import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    DndContext, closestCenter, PointerSensor, DragOverlay,
    useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePreview } from '@/hooks/usePreview'
import { useActivePreset } from '@/stores/exportStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePageContextMenu } from '@/hooks/usePageContextMenu'
import { resolvePageAspect } from '@/lib/pageLayout'
import { PreviewCanvas } from './PreviewCanvas'
import { PreviewToolbar } from './PreviewToolbar'
import { PageFramePreview } from './PageFramePreview'
import type { Page } from '@/types'

// ─── Grid view ────────────────────────────────────────────────────────────────
// Each cell's own aspect ratio is now computed from the SAME page-size/
// orientation/rotation logic PreviewCanvas uses (resolvePageAspect), instead
// of a fixed 3:4 box every card was squeezed into regardless of its actual
// page shape. PageFramePreview renders the page-size/margin/fit-aware
// content inside it, matching what Single view (and the real export) shows.
//
// Drag behavior mirrors the sidebar's approach (VirtualizedPageList): a
// DragOverlay renders the actual floating card that follows the cursor
// (measured from the real DOM element), while the original slot shows a
// dashed placeholder sized to its own aspect-ratio box. The sortable
// wrapper itself must be a plain div, not a motion.div — framer-motion
// takes ownership of `transform` on any element it animates x/y on, which
// silently overrides dnd-kit's own transform (both the settle animation
// and the live reorder-preview shift on sibling cards as you drag over
// them). `alignSelf: 'start'` also matters here: CSS Grid items stretch to
// fill their row by default, and without pinning this the dragged card's
// slot can balloon to fill the row/remaining space instead of keeping its
// normal card size.

