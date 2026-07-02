import { memo, useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext, verticalListSortingStrategy,
    rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePagesStore } from '@/stores/pagesStore'
import { useSelectionStore, useSelectedIdsArray, selectSelectedCount } from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { PageThumbnail } from '@/components/pages/PageThumbnail'
import { PageThumbnailGrid } from '@/components/pages/PageThumbnailGrid'
import { Tooltip } from '@/components/ui/Tooltip'
import {
    RotateCw, Copy, Trash2, X,
    LayoutList, LayoutGrid,
    ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { Page } from '@/types'

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

// ─── Row heights ──────────────────────────────────────────────────────────────

const LIST_ROW_H = 84
const GRID_COLS = 2
const GRID_CELL_H = 160  // thumbnail + label
const PADDING = 8
const GAP = 4

// ─── Sortable wrappers ────────────────────────────────────────────────────────

const SortableListRow = memo(({ page, index, allPageIds, disabled }: {
    page: Page; index: number; allPageIds: string[]; disabled: boolean
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: page.id,
    })
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                cursor: disabled ? 'default' : undefined,
            }}
            {...attributes}
            {...(disabled ? {} : listeners)}
        >
            <PageThumbnail page={page} index={index} allPageIds={allPageIds} />
        </div>
    )
})
SortableListRow.displayName = 'SortableListRow'

const SortableGridCell = memo(({ page, index, allPageIds, disabled }: {
    page: Page; index: number; allPageIds: string[]; disabled: boolean
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: page.id,
    })
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                cursor: disabled ? 'default' : undefined,
            }}
            {...attributes}
            {...(disabled ? {} : listeners)}
        >
            <PageThumbnailGrid page={page} index={index} allPageIds={allPageIds} />
        </div>
    )
})
SortableGridCell.displayName = 'SortableGridCell'

// ─── Sort button ──────────────────────────────────────────────────────────────

