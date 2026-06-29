import type { Page } from '@/types'

// ─── Auto sort ────────────────────────────────────────────────────────────────

export function sortPagesByFilename(pages: Page[]): Page[] {
    return [...pages]
        .sort((a, b) =>
            a.metadata.filename.localeCompare(b.metadata.filename, undefined, {
                numeric: true,
                sensitivity: 'base',
            })
        )
        .map((p, i) => ({ ...p, order: i }))
}

export function sortPagesByDate(pages: Page[]): Page[] {
    return [...pages]
        .sort((a, b) => a.metadata.createdAt - b.metadata.createdAt)
        .map((p, i) => ({ ...p, order: i }))
}

// ─── Duplicate detection (hash-based) ────────────────────────────────────────

export interface DuplicateGroup {
    hash: string
    pageIds: string[]
}

export function findDuplicates(pages: Page[]): DuplicateGroup[] {
    const hashMap = new Map<string, string[]>()

    for (const page of pages) {
        if (!page.metadata.hash) continue
        const existing = hashMap.get(page.metadata.hash) ?? []
        existing.push(page.id)
        hashMap.set(page.metadata.hash, existing)
    }

    return Array.from(hashMap.entries())
        .filter(([, ids]) => ids.length > 1)
        .map(([hash, pageIds]) => ({ hash, pageIds }))
}

// ─── Blank page detection ─────────────────────────────────────────────────────

export async function isBlankPage(blob: Blob, threshold = 0.97): Promise<boolean> {
    try {
        const bitmap = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(64, 64)
        const ctx = canvas.getContext('2d')
        if (!ctx) return false

        ctx.drawImage(bitmap, 0, 0, 64, 64)
        bitmap.close()

        const imageData = ctx.getImageData(0, 0, 64, 64)
        const data = imageData.data
        let whitePixels = 0
        const total = 64 * 64

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // White = all channels > 240
            if (r > 240 && g > 240 && b > 240) whitePixels++
        }

        return whitePixels / total >= threshold
    } catch {
        return false
    }
}

// ─── Resolution warnings ──────────────────────────────────────────────────────

export interface ResolutionWarning {
    pageId: string
    filename: string
    width: number
    height: number
    estimatedDpi: number
    severity: 'low' | 'very-low'
}

// A4 at 150 DPI = 1240×1754px, at 96 DPI = 794×1123px
const A4_150DPI_W = 1240
const A4_150DPI_H = 1754
const A4_96DPI_W = 794

export function detectLowResolution(pages: Page[], thresholdDpi = 150): ResolutionWarning[] {
    const warnings: ResolutionWarning[] = []

    for (const page of pages) {
        const { width, height } = page.metadata
        if (!width || !height) continue

        // Estimate DPI assuming the image maps to A4
        const scaleW = width / A4_150DPI_W
        const estimatedDpi = Math.round(scaleW * 150)

        if (estimatedDpi < thresholdDpi) {
            warnings.push({
                pageId: page.id,
                filename: page.metadata.filename,
                width,
                height,
                estimatedDpi,
                severity: estimatedDpi < 72 ? 'very-low' : 'low',
            })
        }
    }

    return warnings
}

// ─── Image optimization ───────────────────────────────────────────────────────

export async function optimizeImageBlob(
    blob: Blob,
    maxDimension = 3508, // A4 at 300 DPI
    quality = 0.9
): Promise<Blob> {
    try {
        const bitmap = await createImageBitmap(blob)
        const { width, height } = bitmap

        // Only optimize if image is oversized
        if (width <= maxDimension && height <= maxDimension) {
            bitmap.close()
            return blob
        }

        const scale = Math.min(maxDimension / width, maxDimension / height)
        const newW = Math.round(width * scale)
        const newH = Math.round(height * scale)

        const canvas = new OffscreenCanvas(newW, newH)
        const ctx = canvas.getContext('2d')
        if (!ctx) { bitmap.close(); return blob }

        ctx.drawImage(bitmap, 0, 0, newW, newH)
        bitmap.close()

        return await canvas.convertToBlob({
            type: 'image/jpeg',
            quality,
        })
    } catch {
        return blob
    }
}

// ─── Smart feature runner ─────────────────────────────────────────────────────

export interface SmartScanResult {
    duplicates: DuplicateGroup[]
    blankPageIds: string[]
    resolutionWarnings: ResolutionWarning[]
}

export async function runSmartScan(
    pages: Page[],
    options = { checkBlanks: true, checkResolution: true, thresholdDpi: 150 }
): Promise<SmartScanResult> {
    const duplicates = findDuplicates(pages)

    const blankPageIds: string[] = []
    if (options.checkBlanks) {
        const blankChecks = await Promise.allSettled(
            pages.map(async (p) => ({
                id: p.id,
                isBlank: await isBlankPage(p.imageBlob),
            }))
        )
        for (const r of blankChecks) {
            if (r.status === 'fulfilled' && r.value.isBlank) {
                blankPageIds.push(r.value.id)
            }
        }
    }

    const resolutionWarnings = options.checkResolution
        ? detectLowResolution(pages, options.thresholdDpi)
        : []

    return { duplicates, blankPageIds, resolutionWarnings }
}