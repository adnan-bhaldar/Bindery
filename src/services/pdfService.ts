import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib'
import type { Page, ExportOptions, ExportProgress, PageSize } from '@/types'
import { PAGE_SIZES, MARGIN_SIZES } from '@/constants'

export type ProgressCallback = (p: ExportProgress) => void

// ─── Image normaliser ──────────────────────────────────────────────────────────
// pdf-lib only supports JPEG and PNG. Convert everything else (WebP, GIF, BMP,
// TIFF, HEIC, AVIF) to JPEG via OffscreenCanvas. Also apply compression here.

async function normaliseToPdfCompatible(
    blob: Blob,
    quality: number | 'original'
): Promise<{ bytes: Uint8Array; isJpeg: boolean }> {
    const type = blob.type.toLowerCase()
    const isNativeJpeg = type === 'image/jpeg' || type === 'image/jpg'
    const isNativePng = type === 'image/png'

    // If it's already JPEG/PNG and no compression needed → use as-is
    if ((isNativeJpeg || isNativePng) && quality === 'original') {
        return {
            bytes: new Uint8Array(await blob.arrayBuffer()),
            isJpeg: isNativeJpeg,
        }
    }

    // Re-encode via canvas (handles all formats + applies quality)
    try {
        const bitmap = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()

        const q = quality === 'original' ? 0.95 : quality / 100
        // Prefer JPEG for photos (smaller), PNG only if image has transparency
        const outType = isNativePng ? 'image/png' : 'image/jpeg'
        const outBlob = await canvas.convertToBlob({ type: outType, quality: q })
        return {
            bytes: new Uint8Array(await outBlob.arrayBuffer()),
            isJpeg: outType === 'image/jpeg',
        }
    } catch {
        // Fallback: return original bytes, try JPEG first
        return {
            bytes: new Uint8Array(await blob.arrayBuffer()),
            isJpeg: isNativeJpeg,
        }
    }
}

// ─── Page size ────────────────────────────────────────────────────────────────

function getPageSizePts(
    size: PageSize,
    imgW: number,
    imgH: number
): [number, number] {
    if (size === 'original') {
        // Treat image pixels as points (72dpi assumption)
        return [imgW * 0.75, imgH * 0.75]
    }
    if (size === 'auto') {
        const a4 = PAGE_SIZES.a4
        return imgW > imgH ? [a4.height, a4.width] : [a4.width, a4.height]
    }
    if (size in PAGE_SIZES) {
        const s = PAGE_SIZES[size as keyof typeof PAGE_SIZES]
        return [s.width, s.height]
    }
    return [PAGE_SIZES.a4.width, PAGE_SIZES.a4.height]
}

// ─── PDF Service ──────────────────────────────────────────────────────────────

export class PDFService {
    async generate(
        pages: Page[],
        options: ExportOptions,
        onProgress?: ProgressCallback
    ): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.create()
        const { preset, metadata } = options

