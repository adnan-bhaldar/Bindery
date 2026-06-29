import type { ThumbnailRequest, ThumbnailResponse } from '@/workers/thumbnail.worker'

// ─── Worker pool ──────────────────────────────────────────────────────────────

class ThumbnailService {
    private workers: Worker[] = []
    private queue: Array<{
        req: ThumbnailRequest
        resolve: (r: ThumbnailResponse) => void
        reject: (e: Error) => void
    }> = []
    private busy = new Set<number>()
    private readonly POOL_SIZE = 4

    constructor() {
        this.initPool()
    }

    private initPool() {
        for (let i = 0; i < this.POOL_SIZE; i++) {
            const worker = new Worker(
                new URL('../workers/thumbnail.worker.ts', import.meta.url),
                { type: 'module' }
            )
            worker.onmessage = (e: MessageEvent<ThumbnailResponse>) => {
                this.handleResponse(i, e.data)
            }
            worker.onerror = (e) => {
                console.error(`[ThumbnailWorker ${i}] error:`, e)
                this.busy.delete(i)
                this.processQueue()
            }
            this.workers.push(worker)
        }
    }

    private handleResponse(workerIdx: number, response: ThumbnailResponse) {
        // Find the pending promise for this response
        const idx = this.queue.findIndex(q => q.req.id === response.id)
        if (idx !== -1) {
            const { resolve, reject } = this.queue[idx]
            this.queue.splice(idx, 1)
            if (response.error) {
                reject(new Error(response.error))
            } else {
                resolve(response)
            }
        }
        this.busy.delete(workerIdx)
        this.processQueue()
    }

    private processQueue() {
        if (this.queue.length === 0) return

        // Find idle worker
        for (let i = 0; i < this.POOL_SIZE; i++) {
            if (!this.busy.has(i) && this.queue.length > 0) {
                const item = this.queue[0] // peek — don't shift yet
                // Mark worker busy before dispatching
                this.busy.add(i)
                this.workers[i].postMessage(item.req)
                // Remove from queue (it's now in-flight)
                this.queue.shift()
                if (this.queue.length === 0) break
            }
        }
    }

    generate(req: ThumbnailRequest): Promise<ThumbnailResponse> {
        return new Promise((resolve, reject) => {
            this.queue.push({ req, resolve, reject })
            this.processQueue()
        })
    }

    terminate() {
        this.workers.forEach(w => w.terminate())
        this.workers = []
    }
}

// Singleton
export const thumbnailService = new ThumbnailService()
