import { useHotkeys } from 'react-hotkeys-hook'
import { useShallow } from 'zustand/react/shallow'
import { useUIStore } from '@/stores/uiStore'
import { useSelectionStore, useSelectedIdsArray } from '@/stores/selectionStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useExportStore } from '@/stores/exportStore'
import { SHORTCUTS } from '@/constants'

export function useKeyboardShortcuts(opts?: {
    onImport?: () => void
    onSave?: () => void
}) {
    // ── Stable action-only destructures (no data arrays) ─────────────────────────
    const { toggleCommandPalette, zoomIn, zoomOut, resetZoom, openPreview } = useUIStore(
        useShallow(s => ({
            toggleCommandPalette: s.toggleCommandPalette,
            zoomIn: s.zoomIn,
            zoomOut: s.zoomOut,
            resetZoom: s.resetZoom,
            openPreview: s.openPreview,
        }))
    )
    const { deselectAll, selectAll } = useSelectionStore(
        useShallow(s => ({ deselectAll: s.deselectAll, selectAll: s.selectAll }))
    )
    const { removePages, duplicatePages } = usePagesStore(
        useShallow(s => ({ removePages: s.removePages, duplicatePages: s.duplicatePages }))
    )

    // ── Primitives — safe without useShallow ──────────────────────────────────────
    const selectedCount = useSelectionStore(s => s.selectedIds.size)   // number — stable

    // ── Stable array via useShallow ───────────────────────────────────────────────
    const selectedIds = useSelectedIdsArray()   // uses useShallow internally

    const { undo, redo, canUndo, canRedo } = useUndoRedo()
    const pushHistory = useHistoryStore(s => s.push)
    const openExportDialog = useExportStore(s => s.openDialog)

    // ── Command Palette ───────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.COMMAND_PALETTE, (e) => {
        e.preventDefault()
        toggleCommandPalette()
    }, { enableOnFormTags: false })

    // ── Import ────────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.IMPORT, (e) => {
        e.preventDefault()
        opts?.onImport?.()
    }, { enableOnFormTags: false })

    // ── Save ──────────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.SAVE, (e) => {
        e.preventDefault()
        opts?.onSave?.()
    }, { enableOnFormTags: false })

    // ── Export ────────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.EXPORT, (e) => {
        e.preventDefault()
        openExportDialog()
    }, { enableOnFormTags: false })

    // ── Undo / Redo ───────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.UNDO, (e) => {
        e.preventDefault()
        if (canUndo()) undo()
    }, { enableOnFormTags: false })

    useHotkeys(SHORTCUTS.REDO, (e) => {
        e.preventDefault()
        if (canRedo()) redo()
    }, { enableOnFormTags: false })

    // ── Select All ────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.SELECT_ALL, (e) => {
        e.preventDefault()
        // Read pages at call time — don't subscribe to the array
        selectAll(usePagesStore.getState().pages.map(p => p.id))
    }, { enableOnFormTags: false })

    // ── Delete ────────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.DELETE, (e) => {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        if (selectedCount > 0) {
            const before = usePagesStore.getState().pages
            removePages(selectedIds)
            const after = usePagesStore.getState().pages
            pushHistory(
                'delete-pages',
                `Deleted ${selectedCount} page${selectedCount > 1 ? 's' : ''}`,
                before,
                after
            )
            deselectAll()
        }
    }, { enableOnFormTags: false })

    // ── Duplicate ─────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.DUPLICATE, (e) => {
        e.preventDefault()
        if (selectedCount > 0) {
            const before = usePagesStore.getState().pages
            duplicatePages(selectedIds)
            const after = usePagesStore.getState().pages
            pushHistory(
                'duplicate-pages',
                `Duplicated ${selectedCount} page${selectedCount > 1 ? 's' : ''}`,
                before,
                after
            )
        }
    }, { enableOnFormTags: false })

    // ── Zoom ──────────────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.ZOOM_IN, (e) => { e.preventDefault(); zoomIn() }, { enableOnFormTags: false })
    useHotkeys(SHORTCUTS.ZOOM_OUT, (e) => { e.preventDefault(); zoomOut() }, { enableOnFormTags: false })
    useHotkeys('mod+0', (e) => { e.preventDefault(); resetZoom() }, { enableOnFormTags: false })

    // ── Quick Preview ─────────────────────────────────────────────────────────────
    useHotkeys(SHORTCUTS.QUICK_PREVIEW, (e) => {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        const firstId = selectedIds[0]
        if (firstId) openPreview(firstId)
    }, { enableOnFormTags: false })

    // ── Escape ────────────────────────────────────────────────────────────────────
    useHotkeys('escape', () => {
        if (selectedCount > 0) deselectAll()
    }, { enableOnFormTags: false })
}