        // Document metadata
        pdfDoc.setTitle(metadata.title || 'Untitled')
        pdfDoc.setAuthor(metadata.author || '')
        pdfDoc.setSubject(metadata.subject || '')
        pdfDoc.setKeywords(
            metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()) : []
        )
        pdfDoc.setCreator('Bindery')
        pdfDoc.setProducer('Bindery PDF Engine · pdf-lib')
        pdfDoc.setCreationDate(new Date())
        pdfDoc.setModificationDate(new Date())

        const total = pages.length
        onProgress?.({ stage: 'preparing', current: 0, total, message: 'Preparing pages…' })

        const helvetica = preset.pageNumbers
            ? await pdfDoc.embedFont(StandardFonts.Helvetica)
            : null

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i]

            onProgress?.({
                stage: 'processing',
                current: i + 1,
                total,
                message: `Processing page ${i + 1} of ${total}…`,
            })

            // Normalise to JPEG/PNG — handles all input formats and compression
            let normalised: { bytes: Uint8Array; isJpeg: boolean }
            try {
                normalised = await normaliseToPdfCompatible(page.imageBlob, preset.compression)
            } catch {
                console.warn(`[PDF] Skipping page ${i + 1} — could not process image`)
                continue
            }

            // Embed
            let pdfImage
            try {
                pdfImage = normalised.isJpeg
                    ? await pdfDoc.embedJpg(normalised.bytes)
                    : await pdfDoc.embedPng(normalised.bytes)
            } catch {
                // If JPEG embed fails, try PNG fallback
                try {
                    pdfImage = await pdfDoc.embedPng(normalised.bytes)
                } catch {
                    console.warn(`[PDF] Could not embed page ${i + 1}`)
                    continue
                }
            }

            const imgW = pdfImage.width
            const imgH = pdfImage.height

            // Page size
            let [pgW, pgH] = getPageSizePts(preset.pageSize, imgW, imgH)

            // Orientation
            const shouldLandscape =
                preset.orientation === 'landscape' ||
                (preset.orientation === 'auto' && imgW > imgH)
            if (shouldLandscape && pgW < pgH) [pgW, pgH] = [pgH, pgW]

            // Margin
            const margin =
                preset.margin === 'custom'
                    ? { top: 28, right: 28, bottom: 28, left: 28 }
                    : MARGIN_SIZES[preset.margin as keyof typeof MARGIN_SIZES] ?? MARGIN_SIZES.none

            const contentW = pgW - margin.left - margin.right
            const contentH = pgH - margin.top - margin.bottom

            const pdfPage = pdfDoc.addPage([pgW, pgH])

            // Page rotation
            if (page.rotation !== 0) {
                pdfPage.setRotation(degrees(page.rotation))
            }

            // Image draw dimensions
            let drawW = imgW, drawH = imgH
            let drawX = margin.left, drawY = margin.bottom

            if (preset.imageFit === 'fit') {
                const scale = Math.min(contentW / imgW, contentH / imgH)
                drawW = imgW * scale; drawH = imgH * scale
                drawX = margin.left + (contentW - drawW) / 2
                drawY = margin.bottom + (contentH - drawH) / 2
            } else if (preset.imageFit === 'fill') {
                const scale = Math.max(contentW / imgW, contentH / imgH)
                drawW = imgW * scale; drawH = imgH * scale
                drawX = margin.left + (contentW - drawW) / 2
                drawY = margin.bottom + (contentH - drawH) / 2
            } else if (preset.imageFit === 'stretch') {
                drawW = contentW; drawH = contentH
            }

            pdfPage.drawImage(pdfImage, { x: drawX, y: drawY, width: drawW, height: drawH })

            // Watermark
            if (preset.watermark && helvetica) {
                const wm = preset.watermark
                const [r, g, b] = hexToRgb(wm.color || '#888888')
                pdfPage.drawText(wm.text, {
                    x: pgW / 2, y: pgH / 2,
                    size: wm.fontSize || 48,
                    font: helvetica,
                    color: rgb(r, g, b),
                    opacity: wm.opacity || 0.15,
                    rotate: degrees(wm.rotation || -45),
                })
            }

            // Page numbers
            if (preset.pageNumbers && helvetica) {
                const label = `${i + 1}`
                const fontSize = 9
                const textW = helvetica.widthOfTextAtSize(label, fontSize)
                let numX = pgW / 2 - textW / 2
                let numY = 14
                if (preset.pageNumberPosition === 'bottom-right') { numX = pgW - margin.right - textW; numY = 14 }
                if (preset.pageNumberPosition === 'bottom-left') { numX = margin.left; numY = 14 }
                if (preset.pageNumberPosition === 'top-right') { numX = pgW - margin.right - textW; numY = pgH - 20 }

                pdfPage.drawText(label, {
                    x: numX, y: numY, size: fontSize, font: helvetica,
                    color: rgb(0.5, 0.5, 0.5),
                })
            }

            // Invisible OCR text layer
            if (preset.includeOcr && page.ocrText?.trim()) {
                const ocrFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
                const lines = page.ocrText.split('\n').filter(l => l.trim())
                let ty = pgH - 20
                for (const line of lines.slice(0, 60)) {
                    if (ty < 20) break
                    pdfPage.drawText(line.slice(0, 120), {
                        x: 10, y: ty, size: 1, font: ocrFont,
                        color: rgb(1, 1, 1), opacity: 0.01,
                    })
                    ty -= 10
                }
            }
        }

        onProgress?.({ stage: 'generating', current: total, total, message: 'Generating PDF…' })
        const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false })
        onProgress?.({ stage: 'done', current: total, total, message: 'Done' })
        return bytes
    }

    estimateSize(pages: Page[], compression: number | 'original'): number {
        const total = pages.reduce((sum, p) => sum + p.imageBlob.size, 0)
        const factor = compression === 'original' ? 1 : (compression as number) / 100
        return Math.round(total * factor * 1.05)
    }
}

export const pdfService = new PDFService()

// ─── Util ─────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return [r, g, b]
}
