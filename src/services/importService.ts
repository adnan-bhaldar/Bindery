import { generateId, createTrackedObjectUrl } from '@/lib/utils'
import { ACCEPTED_IMAGE_MIME_TYPES } from '@/constants'
import { thumbnailService } from './thumbnailService'
import { hashService } from './hashService'
import { db } from '@/db/schema'
import type { Page, ImageMetadata } from '@/types'

export interface ImportResult {
    imported: Page[]
    duplicates: string[]
    errors: Array<{ filename: string; reason: string }>
    lowResolution: string[]
    total: number
}

export interface ImportProgress {
    phase: 'validating' | 'hashing' | 'thumbnails' | 'saving' | 'done'
    current: number
    total: number
    currentFile: string
}

export type ProgressCallback = (p: ImportProgress) => void

function validateFile(file: File): string | null {
    if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) return `Unsupported format: ${file.type || 'unknown'}`
    if (file.size === 0) return 'File is empty'
    if (file.size > 100 * 1024 * 1024) return 'File exceeds 100 MB limit'
    return null
}

async function getImageDimensionsFast(blob: Blob): Promise<{ width: number; height: number }> {
    try {
        const bmp = await createImageBitmap(blob)
        const { width, height } = bmp
        bmp.close()
        return { width, height }
    } catch {
        return { width: 0, height: 0 }
    }
}

// Generate a REAL thumbnail immediately on main thread at small size
// This is fast enough (< 200ms) and shows instantly
async function generateInlineThumbnail(blob: Blob, size: number): Promise<{ blob: Blob; url: string } | null> {
    try {
        const bmp = await createImageBitmap(blob)
        const { width, height } = bmp
        const ratio = Math.min(size / width, size / height, 1)
        const w = Math.round(width * ratio)
        const h = Math.round(height * ratio)
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d')
        if (!ctx) { bmp.close(); return null }
        ctx.drawImage(bmp, 0, 0, w, h)
        bmp.close()
        const thumbBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.75 })
        const url = createTrackedObjectUrl(thumbBlob)
        return { blob: thumbBlob, url }
    } catch {
        return null
    }
}

// Approximates "effective print resolution" in DPI for a scanned/photographed
// page, since we have no reliable physical-size metadata (EXIF DPI tags are
// inconsistent/absent on most phone photos and screenshots). We assume the
// image is destined for a standard Letter-ish page (8.5×11in) and take the
// more conservative (smaller) of the two axis-based DPI estimates. This is a
// heuristic, not a true measurement — but it's the same practical shortcut
// most consumer scanning apps use, and it's good enough to flag genuinely
// low-res sources (e.g. a 400×300px web image) without false-flagging normal
// camera photos.
function estimateEffectiveDpi(width: number, height: number): number {
    if (!width || !height) return Infinity // unknown dimensions — don't warn
    const longEdge = Math.max(width, height)
    const shortEdge = Math.min(width, height)
    return Math.min(longEdge / 11, shortEdge / 8.5)
}

class ImportService {
    private thumbCallbacks: Array<(pageId: string, url: string, blob: Blob) => void> = []

    onThumbnailReady(cb: (pageId: string, url: string, blob: Blob) => void) {
        this.thumbCallbacks.push(cb)
        return () => { this.thumbCallbacks = this.thumbCallbacks.filter(c => c !== cb) }
    }

    private notifyThumb(pageId: string, url: string, blob: Blob) {
        this.thumbCallbacks.forEach(cb => cb(pageId, url, blob))
    }

