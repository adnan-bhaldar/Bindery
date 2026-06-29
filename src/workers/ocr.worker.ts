import Tesseract from 'tesseract.js'

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
    error?: string
}

export interface OCRProgressResponse {
    id: string
    pageId: string
    progress: number
    status: string
}

// Tesseract worker instance — reused across requests
let tesseractWorker: Tesseract.Worker | null = null
let currentLanguage = ''

async function getWorker(lang: string): Promise<Tesseract.Worker> {
    if (tesseractWorker && currentLanguage === lang) return tesseractWorker

    if (tesseractWorker) {
        await tesseractWorker.terminate()
        tesseractWorker = null
    }

    const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
            // Post progress back — will be picked up by the main thread listener
            self.postMessage({
                type: 'progress',
                status: m.status,
                progress: m.progress,
            })
        },
    })

    tesseractWorker = worker
    currentLanguage = lang
    return worker
}

self.onmessage = async (e: MessageEvent<OCRRequest>) => {
    const { id, pageId, blob, language } = e.data

    try {
        const lang = language === 'auto' ? 'eng' : language
        const worker = await getWorker(lang)

        const url = URL.createObjectURL(blob)
        const result = await worker.recognize(url)
        URL.revokeObjectURL(url)

        const response: OCRResponse = {
            id,
            pageId,
            text: result.data.text,
            confidence: result.data.confidence,
            language: lang,
        }
        self.postMessage({ type: 'result', ...response })
    } catch (err) {
        const response: OCRResponse = {
            id,
            pageId,
            text: '',
            confidence: 0,
            language,
            error: err instanceof Error ? err.message : 'OCR failed',
        }
        self.postMessage({ type: 'result', ...response })
    }
}