import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
    DndContext, closestCenter, PointerSensor, DragOverlay,
    useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
    SortableContext, verticalListSortingStrategy,
    rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePagesStore } from '@/stores/pagesStore'
import { toast } from 'sonner'
import { useSelectionStore, useSelectedIdsArray, selectSelectedCount } from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { PageThumbnail } from '@/components/pages/PageThumbnail'
import { PageThumbnailGrid } from '@/components/pages/PageThumbnailGrid'
import { Tooltip } from '@/components/ui/Tooltip'
import {
    RotateCw, RotateCcw, Copy, Trash2, X,
    LayoutList, LayoutGrid,
    ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { Page } from '@/types'

// NOTE: this list is intentionally NOT virtualized. It previously used
// @tanstack/react-virtual, but virtualization and @dnd-kit/sortable's
// reflow/reorder animations are two independent layout systems fighting to
// position the same DOM nodes — that mismatch was the root cause behind a
// whole family of bugs (CSS Grid track sizing, drag clamped to a single
// row's bounds, dragged items disappearing behind sibling rows). For a
// sidebar of scanned pages (realistically dozens to a few hundred, not tens
// of thousands), plain rendering lets dnd-kit work exactly as documented,
// and React handles this many simple thumbnail nodes without difficulty.
// If a project ever needs to comfortably handle thousands of pages, this is
// the file to revisit — but re-virtualizing should go hand in hand with
// disabling dnd-kit's live reflow animation during drag, not just bolting
// the virtualizer back on as before.

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = 'manual' | 'name' | 'size' | 'date'
type SortDir = 'asc' | 'desc'

function sortPages(pages: Page[], key: SortKey, dir: SortDir): Page[] {
    if (key === 'manual') return pages
    return [...pages].sort((a, b) => {
        let cmp = 0
        if (key === 'name') {
            cmp = a.metadata.filename.localeCompare(b.metadata.filename, undefined, { numeric: true, sensitivity: 'base' })
        } else if (key === 'size') {
            cmp = a.metadata.fileSize - b.metadata.fileSize
        } else if (key === 'date') {
            cmp = a.metadata.createdAt - b.metadata.createdAt
        }
        return dir === 'asc' ? cmp : -cmp
    })
}

const GRID_COLS = 2
const GAP = 8
const PADDING_PX = 8

// ─── Sortable wrappers ────────────────────────────────────────────────────────

const SortableListRow = memo(({ page, index, allPageIds, disabled }: {
    page: Page; index: number; allPageIds: string[]; disabled: boolean
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
    return (
        <div
            ref={setNodeRef}
            data-page-id={page.id}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                position: 'relative',
                cursor: disabled ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                touchAction: 'none',
            }}
            data-drag-locked={disabled ? 'true' : undefined}
            {...attributes}
            {...listeners}
        >
            {/* visibility:hidden (not display:none) keeps this row's exact
                height reserved, so the dashed placeholder below lines up
                perfectly without needing to hardcode a pixel height. */}
            <div style={{ visibility: isDragging ? 'hidden' : 'visible' }}>
                <PageThumbnail page={page} index={index} allPageIds={allPageIds} />
            </div>
            {isDragging && (
                <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 10,
                    border: '1.5px dashed var(--accent-border)',
                    background: 'var(--accent-dim)',
                }} />
            )}
        </div>
    )
})
SortableListRow.displayName = 'SortableListRow'

const SortableGridCell = memo(({ page, index, allPageIds, disabled }: {
    page: Page; index: number; allPageIds: string[]; disabled: boolean
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
    return (
        <div
            ref={setNodeRef}
            data-page-id={page.id}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                position: 'relative',
                cursor: disabled ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                minWidth: 0, minHeight: 0,
                touchAction: 'none',
            }}
            data-drag-locked={disabled ? 'true' : undefined}
            {...attributes}
            {...listeners}
        >
            <div style={{ visibility: isDragging ? 'hidden' : 'visible' }}>
                <PageThumbnailGrid page={page} index={index} allPageIds={allPageIds} />
            </div>
            {isDragging && (
                <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 10,
                    border: '1.5px dashed var(--accent-border)',
                    background: 'var(--accent-dim)',
                }} />
            )}
        </div>
    )
})
SortableGridCell.displayName = 'SortableGridCell'

