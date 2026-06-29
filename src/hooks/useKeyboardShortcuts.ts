import { useHotkeys } from 'react-hotkeys-hook'
import { useUIStore } from '@/stores/uiStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useExportStore } from '@/stores/exportStore'
import { SHORTCUTS } from '@/constants'

export function useKeyboardShortcuts() {
    const { toggleCommandPalette, zoomIn, zoomOut, resetZoom, openPreview } =
        useUIStore()
    const { deselectAll, selectAll, selectedIds } = useSelectionStore()
    const { removePages, duplicatePages } = usePagesStore()
    const pages = usePagesStore((s) => s.pages)
    const { undo, redo, canUndo, canRedo } = useHistoryStore()
    const { openDialog: openExportDialog } = useExportStore()

    // ── Command Palette ─────────────────────────────────────────────────────────

    useHotkeys(SHORTCUTS.COMMAND_PALETTE, (e) => {
        e.preventDefault()
        toggleCommandPalette()
    })

    // ── Select All ──────────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.SELECT_ALL,
        (e) => {
            e.preventDefault()
            selectAll(pages.map((p) => p.id))
        },
        { enableOnFormTags: false }
    )

    // ── Delete ──────────────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.DELETE,
        (e) => {
            e.preventDefault()
            if (selectedIds.size > 0) {
                removePages(Array.from(selectedIds))
                deselectAll()
            }
        },
        { enableOnFormTags: false }
    )

    // ── Duplicate ───────────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.DUPLICATE,
        (e) => {
            e.preventDefault()
            if (selectedIds.size > 0) {
                duplicatePages(Array.from(selectedIds))
            }
        },
        { enableOnFormTags: false }
    )

    // ── Undo ────────────────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.UNDO,
        (e) => {
            e.preventDefault()
            if (canUndo()) undo()
        },
        { enableOnFormTags: false }
    )

    // ── Redo ────────────────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.REDO,
        (e) => {
            e.preventDefault()
            if (canRedo()) redo()
        },
        { enableOnFormTags: false }
    )

    // ── Export ──────────────────────────────────────────────────────────────────

    useHotkeys(SHORTCUTS.EXPORT, (e) => {
        e.preventDefault()
        openExportDialog()
    })

    // ── Zoom ────────────────────────────────────────────────────────────────────

    useHotkeys(SHORTCUTS.ZOOM_IN, (e) => {
        e.preventDefault()
        zoomIn()
    })

    useHotkeys(SHORTCUTS.ZOOM_OUT, (e) => {
        e.preventDefault()
        zoomOut()
    })

    useHotkeys('mod+0', (e) => {
        e.preventDefault()
        resetZoom()
    })

    // ── Quick Preview ───────────────────────────────────────────────────────────

    useHotkeys(
        SHORTCUTS.QUICK_PREVIEW,
        (e) => {
            if (e.target instanceof HTMLInputElement) return
            e.preventDefault()
            const firstSelected = Array.from(selectedIds)[0]
            if (firstSelected) openPreview(firstSelected)
        },
        { enableOnFormTags: false }
    )
}