const SortBtn = memo(({
    label, sortKey, currentKey, currentDir, onClick,
}: {
    label: string; sortKey: SortKey
    currentKey: SortKey; currentDir: SortDir
    onClick: (k: SortKey) => void
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
        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 7, border: 'none', background: 'var(--s4)',
        color: 'var(--tx-2)', cursor: 'pointer', transition: 'background 110ms',
    }

    return (
        <div style={{
            position: 'sticky', bottom: 0, padding: '7px 10px',
            background: 'var(--bg-overlay)', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 4,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            flexShrink: 0, zIndex: 10,
        }}>
            <span style={{
                fontSize: 10.5, fontWeight: 700, color: 'var(--accent)',
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                borderRadius: 99, padding: '1px 7px', fontFamily: 'var(--font-mono)',
            }}>{count}</span>
            <span style={{ fontSize: 11, color: 'var(--tx-3)', flex: 1, marginLeft: 2 }}>
                {count === 1 ? 'page' : 'pages'}
            </span>
            <Tooltip content="Rotate CW" placement="top">
                <button style={btn}
                    onClick={() => ids.forEach(id => {
                        const p = pages.find(pg => pg.id === id)
                        if (p) rotatePages([id], ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270)
                    })}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                ><RotateCw size={12} /></button>
            </Tooltip>
            <Tooltip content="Duplicate" shortcut="⌘D" placement="top">
                <button style={btn} onClick={() => duplicatePages(ids)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                ><Copy size={12} /></button>
            </Tooltip>
            <Tooltip content="Delete" shortcut="⌫" placement="top">
                <button style={{ ...btn, color: '#ef4444' }}
                    onClick={() => { removePages(ids); deselectAll() }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = '#ef4444' }}
                ><Trash2 size={12} /></button>
            </Tooltip>
            <Tooltip content="Deselect" shortcut="Esc" placement="top">
                <button style={btn} onClick={deselectAll}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                ><X size={12} /></button>
            </Tooltip>
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

    // Apply sort
    const pages = useMemo(() => sortPages(rawPages, sortKey, sortDir), [rawPages, sortKey, sortDir])
    const allPageIds = useMemo(() => pages.map(p => p.id), [pages])

    const containerRef = useRef<HTMLDivElement>(null)

    // Virtualizer — single row for list, paired rows for grid
    const rowCount = layout === 'grid' ? Math.ceil(pages.length / GRID_COLS) : pages.length
    const rowH = layout === 'grid' ? GRID_CELL_H + GAP : LIST_ROW_H + GAP

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => containerRef.current,
        estimateSize: () => rowH,
        overscan: 6,
        paddingStart: PADDING,
        paddingEnd: PADDING + 52,
    })

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = pages.findIndex(p => p.id === active.id)
        const newIdx = pages.findIndex(p => p.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return
        const before = pages
        reorderPages(oldIdx, newIdx)
        const after = usePagesStore.getState().pages
        pushHistory('reorder-pages', `Moved page ${oldIdx + 1} → ${newIdx + 1}`, before, after)
        // If dragging while a sort was active, revert to manual so the dragged order is preserved
        if (sortKey !== 'manual') setSortKey('manual')
    }, [pages, reorderPages, pushHistory, sortKey])

    const handleSort = useCallback((key: SortKey) => {
        if (key === 'manual') {
            setSortKey('manual')
            return
        }
        if (sortKey === key) {
            // Toggle direction
            const next = sortDir === 'asc' ? 'desc' : 'asc'
            setSortDir(next)
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }, [sortKey, sortDir])

    // Apply sort to store order when user clicks a sort (makes it persistent for export)
    useEffect(() => {
        if (sortKey === 'manual') return
        const sorted = sortPages(rawPages, sortKey, sortDir)
        setPages(sorted.map((p, i) => ({ ...p, order: i })))
    }, [sortKey, sortDir]) // eslint-disable-line

    // Kbd
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div style={{
                padding: '7px 10px 6px', flexShrink: 0,
                borderBottom: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>

                {/* Top row: count + layout toggle + select-all */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--tx-4)',
                        textTransform: 'uppercase', letterSpacing: '0.7px', flex: 1,
                    }}>
                        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                    </span>

                    {/* Layout toggle */}
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

                {/* Sort row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpDown size={10} color="var(--tx-4)" style={{ flexShrink: 0 }} />
                    <SortBtn label="Manual" sortKey="manual" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Size" sortKey="size" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                    <SortBtn label="Date" sortKey="date" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
                </div>
            </div>

            {/* ── Scrollable list ────────────────────────────────────────── */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={allPageIds}
                    strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
                >
                    <div
                        ref={containerRef}
                        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
                    >
                        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>

                            {layout === 'list' && virtualizer.getVirtualItems().map(vRow => {
                                const page = pages[vRow.index]
                                if (!page) return null
                                return (
                                    <div key={vRow.key} style={{
                                        position: 'absolute', top: 0,
                                        left: PADDING, right: PADDING,
                                        height: LIST_ROW_H,
                                        transform: `translateY(${vRow.start}px)`,
                                    }}>
                                        <SortableListRow
                                            page={page} index={vRow.index}
                                            allPageIds={allPageIds} disabled={dragDisabled}
                                        />
                                    </div>
                                )
                            })}

                            {layout === 'grid' && virtualizer.getVirtualItems().map(vRow => {
                                const startIdx = vRow.index * GRID_COLS
                                const rowPages = pages.slice(startIdx, startIdx + GRID_COLS)
                                return (
                                    <div key={vRow.key} style={{
                                        position: 'absolute', top: 0,
                                        left: PADDING, right: PADDING,
                                        height: GRID_CELL_H,
                                        transform: `translateY(${vRow.start}px)`,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                                        gap: GAP,
                                    }}>
                                        {rowPages.map((page, ci) => (
                                            <SortableGridCell
                                                key={page.id}
                                                page={page} index={startIdx + ci}
                                                allPageIds={allPageIds} disabled={dragDisabled}
                                            />
                                        ))}
                                    </div>
                                )
                            })}

                        </div>
                    </div>
                </SortableContext>
            </DndContext>

            <BatchToolbar />
        </div>
    )
})
VirtualizedPageList.displayName = 'VirtualizedPageList'
