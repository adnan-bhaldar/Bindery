import { createContext, useContext } from 'react'
import type { ContextMenuItem } from '@/components/common/ContextMenu'

// ─── Context ──────────────────────────────────────────────────────────────────
// Extracted from ContextMenu.tsx — that file exports components only now, so
// Fast Refresh works correctly there (mixing a hook export into a component
// file breaks it, per react-refresh/only-export-components).

export interface ContextMenuContextValue {
    open: (x: number, y: number, items: ContextMenuItem[]) => void
    close: () => void
}

export const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export function useContextMenu() {
    const ctx = useContext(ContextMenuContext)
    if (!ctx) throw new Error('useContextMenu must be inside <ContextMenuProvider>')
    return ctx
}
