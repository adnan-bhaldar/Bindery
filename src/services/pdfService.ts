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
// NOTE: imgW/imgH passed in here should already be the EFFECTIVE (post-rotation)
// dimensions — see effImgW/effImgH in generate() below — so that 'auto'/'original'
// page sizing and auto-orientation match what the rotated image will actually
// look like, exactly mirroring the on-screen preview's resolvePageAspect().

function getPageSizePts(
    size: PageSize,
    imgW: number,
    imgH: number,
    exactAutoSize: boolean
): [number, number] {
    if (size === 'original') {
        // Treat image pixels as points (72dpi assumption)
        return [imgW * 0.75, imgH * 0.75]
    }
    if (size === 'auto') {
        // BUG (fixed): this used to always substitute A4 dimensions here
        // (just orientation-swapped to match the image) instead of actually
        // sizing the page to the image — completely different from what the
        // on-screen preview does for 'auto' (which sizes the page frame
        // exactly to the image's own aspect ratio, via resolvePageAspect in
        // PreviewCanvas.tsx). Since a real photo's aspect ratio essentially
        // never exactly matches A4's, the mismatch meant the exported PDF
        // showed visible blank page space ("canvas") around the image that
        // never appeared in the preview.
        //
        // exactAutoSize (Settings → Export → "Auto page size") controls
        // which behavior 'auto' actually uses:
        //   true  (default) → identical to 'original': page sized exactly
        //                      to the image, no canvas/padding at all.
        //   false            → the old behavior: pad onto a standard-size
        //                      page, oriented to match the image.
        if (exactAutoSize) {
            return [imgW * 0.75, imgH * 0.75]
        }
        const a4 = PAGE_SIZES.a4
        return imgW > imgH ? [a4.height, a4.width] : [a4.width, a4.height]
    }
    if (size in PAGE_SIZES) {
        const s = PAGE_SIZES[size as keyof typeof PAGE_SIZES]
        return [s.width, s.height]
    }
    return [PAGE_SIZES.a4.width, PAGE_SIZES.a4.height]
}

// ─── Rotation anchor math ──────────────────────────────────────────────────────
// pdf-lib's drawImage({ rotate }) rotates the image about the (x, y) anchor
// point — i.e. where the image's bottom-left corner would sit if it were NOT
// rotated — not about its center. To make a `w × h` box land centered at a
// target point (cx, cy) after being rotated by `deg` (pdf-lib's y-up, standard
// math / counter-clockwise-positive convention), the anchor must be offset
// from the target center by the rotated half-diagonal. Derivation: the box's
// center, relative to its own bottom-left corner, is (w/2, h/2); rotating the
// whole box about the anchor by `deg` moves that relative offset to
// R(deg) · (w/2, h/2); solving anchor + R(deg)·(w/2,h/2) = (cx,cy) for anchor
// gives the formulas below. Verified against deg = 0/90/180/270 by hand.
function centeredAnchor(cx: number, cy: number, w: number, h: number, deg: number) {
    const rad = (deg * Math.PI) / 180
    // Snap to exact values for our supported 90°-multiples — avoids sub-pixel
    // drift from floating-point cos/sin of e.g. Math.PI/2.
    const cos = Math.round(Math.cos(rad) * 1e6) / 1e6
    const sin = Math.round(Math.sin(rad) * 1e6) / 1e6
    const x = cx - (w / 2) * cos + (h / 2) * sin
    const y = cy - (w / 2) * sin - (h / 2) * cos
    return { x, y }
}

// ─── PDF Service ──────────────────────────────────────────────────────────────

export class PDFService {
    async generate(
        pages: Page[],
        options: ExportOptions,
        onProgress?: ProgressCallback
    ): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.create()
        const { preset, metadata, useExactAutoPageSize = true, useDefaultAuthorName = true } = options

        // Document metadata
        // Title: use the provided title if set, otherwise fall back to
        // "Bindery" (previously fell back to the generic "Untitled").
        pdfDoc.setTitle(metadata.title?.trim() || 'Bindery')

        // Author: previously always fell back to a default name when left
        // blank. Now configurable via Settings → Export → "Default author
        // name" — off means the Author field is left genuinely empty in
        // the exported PDF instead of getting a default filled in.
        pdfDoc.setAuthor(metadata.author?.trim() || (useDefaultAuthorName ? 'Bindery' : ''))

