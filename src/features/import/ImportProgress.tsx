import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { ImportProgress as IProgress } from '@/services/importService'

interface Props {
    progress: IProgress | null
    isVisible: boolean
}

export const PHASE_LABELS: Record<IProgress['phase'], string> = {
    validating: 'Checking files…',
    hashing: 'Checking for duplicates…',
    thumbnails: 'Processing images…',
    saving: 'Saving…',
    done: 'Done',
}

export const ImportProgressOverlay = memo(({ progress, isVisible }: Props) => {
    if (!progress && !isVisible) return null

    const isDone = progress?.phase === 'done'
    const pct = progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0

    return (
        <AnimatePresence>
            {isVisible && progress && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'fixed',
                        bottom: 24, left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 200,
                        minWidth: 280, maxWidth: 380,
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border-hard)',
                        borderRadius: 14,
                        padding: '12px 16px',
                        boxShadow: 'var(--sh-xl)',
                        display: 'flex', flexDirection: 'column', gap: 10,
                        pointerEvents: 'none',
                    }}
                >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: isDone ? 'rgba(34,197,94,0.12)' : 'var(--accent-dim)',
                            border: `1px solid ${isDone ? 'rgba(34,197,94,0.25)' : 'var(--accent-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {isDone
                                ? <CheckCircle2 size={14} color="#22c55e" />
                                : <Loader2 size={14} color="var(--accent)"
                                    style={{ animation: 'spin 0.7s linear infinite' }} />
                            }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.1px' }}>
                                {progress ? PHASE_LABELS[progress.phase] : 'Importing…'}
                            </p>
                            {progress?.currentFile && !isDone && (
                                <p style={{
                                    fontSize: 10.5, color: 'var(--tx-3)', marginTop: 1,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {progress.currentFile}
                                </p>
                            )}
                        </div>

                        {progress && progress.total > 1 && (
                            <span style={{
                                fontSize: 10.5, fontWeight: 600, color: 'var(--tx-3)',
                                fontFamily: 'var(--font-mono)', flexShrink: 0,
                            }}>
                                {progress.current}/{progress.total}
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    {progress && progress.total > 0 && !isDone && (
                        <div style={{ height: 3, borderRadius: 99, background: 'var(--s4)', overflow: 'hidden' }}>
                            <motion.div
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                style={{
                                    height: '100%', borderRadius: 99,
                                    background: 'var(--gradient-accent)',
                                }}
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
})
ImportProgressOverlay.displayName = 'ImportProgressOverlay'