import { useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { importService, type ImportProgress } from '@/services/importService'
import { usePagesStore } from '@/stores/pagesStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useHistoryStore } from '@/stores/historyStore'
import { generateId } from '@/lib/utils'
import type { Page } from '@/types'

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

    const { pages, addPages, setThumbnail } = usePagesStore()
    const { currentProject, setCurrentProject, setDirty } = useProjectStore()
    const { settings } = useSettingsStore()
    const { push: pushHistory } = useHistoryStore()

    // Subscribe to background thumbnail updates
    useEffect(() => {
        const unsub = importService.onThumbnailReady((pageId, url, blob) => {
            setThumbnail(pageId, blob, url)
        })
        return unsub
    }, [setThumbnail])

    const ensureProject = useCallback(() => {
        if (currentProject) return currentProject.id
        const id = generateId()
        const newProject = {
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
        }
        setCurrentProject(newProject)
        return id
    }, [currentProject, setCurrentProject])

    const importFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return

        setIsImporting(true)
        setProgress({ phase: 'validating', current: 0, total: files.length, currentFile: '' })

        try {
            const projectId = ensureProject()

            const result = await importService.importFiles(
                files,
                projectId,
                pages.length,
                (p) => {
                    setProgress(p)
                    // As soon as we hit 'done', push pages to store immediately
                    // so sidebar shows them before background thumbnails finish
                    if (p.phase === 'done') {
                        setIsImporting(false)
                        setProgress(null)
                    }
                },
                settings.detectDuplicates,
                settings.thumbnailSize,
            )

            if (result.imported.length > 0) {
                const before = pages.map(p => p.id)
                addPages(result.imported)
                setDirty(true)
                pushHistory(
                    'add-pages',
                    `Added ${result.imported.length} image${result.imported.length !== 1 ? 's' : ''}`,
                    before,
                    [...before, ...result.imported.map(p => p.id)]
                )

                toast.success(
                    `${result.imported.length} image${result.imported.length !== 1 ? 's' : ''} imported`,
                    {
                        description: result.imported.length === 1
                            ? result.imported[0].metadata.filename
                            : `${result.imported.length} pages added to your project`,
                    }
                )
            }

            if (result.duplicates.length > 0) {
                toast.warning(
                    `${result.duplicates.length} duplicate${result.duplicates.length !== 1 ? 's' : ''} skipped`,
                    { description: result.duplicates.slice(0, 3).join(', ') }
                )
            }

            if (result.errors.length > 0) {
                toast.error(
                    `${result.errors.length} file${result.errors.length !== 1 ? 's' : ''} failed`,
                    { description: result.errors[0].reason }
                )
            }

        } catch (err) {
            toast.error('Import failed', {
                description: err instanceof Error ? err.message : 'Unknown error',
            })
        } finally {
            setIsImporting(false)
            setProgress(null)
        }
    }, [ensureProject, pages, addPages, setDirty, pushHistory, settings])

    const importFromPicker = useCallback(async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = Object.values({
            jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
            gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
            heic: 'image/heic', heif: 'image/heif',
        }).join(',')
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