        pdfDoc.setSubject(metadata.subject || '')
        pdfDoc.setKeywords(
            metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()) : []
        )
        pdfDoc.setCreator('Bindery')

        // Producer: previously a static string with no year at all. Now
        // computes the current year at runtime, and respects a
        // user-provided Copyright field (from the sidebar Info tab) if one
        // was actually entered, falling back to a plain "© {year}" when it
        // was left blank.
        const copyrightLine = metadata.copyright?.trim() || `© ${new Date().getFullYear()}`
        pdfDoc.setProducer(`Bindery PDF Engine · ${copyrightLine}`)

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

            // ── Rotation-aware effective dimensions ──────────────────────────
            // Mirrors the preview canvas's resolvePageAspect() exactly: when the
            // page is rotated 90/270, page-size and auto-orientation decisions
            // must use the SWAPPED dimensions, or the chosen page shape won't
            // match what the rotated image actually looks like.
            const isRotated90 = page.rotation === 90 || page.rotation === 270
            const effImgW = isRotated90 ? imgH : imgW
            const effImgH = isRotated90 ? imgW : imgH

            // Page size — decided from the EFFECTIVE (post-rotation) aspect
            let [pgW, pgH] = getPageSizePts(preset.pageSize, effImgW, effImgH, useExactAutoPageSize)

            // Orientation — same effective-dimension awareness
            const shouldLandscape =
                preset.orientation === 'landscape' ||
                (preset.orientation === 'auto' && effImgW > effImgH)
            if (shouldLandscape && pgW < pgH) [pgW, pgH] = [pgH, pgW]

            // Margin
            const margin =
                preset.margin === 'custom'
                    ? { top: 28, right: 28, bottom: 28, left: 28 }
                    : MARGIN_SIZES[preset.margin as keyof typeof MARGIN_SIZES] ?? MARGIN_SIZES.none

            const contentW = pgW - margin.left - margin.right
            const contentH = pgH - margin.top - margin.bottom

            const pdfPage = pdfDoc.addPage([pgW, pgH])

            // NOTE: we deliberately do NOT call pdfPage.setRotation() here.
            // A page-level /Rotate flag rotates EVERYTHING on the page —
            // margins, watermark, page numbers — as one unit, and the page's
            // own MediaBox would then need a *different* pre-swap to line up
            // correctly, which is a separate and more error-prone path. Since
            // pgW/pgH above are already sized using the rotation-aware
            // effective dimensions, this page is already the correctly-shaped
            // final page — margins, watermark, and page numbers all sit in
            // this same untouched coordinate space. Only the image itself
            // gets rotated, directly in the drawImage() call below.

            // The box the NATIVE (unrotated) image must be fit into so that,
            // once rotated back to the page's true orientation, it lands
            // exactly on the real content box (contentW × contentH).
            const effContentW = isRotated90 ? contentH : contentW
            const effContentH = isRotated90 ? contentW : contentH

            // Image draw dimensions (in the image's own native orientation)
            let drawW = imgW, drawH = imgH
            let centerX = margin.left + drawW / 2
            let centerY = margin.bottom + drawH / 2

            if (preset.imageFit === 'fit') {
                const scale = Math.min(effContentW / imgW, effContentH / imgH)
                drawW = imgW * scale; drawH = imgH * scale
                centerX = margin.left + contentW / 2
                centerY = margin.bottom + contentH / 2
            } else if (preset.imageFit === 'fill') {
                const scale = Math.max(effContentW / imgW, effContentH / imgH)
                drawW = imgW * scale; drawH = imgH * scale
                centerX = margin.left + contentW / 2
                centerY = margin.bottom + contentH / 2
            } else if (preset.imageFit === 'stretch') {
                drawW = effContentW; drawH = effContentH
                centerX = margin.left + contentW / 2
                centerY = margin.bottom + contentH / 2
            }
            // ('original' fit falls through to the natural-size defaults above,
            // preserving prior behaviour exactly when page.rotation === 0.)

            // CSS (used by the preview canvas) and pdf-lib use opposite-handed
            // coordinate systems — CSS is y-down (positive deg = clockwise),
            // pdf-lib/PDF is y-up (positive deg = counter-clockwise). To make
            // the export match what the user actually sees in the preview for
            // the SAME page.rotation value, we flip the angle here.
            const pdfRotationDeg = (360 - page.rotation) % 360

            const { x: drawX, y: drawY } = centeredAnchor(centerX, centerY, drawW, drawH, pdfRotationDeg)

            pdfPage.drawImage(pdfImage, {
                x: drawX, y: drawY, width: drawW, height: drawH,
                rotate: degrees(pdfRotationDeg),
            })

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