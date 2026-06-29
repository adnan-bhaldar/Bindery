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
                    this.busy.delete(i)
                    this.processQueue()
                }
            }

            worker.onerror = () => {
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
                this.pending.set(job.req.id, job)
                this.workers[i].postMessage(job.req)
                if (this.queue.length === 0) break
            }
        }
    }

    recognize(req: OCRRequest, onProgress?: OCRProgressCallback): Promise<OCRResponse> {
        return new Promise((resolve, reject) => {
            const job: PendingJob = {
                req,
                onProgress,
                onComplete: resolve,
                onError: reject,
            }
            this.queue.push(job)
            this.processQueue()
        })
    }

    cancelAll() {
        this.queue.length = 0
        this.pending.clear()
    }

    terminate() {
        this.workers.forEach(w => w.terminate())
        this.workers = []
    }
}

export const ocrService = new OCRService()