// ─── Sort button ──────────────────────────────────────────────────────────────

const SortBtn = memo(({ label, sortKey, currentKey, currentDir, onClick }: {
    label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir; onClick: (k: SortKey) => void
}) => {
    const active = currentKey === sortKey
    const Icon = active ? (currentDir === 'asc' ? ChevronUp : ChevronDown) : null
    return (
        <button
            onClick={() => onClick(sortKey)}
            style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 7px', borderRadius: 6,
                border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                background: active ? 'var(--accent-dim)' : 'var(--s3)',
                color: active ? 'var(--accent)' : 'var(--tx-3)',
                fontSize: 10.5, fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                transition: 'all 110ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--tx-2)' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--tx-3)' } }}
        >
            {label}
            {Icon && <Icon size={9} />}
        </button>
    )
})
SortBtn.displayName = 'SortBtn'

// ─── Batch toolbar ────────────────────────────────────────────────────────────

const BatchToolbar = memo(() => {
    const ids = useSelectedIdsArray()
    const count = useSelectionStore(selectSelectedCount)
    const pages = usePagesStore(s => s.pages)
    const { deselectAll } = useSelectionStore()
    const { removePages, rotatePages, duplicatePages } = usePagesStore()

    if (count === 0) return null

    const btn: React.CSSProperties = {
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, border: 'none', background: 'var(--s3)',
        color: 'var(--tx-2)', cursor: 'pointer',
        transition: 'background 130ms, transform 130ms, color 130ms',
    }

    const divider = (
        <div style={{ width: 1, height: 18, background: 'var(--border-hard)', margin: '0 2px', flexShrink: 0 }} />
    )

    return (
        <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '0 10px 10px', zIndex: 10,
        }}>
            <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '7px 8px',
                borderRadius: 16,
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-hard)',
                boxShadow: 'var(--sh-md)',
                overflow: 'hidden',
            }}>
                <span style={{
                    position: 'relative', zIndex: 1,
                    fontSize: 10.5, fontWeight: 700, color: 'var(--accent)',
                    background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                    borderRadius: 99, padding: '2px 8px', fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                }}>{count}</span>
                {/* <span style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'var(--tx-3)', flex: 1, marginLeft: 3, whiteSpace: 'nowrap' }}>
                    {count === 1 ? 'page' : 'pages'}
                </span> */}

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Tooltip content="Rotate Right" placement="top">
                        <button style={btn}
                            onClick={() => ids.forEach(id => {
                                const p = pages.find(pg => pg.id === id)
                                if (p) rotatePages([id], ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270)
                            })}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'none' }}
                        ><RotateCw size={13} /></button>
                    </Tooltip>
                    <Tooltip content="Rotate Left" placement="top">
                        <button style={btn}
                            onClick={() => ids.forEach(id => {
                                const p = pages.find(pg => pg.id === id)
                                if (p) rotatePages([id], ((p.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270)
                            })}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'none' }}
                        ><RotateCcw size={13} /></button>
                    </Tooltip>
                    <Tooltip content="Duplicate" shortcut="⌘D" placement="top">
                        <button style={btn} onClick={() => duplicatePages(ids)}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'none' }}
                        ><Copy size={13} /></button>
                    </Tooltip>

                    {divider}

                    <Tooltip content="Delete" shortcut="⌫" placement="top">
                        <button style={{ ...btn, color: '#ef4444' }}
                            onClick={() => { removePages(ids); deselectAll() }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'none' }}
                        ><Trash2 size={13} /></button>
                    </Tooltip>
                    <Tooltip content="Deselect" shortcut="Esc" placement="top">
                        <button style={btn} onClick={deselectAll}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'none' }}
                        ><X size={13} /></button>
                    </Tooltip>
                </div>
            </div>
        </div>
    )
})
BatchToolbar.displayName = 'BatchToolbar'

