import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

export const UpdateAvailableDialog = memo(() => {
    const { updateAvailable, reloadForUpdate } = usePWA()
    const [dismissed, setDismissed] = useState(false)
    const [reloading, setReloading] = useState(false)
    

    const visible = updateAvailable && !dismissed

    const handleReload = useCallback(() => {
        setReloading(true)
        reloadForUpdate()
    }, [reloadForUpdate])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
                    exit={{ opacity: 0, y: 16, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                    style={{
                        position: 'fixed',
                        bottom: 24, right: 24,
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
                            <RefreshCw size={15} color="#fff" strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                Update available
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1 }}>
                                A new version is ready
                            </p>
                        </div>
                        <button
                            className="icon-btn"
                            onClick={() => setDismissed(true)}
                            style={{ flexShrink: 0 }}
                            aria-label="Dismiss update prompt"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Reload button */}
                    <button
                        onClick={handleReload}
                        disabled={reloading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            padding: '9px 16px',
                            background: 'var(--gradient-accent)', color: '#fff',
                            border: 'none', borderRadius: 'var(--r-md)',
                            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
                            cursor: reloading ? 'default' : 'pointer',
                            opacity: reloading ? 0.7 : 1,
                            boxShadow: '0 2px 10px var(--accent-glow)',
                            transition: 'opacity 110ms, transform 110ms',
                        }}
                        onMouseEnter={e => { if (!reloading) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                        onMouseLeave={e => { if (!reloading) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' } }}
                    >
                        <RefreshCw
                            size={13} strokeWidth={2.5}
                            style={reloading ? { animation: 'spin 0.8s linear infinite' } : undefined}
                        />
                        {reloading ? 'Reloading…' : 'Reload Page'}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
UpdateAvailableDialog.displayName = 'UpdateAvailableDialog'