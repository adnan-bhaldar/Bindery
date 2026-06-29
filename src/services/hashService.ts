import type { HashRequest, HashResponse } from '@/workers/hash.worker'

class HashService {
    private worker: Worker
    private pending = new Map<string, {
        resolve: (hash: string) => void
        reject: (e: Error) => void
    }>()

    constructor() {
        this.worker = new Worker(
            new URL('../workers/hash.worker.ts', import.meta.url),
            { type: 'module' }
        )
        this.worker.onmessage = (e: MessageEvent<HashResponse>) => {
            const cb = this.pending.get(e.data.id)
            if (!cb) return
            this.pending.delete(e.data.id)
            if (e.data.error) cb.reject(new Error(e.data.error))
            else cb.resolve(e.data.hash)
        }
    }

    hash(id: string, blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject })
            const req: HashRequest = { id, blob }
            this.worker.postMessage(req)
        })
    }

    terminate() {
        this.worker.terminate()
    }
}

export const hashService = new HashService()
