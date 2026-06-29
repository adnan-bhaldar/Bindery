import { useState, useCallback } from 'react'
import { usePagesStore } from '@/stores/pagesStore'
import { useUIStore } from '@/stores/uiStore'
import { clamp } from '@/lib/utils'
import type { Page } from '@/types'

export type PreviewView = 'single' | 'continuous' | 'grid'

export interface PreviewState {
    currentPageIndex: number
    view: PreviewView
    zoom: number
    isFullscreen: boolean
    imageUrls: Map<string, string>
}

export function usePreview() {
    const pages = usePagesStore((s) => s.pages)
    const { zoom, setZoom, zoomIn, zoomOut, resetZoom } = useUIStore()

    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const [view, setView] = useState<PreviewView>('single')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())

    const currentPage = pages[currentPageIndex] ?? null

    const goTo = useCallback((index: number) => {
        setCurrentPageIndex(clamp(index, 0, pages.length - 1))
    }, [pages.length])

    const goNext = useCallback(() => goTo(currentPageIndex + 1), [currentPageIndex, goTo])
    const goPrev = useCallback(() => goTo(currentPageIndex - 1), [currentPageIndex, goTo])
    const goFirst = useCallback(() => goTo(0), [goTo])
    const goLast = useCallback(() => goTo(pages.length - 1), [pages.length, goTo])

    // Ensure image URL is available for a page (create from blob if needed)
    const ensureImageUrl = useCallback(async (page: Page): Promise<string> => {
        if (imageUrls.has(page.id)) return imageUrls.get(page.id)!
        if (page.imageUrl) return page.imageUrl

        const url = URL.createObjectURL(page.imageBlob)
        setImageUrls(prev => new Map(prev).set(page.id, url))
        return url
    }, [imageUrls])

    const handleWheelZoom = useCallback((e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(clamp(zoom + delta, 0.1, 8))
    }, [zoom, setZoom])

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(() => { })
            setIsFullscreen(true)
        } else {
            await document.exitFullscreen().catch(() => { })
            setIsFullscreen(false)
        }
    }, [])

    return {
        pages,
        currentPage,
        currentPageIndex,
        view,
        zoom,
        isFullscreen,
        imageUrls,
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
        ensureImageUrl,
        handleWheelZoom,
        toggleFullscreen,
        canGoNext: currentPageIndex < pages.length - 1,
        canGoPrev: currentPageIndex > 0,
    }
}
