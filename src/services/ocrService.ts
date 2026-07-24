import Tesseract from 'tesseract.js'
import type { Worker as TesseractWorker } from 'tesseract.js'

export interface OCRRequest {
    id: string
    pageId: string
    blob: Blob
    language: string
}

export interface OCRResponse {
    id: string
    pageId: string
    text: string
    confidence: number
    language: string
}

export interface OCRJobProgress {
    pageId: string
    progress: number
    status: string
}

export type OCRProgressCallback = (p: OCRJobProgress) => void
export type OCRCompleteCallback = (r: OCRResponse) => void

interface PendingJob {
    req: OCRRequest
    onProgress?: OCRProgressCallback
    onComplete: OCRCompleteCallback
    onError: (e: Error) => void
}

// Tesseract.js's createWorker() already spins up its own dedicated Web Worker
// internally to run the wasm engine off the main thread — it IS the worker.
// The previous version of this service wrapped that inside a second, custom
// Worker (src/workers/ocr.worker.ts), so every OCR job ran inside a worker
// nested inside another worker. That extra layer bought nothing (Tesseract
// was already off-main-thread), added real overhead, and made the whole
// thing fragile — module-worker path resolution and environment detection
// inside a Vite-bundled nested worker is exactly the kind of thing that
// causes slow, sometimes-failing behavior instead of a clean error. Calling
// Tesseract directly from here removes that nesting entirely.
class OCRService {
    private slots: (TesseractWorker | null)[] = []
    private slotLang: (string | null)[] = []
    private busy = new Set<number>()
    private queue: PendingJob[] = []
    private pending = new Map<string, PendingJob>() // job id → job
    private runningOn = new Map<number, string>() // slot index → job id currently running on it
    private readonly POOL_SIZE = 2 // OCR is heavy — limit concurrency

    constructor() {
        this.slots = new Array(this.POOL_SIZE).fill(null)
        this.slotLang = new Array(this.POOL_SIZE).fill(null)
    }

    private async ensureWorker(i: number, lang: string): Promise<TesseractWorker> {
        if (this.slots[i] && this.slotLang[i] === lang) return this.slots[i]!

        if (this.slots[i]) {
            await this.slots[i]!.terminate().catch(() => { })
            this.slots[i] = null
        }

        const worker = await Tesseract.createWorker(lang, 1, {
            logger: (m: { status: string; progress: number }) => {
                const jobId = this.runningOn.get(i)
                const job = jobId ? this.pending.get(jobId) : undefined
                job?.onProgress?.({ pageId: job.req.pageId, progress: m.progress, status: m.status })
            },
        })

        this.slots[i] = worker
        this.slotLang[i] = lang
        return worker
    }

    private processQueue() {
        if (this.queue.length === 0) return

        for (let i = 0; i < this.POOL_SIZE; i++) {
            if (!this.busy.has(i) && this.queue.length > 0) {
                const job = this.queue.shift()!
                this.busy.add(i)
                this.runningOn.set(i, job.req.id)
                this.pending.set(job.req.id, job)
                void this.runJob(i, job)
                if (this.queue.length === 0) break
            }
        }
    }

    private async runJob(i: number, job: PendingJob) {
        const lang = job.req.language === 'auto' ? 'eng' : job.req.language
        let url: string | null = null
        try {
            const worker = await this.ensureWorker(i, lang)
            url = URL.createObjectURL(job.req.blob)
            const result = await worker.recognize(url)
            job.onComplete({
                id: job.req.id,
                pageId: job.req.pageId,
                text: result.data.text,
                confidence: result.data.confidence,
                language: lang,
            })
        } catch (err) {
            // A failure here is most often the language/core data fetch
            // itself (blocked or unreachable CDN) rather than recognition —
            // surface that distinction so it doesn't just read as generic
            // "OCR failed" every time.
            const message = err instanceof Error ? err.message : String(err)
            const friendly = /fetch|network|load/i.test(message)
                ? 'Could not download OCR language data — check your network connection'
                : message
            job.onError(new Error(friendly))
            // The worker for this slot may be in a bad state after a failed
            // load — drop it so the next job gets a fresh one instead of
            // repeating the same failure silently.
            if (this.slots[i]) {
                this.slots[i]!.terminate().catch(() => { })
                this.slots[i] = null
                this.slotLang[i] = null
            }
        } finally {
            if (url) URL.revokeObjectURL(url)
            this.pending.delete(job.req.id)
            this.runningOn.delete(i)
            this.busy.delete(i)
            this.processQueue()
        }
    }

    recognize(req: OCRRequest, onProgress?: OCRProgressCallback): Promise<OCRResponse> {
        return new Promise((resolve, reject) => {
            let settled = false
            // First-run language/core downloads can be tens of MB — give
            // this real headroom before treating it as hung, rather than
            // failing fast on a slow-but-working connection.
            const timeoutId = setTimeout(() => {
                if (settled) return
                settled = true
                this.pending.delete(req.id)
                for (const [idx, jobId] of this.runningOn) {
                    if (jobId === req.id) {
                        this.runningOn.delete(idx)
                        this.busy.delete(idx)
                        if (this.slots[idx]) {
                            this.slots[idx]!.terminate().catch(() => { })
                            this.slots[idx] = null
                            this.slotLang[idx] = null
                        }
                        this.processQueue()
                    }
                }
                reject(new Error('OCR timed out'))
            }, 120_000)

            const job: PendingJob = {
                req,
                onProgress,
                onComplete: (r) => {
                    if (settled) return
                    settled = true
                    clearTimeout(timeoutId)
                    resolve(r)
                },
                onError: (e) => {
                    if (settled) return
                    settled = true
                    clearTimeout(timeoutId)
                    reject(e)
                },
            }
            this.queue.push(job)
            this.processQueue()
        })
    }

    cancelAll() {
        this.queue.length = 0
        this.pending.clear()
        this.runningOn.clear()
    }

    terminate() {
        this.slots.forEach(w => w?.terminate().catch(() => { }))
        this.slots = new Array(this.POOL_SIZE).fill(null)
        this.slotLang = new Array(this.POOL_SIZE).fill(null)
    }
}

export const ocrService = new OCRService()