// ─── Main ─────────────────────────────────────────────────────────────────────

export const VirtualizedPageList = memo(() => {
    const rawPages = usePagesStore(s => s.pages)
    const { reorderPages, setPages } = usePagesStore()
    const count2 = useSelectionStore(selectSelectedCount)
    const { selectAll, deselectAll } = useSelectionStore()
    const { push: pushHistory } = useHistoryStore()
    const { settings, updateSetting } = useSettingsStore()

    const layout = settings.sidebarLayout ?? 'list'

    const [sortKey, setSortKey] = useState<SortKey>('manual')
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    const isSorted = sortKey !== 'manual'
    const dragDisabled = isSorted && !settings.allowDragWhenSorted

    const pages = useMemo(() => sortPages(rawPages, sortKey, sortDir), [rawPages, sortKey, sortDir])
    const allPageIds = useMemo(() => pages.map(p => p.id), [pages])

    const sensors = useSensors(
        useSensor(
            class BlockablePointerSensor extends PointerSensor {
                static activators = [
                    {
                        eventName: 'onPointerDown' as const,
                        handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
                            const el = event.target as HTMLElement
                            if (el.closest('[data-drag-locked="true"]')) {
                                toast.info('Drag is locked while sorted', {
                                    description: 'Switch to Manual sort or enable "Allow drag when sorted" in Settings → Appearance.',
                                    duration: 3500,
                                    id: 'drag-locked',
                                })
                                return false
                            }
                            return true
                        },
                    },
                ]
            },
            { activationConstraint: { distance: 6 } }
        )
    )

    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null)

    // Without this, the cursor flickers back to the default arrow whenever
    // the pointer passes over a gap between rows/cells mid-drag — pinning it
    // to 'grabbing' for the whole page while active reads much more solid.
    useEffect(() => {
        if (!activeId) return
        const prev = document.body.style.cursor
        document.body.style.cursor = 'grabbing'
        return () => { document.body.style.cursor = prev }
    }, [activeId])

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const id = String(event.active.id)
        setActiveId(id)
        // Measure the actual rendered element directly — dnd-kit's own
        // rect.current.initial wasn't reliably populated in this setup,
        // which was silently falling back to a fixed placeholder size and
        // making the dragged item look enlarged/mismatched the whole time.
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

    const handleCancelDrop = useCallback(() => dragDisabled, [dragDisabled])

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
        const reordered = usePagesStore.getState().pages
        if (!reordered[0]?.isCover) {
            setPages(reordered.map((p, i) => ({ ...p, isCover: i === 0 })))
        }
        const after = usePagesStore.getState().pages
        pushHistory('reorder-pages', `Moved page ${oldIdx + 1} → ${newIdx + 1}`, before, after)
        if (sortKey !== 'manual') setSortKey('manual')
    }, [pages, reorderPages, pushHistory, sortKey])

    const handleSort = useCallback((key: SortKey) => {
        if (key === 'manual') {
            setSortKey('manual')
            return
        }
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }, [sortKey, sortDir])

    // Side effect (calling setPages) belongs in useEffect, not useMemo.
    useEffect(() => {
        if (sortKey === 'manual') return
        const sorted = sortPages(rawPages, sortKey, sortDir)
        setPages(sorted.map((p, i) => ({ ...p, order: i, isCover: i === 0 })))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortKey, sortDir])

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if ((e.metaKey || e.ctrlKey) && e.key === 'a' && pages.length > 0) {
                e.preventDefault(); selectAll(allPageIds)
            }
            if (e.key === 'Escape' && count2 > 0) deselectAll()
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [pages, allPageIds, selectAll, deselectAll, count2])

    if (pages.length === 0) return null

    const activePage = activeId ? pages.find(p => p.id === activeId) : undefined
    const activeIndex = activeId ? pages.findIndex(p => p.id === activeId) : -1

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{
                padding: '7px 10px 6px', flexShrink: 0,
                borderBottom: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--tx-4)',
                        textTransform: 'uppercase', letterSpacing: '0.7px', flex: 1,
                    }}>
                        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                    </span>
                    <div style={{
                        display: 'flex', background: 'var(--s3)',
                        borderRadius: 7, padding: 2, gap: 1,
                        border: '1px solid var(--border)',
                    }}>
                        <Tooltip content="List view" placement="bottom">
                            <button
                                onClick={() => updateSetting('sidebarLayout', 'list')}
                                style={{
                                    width: 22, height: 22, borderRadius: 5, border: 'none',
                                    background: layout === 'list' ? 'var(--bg-card)' : 'transparent',
                                    color: layout === 'list' ? 'var(--tx-1)' : 'var(--tx-3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 110ms',
                                    boxShadow: layout === 'list' ? 'var(--sh-xs)' : 'none',
                                }}
                            ><LayoutList size={12} /></button>
                        </Tooltip>
                        <Tooltip content="Grid view" placement="bottom">
                            <button
                                onClick={() => updateSetting('sidebarLayout', 'grid')}
                                style={{
                                    width: 22, height: 22, borderRadius: 5, border: 'none',
                                    background: layout === 'grid' ? 'var(--bg-card)' : 'transparent',
                                    color: layout === 'grid' ? 'var(--tx-1)' : 'var(--tx-3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 110ms',
                                    boxShadow: layout === 'grid' ? 'var(--sh-xs)' : 'none',
                                }}
                            ><LayoutGrid size={12} /></button>
                        </Tooltip>
                    </div>
                    <Tooltip content={count2 > 0 ? 'Deselect all' : 'Select all'} shortcut="⌘A" placement="bottom">
                        <button
                            onClick={() => count2 > 0 ? deselectAll() : selectAll(allPageIds)}
                            style={{
                                fontSize: 10.5, fontWeight: 500, color: 'var(--tx-3)',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '2px 5px', borderRadius: 6,
                                transition: 'background 110ms, color 110ms',
                                fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--tx-1)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' }}
                        >
                            {count2 > 0 ? 'Deselect' : 'Select all'}
                        </button>
                    </Tooltip>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpDown size={10} color="var(--tx-4)" style={{ flexShrink: 0 }} />
                    <SortBtn label="Manual" sortKey="manual" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Size" sortKey="size" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Date" sortKey="date" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={layout === 'list' ? [restrictToVerticalAxis] : []}
                onDragStart={handleDragStart}
                cancelDrop={handleCancelDrop}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <SortableContext
                    items={allPageIds}
                    strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
                >
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PADDING_PX }}>
                        {layout === 'list' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {pages.map((page, i) => (
                                    <SortableListRow
                                        key={page.id}
                                        page={page} index={i}
                                        allPageIds={allPageIds} disabled={dragDisabled}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                                gap: GAP,
                            }}>
                                {pages.map((page, i) => (
                                    <SortableGridCell
                                        key={page.id}
                                        page={page} index={i}
                                        allPageIds={allPageIds} disabled={dragDisabled}
                                    />
                                ))}
                            </div>
                        )}
                        <div style={{ height: 52 }} />
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {activePage ? (
                        <div style={{
                            // Fallback size covers the rare case where the
                            // initial rect measurement isn't ready the exact
                            // instant dragStart fires — without this, the
                            // overlay would render nothing for a moment while
                            // the original item is already hidden, making the
                            // dragged page appear to vanish entirely.
                            width: activeSize?.width ?? (layout === 'grid' ? 140 : 200),
                            height: activeSize?.height ?? (layout === 'grid' ? 186 : 64),
                            cursor: 'grabbing',
                            pointerEvents: 'none',
                            borderRadius: 10,
                            filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.5)) drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
                        }}>
                            {layout === 'grid'
                                ? <PageThumbnailGrid page={activePage} index={activeIndex} allPageIds={allPageIds} />
                                : <PageThumbnail page={activePage} index={activeIndex} allPageIds={allPageIds} />}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <BatchToolbar />
        </div>
    )
})
VirtualizedPageList.displayName = 'VirtualizedPageList'