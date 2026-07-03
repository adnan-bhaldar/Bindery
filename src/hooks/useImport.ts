import { useCallback, useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { importService, type ImportProgress } from '@/services/importService'
import { usePagesStore } from '@/stores/pagesStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useHistoryStore } from '@/stores/historyStore'
import { generateId } from '@/lib/utils'

export interface UseImportReturn {
    isImporting: boolean
    progress: ImportProgress | null
    importFiles: (files: File[]) => Promise<void>
    importFromPicker: () => Promise<void>
    importFromClipboard: () => Promise<void>
}

export function useImport(): UseImportReturn {
    const [isImporting, setIsImporting] = useState(false)
    const [progress, setProgress] = useState<ImportProgress | null>(null)

    const { addPages, setThumbnail } = usePagesStore(
        useShallow(s => ({ addPages: s.addPages, setThumbnail: s.setThumbnail }))
    )
    const { setDirty } = useProjectStore(
        useShallow(s => ({ setDirty: s.setDirty }))
    )
    const { settings } = useSettingsStore()
    const pushHistory = useHistoryStore(s => s.push)

    // Subscribe to background hi-res thumbnail updates
    useEffect(() => {
        const unsub = importService.onThumbnailReady((pageId, url, blob) => {
            setThumbnail(pageId, blob, url)
        })
        return unsub
    }, [setThumbnail])

    const ensureProject = useCallback(() => {
        const { currentProject, setCurrentProject: set } = useProjectStore.getState()
        if (currentProject) return currentProject.id
        const id = generateId()
        set({
            id,
            name: 'Untitled Project',
            status: 'new' as const,
            pageCount: 0,
            metadata: {
                title: '', author: '', subject: '', keywords: '',
                creator: 'Bindery', producer: 'Bindery PDF Engine', copyright: '',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastOpenedAt: Date.now(),
        })
        return id
    }, [])

    const importFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return

        setIsImporting(true)
        setProgress({ phase: 'validating', current: 0, total: files.length, currentFile: '' })

        try {
            const projectId = ensureProject()
            const existingPages = usePagesStore.getState().pages

            const result = await importService.importFiles(
                files,
                projectId,
                existingPages.length,
                (p) => {
                    setProgress(p)
                    if (p.phase === 'done') {
                        setIsImporting(false)
                        setProgress(null)
                    }
                },
                settings.detectDuplicates,
                settings.thumbnailSize,
            )

            if (result.imported.length > 0) {
                const before = usePagesStore.getState().pages
                addPages(result.imported)
                setDirty(true)
                const after = usePagesStore.getState().pages
                pushHistory(
                    'add-pages',
                    `Added ${result.imported.length} image${result.imported.length !== 1 ? 's' : ''}`,
                    before,
                    after
                )

                const count = result.imported.length
                toast.success(
                    `${count} image${count !== 1 ? 's' : ''} imported`,
                    {
                        description: count === 1
                            ? result.imported[0].metadata.filename
                            : `${count} pages added`,
                    }
                )

                // Auto-run OCR if enabled in settings
                if (settings.ocrEnabled && settings.autoRunOcr) {
                    toast.info('Running OCR…', { description: 'Text extraction started in background', duration: 2000 })
                }
            }

            if (result.duplicates.length > 0) {
                toast.warning(`${result.duplicates.length} duplicate${result.duplicates.length !== 1 ? 's' : ''} skipped`)
            }

            if (result.errors.length > 0) {
                toast.error(`${result.errors.length} file${result.errors.length !== 1 ? 's' : ''} failed`, {
                    description: result.errors[0].reason,
                })
            }

        } catch (err) {
            toast.error('Import failed', {
                description: err instanceof Error ? err.message : 'Unknown error',
            })
        } finally {
            setIsImporting(false)
            setProgress(null)
        }
    }, [ensureProject, addPages, setDirty, pushHistory, settings])

    const importFromPicker = useCallback(async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/heif'
        input.onchange = async () => {
            const files = Array.from(input.files ?? [])
            if (files.length > 0) await importFiles(files)
        }
        input.click()
    }, [importFiles])

    const importFromClipboard = useCallback(async () => {
        try {
            const items = await navigator.clipboard.read()
            const imageFiles: File[] = []
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type)
                        const ext = type.split('/')[1] ?? 'png'
                        imageFiles.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type }))
                    }
                }
            }
            if (imageFiles.length === 0) {
                toast.info('No images found in clipboard')
                return
            }
            await importFiles(imageFiles)
        } catch {
            toast.error('Clipboard access denied')
        }
    }, [importFiles])

    return { isImporting, progress, importFiles, importFromPicker, importFromClipboard }
}
