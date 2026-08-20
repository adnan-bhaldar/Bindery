import { createContext, useContext } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────
// Extracted from ConfirmDialog.tsx — that file exports components only now, so
// Fast Refresh works correctly there (mixing a hook export into a component
// file breaks it, per react-refresh/only-export-components).

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be inside <ConfirmProvider>')
  return ctx.confirm
}
