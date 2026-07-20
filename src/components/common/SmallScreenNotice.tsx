import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MonitorSmartphone } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

// Below this width, enough real functionality breaks down (drag-and-drop
// reordering, hover-dependent menus, small touch targets on dense toolbars)
// that it's more honest to block the app outright than let it run in a
// broken state. Covers phones (~375-428px) and small/medium tablets in
// portrait (~768-820px) - deliberately excludes larger tablets like a
// landscape iPad (1024px+), which are usable enough.
const BREAKPOINT = 900

/**
 * A full-screen blocking overlay - NOT a dismissible banner. There is
 * deliberately no close button: below the breakpoint, the app underneath is
 * genuinely inert (this sits above it at a high z-index and captures all
 * pointer events), and it stays that way until the viewport is actually
 * wide enough, not until the user taps something away. Re-evaluates live
 * on resize/orientation-change, so rotating a tablet or resizing a window
 * updates it immediately without a reload.
 */
export const SmallScreenNotice = memo(() => {
    const [shouldBlock, setShouldBlock] = useState(false)
    const { resolvedTheme } = useThemeStore()
    const isDark = resolvedTheme === 'dark'

    useEffect(() => {
        // Two independent checks, either one triggers the block:
        //
        // 1. Narrow viewport — the normal case.
        //
        // 2. Coarse (touch) primary pointer — catches "Desktop site" mode
        //    on mobile Safari/Chrome, which widens the *reported* viewport
        //    (often to ~980-1024px, then zooms the whole page out to fit
        //    the actual screen) specifically so width-based checks like #1
        //    stop matching. It can't fake the input mechanism, though: a
        //    phone requesting the desktop site is still touch-primary, no
        //    matter what width it claims. Using `pointer` (not
        //    `any-pointer`) deliberately targets the PRIMARY input only, so
        //    a laptop that merely has a touchscreen alongside its trackpad
        //    still correctly reads as fine/mouse-primary and isn't blocked.
        const widthMq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`)
        const pointerMq = window.matchMedia('(pointer: coarse)')

        const evaluate = () => setShouldBlock(widthMq.matches || pointerMq.matches)
        evaluate()

        widthMq.addEventListener('change', evaluate)
        pointerMq.addEventListener('change', evaluate)
        return () => {
            widthMq.removeEventListener('change', evaluate)
            pointerMq.removeEventListener('change', evaluate)
        }
    }, [])

    return (
        <AnimatePresence>
            {shouldBlock && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999999,
                        background: 'color-mix(in srgb, var(--bg-app) 82%, transparent)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                        pointerEvents: 'auto',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                        style={{ position: 'relative', width: '100%', maxWidth: 380 }}
                    >
                        <div style={{
                            position: 'absolute', inset: -28, zIndex: 0, pointerEvents: 'none',
                            background: 'radial-gradient(ellipse 65% 55% at 50% 8%, var(--accent-glow), transparent 70%)',
                            filter: 'blur(6px)',
                        }} />

                        <div style={{
                            position: 'relative', zIndex: 1,
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 24,
                            boxShadow: 'var(--sh-dialog)',
                            overflow: 'hidden',
                            padding: '32px 28px 28px',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                                background: `linear-gradient(120deg, rgba(255,255,255,${isDark ? 0.05 : 0.35}) 0%, transparent 32%)`,
                            }} />

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 20px' }}>
                                    <div style={{
                                        position: 'absolute', inset: -12, borderRadius: '50%',
                                        background: 'radial-gradient(circle, var(--accent-glow), transparent 72%)',
                                    }} />
                                    <div style={{
                                        position: 'relative',
                                        width: 64, height: 64, borderRadius: 18,
                                        background: 'var(--gradient-accent)',
                                        boxShadow: '0 8px 24px var(--accent-glow)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <MonitorSmartphone size={28} color="#fff" strokeWidth={2} />
                                    </div>
                                </div>

                                <p style={{
                                    fontSize: 18, fontWeight: 700, color: 'var(--tx-1)',
                                    letterSpacing: '-0.3px', marginBottom: 10,
                                }}>
                                    Bigger Screen Needed
                                </p>
                                <p style={{
                                    fontSize: 13.5, color: 'var(--tx-3)',
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