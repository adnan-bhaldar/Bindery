import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ocrService } from '@/services/ocrService'
import { usePagesStore } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { generateId } from '@/lib/utils'
import type { Page } from '@/types'

export interface OCRProgress {
    isRunning: boolean
    current: number
    total: number
    currentPageId: string | null
    pageProgress: number
    status: string
    completedIds: Set<string>
    errorIds: Set<string>
}

const INITIAL: OCRProgress = {
    isRunning: false,
    current: 0,
    total: 0,
    currentPageId: null,
    pageProgress: 0,
    status: '',
    completedIds: new Set(),
    errorIds: new Set(),
}

export function useOCR() {
    const [progress, setProgress] = useState<OCRProgress>(INITIAL)
    const { pages, updatePage } = usePagesStore()
    const { settings } = useSettingsStore()

    const runOCR = useCallback(async (targetPages?: Page[]) => {
        const toProcess = targetPages ?? pages.filter(p => p.ocrStatus !== 'done')

        if (toProcess.length === 0) {
            toast.info('All pages already have OCR text')
            return
        }

        // Respect page limit setting
        const limited = settings.skipOcrForLargeDocuments && toProcess.length > settings.ocrPageLimit
            ? toProcess.slice(0, settings.ocrPageLimit)
            : toProcess

        setProgress({ ...INITIAL, isRunning: true, total: limited.length })

        // Mark all as pending
        limited.forEach(p => updatePage(p.id, { ocrStatus: 'pending' }))

        let completed = 0
        const completedIds = new Set<string>()
        const errorIds = new Set<string>()

        // Process sequentially to avoid memory spikes — each OCR call is already worker-offloaded
        for (const page of limited) {
            updatePage(page.id, { ocrStatus: 'processing' })

            setProgress(prev => ({
                ...prev,
                current: completed,
                currentPageId: page.id,
                pageProgress: 0,
                status: 'Starting…',
                completedIds: new Set(completedIds),
                errorIds: new Set(errorIds),
            }))

            try {
                const result = await ocrService.recognize(
                    {
                        id: generateId(),
                        pageId: page.id,
                        blob: page.imageBlob,
                        language: settings.ocrLanguage,
                    },
                    ({ progress: pct, status }) => {
                        setProgress(prev => ({
                            ...prev,
                            pageProgress: Math.round(pct * 100),
                            status,
                        }))
                    }
                )

                updatePage(page.id, {
                    ocrText: result.text,
                    ocrStatus: 'done',
                })
                completedIds.add(page.id)
            } catch (err) {
                updatePage(page.id, { ocrStatus: 'error' })
                errorIds.add(page.id)
                console.error(`[OCR] Failed for page ${page.id}:`, err)
            }

            completed++
        }

        setProgress(prev => ({
            ...prev,
            isRunning: false,
            current: completed,
            currentPageId: null,
            completedIds: new Set(completedIds),
            errorIds: new Set(errorIds),
        }))

        const errors = errorIds.size
        const success = completedIds.size

        if (success > 0 && errors === 0) {
            toast.success(`OCR complete — ${success} page${success > 1 ? 's' : ''} processed`)
        } else if (success > 0 && errors > 0) {
            toast.warning(`OCR done — ${success} succeeded, ${errors} failed`)
        } else {
            toast.error('OCR failed for all pages')
        }

        if (limited.length < toProcess.length) {
            toast.info(`Processed first ${settings.ocrPageLimit} pages (limit in settings)`)
        }
    }, [pages, updatePage, settings])

    const runOCROnSelected = useCallback(async (selectedIds: string[]) => {
        const selected = pages.filter(p => selectedIds.includes(p.id))
        await runOCR(selected)
    }, [pages, runOCR])

    const cancelOCR = useCallback(() => {
        ocrService.cancelAll()
        pages.forEach(p => {
            if (p.ocrStatus === 'pending' || p.ocrStatus === 'processing') {
                updatePage(p.id, { ocrStatus: 'idle' })
            }
        })
        setProgress(INITIAL)
        toast.info('OCR cancelled')
    }, [pages, updatePage])

    return { progress, runOCR, runOCROnSelected, cancelOCR }
}
