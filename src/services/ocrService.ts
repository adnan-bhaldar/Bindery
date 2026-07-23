import type { OCRRequest, OCRResponse } from '@/workers/ocr.worker'

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

class OCRService {
    private workers: Worker[] = []
    private busy = new Set<number>()
    private queue: PendingJob[] = []
    private pending = new Map<string, PendingJob>() // id → job
    private runningOn = new Map<number, string>() // worker index → job id currently running on it
    private readonly POOL_SIZE = 2 // OCR is heavy — limit concurrency

    constructor() {
        this.initPool()
    }

    private initPool() {
        for (let i = 0; i < this.POOL_SIZE; i++) {
            const worker = new Worker(
                new URL('../workers/ocr.worker.ts', import.meta.url),
                { type: 'module' }
            )

            worker.onmessage = (e: MessageEvent) => {
                const data = e.data

                if (data.type === 'progress') {
                    // Find which job this worker is running
                    for (const [, job] of this.pending) {
                        job.onProgress?.({
                            pageId: job.req.pageId,
                            progress: data.progress,
                            status: data.status,
                        })
                    }
                    return
                }

                if (data.type === 'result') {
                    const job = this.pending.get(data.id)
                    if (job) {
                        this.pending.delete(data.id)
                        if (data.error) {
                            job.onError(new Error(data.error))
                        } else {
                            job.onComplete(data as OCRResponse)
                        }
                    }
                    this.runningOn.delete(i)
                    this.busy.delete(i)
                    this.processQueue()
                }
            }

            worker.onerror = () => {
                // The worker crashed outright (e.g. failed to load its wasm/
                // trained-data, often from a blocked or unreachable CDN) —
                // no 'result' message will ever arrive for whatever job it
                // was running, so without this it hangs forever on "Running
                // OCR...". Fail that specific job and recycle the slot.
                const jobId = this.runningOn.get(i)
                if (jobId) {
                    const job = this.pending.get(jobId)
                    if (job) {
                        this.pending.delete(jobId)
                        job.onError(new Error('OCR worker failed to load or crashed'))
                    }
                    this.runningOn.delete(i)
                }
                this.busy.delete(i)
                this.processQueue()
            }

            this.workers.push(worker)
        }
    }

    private processQueue() {
        if (this.queue.length === 0) return

        for (let i = 0; i < this.POOL_SIZE; i++) {
            if (!this.busy.has(i) && this.queue.length > 0) {
                const job = this.queue.shift()!
                this.busy.add(i)
                this.runningOn.set(i, job.req.id)
                this.pending.set(job.req.id, job)
                this.workers[i].postMessage(job.req)
                if (this.queue.length === 0) break
            }
        }
    }

    private replaceWorker(i: number) {
        this.workers[i].terminate()
        const worker = new Worker(
            new URL('../workers/ocr.worker.ts', import.meta.url),
            { type: 'module' }
        )
        worker.onmessage = this.workers[i].onmessage
        worker.onerror = this.workers[i].onerror
        this.workers[i] = worker
    }

    recognize(req: OCRRequest, onProgress?: OCRProgressCallback): Promise<OCRResponse> {
        return new Promise((resolve, reject) => {
            let settled = false
            const timeoutId = setTimeout(() => {
                if (settled) return
                settled = true
                this.pending.delete(req.id)
                for (const [idx, jobId] of this.runningOn) {
                    if (jobId === req.id) {
                        this.runningOn.delete(idx)
                        this.busy.delete(idx)
                        this.replaceWorker(idx) // it's silently wedged — don't reuse it as-is
                        this.processQueue()
                    }
                }
                reject(new Error('OCR timed out'))
            }, 45_000)

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
        this.workers.forEach(w => w.terminate())
        this.workers = []
    }
}

export const ocrService = new OCRService()