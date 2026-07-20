import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MonitorSmartphone } from 'lucide-react'

// Below this width, enough real functionality breaks down (drag-and-drop
// reordering, hover-dependent menus, small touch targets on dense toolbars)
// that it's more honest to block the app outright than let it run in a
// broken state. Covers phones (~375–428px) and small/medium tablets in
// portrait (~768–820px) — deliberately excludes larger tablets like a
// landscape iPad (1024px+), which are usable enough.
const BREAKPOINT = 900

/**
 * A full-screen blocking overlay — NOT a dismissible banner. There is
 * deliberately no close button: below the breakpoint, the app underneath is
 * genuinely inert (this sits above it at a high z-index and captures all
 * pointer events), and it stays that way until the viewport is actually
 * wide enough, not until the user taps something away. Re-evaluates live
 * on resize/orientation-change, so rotating a tablet or resizing a window
 * updates it immediately without a reload.
 */
export const SmallScreenNotice = memo(() => {
    const [isSmallScreen, setIsSmallScreen] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`)
        setIsSmallScreen(mq.matches)
        const onChange = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    return (
        <AnimatePresence>
            {isSmallScreen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999999,
                        background: 'rgba(8, 8, 14, 0.88)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                        // Belt-and-suspenders on top of the high z-index —
                        // guarantees nothing underneath can receive input
                        // while this is up, regardless of stacking-context
                        // quirks elsewhere in the app.
                        pointerEvents: 'auto',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                        style={{ position: 'relative', width: '100%', maxWidth: 380 }}
                    >
                        {/* Ambient glow */}
                        <div style={{
                            position: 'absolute', inset: -28, zIndex: 0, pointerEvents: 'none',
                            background: 'radial-gradient(ellipse 65% 55% at 50% 8%, rgba(99,102,241,0.35), transparent 70%)',
                            filter: 'blur(6px)',
                        }} />

                        <div style={{
                            position: 'relative', zIndex: 1,
                            background: '#121218',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 24,
                            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4)',
                            overflow: 'hidden',
                            padding: '32px 28px 28px',
                            textAlign: 'center',
                        }}>
                            {/* Glass shine */}
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                                background: 'linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 32%)',
                            }} />

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                {/* Icon badge with its own glow ring */}
                                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 20px' }}>
                                    <div style={{
                                        position: 'absolute', inset: -12, borderRadius: '50%',
                                        background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 72%)',
                                    }} />
                                    <div style={{
                                        position: 'relative',
                                        width: 64, height: 64, borderRadius: 18,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <MonitorSmartphone size={28} color="#fff" strokeWidth={2} />
                                    </div>
                                </div>

                                <p style={{
                                    fontSize: 18, fontWeight: 700, color: '#fff',
                                    letterSpacing: '-0.3px', marginBottom: 10,
                                }}>
                                    Bigger Screen Needed
                                </p>
                                <p style={{
                                    fontSize: 13.5, color: 'rgba(255,255,255,0.6)',
                                    lineHeight: 1.7,
                                }}>
                                    Bindery is designed for laptop and desktop screens. Drag-and-drop
                                    reordering, keyboard shortcuts, and several other core features
                                    do not work correctly on this device, so the app is paused here.
                                    Please switch to a larger screen to continue.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
SmallScreenNotice.displayName = 'SmallScreenNotice'