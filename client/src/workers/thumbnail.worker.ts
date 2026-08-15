// Thumbnail generation worker
// Runs entirely off the main thread — receives image blobs, returns thumbnail blobs

export interface ThumbnailRequest {
    id: string
    blob: Blob
    size: number // max dimension in px
}

export interface ThumbnailResponse {
    id: string
    blob: Blob
    width: number
    height: number
    error?: string
}

self.onmessage = async (e: MessageEvent<ThumbnailRequest>) => {
    const { id, blob, size } = e.data

    try {
        // Create ImageBitmap from blob (available in workers)
        const bitmap = await createImageBitmap(blob)

        const { width: origW, height: origH } = bitmap

        // Maintain aspect ratio
        const ratio = Math.min(size / origW, size / origH, 1)
        const w = Math.round(origW * ratio)
        const h = Math.round(origH * ratio)

        // Draw to OffscreenCanvas
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get 2d context')

        // Browsers don't always default to their best resize algorithm —
        // explicitly requesting high-quality smoothing measurably reduces
        // blur/aliasing from the downscale step itself, independent of the
        // thumbnail's actual pixel dimensions.
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.drawImage(bitmap, 0, 0, w, h)
        bitmap.close()

        // Export as WebP for best compression, fallback to JPEG. Bumped
        // from 0.82 — a modest quality increase costs relatively little
        // file size at thumbnail dimensions but visibly reduces
        // compression softness/artifacts.
        let thumbBlob: Blob
        try {
            thumbBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 })
        } catch {
            thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
        }

        const response: ThumbnailResponse = { id, blob: thumbBlob, width: w, height: h }
        self.postMessage(response)
    } catch (err) {
        const response: ThumbnailResponse = {
            id, blob: new Blob(), width: 0, height: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
        }
        self.postMessage(response)
    }
}