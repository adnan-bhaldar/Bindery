import { memo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

// ─── Shared presentational primitives used across every settings section ──────
// Extracted from the original monolithic SettingsDialog.tsx so each section
// file can import just what it needs instead of everything living in one
// ~1800-line file.

// lucide-react removed all brand/logo icons (GitHub, Twitter, etc.) from
// v1.0 onward — this project is pinned to ^1.21.0, so `Github` no longer
// exists as an export. A small inline SVG of the mark is the standard
// substitute other apps use once a icon library drops brand glyphs.
export const GithubMark = memo(({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.75 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.56-.29-5.26-1.28-5.26-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.11 3.05.75.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
))
GithubMark.displayName = 'GithubMark'

// ─── Card primitives (the "modern cards" redesign) ────────────────────────────

export const Card = memo(({ id, title, desc, icon: Icon, children }: {
    id?: string; title?: string; desc?: string; icon?: React.FC<{ size?: number }>; children: React.ReactNode
}) => (
    <div id={id} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: 16,
        marginBottom: 14,
        boxShadow: 'var(--sh-xs)',
    }}>
        {title && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {Icon && (
                    <div style={{
                        width: 24, height: 24, borderRadius: 7,
                        background: 'var(--accent-dim)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Icon size={13} />
                    </div>
                )}
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>{title}</p>
            </div>
        )}
        {desc && <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 10, lineHeight: 1.5 }}>{desc}</p>}
        <div>{children}</div>
    </div>
))
Card.displayName = 'Card'

export const CardRow = memo(({ id, label, desc, children, last }: {
    id?: string; label: string; desc?: string; children: React.ReactNode; last?: boolean
}) => (
    <div id={id} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, padding: '9px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-soft)',
    }}>
        <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx-1)' }}>{label}</p>
            {desc && (
                <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2, lineHeight: 1.5 }}>
                    {desc}
                </p>
            )}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
))
CardRow.displayName = 'CardRow'

export const SegRow = memo(({ options, value, onChange }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
}) => (
    <div style={{
        display: 'flex', background: 'var(--s3)',
        borderRadius: 8, padding: 3, gap: 2,
    }}>
        {options.map(o => (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: value === o.value ? 'var(--bg-card)' : 'transparent',
                color: value === o.value ? 'var(--tx-1)' : 'var(--tx-3)',
                fontSize: 11.5, fontWeight: value === o.value ? 600 : 400,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                boxShadow: value === o.value ? 'var(--sh-xs)' : 'none',
                transition: 'all 110ms', whiteSpace: 'nowrap',
            }}>
                {o.label}
            </button>
        ))}
    </div>
))
SegRow.displayName = 'SegRow'

export const SelectRow = memo(({ options, value, onChange }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
}) => {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const current = options.find(o => o.value === value)

    // Close on outside click and on Escape — standard custom-dropdown behavior
    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--s3)',
                    border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: open ? '0 0 0 3px var(--accent-dim)' : 'none',
                    color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
                    cursor: 'pointer', outline: 'none',
                    transition: 'border-color 130ms, box-shadow 130ms',
                    minWidth: 140, justifyContent: 'space-between',
                }}
            >
                <span>{current?.label ?? value}</span>
                <ChevronDown
                    size={13}
                    color="var(--tx-3)"
                    style={{ transition: 'transform 180ms var(--ease-out)', transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                            minWidth: 160, zIndex: 50,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 12,
                            boxShadow: 'var(--sh-md)',
                            padding: 4,
                            maxHeight: 220, overflowY: 'auto',
                            transformOrigin: 'top right',
                        }}
                    >
                        {options.map(o => {
                            const active = o.value === value
                            return (
                                <button
                                    key={o.value}
                                    onClick={() => { onChange(o.value); setOpen(false) }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: 10, padding: '7px 10px', borderRadius: 8, border: 'none',
                                        background: active ? 'var(--accent-dim)' : 'transparent',
                                        color: active ? 'var(--accent)' : 'var(--tx-1)',
                                        fontSize: 12.5, fontWeight: active ? 600 : 400,
                                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                        textAlign: 'left', transition: 'background 100ms',
                                    }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)' }}
                                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                                >
                                    {o.label}
                                    {active && <Check size={13} strokeWidth={2.75} />}
                                </button>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})
SelectRow.displayName = 'SelectRow'
