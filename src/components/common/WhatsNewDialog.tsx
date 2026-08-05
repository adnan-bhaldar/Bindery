import { memo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Check, ChevronDown } from 'lucide-react'
import { useWhatsNew } from '@/hooks/useWhatsNew'

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
// Collapsed view never shows more than this many highlights at once —
// beyond that, a "More" affordance reveals the rest (and the region
// becomes scrollable) instead of the dialog just listing everything.
const MAX_COLLAPSED = 5

export const WhatsNewDialog = memo(() => {
    const { entry, dismiss } = useWhatsNew()
    const dialogRef = useRef<HTMLDivElement>(null)
    const previouslyFocused = useRef<HTMLElement | null>(null)
    const [expanded, setExpanded] = useState(false)

    // Initial focus + focus restoration, and a basic Tab-cycle trap so
    // keyboard focus can't escape into the (visually obscured) app behind
    // the dialog while it's open.
    useEffect(() => {
        if (!entry) return

        previouslyFocused.current = document.activeElement as HTMLElement | null
        dialogRef.current?.focus()

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                dismiss()
                return
            }
            if (e.key !== 'Tab' || !dialogRef.current) return

            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            )
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            previouslyFocused.current?.focus()
        }
    }, [entry, dismiss])

    return (
        <AnimatePresence>
            {entry && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 500,
                        background: 'radial-gradient(circle at 50% 40%, rgba(124,109,242,0.08), rgba(0,0,0,0.6) 70%)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={dismiss}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="whats-new-title"
                        tabIndex={-1}
                        initial={{ scale: 0.92, opacity: 0, y: 14 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.94, opacity: 0, y: 8, transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: 'min(400px, calc(100vw - 32px))',
                            // maxHeight is a ceiling, not a fixed size — a
                            // short entry (few highlights) just sizes to
                            // its actual content and stays small; only once
                            // content would exceed roughly 5 highlights'
                            // worth of height does this cap kick in, and
                            // the middle section below scrolls internally
                            // (with its scrollbar hidden) instead of the
                            // dialog growing further.
                            maxHeight: 'min(520px, calc(100vh - 32px))',
                            boxSizing: 'border-box',
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)', borderRadius: 22,
                            boxShadow: 'var(--sh-xl), 0 0 60px rgba(124,109,242,0.12)',
                            overflow: 'hidden', // clips the decorative glow below to the rounded corners
                            outline: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
                            width: 280, height: 160, borderRadius: '50%',
                            background: 'var(--gradient-accent)', opacity: 0.12, filter: 'blur(50px)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{
                            position: 'relative', flexShrink: 0,
                            padding: '22px 22px 0',
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'var(--gradient-accent)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    boxShadow: '0 2px 10px var(--accent-glow)',
                                }}>
                                    <Sparkles size={16} color="#fff" strokeWidth={2} />
                                </div>
                                <div>
                                    <p id="whats-new-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                        What's new
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                                        v{entry.version}
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={dismiss} aria-label="Close" style={{ flexShrink: 0 }}>
                                <X size={14} />
                            </button>
                        </div>

                        <div
                            className="hide-scrollbar"
                            role="region"
                            aria-label="What's new highlights"
                            tabIndex={0}
                            style={{
                                position: 'relative', flex: 1, minHeight: 0,
                                overflowY: expanded ? 'auto' : 'hidden',
                                display: 'flex', flexDirection: 'column', gap: 10,
                                padding: '0 22px', marginBottom: 20,
                            }}
                        >
                            {(expanded ? entry.highlights : entry.highlights.slice(0, MAX_COLLAPSED)).map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, marginTop: 1,
                                    }}>
                                        <Check size={11} color="var(--accent)" strokeWidth={3} />
                                    </div>
                                    <p style={{ fontSize: 12.5, color: 'var(--tx-2)', lineHeight: 1.5 }}>{h}</p>
                                </motion.div>
                            ))}

                            {!expanded && entry.highlights.length > MAX_COLLAPSED && (
                                // Zero-height wrapper pulled up via negative margin: this is
                                // what lets the blur/button sit *inside* the space of the last
                                // entry above, instead of adding their own row to the flex
                                // column (which would re-introduce unwanted scroll height).
                                <div style={{ position: 'relative', marginTop: -34, height: 0 }}>
                                    {/* Progressive blur: 2 stacked layers, each stronger and
                                        more tightly masked than the last, so the blur builds up
                                        gradually toward the button instead of switching on at a
                                        hard edge. Each layer's maskImage fades its own blur in/out
                                        smoothly; together they read as one continuous gradient. */}
                                    <div aria-hidden="true" style={{
                                        position: 'absolute', left: -22, right: -22, bottom: -9, height: 40,
                                        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(2px)',
                                        maskImage: 'linear-gradient(to bottom, transparent, black 60%)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 60%)',
                                        pointerEvents: 'none',
                                    }} />
                                    <div aria-hidden="true" style={{
                                        position: 'absolute', left: -22, right: -22, bottom: -9, height: 26,
                                        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(4px)',
                                        background: 'linear-gradient(to bottom, transparent, var(--bg-overlay) 75%)',
                                        maskImage: 'linear-gradient(to bottom, transparent, black 45%)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 45%)',
                                        pointerEvents: 'none',
                                    }} />
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.05 + MAX_COLLAPSED * 0.05, duration: 0.2 }}
                                        onClick={() => setExpanded(true)}
                                        style={{
                                            position: 'absolute', left: -22, right: -22, bottom: -10,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                            padding: '7px 0',
                                            background: 'transparent', border: 'none',
                                            color: 'var(--accent)', fontSize: 11.5, fontWeight: 600,
                                            fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                        }}
                                    >
                                        {/* {entry.highlights.length - MAX_COLLAPSED}  */}
                                        More
                                        <ChevronDown size={14} strokeWidth={2.4} />
                                    </motion.button>
                                </div>
                            )}
                        </div>

                        <div style={{ flexShrink: 0, padding: '0 22px 22px' }}>
                            <button
                                onClick={dismiss}
                                style={{
                                    width: '100%', padding: '10px 16px',
                                    background: 'var(--gradient-accent)', color: '#fff',
                                    border: 'none', borderRadius: 12,
                                    fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
                                    cursor: 'pointer', boxShadow: '0 2px 10px var(--accent-glow)',
                                    transition: 'opacity 110ms',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
WhatsNewDialog.displayName = 'WhatsNewDialog'