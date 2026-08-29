// Hash worker — computes SHA-256 of image blobs for duplicate detection

export interface HashRequest {
    id: string
    blob: Blob
}

export interface HashResponse {
    id: string
    hash: string
    error?: string
}

self.onmessage = async (e: MessageEvent<HashRequest>) => {
    const { id, blob } = e.data
    try {
        const buffer = await blob.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        const response: HashResponse = { id, hash }
        self.postMessage(response)
    } catch (err) {
        const response: HashResponse = {
            id, hash: '',
            error: err instanceof Error ? err.message : 'Hash failed',
        }
        self.postMessage(response)
    }
}
