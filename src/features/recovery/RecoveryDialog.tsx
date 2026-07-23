import { memo, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, RotateCcw, X } from 'lucide-react'
import { projectService } from '@/services/projectService'
import { useProjectStore } from '@/stores/projectStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { RecoverySnapshot } from '@/types'
import { suppressNextDirtyFlag } from '@/stores/storeLinks'

export const RecoveryDialog = memo(() => {
    const [snapshots, setSnapshots] = useState<RecoverySnapshot[]>([])
    const [projectName, setProjectName] = useState<string | null>(null)
    const [visible, setVisible] = useState(false)
    const [restoring, setRestoring] = useState(false)

    const { setCurrentProject } = useProjectStore()
    const { setPages } = usePagesStore()
    const { settings } = useSettingsStore()

    useEffect(() => {
        if (!settings.restorePreviousSession) return

        const check = async () => {
            const lastId = await projectService.getLastProjectId()
            if (!lastId) return

            const snaps = await projectService.getRecoverySnapshots(lastId)
            if (snaps.length > 0) {
                const project = await projectService.getProject(lastId)
                setProjectName(project?.name ?? null)
                setSnapshots(snaps)
                setVisible(true)
            }
        }

        // Small delay so app renders first
        const timer = setTimeout(check, 800)
        return () => clearTimeout(timer)
    }, [settings.restorePreviousSession])

    const handleRestore = useCallback(async (snapshot: RecoverySnapshot) => {
        setRestoring(true)
        try {
            const result = await projectService.loadProject(snapshot.projectId)
            if (!result) {
                toast.error('Could not restore project')
                setVisible(false)
                return
            }
            setCurrentProject(result.project)
            suppressNextDirtyFlag(); setPages(result.pages)
            toast.success(`Restored "${result.project.name}" — ${result.pages.length} pages`)
            setVisible(false)
        } catch {
            toast.error('Restoration failed')
        } finally {
            setRestoring(false)
        }
    }, [setCurrentProject, setPages])

    const handleDismiss = useCallback(() => setVisible(false), [])

    if (snapshots.length === 0) return null

    const latest = snapshots[0]

    return (
        <AnimatePresence>
            {visible && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 300,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -12 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed', inset: 0, margin: 'auto',
                            zIndex: 301,
                            width: 400, height: 'fit-content',
                            maxHeight: '80vh',
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 'var(--r-2xl)',
                            boxShadow: 'var(--sh-dialog)',
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '16px 20px', borderBottom: '1px solid var(--border)',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'rgba(245,158,11,0.12)',
                                border: '1px solid rgba(245,158,11,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <AlertTriangle size={18} color="#f59e0b" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.3px' }}>
                                    Restore Previous Session?
                                </p>
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 2 }}>
                                    Unsaved work was found from your last session
                                </p>
                            </div>
                            <button
                                className="icon-btn"
                                onClick={handleDismiss}
                                style={{ flexShrink: 0 }}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Snapshot info */}
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{
                                padding: 14, borderRadius: 'var(--r-lg)',
                                background: 'var(--s3)', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <Clock size={16} color="var(--tx-3)" strokeWidth={1.5} />
                                <div style={{ flex: 1 }}>
                                    {projectName && (
                                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx-1)' }}>
                                            {projectName}
                                        </p>
                                    )}
                                    <p style={{
                                        fontSize: projectName ? 11 : 12.5,
                                        fontWeight: projectName ? 400 : 500,
                                        color: projectName ? 'var(--tx-3)' : 'var(--tx-1)',
                                        marginTop: projectName ? 1 : 0,
                                    }}>
                                        {latest.description}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>
                                        {latest.pageCount} pages · {formatRelativeTime(latest.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <p style={{ fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.6 }}>
                                Bindery found unsaved changes. Would you like to restore your last working session?
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{
                            display: 'flex', gap: 8, padding: '0 20px 20px',
                        }}>
                            <button
                                onClick={handleDismiss}
                                style={{
                                    flex: 1, padding: '9px 16px',
                                    borderRadius: 'var(--r-md)',
                                    border: '1px solid var(--border)', background: 'var(--s3)',
                                    color: 'var(--tx-2)', fontSize: 12.5, fontWeight: 500,
                                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                    transition: 'background 110ms',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)' }}
                            >
                                Start Fresh
                            </button>
                            <button
                                onClick={() => handleRestore(latest)}
                                disabled={restoring}
                                style={{
                                    flex: 1, padding: '9px 16px',
                                    borderRadius: 'var(--r-md)',
                                    border: 'none', background: 'var(--gradient-accent)',
                                    color: '#fff', fontSize: 12.5, fontWeight: 600,
                                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: '0 2px 10px var(--accent-glow)',
                                    transition: 'opacity 110ms',
                                    opacity: restoring ? 0.7 : 1,
                                }}
                            >
                                <RotateCcw size={13} />
                                {restoring ? 'Restoring…' : 'Restore Session'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})
RecoveryDialog.displayName = 'RecoveryDialog'