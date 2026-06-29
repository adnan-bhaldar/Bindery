import {
  memo, createContext, useContext,
  useState, useCallback, type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, Trash2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = 'danger' | 'warning' | 'info'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean
  resolve: (v: boolean) => void
}

interface CtxValue { confirm: (opts: ConfirmOptions) => Promise<boolean> }
const Ctx = createContext<CtxValue | null>(null)

export function useConfirm() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirm must be inside <ConfirmProvider>')
  return ctx.confirm
}

// ─── Per-variant tokens (all resolved against CSS vars) ───────────────────────

function getVariantStyles(v: Variant) {
  if (v === 'danger') return {
    accentLine: 'linear-gradient(90deg,#ef4444,#f97316)',
    iconBg: 'rgba(239,68,68,0.10)',
    iconBorder: 'rgba(239,68,68,0.22)',
    iconColor: '#ef4444',
    btnBg: 'linear-gradient(135deg,#ef4444,#dc2626)',
    btnGlow: 'rgba(239,68,68,0.35)',
    Icon: Trash2,
  }
  if (v === 'warning') return {
    accentLine: 'linear-gradient(90deg,#f59e0b,#eab308)',
    iconBg: 'rgba(245,158,11,0.10)',
    iconBorder: 'rgba(245,158,11,0.22)',
    iconColor: '#f59e0b',
    btnBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
    btnGlow: 'rgba(245,158,11,0.35)',
    Icon: AlertTriangle,
  }
  return {
    accentLine: 'var(--gradient-accent)',
    iconBg: 'var(--accent-dim)',
    iconBorder: 'var(--accent-border)',
    iconColor: 'var(--accent)',
    btnBg: 'var(--gradient-accent)',
    btnGlow: 'var(--accent-glow)',
    Icon: Info,
  }
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

const ConfirmDialogNode = memo(({
  state, onConfirm, onCancel,
}: { state: ConfirmState; onConfirm: () => void; onCancel: () => void }) => {
  const v = state.variant ?? 'danger'
  const s = getVariantStyles(v)
  const Icon = s.Icon

  return (
    <AnimatePresence>
      {state.visible && (
        <>
          {/* Backdrop — uses CSS var for theme-aware color */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'color-mix(in srgb, var(--bg-app) 40%, transparent)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, margin: 'auto',
              zIndex: 9001,
              width: 380,
              height: 'fit-content',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-hard)',
              borderRadius: 'var(--r-2xl)',
              boxShadow: 'var(--sh-dialog)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Accent top stripe */}
            <div style={{ height: 2.5, background: s.accentLine, flexShrink: 0 }} />

            {/* Body */}
            <div style={{ padding: '24px 24px 20px' }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: s.iconBg,
                border: `1px solid ${s.iconBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, flexShrink: 0,
              }}>
                <span style={{ color: s.iconColor, display: 'flex' }}>
                  <Icon size={20} />
                </span>
              </div>

              {/* Title */}
              <p style={{
                fontSize: 15, fontWeight: 700,
                color: 'var(--tx-1)',
                letterSpacing: '-0.3px', marginBottom: 8, lineHeight: 1.3,
              }}>
                {state.title}
              </p>

              {/* Message */}
              <p style={{
                fontSize: 13,
                color: 'var(--tx-2)',
                lineHeight: 1.65,
              }}>
                {state.message}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0 0 0' }} />

            {/* Actions */}
            <div style={{
              display: 'flex', gap: 8,
              padding: '16px 24px 20px',
              background: 'var(--bg-panel)',
            }}>
              {/* Cancel */}
              <button
                onClick={onCancel}
                autoFocus
                style={{
                  flex: 1, padding: '9px 16px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--s3)',
                  color: 'var(--tx-2)',
                  fontSize: 13, fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  transition: 'background 110ms, border-color 110ms, color 110ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--s4)'
                  e.currentTarget.style.borderColor = 'var(--border-hard)'
                  e.currentTarget.style.color = 'var(--tx-1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--s3)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--tx-2)'
                }}
                onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
              >
                {state.cancelLabel ?? 'Cancel'}
              </button>

              {/* Confirm */}
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, padding: '9px 16px',
                  borderRadius: 'var(--r-md)',
                  border: 'none',
                  background: s.btnBg,
                  color: '#fff',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  boxShadow: `0 2px 10px ${s.btnGlow}`,
                  transition: 'opacity 110ms, transform 110ms, box-shadow 110ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 5px 18px ${s.btnGlow}`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = `0 2px 10px ${s.btnGlow}`
                }}
              >
                {state.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
ConfirmDialogNode.displayName = 'ConfirmDialogNode'

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ConfirmProvider = memo(({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState>({
    visible: false, title: '', message: '', resolve: () => { },
  })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => {
      setState({ ...opts, visible: true, resolve })
    }),
    [])

  const handleConfirm = useCallback(() => {
    setState(s => { s.resolve(true); return { ...s, visible: false } })
  }, [])

  const handleCancel = useCallback(() => {
    setState(s => { s.resolve(false); return { ...s, visible: false } })
  }, [])

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogNode state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Ctx.Provider>
  )
})
ConfirmProvider.displayName = 'ConfirmProvider'