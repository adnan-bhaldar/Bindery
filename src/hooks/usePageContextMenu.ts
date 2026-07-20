import { createElement, useCallback } from 'react'
import { RotateCw, RotateCcw, Copy, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useContextMenu, type ContextMenuItem } from '@/components/common/ContextMenu'
import { usePagesStore } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { importService } from '@/services/importService'
import type { Page } from '@/types'

/**
 * Builds and opens the right-click context menu for a page thumbnail —
 * shared by both PageThumbnail (list) and PageThumbnailGrid so the two
 * views don't duplicate this logic (or drift out of sync with each other).
 *
 * Plain .ts, not .tsx — this file uses createElement() instead of JSX for
 * the menu icons so it can stay a pure TypeScript file (.tsx requires the
 * JSX parser and was causing styling to break on import elsewhere).
 */
export function usePageContextMenu() {
    const { open } = useContextMenu()
    const { removePage, rotatePage, duplicatePage, setThumbnail } = usePagesStore()
    const { settings } = useSettingsStore()

    const handleRegenerateThumbnail = useCallback(async (page: Page) => {
        toast.promise(
            importService.regenerateThumbnail(page, settings.thumbnailSize).then(result => {
                if (!result) throw new Error('Regeneration failed')
                setThumbnail(page.id, result.blob, result.url)
            }),
            {
                loading: 'Regenerating thumbnail…',
                success: 'Thumbnail regenerated',
                error: 'Could not regenerate thumbnail',
            }
        )
    }, [settings.thumbnailSize, setThumbnail])

    const openPageContextMenu = useCallback((e: React.MouseEvent, page: Page) => {
        e.preventDefault()
        e.stopPropagation()

        const items: ContextMenuItem[] = [
            {
                id: 'rotate-cw',
                label: 'Rotate Right 90°',
                icon: createElement(RotateCw, { size: 14 }),
                action: () => rotatePage(page.id, ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270),
            },
            {
                id: 'rotate-ccw',
                label: 'Rotate Left 90°',
                icon: createElement(RotateCcw, { size: 14 }),
                action: () => rotatePage(page.id, ((page.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270),
            },
            {
                id: 'duplicate',
                label: 'Duplicate',
                icon: createElement(Copy, { size: 14 }),
                action: () => duplicatePage(page.id),
            },
            { id: 'sep-1', label: '', separator: true },
            {
                id: 'regenerate-thumbnail',
                label: 'Regenerate Thumbnail',
                icon: createElement(RefreshCw, { size: 14 }),
                action: () => handleRegenerateThumbnail(page),
            },
            { id: 'sep-2', label: '', separator: true },
            {
                id: 'delete',
                label: 'Delete',
                icon: createElement(Trash2, { size: 14 }),
                danger: true,
                action: () => removePage(page.id),
            },
        ]

        open(e.clientX, e.clientY, items)
    }, [open, rotatePage, duplicatePage, removePage, handleRegenerateThumbnail])

    return { openPageContextMenu }
}