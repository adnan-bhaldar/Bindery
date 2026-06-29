import { memo, useEffect, useRef, createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuItem {
    id: string
    label: string
    icon?: ReactNode
    shortcut?: string
    danger?: boolean
    disabled?: boolean
    separator?: boolean
    action?: () => void
}

interface ContextMenuState {
    visible: boolean
    x: number
    y: number
    items: ContextMenuItem[]
}

interface ContextMenuContextValue {
    open: (x: number, y: number, items: ContextMenuItem[]) => void
    close: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export function useContextMenu() {
    const ctx = useContext(ContextMenuContext)
    if (!ctx) throw new Error('useContextMenu must be inside <ContextMenuProvider>')
    return ctx
}

// ─── Menu node ────────────────────────────────────────────────────────────────

const MenuNode = memo(({ state, onClose }: { state: ContextMenuState; onClose: () => void }) => {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: state.x, y: state.y })

    useEffect(() => {
        if (!ref.current || !state.visible) return
        const el = ref.current
        const vw = window.innerWidth
        const vh = window.innerHeight
        const { width, height } = el.getBoundingClientRect()
        setPos({
            x: Math.min(state.x, vw - width - 8),
            y: Math.min(state.y, vh - height - 8),
        })
    }, [state])

    if (!state.visible) return null

    return createPortal(
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed',
                left: pos.x, top: pos.y,
                zIndex: 9000,
                minWidth: 200,
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-hard)',
                borderRadius: 'var(--r-xl)',
                padding: 5,
                boxShadow: 'var(--sh-dialog)',
                outline: 'none',
            }}
            tabIndex={-1}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        >
            {state.items.map((item, i) => {
                if (item.separator) {
                    return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                }
                return (
                    <button
                        key={item.id}
                        disabled={item.disabled}
                        onClick={() => { item.action?.(); onClose() }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', borderRadius: 'var(--r-md)',
                            border: 'none', background: 'transparent',
                            color: item.danger ? '#ef4444' : item.disabled ? 'var(--tx-4)' : 'var(--tx-1)',
                            fontSize: 12.5, fontWeight: 400, fontFamily: 'var(--font-sans)',
                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                            textAlign: 'left', transition: 'background 80ms',
                        }}
                        onMouseEnter={e => {
                            if (!item.disabled) e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.10)' : 'var(--hover)'
                        }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        {item.icon && (
                            <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.danger ? '#ef4444' : 'var(--tx-3)' }}>
                                {item.icon}
                            </span>
                        )}
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.shortcut && (
                            <kbd className="kbd">{item.shortcut}</kbd>
                        )}
                    </button>
                )
            })}
        </motion.div>,
        document.body
    )
})
MenuNode.displayName = 'MenuNode'

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ContextMenuProvider = memo(({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<ContextMenuState>({
        visible: false, x: 0, y: 0, items: [],
    })

    const open = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
        setState({ visible: true, x, y, items })
    }, [])

    const close = useCallback(() => {
        setState(s => ({ ...s, visible: false }))
    }, [])

    // Close on outside click or Escape
    useEffect(() => {
        if (!state.visible) return
        const onDown = () => close()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
        window.addEventListener('mousedown', onDown)
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('mousedown', onDown)
            window.removeEventListener('keydown', onKey)
        }
    }, [state.visible, close])

    return (
        <ContextMenuContext.Provider value={{ open, close }}>
            {children}
            <AnimatePresence>
                {state.visible && <MenuNode state={state} onClose={close} />}
            </AnimatePresence>
        </ContextMenuContext.Provider>
    )
})
ContextMenuProvider.displayName = 'ContextMenuProvider'