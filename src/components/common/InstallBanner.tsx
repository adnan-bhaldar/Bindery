import { memo, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, BookOpen } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'
import { APP_NAME } from '@/constants'

const DISMISS_KEY = 'bindery:install-banner-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const InstallBanner = memo(() => {
    const { canInstall, install } = usePWA()
    const [dismissed, setDismissed] = useState(true) // default true until we check storage

    // Check if user dismissed recently
    useEffect(() => {
        try {
            const stored = localStorage.getItem(DISMISS_KEY)
            if (!stored) { setDismissed(false); return }
            const dismissedAt = Number(stored)
            const expired = Date.now() - dismissedAt > DISMISS_DURATION_MS
            setDismissed(!expired)
        } catch {
            setDismissed(false)
        }
    }, [])

    const handleDismiss = useCallback(() => {
        setDismissed(true)
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()))
        } catch {
            // localStorage may be unavailable — dismissal just won't persist
        }
    }, [])

    const handleInstall = useCallback(async () => {
        const accepted = await install()
        if (!accepted) {
            // User dismissed the native prompt — also hide our banner for a while
            handleDismiss()
        }
    }, [install, handleDismiss])

    const visible = canInstall && !dismissed

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{
                        opacity: 1, y: 0,
                        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: 2 },
                    }}
                    exit={{
                        opacity: 0, y: 16,
                        transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] }, // no delay — dismiss should feel instant
                    }}
                    style={{
                        position: 'fixed',
                        bottom: 24, left: 24,
                        zIndex: 150,
                        width: 300,
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-hard)',
                        borderRadius: 'var(--r-xl)',
                        padding: '14px 16px',
                        boxShadow: 'var(--sh-xl)',
                        display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'var(--gradient-accent)',
                            boxShadow: '0 2px 8px var(--accent-glow)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <BookOpen size={15} color="#fff" strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                Install {APP_NAME}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1 }}>
                                Use offline, runs natively
                            </p>
                        </div>
                        <button
                            className="icon-btn"
                            onClick={handleDismiss}
                            style={{ flexShrink: 0 }}
                            aria-label="Dismiss install prompt"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Install button */}
                    <button
                        onClick={handleInstall}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            padding: '9px 16px',
                            background: 'var(--gradient-accent)', color: '#fff',
                            border: 'none', borderRadius: 'var(--r-md)',
                            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px var(--accent-glow)',
                            transition: 'opacity 110ms, transform 110ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
                    >
                        <Download size={13} strokeWidth={2.5} />
                        Install App
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
InstallBanner.displayName = 'InstallBanner'