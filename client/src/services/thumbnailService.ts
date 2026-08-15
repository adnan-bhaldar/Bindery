import type { ThumbnailRequest, ThumbnailResponse } from '@/workers/thumbnail.worker'

// ─── Worker pool ──────────────────────────────────────────────────────────────

class ThumbnailService {
    private workers: Worker[] = []
    private queue: Array<{
        req: ThumbnailRequest
        resolve: (r: ThumbnailResponse) => void
        reject: (e: Error) => void
    }> = []
    // Tracks requests currently dispatched to a worker, awaiting a response —
    // keyed by request id.
    //
    // BUG (fixed): the previous version tracked in-flight requests by simply
    // leaving them in `this.queue` until a response came back. But
    // processQueue() actually calls `this.queue.shift()` the moment a
    // request is dispatched to a worker — BEFORE that worker has responded
    // — so the request was already gone from `queue` by the time
    // handleResponse() went looking for it there. That lookup could never
    // succeed, so resolve/reject were never called for ANY request, ever —
    // every generate() call hung forever regardless of whether the worker
    // actually succeeded or failed. This separate map is populated at
    // dispatch time and is what handleResponse() actually consults.
    private inFlight = new Map<string, {
        resolve: (r: ThumbnailResponse) => void
        reject: (e: Error) => void
    }>()
    // Which request id each worker index is currently processing — lets a
    // fatal worker.onerror (the worker crashing entirely, not a caught
    // in-generation error) reject the correct dangling promise instead of
    // just freeing the slot and leaving that promise hanging too.
    private workerAssignment = new Map<number, string>()
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
                const reqId = this.workerAssignment.get(i)
                if (reqId) {
                    const pending = this.inFlight.get(reqId)
                    if (pending) {
                        this.inFlight.delete(reqId)
                        pending.reject(new Error(e.message || 'Thumbnail worker crashed'))
                    }
                    this.workerAssignment.delete(i)
                }
                this.busy.delete(i)
                this.processQueue()
            }
            this.workers.push(worker)
        }
    }

    private handleResponse(workerIdx: number, response: ThumbnailResponse) {
        const pending = this.inFlight.get(response.id)
        if (pending) {
            this.inFlight.delete(response.id)
            if (response.error) {
                pending.reject(new Error(response.error))
            } else {
                pending.resolve(response)
            }
        }
        this.workerAssignment.delete(workerIdx)
        this.busy.delete(workerIdx)
        this.processQueue()
    }

    private processQueue() {
        if (this.queue.length === 0) return

        // Find idle worker
        for (let i = 0; i < this.POOL_SIZE; i++) {
            if (!this.busy.has(i) && this.queue.length > 0) {
                const item = this.queue.shift()! // now genuinely in-flight
                this.busy.add(i)
                this.workerAssignment.set(i, item.req.id)
                this.inFlight.set(item.req.id, { resolve: item.resolve, reject: item.reject })
                this.workers[i].postMessage(item.req)
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
        this.inFlight.clear()
        this.workerAssignment.clear()
        this.busy.clear()
        this.queue = []
    }
}

// Singleton
export const thumbnailService = new ThumbnailService()