    async importFiles(
        files: File[],
        projectId: string,
        existingPages: Page[],
        onProgress?: ProgressCallback,
        detectDuplicates = true,
        thumbnailSize = 160,
        warnLowResolution = true,
        lowResolutionThreshold = 72,
    ): Promise<ImportResult> {
        const result: ImportResult = { imported: [], duplicates: [], errors: [], lowResolution: [], total: files.length }
        const existingPageCount = existingPages.length

        const validFiles: File[] = []
        for (const file of files) {
            const err = validateFile(file)
            if (err) result.errors.push({ filename: file.name, reason: err })
            else validFiles.push(file)
        }
        if (validFiles.length === 0) return result

        // Real hash-based duplicate detection: hash every existing page that
        // doesn't already have one cached (older projects may predate this),
        // then compare each new file's hash against that set.
        const knownHashes = new Set<string>()
        if (detectDuplicates) {
            onProgress?.({ phase: 'hashing', current: 0, total: existingPageCount, currentFile: '' })
            await Promise.all(existingPages.map(async (p) => {
                if (p.metadata.hash) { knownHashes.add(p.metadata.hash); return }
                try {
                    const h = await hashService.hash(p.id, p.imageBlob)
                    knownHashes.add(h)
                } catch { /* if hashing an existing page fails, just skip comparing against it */ }
            }))
        }

        onProgress?.({ phase: 'thumbnails', current: 0, total: validFiles.length, currentFile: '' })

        // Process files — generate a real small thumbnail immediately (fast, synchronous-feeling)
        // Then upgrade to hi-res thumbnail in background via worker
        const pages: Page[] = []
        const seenThisBatch = new Set<string>() // catches duplicates WITHIN the same import batch too
        let importedCount = 0
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            onProgress?.({ phase: 'thumbnails', current: i + 1, total: validFiles.length, currentFile: file.name })

            const imageBlob = new Blob([await file.arrayBuffer()], { type: file.type })
            const { width, height } = await getImageDimensionsFast(imageBlob)

            let hash: string | undefined
            if (detectDuplicates) {
                try {
                    hash = await hashService.hash(`import-${projectId}-${i}`, imageBlob)
                } catch { /* if hashing fails, just import the file normally rather than blocking it */ }
            }

            if (hash && (knownHashes.has(hash) || seenThisBatch.has(hash))) {
                result.duplicates.push(file.name)
                continue
            }
            if (hash) { knownHashes.add(hash); seenThisBatch.add(hash) }

            if (warnLowResolution && estimateEffectiveDpi(width, height) < lowResolutionThreshold) {
                result.lowResolution.push(file.name)
            }

            // Inline thumbnail respects the user's configured thumbnail size —
            // background hi-res upgrade uses a modest multiple of it, capped
            // at a sensible ceiling so it stays fast on large batches.
            const thumb = await generateInlineThumbnail(imageBlob, thumbnailSize)

            const metadata: ImageMetadata = {
                filename: file.name, width, height,
                fileSize: file.size, mimeType: file.type,
                createdAt: file.lastModified || Date.now(),
                hash,
            }

            pages.push({
                id: generateId(),
                projectId,
                order: existingPageCount + importedCount,
                rotation: 0,
                imageBlob,
                thumbnailBlob: thumb?.blob,
                thumbnailUrl: thumb?.url,
                imageUrl: undefined,
                metadata,
                ocrText: undefined,
                ocrStatus: 'idle',
                isCover: existingPageCount === 0 && importedCount === 0,
                margin: 'medium',
                customMargin: undefined,
                imageFit: 'fit',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
            importedCount++
        }

        result.imported = pages
        onProgress?.({ phase: 'done', current: pages.length, total: pages.length, currentFile: '' })

        // Save to DB in background
        this.saveToDb(pages).catch(err => console.error('[ImportService] DB save failed:', err))

        // Upgrade thumbnails to hi-res in background via worker
        const hiResSize = Math.min(Math.round(thumbnailSize * 1.5), 600)
        this.upgradeThumbnailsBackground(pages, hiResSize).catch(err =>
            console.warn('[ImportService] Background thumb upgrade failed:', err)
        )

        return result
    }

    private async saveToDb(pages: Page[]): Promise<void> {
        try {
            await db.transaction('rw', [db.pages, db.thumbnails], async () => {
                await db.pages.bulkAdd(pages)
                const thumbRecords = pages
                    .filter(p => p.thumbnailBlob)
                    .map(p => ({ pageId: p.id, blob: p.thumbnailBlob!, updatedAt: Date.now() }))
                if (thumbRecords.length > 0) await db.thumbnails.bulkAdd(thumbRecords)
            })
        } catch (err) {
            console.warn('[ImportService] saveToDb error:', err)
        }
    }

    // Upgrade existing thumbnails to hi-res in background
    private async upgradeThumbnailsBackground(pages: Page[], size: number): Promise<void> {
        const BATCH = 3
        for (let i = 0; i < pages.length; i += BATCH) {
            await Promise.allSettled(
                pages.slice(i, i + BATCH).map(async (page) => {
                    try {
                        const result = await thumbnailService.generate({
                            id: `hires-${page.id}`,
                            blob: page.imageBlob,
                            size,
                        })
                        if (result.error || !result.blob.size) return
                        const url = createTrackedObjectUrl(result.blob)
                        this.notifyThumb(page.id, url, result.blob)
                        await db.thumbnails.put({ pageId: page.id, blob: result.blob, updatedAt: Date.now() })
                    } catch { /* non-critical */ }
                })
            )
            await new Promise(r => setTimeout(r, 16)) // yield one frame between batches
        }
    }
}

export const importService = new ImportService()