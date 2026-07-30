import * as pdfjsLib from 'pdfjs-dist'

// Bundle the worker locally via Vite instead of letting pdf.js fall back to
// fetching it from a CDN — the same class of fragility we hit with
// tesseract.js earlier (a worker that silently depends on a third-party
// CDN being reachable is slow at best and breaks entirely in restricted
// network environments). This keeps everything self-contained in the build.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

// How many CSS pixels of resolution to render each PDF page at, per point
// of PDF page size — 2 is roughly a 144dpi-equivalent raster, matching what
// the rest of the app's thumbnail/print pipeline already targets for a
// crisp result without producing enormous files for a typical page.
const RENDER_SCALE = 2

export interface PdfExpandProgress {
    fileName: string
    pageIndex: number
    pageCount: number
}

class PdfImportService {
    /**
     * Renders every page of a PDF file into a standalone PNG File, named so
     * a multi-page source is easy to tell apart in the imported list
     * ("Invoice.pdf — page 1 of 3.png", etc). These are then treated as
     * ordinary image imports by the rest of importService — no separate
     * "PDF page" concept exists anywhere else in the app; a page rendered
     * from a PDF is just a Page like any other, so reordering, rotating,
     * deleting, margins, and OCR all already work on it unmodified.
     */
    async expandToImageFiles(
        file: File,
        onProgress?: (p: PdfExpandProgress) => void
    ): Promise<File[]> {
        const buffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: buffer })
        const doc = await loadingTask.promise

        const baseName = file.name.replace(/\.pdf$/i, '')
        const out: File[] = []

        try {
            for (let i = 1; i <= doc.numPages; i++) {
                onProgress?.({ fileName: file.name, pageIndex: i, pageCount: doc.numPages })

                const page = await doc.getPage(i)
                const viewport = page.getViewport({ scale: RENDER_SCALE })

                const canvas = document.createElement('canvas')
                canvas.width = Math.ceil(viewport.width)
                canvas.height = Math.ceil(viewport.height)
                const ctx = canvas.getContext('2d')
                if (!ctx) { page.cleanup(); continue }

                // Renders show up on a transparent PDF background as black
                // otherwise — fill white first, same as opening the PDF in
                // any normal viewer.
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                await page.render({ canvas, viewport }).promise
                page.cleanup()

                const blob: Blob | null = await new Promise(resolve =>
                    canvas.toBlob(resolve, 'image/png')
                )
                if (!blob) continue

                const pageName = doc.numPages > 1
                    ? `${baseName} — page ${i} of ${doc.numPages}.png`
                    : `${baseName}.png`

                out.push(new File([blob], pageName, {
                    type: 'image/png',
                    lastModified: file.lastModified,
                }))
            }
        } finally {
            await loadingTask.destroy()
        }

        return out
    }

    /**
     * Expands every PDF in a file list into rendered image files in place,
     * leaving non-PDF files untouched — the returned files array is safe to
     * feed straight into the normal image import path. A PDF that fails to
     * read (corrupted, password-protected) is reported in `errors` rather
     * than aborting the rest of the batch.
     */
    async expandAll(
        files: File[],
        onProgress?: (p: PdfExpandProgress) => void
    ): Promise<{ files: File[]; errors: Array<{ filename: string; reason: string }> }> {
        const out: File[] = []
        const errors: Array<{ filename: string; reason: string }> = []
        for (const file of files) {
            if (file.type === 'application/pdf') {
                try {
                    out.push(...await this.expandToImageFiles(file, onProgress))
                } catch (err) {
                    console.error('[PdfImportService] Failed to expand PDF:', file.name, err)
                    errors.push({
                        filename: file.name,
                        reason: 'Could not read this PDF — it may be corrupted or password-protected',
                    })
                }
            } else {
                out.push(file)
            }
        }
        return { files: out, errors }
    }
}

export const pdfImportService = new PdfImportService()