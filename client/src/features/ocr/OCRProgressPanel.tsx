import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { OCRProgress } from '@/hooks/useOCR'

interface Props {
    progress: OCRProgress
    onCancel: () => void
}

export const OCRProgressPanel = memo(({ progress, onCancel }: Props) => {
    const pct = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0

    return (
        <AnimatePresence>
            {progress.isRunning && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'fixed',
                        bottom: 24, right: 24,
                        zIndex: 200,
                        width: 320,
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-hard)',
                        borderRadius: 'var(--r-xl)',
                        padding: '16px 18px',
                        boxShadow: 'var(--sh-xl)',
                        display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--accent-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Loader2 size={15} color="var(--accent)"
                                style={{ animation: 'spin 0.8s linear infinite' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                Running OCR
                            </p>
                            <p style={{
                                fontSize: 11, color: 'var(--tx-3)', marginTop: 1,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {progress.status || 'Processing…'}
                            </p>
                        </div>

                        <span style={{
                            fontSize: 10.5, fontWeight: 600, color: 'var(--tx-3)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {progress.current}/{progress.total}
                        </span>

                        <button
                            onClick={onCancel}
                            style={{
                                width: 24, height: 24,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: 6, border: 'none', background: 'transparent',
                                color: 'var(--tx-3)', cursor: 'pointer',
                                transition: 'background 110ms, color 110ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--tx-1)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' }}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Overall progress bar */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>Overall</span>
                            <span style={{ fontSize: 10.5, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                                {pct}%
                            </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: 'var(--s4)', overflow: 'hidden' }}>
                            <motion.div
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                style={{
                                    height: '100%', borderRadius: 99,
                                    background: 'var(--gradient-accent)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Per-page progress */}
                    {progress.pageProgress > 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>Current page</span>
                                <span style={{ fontSize: 10.5, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                                    {progress.pageProgress}%
                                </span>
                            </div>
                            <div style={{ height: 3, borderRadius: 99, background: 'var(--s4)', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ width: `${progress.pageProgress}%` }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        height: '100%', borderRadius: 99,
                                        background: 'rgba(99,102,241,0.4)',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Status badges */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {progress.completedIds.size > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 99,
                                background: 'rgba(34,197,94,0.10)',
                                border: '1px solid rgba(34,197,94,0.25)',
                            }}>
                                <CheckCircle2 size={10} color="#22c55e" />
                                <span style={{ fontSize: 10.5, color: '#22c55e', fontWeight: 500 }}>
                                    {progress.completedIds.size} done
                                </span>
                            </div>
                        )}
                        {progress.errorIds.size > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 99,
                                background: 'rgba(239,68,68,0.10)',
                                border: '1px solid rgba(239,68,68,0.25)',
                            }}>
                                <AlertCircle size={10} color="#ef4444" />
                                <span style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 500 }}>
                                    {progress.errorIds.size} failed
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
OCRProgressPanel.displayName = 'OCRProgressPanel'