const SortableGridCard = memo(({ page, index, isActive, aspect, onSelect, onContextMenu }: {
    page: Page
    index: number
    isActive: boolean
    aspect: { w: number; h: number }
    onSelect: () => void
    onContextMenu?: (e: React.MouseEvent) => void
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })

    // Only show the grab affordance once the pointer is actually pressed
    // down on the card — a plain hover just means "click to select", so
    // the default cursor stays until you attempt to grab it.
    const [isPressed, setIsPressed] = useState(false)

    return (
        <div
            ref={setNodeRef}
            data-page-id={page.id}
            style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                alignSelf: 'start', // grid items stretch to fill the row by default —
                // pin this so the card's own aspect-ratio box is
                // always what determines its height, drag or not
                cursor: isDragging ? 'grabbing' : isPressed ? 'grab' : 'default',
                // dnd-kit owns this element's transform for both the settle
                // animation and the live reorder-preview shift as you drag
                // over siblings — a motion.div animating its own x/y here
                // would silently fight it for control of the transform
                // property, which is why this stays a plain div.
                transform: CSS.Transform.toString(transform),
                transition: transition ?? undefined,
                touchAction: 'none',
            }}
            onClick={onSelect}
            onContextMenu={onContextMenu}
            {...attributes}
            {...listeners}
            onPointerDown={(e) => { setIsPressed(true); listeners?.onPointerDown?.(e) }}
            onPointerUp={() => setIsPressed(false)}
            onPointerLeave={() => setIsPressed(false)}
            onPointerCancel={() => setIsPressed(false)}
        >
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                style={{
                    aspectRatio: `${aspect.w} / ${aspect.h}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: 'var(--canvas-bg)',
                    boxShadow: isActive
                        ? '0 0 0 3px var(--accent-dim), var(--sh-md)'
                        : 'var(--sh-sm)',
                    transition: 'border-color 110ms, box-shadow 110ms',
                    position: 'relative',
                }}
            >
                {isDragging ? (
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: 8,
                        border: '1.5px dashed var(--accent-border)',
                        background: 'var(--accent-dim)',
                    }} />
                ) : (
                    <PageFramePreview page={page} loading="lazy" />
                )}
            </motion.div>
            <p style={{
                fontSize: 10.5, textAlign: 'center',
                color: isActive ? 'var(--accent)' : 'var(--tx-3)',
                fontFamily: 'var(--font-mono)', fontWeight: isActive ? 600 : 400,
            }}>
                {index + 1}
            </p>
        </div>
    )
})
SortableGridCard.displayName = 'SortableGridCard'

const GridView = memo(({ pages, currentIndex, onSelect }: {
    pages: Page[]
    currentIndex: number
    onSelect: (i: number) => void
}) => {
    const preset = useActivePreset()
    const { reorderPages } = usePagesStore()
    const { push: pushHistory } = useHistoryStore()
    const { settings } = useSettingsStore()
    const { openPageContextMenu } = usePageContextMenu()

    // One shared box shape for every card, independent of each page's own
    // rotation/dimensions — the grid is for quick browsing/reordering, not
    // a preview of each page's true shape (Single view and the actual PDF
    // export still use each page's real aspect via resolvePageAspect).
    // When pageSize is 'auto'/'original' there's no single sensible preset
    // aspect (it's inherently per-page by design), so fall back to a
    // standard A4-proportioned box, oriented per the preset's setting.
    const gridAspect =
        preset.pageSize === 'auto' || preset.pageSize === 'original'
            ? (preset.orientation === 'landscape' ? { w: 297, h: 210 } : { w: 210, h: 297 })
            : resolvePageAspect(preset.pageSize, preset.orientation, 210, 297, 0)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    )

    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null)
    const activePage = activeId ? pages.find(p => p.id === activeId) ?? null : null
    const activeIndex = activeId ? pages.findIndex(p => p.id === activeId) : -1

    // Pin the grabbing cursor for the whole page while dragging — without
    // this it flickers back to the default arrow whenever the pointer
    // crosses a gap between cards mid-drag.
    useEffect(() => {
        if (!activeId) return
        const prev = document.body.style.cursor
        document.body.style.cursor = 'grabbing'
        return () => { document.body.style.cursor = prev }
    }, [activeId])

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const id = String(event.active.id)
        setActiveId(id)
        const escapedId = window.CSS.escape(id)
        const el = document.querySelector(`[data-page-id="${escapedId}"]`) as HTMLElement | null
        if (el) {
            const rect = el.getBoundingClientRect()
            setActiveSize({ width: rect.width, height: rect.height })
        } else {
            const rect = event.active.rect.current.initial
            if (rect) setActiveSize({ width: rect.width, height: rect.height })
        }
    }, [])

    const handleDragCancel = useCallback(() => {
        setActiveId(null)
        setActiveSize(null)
    }, [])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveId(null)
        setActiveSize(null)
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = pages.findIndex(p => p.id === active.id)
        const newIdx = pages.findIndex(p => p.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return
        const before = pages
        reorderPages(oldIdx, newIdx)
        const after = usePagesStore.getState().pages
        pushHistory('reorder-pages', `Moved page ${oldIdx + 1} → ${newIdx + 1}`, before, after)
    }, [pages, reorderPages, pushHistory])

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                <div style={{
                    flex: 1, overflowY: 'auto', padding: 24,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 16,
                    alignContent: 'start',
                }}>
                    {pages.map((page, i) => (
                        <SortableGridCard
                            key={page.id}
                            page={page}
                            index={i}
                            isActive={i === currentIndex}
                            aspect={gridAspect}
                            onSelect={() => onSelect(i)}
                            onContextMenu={
                                settings.enableWorkspaceContextMenu
                                    ? (e) => openPageContextMenu(e, page)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {activePage ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        width: activeSize?.width ?? 160,
                        height: activeSize?.height ?? 200,
                        cursor: 'grabbing',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.5)) drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
                    }}>
                        <div style={{
                            flex: 1,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '2px solid var(--accent)',
                            background: 'var(--canvas-bg)',
                            position: 'relative',
                        }}>
                            <PageFramePreview page={activePage} loading="lazy" />
                        </div>
                        <p style={{
                            fontSize: 10.5, textAlign: 'center',
                            color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        }}>
                            {activeIndex + 1}
                        </p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
})
GridView.displayName = 'GridView'

// ─── Continuous view ──────────────────────────────────────────────────────────
// Same idea: the wrapper's aspect ratio previously came from the raw image's
// own metadata dimensions only (rotation-aware, but with no idea what page
// size/orientation preset was active). Now uses the full resolvePageAspect,
// so a page set to A4/Letter/etc. actually shows as that shape here too.

const ContinuousView = memo(({ pages, zoom }: {
    pages: Page[]
    zoom: number
}) => {
    const preset = useActivePreset()

    return (
        <div style={{
            flex: 1, overflowY: 'auto',
            padding: 32,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 24,
        }}>
            {pages.map((page, i) => {
                const aspect = resolvePageAspect(
                    preset.pageSize, preset.orientation,
                    page.metadata.width, page.metadata.height, page.rotation
                )

                return (
                    <motion.div
                        key={page.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        style={{
                            position: 'relative',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            borderRadius: 2,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: 'transform 200ms var(--ease-out)',
                            width: '100%', maxWidth: 600,
                            aspectRatio: `${aspect.w} / ${aspect.h}`,
                            background: 'var(--canvas-bg)',
                        }}
                    >
                        <PageFramePreview page={page} loading="lazy" />
                        {/* Page number label */}
                        <div style={{
                            position: 'absolute', bottom: -24, left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 10.5, color: 'var(--tx-4)',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                        }}>
                            {i + 1} / {pages.length}
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
})
ContinuousView.displayName = 'ContinuousView'

// ─── PreviewWorkspace ─────────────────────────────────────────────────────────

export const PreviewWorkspace = memo(() => {
    const {
        pages, currentPage, currentPageIndex,
        view, zoom, isFullscreen,
        canGoPrev, canGoNext,
        goTo, goNext, goPrev, goFirst, goLast,
        setView, zoomIn, zoomOut, resetZoom, setZoom,
        toggleFullscreen,
    } = usePreview()

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault(); goNext(); break
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault(); goPrev(); break
                case 'Home':
                    e.preventDefault(); goFirst(); break
                case 'End':
                    e.preventDefault(); goLast(); break
                case 'f':
                case 'F':
                    toggleFullscreen(); break
                case '+':
                case '=':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); zoomIn() } break
                case '-':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); zoomOut() } break
                case '0':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); resetZoom() } break
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [goNext, goPrev, goFirst, goLast, zoomIn, zoomOut, resetZoom, toggleFullscreen])

    if (pages.length === 0) return null

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative',
            background: 'var(--canvas-bg)',
        }}>
            {/* Main content area */}
            {view === 'single' && currentPage && (
                <PreviewCanvas
                    page={currentPage}
                    zoom={zoom}
                    onZoomChange={setZoom}
                />
            )}

            {view === 'grid' && (
                <GridView
                    pages={pages}
                    currentIndex={currentPageIndex}
                    onSelect={goTo}
                />
            )}

            {view === 'continuous' && (
                <ContinuousView pages={pages} zoom={zoom} />
            )}

            {/* Floating toolbar */}
            <PreviewToolbar
                currentIndex={currentPageIndex}
                total={pages.length}
                zoom={zoom}
                view={view}
                isFullscreen={isFullscreen}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                onFirst={goFirst}
                onLast={goLast}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onViewChange={setView}
                onFullscreen={toggleFullscreen}
                onGoTo={goTo}
            />
        </div>
    )
})
PreviewWorkspace.displayName = 'PreviewWorkspace'