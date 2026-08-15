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

// ─── Per-variant tokens (all resolved against CSS vars where possible —
// danger/warning keep their own semantic hue since "delete" and "caution"
// need to read as red/amber regardless of theme, but everything else about
// the dialog now pulls from the same shared tokens the rest of the app uses,
// so it sits together with Settings/etc. instead of looking like a separate
// bolted-on component) ───────────────────────────────────────────────────────

function getVariantStyles(v: Variant) {
  if (v === 'danger') return {
    glow: 'rgba(239,68,68,0.28)',
    iconBg: 'rgba(239,68,68,0.12)',
    iconBorder: 'rgba(239,68,68,0.28)',
    iconColor: '#f87171',
    btnBg: 'linear-gradient(135deg,#ef4444,#dc2626)',
    btnGlow: 'rgba(239,68,68,0.32)',
    Icon: Trash2,
  }
  if (v === 'warning') return {
    glow: 'rgba(245,158,11,0.24)',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.26)',
    iconColor: '#fbbf24',
    btnBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
    btnGlow: 'rgba(245,158,11,0.30)',
    Icon: AlertTriangle,
  }
  return {
    glow: 'var(--accent-glow)',
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
              background: 'color-mix(in srgb, var(--bg-app) 45%, transparent)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, margin: 'auto',
              zIndex: 9001,
              width: 388,
              height: 'fit-content',
            }}
          >
            {/* Ambient glow bleeding out from behind the panel — replaces
                the old flat accent stripe with something softer and more
                dimensional, consistent with the Settings redesign */}
            <div style={{
              position: 'absolute', inset: -28, zIndex: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse 65% 55% at 50% 8%, ${s.glow}, transparent 70%)`,
              filter: 'blur(6px)',
            }} />

            <div style={{
              position: 'relative', zIndex: 1,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-hard)',
              borderRadius: 'var(--r-2xl)',
              boxShadow: 'var(--sh-dialog)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Glass shine — soft diagonal highlight across the top,
                  matching the premium treatment used elsewhere */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                background: 'linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 32%)',
              }} />

              {/* Body */}
              <div style={{ position: 'relative', zIndex: 1, padding: '26px 24px 20px' }}>
                {/* Icon — soft ring glow instead of a flat bordered box */}
                <div style={{ position: 'relative', width: 46, height: 46, marginBottom: 18 }}>
                  <div style={{
                    position: 'absolute', inset: -10, borderRadius: '50%',
                    background: `radial-gradient(circle, ${s.glow}, transparent 72%)`,
                  }} />
                  <div style={{
                    position: 'relative',
                    width: 46, height: 46, borderRadius: 15,
                    background: s.iconBg,
                    border: `1px solid ${s.iconBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: s.iconColor, display: 'flex' }}>
                      <Icon size={20} strokeWidth={2.25} />
                    </span>
                  </div>
                </div>

                {/* Title */}
                <p style={{
                  fontSize: 15.5, fontWeight: 700,
                  color: 'var(--tx-1)',
                  letterSpacing: '-0.3px', marginBottom: 8, lineHeight: 1.3,
                }}>
                  {state.title}
                </p>

                {/* Message */}
                <p style={{
                  fontSize: 13,
                  color: 'var(--tx-3)',
                  lineHeight: 1.65,
                }}>
                  {state.message}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-soft)' }} />

              {/* Actions */}
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', gap: 8,
                padding: '16px 24px 20px',
                background: 'var(--bg-panel)',
              }}>
                {/* Cancel */}
                <button
                  onClick={onCancel}
                  autoFocus
                  style={{
                    flex: 1, padding: '10px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--s3)',
                    color: 'var(--tx-2)',
                    fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    transition: 'background 130ms, border-color 130ms, color 130ms',
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
                    flex: 1, padding: '10px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: s.btnBg,
                    color: '#fff',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    boxShadow: `0 4px 16px ${s.btnGlow}`,
                    transition: 'transform 130ms, box-shadow 130ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = `0 7px 22px ${s.btnGlow}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = `0 4px 16px ${s.btnGlow}`
                  }}
                >
                  {state.confirmLabel ?? 'Confirm'}
                </button>
              </div>
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