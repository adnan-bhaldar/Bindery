import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { usePagesStore } from '@/stores/pagesStore'
import { useUIStore } from '@/stores/uiStore'
import { clamp } from '@/lib/utils'

export type PreviewView = 'single' | 'continuous' | 'grid'

export function usePreview() {
    const pages = usePagesStore(s => s.pages)

    // Numbers and functions — all primitive or stable refs
    const zoom = useUIStore(s => s.zoom)
    const currentPreviewIndex = useUIStore(s => s.currentPreviewIndex)
    const view = useUIStore(s => s.workspaceView) as PreviewView
    const isFullscreen = useUIStore(s => s.isFullscreen)

    // Actions — stable refs, safe to group
    const { setZoom, zoomIn, zoomOut, resetZoom, setCurrentPreviewIndex, setWorkspaceView, setFullscreen } =
        useUIStore(useShallow(s => ({
            setZoom: s.setZoom,
            zoomIn: s.zoomIn,
            zoomOut: s.zoomOut,
            resetZoom: s.resetZoom,
            setCurrentPreviewIndex: s.setCurrentPreviewIndex,
            setWorkspaceView: s.setWorkspaceView,
            setFullscreen: s.setFullscreen,
        })))

    const safeIndex = clamp(currentPreviewIndex, 0, Math.max(0, pages.length - 1))
    const currentPage = pages[safeIndex] ?? null

    const goTo = useCallback((index: number) => {
        setCurrentPreviewIndex(clamp(index, 0, pages.length - 1))
    }, [pages.length, setCurrentPreviewIndex])

    const goNext = useCallback(() => goTo(safeIndex + 1), [safeIndex, goTo])
    const goPrev = useCallback(() => goTo(safeIndex - 1), [safeIndex, goTo])
    const goFirst = useCallback(() => goTo(0), [goTo])
    const goLast = useCallback(() => goTo(pages.length - 1), [pages.length, goTo])

    const setView = useCallback((v: PreviewView) => {
        setWorkspaceView(v as 'single' | 'continuous' | 'grid')
    }, [setWorkspaceView])

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(() => { })
            setFullscreen(true)
        } else {
            await document.exitFullscreen().catch(() => { })
            setFullscreen(false)
        }
    }, [setFullscreen])

    return {
        pages,
        currentPage,
        currentPageIndex: safeIndex,
        view,
        zoom,
        isFullscreen,
        goTo,
        goNext,
        goPrev,
        goFirst,
        goLast,
        setView,
        zoomIn,
        zoomOut,
        resetZoom,
        setZoom,
        toggleFullscreen,
        canGoNext: safeIndex < pages.length - 1,
        canGoPrev: safeIndex > 0,
    }
}
