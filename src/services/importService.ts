import { generateId, createTrackedObjectUrl } from '@/lib/utils'
import { ACCEPTED_IMAGE_MIME_TYPES } from '@/constants'
import { thumbnailService } from './thumbnailService'
import { db } from '@/db/schema'
import type { Page, ImageMetadata } from '@/types'

export interface ImportResult {
    imported: Page[]
    duplicates: string[]
    errors: Array<{ filename: string; reason: string }>
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
async function generateInlineThumbnail(blob: Blob, size = 200): Promise<{ blob: Blob; url: string } | null> {
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
        existingPageCount: number,
        onProgress?: ProgressCallback,
        _detectDuplicates = true,
        _thumbnailSize = 160
    ): Promise<ImportResult> {
        const result: ImportResult = { imported: [], duplicates: [], errors: [], total: files.length }

        const validFiles: File[] = []
        for (const file of files) {
            const err = validateFile(file)
            if (err) result.errors.push({ filename: file.name, reason: err })
            else validFiles.push(file)
        }
        if (validFiles.length === 0) return result

        onProgress?.({ phase: 'thumbnails', current: 0, total: validFiles.length, currentFile: '' })

        // Process files — generate a real small thumbnail immediately (fast, synchronous-feeling)
        // Then upgrade to hi-res thumbnail in background via worker
        const pages: Page[] = []
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            onProgress?.({ phase: 'thumbnails', current: i + 1, total: validFiles.length, currentFile: file.name })

            const imageBlob = new Blob([await file.arrayBuffer()], { type: file.type })
            const { width, height } = await getImageDimensionsFast(imageBlob)

            // Generate a fast inline thumbnail at 200px — visible quality, fast generation
            const thumb = await generateInlineThumbnail(imageBlob, 200)

            const metadata: ImageMetadata = {
                filename: file.name, width, height,
                fileSize: file.size, mimeType: file.type,
                createdAt: file.lastModified || Date.now(),
            }

            pages.push({
                id: generateId(),
                projectId,
                order: existingPageCount + i,
                rotation: 0,
                imageBlob,
                thumbnailBlob: thumb?.blob,
                thumbnailUrl: thumb?.url,
                imageUrl: undefined,
                metadata,
                ocrText: undefined,
                ocrStatus: 'idle',
                isCover: existingPageCount === 0 && i === 0,
                margin: 'medium',
                customMargin: undefined,
                imageFit: 'fit',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        }

        result.imported = pages
        onProgress?.({ phase: 'done', current: pages.length, total: pages.length, currentFile: '' })

        // Save to DB in background
        this.saveToDb(pages).catch(err => console.error('[ImportService] DB save failed:', err))

        // Upgrade thumbnails to hi-res in background via worker
        this.upgradeThumbnailsBackground(pages, 300).catch(err =>
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