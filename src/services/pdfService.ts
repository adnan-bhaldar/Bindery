import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib'
import type { Page, ExportOptions, ExportProgress, PageSize } from '@/types'
import { PAGE_SIZES, MARGIN_SIZES } from '@/constants'

export type ProgressCallback = (p: ExportProgress) => void

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageSizePts(size: PageSize, imgW: number, imgH: number): [number, number] {
    if (size === 'original') return [imgW * 0.75, imgH * 0.75] // px → pt approx
    if (size === 'auto') {
        // Match landscape/portrait to A4
        const a4 = PAGE_SIZES.a4
        return imgW > imgH
            ? [a4.height, a4.width]   // landscape
            : [a4.width, a4.height]  // portrait
    }
    if (size in PAGE_SIZES) {
        const s = PAGE_SIZES[size as keyof typeof PAGE_SIZES]
        return [s.width, s.height]
    }
    return [PAGE_SIZES.a4.width, PAGE_SIZES.a4.height]
}

async function compressImageBlob(imageBlob: Blob, quality: number): Promise<Blob> {
    // Draw to canvas and re-export at lower quality
    const bitmap = await createImageBitmap(imageBlob)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return imageBlob
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    try {
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 })
    } catch {
        return imageBlob
    }
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

        // ── Set document metadata ────────────────────────────────────────────────
        pdfDoc.setTitle(metadata.title || 'Untitled')
        pdfDoc.setAuthor(metadata.author || '')
        pdfDoc.setSubject(metadata.subject || '')
        pdfDoc.setKeywords(metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()) : [])
        pdfDoc.setCreator('Bindery')
        pdfDoc.setProducer('Bindery PDF Engine · pdf-lib')
        pdfDoc.setCreationDate(new Date())
        pdfDoc.setModificationDate(new Date())

        const total = pages.length

        onProgress?.({
            stage: 'preparing', current: 0, total, message: 'Preparing pages…',
        })

        // ── Embed a font for page numbers ────────────────────────────────────────
        const helvetica = preset.pageNumbers
            ? await pdfDoc.embedFont(StandardFonts.Helvetica)
            : null

        // ── Process each page ────────────────────────────────────────────────────
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i]

            onProgress?.({
                stage: 'processing',
                current: i + 1,
                total,
                message: `Processing page ${i + 1} of ${total}…`,
            })

            // Get image bytes
            let imageBlob = page.imageBlob
            if (preset.compression !== 'original') {
                try {
                    imageBlob = await compressImageBlob(imageBlob, preset.compression as number)
                } catch {
                    // Use original if compression fails
                }
            }

            const imageBytes = new Uint8Array(await imageBlob.arrayBuffer())
            const mimeType = page.metadata.mimeType

            // Embed image
            let pdfImage
            try {
                if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                    pdfImage = await pdfDoc.embedJpg(imageBytes)
                } else {
                    pdfImage = await pdfDoc.embedPng(imageBytes)
                }
            } catch {
                // Try PNG fallback
                try {
                    pdfImage = await pdfDoc.embedPng(imageBytes)
                } catch {
                    console.warn(`Skipping page ${i + 1} — could not embed image`)
                    continue
                }
            }

            const imgW = pdfImage.width
            const imgH = pdfImage.height

            // Determine page size
            let [pgW, pgH] = getPageSizePts(preset.pageSize, imgW, imgH)

            // Apply orientation
            const shouldLandscape = preset.orientation === 'landscape'
                || (preset.orientation === 'auto' && imgW > imgH)
            if (shouldLandscape && pgW < pgH) [pgW, pgH] = [pgH, pgW]

            // Margins
            const margin = preset.margin === 'custom' ? { top: 28, right: 28, bottom: 28, left: 28 }
                : MARGIN_SIZES[preset.margin as keyof typeof MARGIN_SIZES] ?? MARGIN_SIZES.none
            const contentW = pgW - margin.left - margin.right
            const contentH = pgH - margin.top - margin.bottom

            // Add page
            const pdfPage = pdfDoc.addPage([pgW, pgH])

            // Rotation (pdf-lib uses CCW degrees)
            if (page.rotation !== 0) {
                pdfPage.setRotation(degrees(page.rotation))
            }

            // Compute image draw dimensions
            let drawW = imgW
            let drawH = imgH
            let drawX = margin.left
            let drawY = margin.bottom

            if (preset.imageFit === 'fit') {
                const scale = Math.min(contentW / imgW, contentH / imgH)
                drawW = imgW * scale
                drawH = imgH * scale
                drawX = margin.left + (contentW - drawW) / 2
                drawY = margin.bottom + (contentH - drawH) / 2
            } else if (preset.imageFit === 'fill') {
                const scale = Math.max(contentW / imgW, contentH / imgH)
                drawW = imgW * scale
                drawH = imgH * scale
                drawX = margin.left + (contentW - drawW) / 2
                drawY = margin.bottom + (contentH - drawH) / 2
            } else if (preset.imageFit === 'stretch') {
                drawW = contentW
                drawH = contentH
            }
            // 'original' keeps natural dims

            pdfPage.drawImage(pdfImage, { x: drawX, y: drawY, width: drawW, height: drawH })

            // Watermark
            if (preset.watermark && helvetica) {
                const wm = preset.watermark
                const [r, g, b2] = hexToRgb(wm.color || '#888888')
                pdfPage.drawText(wm.text, {
                    x: pgW / 2,
                    y: pgH / 2,
                    size: wm.fontSize || 48,
                    font: helvetica,
                    color: rgb(r, g, b2),
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

            // OCR text layer
            if (preset.includeOcr && page.ocrText && page.ocrText.trim()) {
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
                // Draw invisible text layer for searchability
                const lines = page.ocrText.split('\n').filter(l => l.trim())
                let ty = pgH - 20
                for (const line of lines.slice(0, 50)) { // limit lines to avoid bloat
                    if (ty < 20) break
                    pdfPage.drawText(line.slice(0, 100), {
                        x: 10, y: ty, size: 1, font,
                        color: rgb(1, 1, 1), opacity: 0.01, // invisible
                    })
                    ty -= 12
                }
            }
        }

        onProgress?.({ stage: 'generating', current: total, total, message: 'Generating PDF…' })

        const pdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
        })

        onProgress?.({ stage: 'done', current: total, total, message: 'Done' })

        return pdfBytes
    }

    estimateSize(pages: Page[], compressionQuality: number | 'original'): number {
        const totalImageBytes = pages.reduce((sum, p) => sum + p.imageBlob.size, 0)
        const factor = compressionQuality === 'original' ? 1 : (compressionQuality as number) / 100
        return Math.round(totalImageBytes * factor * 1.05) // 5% PDF overhead
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

