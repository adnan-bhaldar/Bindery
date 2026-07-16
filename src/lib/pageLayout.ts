import { PAGE_SIZES } from '@/constants'

/**
 * Resolves the "page" aspect ratio (in points) for a given page-size preset,
 * orientation, and image — accounting for rotation. Shared by PreviewCanvas
 * (single-page view) and PageFramePreview (Grid/Continuous views) so all
 * three preview modes agree on exactly what the exported PDF page will look
 * like, instead of Grid/Continuous just showing the raw image.
 */
export function resolvePageAspect(
    pageSize: string,
    orientation: string,
    imgW: number,
    imgH: number,
    rotation: number
): { w: number; h: number } {
    if (!imgW || !imgH) return { w: 210, h: 297 }

    // Swap effective dimensions when image is rotated 90/270
    const isRotated90 = rotation === 90 || rotation === 270
    const effW = isRotated90 ? imgH : imgW
    const effH = isRotated90 ? imgW : imgH

    if (pageSize === 'auto' || pageSize === 'original') {
        return { w: effW, h: effH }
    }

    const sizes = PAGE_SIZES as Record<string, { width: number; height: number }>
    const def = sizes[pageSize] ?? PAGE_SIZES.a4
    let { width: w, height: h } = def

    const isLandscape =
        orientation === 'landscape' ||
        (orientation === 'auto' && effW > effH)

    if (isLandscape && w < h) [w, h] = [h, w]
    return { w, h }
}