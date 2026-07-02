import { memo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCw, RotateCcw, Trash2, Copy, Crown, X } from 'lucide-react'
import { usePagesStore } from '@/stores/pagesStore'
import {
    useSelectionStore,
    selectSelectedCount,
    useSelectedIdsArray,
} from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { Tooltip } from '@/components/ui/Tooltip'

// ─── Toolbar button ───────────────────────────────────────────────────────────

interface TBtnProps {
    tooltip: string
    shortcut?: string
    onClick: () => void
    danger?: boolean
    disabled?: boolean
    children: React.ReactNode
}

const TBtn = memo(({ tooltip, shortcut, onClick, danger, disabled, children }: TBtnProps) => (
    <Tooltip content={tooltip} shortcut={shortcut} placement="top">
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--r-md)', border: 'none',
                background: 'transparent',
                color: danger ? '#ef4444' : 'var(--tx-2)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.35 : 1,
                transition: 'background 110ms, color 110ms',
            }}
            onMouseEnter={e => {
                if (!disabled)
                    e.currentTarget.style.background = danger
                        ? 'rgba(239,68,68,0.12)'
                        : 'var(--hover)'
            }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
            {children}
        </button>
    </Tooltip>
))
TBtn.displayName = 'TBtn'

const Sep = () => (
    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
)

// ─── BatchEditToolbar ─────────────────────────────────────────────────────────

export const BatchEditToolbar = memo(() => {
    const selectedIds = useSelectedIdsArray()
    const count = useSelectionStore(selectSelectedCount)
    const { deselectAll } = useSelectionStore()

    const { removePages, rotatePages, duplicatePages, setCoverPage } = usePagesStore(
        useShallow((s) => ({
            removePages: s.removePages,
            rotatePages: s.rotatePages,
            duplicatePages: s.duplicatePages,
            setCoverPage: s.setCoverPage,
        }))
    )
    const { push: pushHistory } = useHistoryStore()

    // Always read the freshest pages snapshot at call time, not via stale closure
    const snapshot = useCallback(() => usePagesStore.getState().pages, [])

    const rotateCW = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = snapshot()
        selectedIds.forEach(id => {
            const page = before.find(p => p.id === id)
            if (page) rotatePages([id], ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270)
        })
        const after = usePagesStore.getState().pages
        pushHistory('rotate-pages', `Rotated ${count} page${count > 1 ? 's' : ''} CW`, before, after)
    }, [selectedIds, rotatePages, pushHistory, count, snapshot])

    const rotateCCW = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = snapshot()
        selectedIds.forEach(id => {
            const page = before.find(p => p.id === id)
            if (page) rotatePages([id], ((page.rotation + 270) % 360) as 0 | 90 | 180 | 270)
        })
        const after = usePagesStore.getState().pages
        pushHistory('rotate-pages', `Rotated ${count} page${count > 1 ? 's' : ''} CCW`, before, after)
    }, [selectedIds, rotatePages, pushHistory, count, snapshot])

    const duplicate = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = snapshot()
        duplicatePages(selectedIds)
        const after = usePagesStore.getState().pages
        pushHistory('duplicate-pages', `Duplicated ${count} page${count > 1 ? 's' : ''}`, before, after)
    }, [selectedIds, duplicatePages, pushHistory, count, snapshot])

    const deleteSelected = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = snapshot()
        removePages(selectedIds)
        const after = usePagesStore.getState().pages
        pushHistory('delete-pages', `Deleted ${count} page${count > 1 ? 's' : ''}`, before, after)
        deselectAll()
    }, [selectedIds, removePages, deselectAll, pushHistory, count, snapshot])

    const setAsCover = useCallback(() => {
        if (selectedIds.length !== 1) return
        const before = snapshot()
        setCoverPage(selectedIds[0])
        const after = usePagesStore.getState().pages
        pushHistory('set-cover', 'Changed cover page', before, after)
    }, [selectedIds, setCoverPage, pushHistory, snapshot])

    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'fixed',
                        bottom: 24, left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 80,
                        display: 'flex', alignItems: 'center', gap: 2,
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-hard)',
                        borderRadius: 'var(--r-full)',
                        padding: '4px 8px',
                        boxShadow: 'var(--sh-xl)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <div style={{
                        padding: '3px 10px', borderRadius: 'var(--r-full)',
                        background: 'var(--accent-dim)',
                        border: '1px solid var(--accent-border)',
                        marginRight: 4,
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        <span style={{
                            fontSize: 11.5, fontWeight: 700, color: 'var(--accent)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {count}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                            {count === 1 ? 'page' : 'pages'}
                        </span>
                    </div>

                    <Sep />

                    <TBtn tooltip="Rotate clockwise" shortcut="R" onClick={rotateCW}>
                        <RotateCw size={14} />
                    </TBtn>
                    <TBtn tooltip="Rotate counter-clockwise" onClick={rotateCCW}>
                        <RotateCcw size={14} />
                    </TBtn>

                    <Sep />

                    <TBtn tooltip="Duplicate selected" shortcut="⌘D" onClick={duplicate}>
                        <Copy size={14} />
                    </TBtn>
                    <TBtn
                        tooltip={count === 1 ? 'Set as cover' : 'Select one page to set cover'}
                        onClick={setAsCover}
                        disabled={count !== 1}
                    >
                        <Crown size={14} />
                    </TBtn>

                    <Sep />

                    <TBtn tooltip="Delete selected" shortcut="⌫" onClick={deleteSelected} danger>
                        <Trash2 size={14} />
                    </TBtn>

                    <Sep />

                    <Tooltip content="Deselect all" shortcut="Esc" placement="top">
                        <button
                            onClick={deselectAll}
                            style={{
                                height: 32, padding: '0 8px',
                                display: 'flex', alignItems: 'center', gap: 4,
                                borderRadius: 'var(--r-md)', border: 'none',
                                background: 'transparent', color: 'var(--tx-3)',
                                fontSize: 11, fontFamily: 'var(--font-sans)',
                                cursor: 'pointer', transition: 'background 110ms, color 110ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--tx-1)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' }}
                        >
                            <X size={12} />
                            Deselect
                        </button>
                    </Tooltip>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
BatchEditToolbar.displayName = 'BatchEditToolbar'
