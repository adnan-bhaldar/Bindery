import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, Trash2, X } from 'lucide-react'
import { useStorageWarning } from '@/hooks/useStorageWarning'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { clearDatabase } from '@/db/schema'
import { toast } from 'sonner'

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// ─── Clear-data confirmation ────────────────────────────────────────────────
// Purpose-built rather than reusing the shared useConfirm() dialog — this
// flow needs a genuine 3-way choice (close / clear all / keep current
// project), not the generic confirm/cancel shape every other confirm() call
// in the app relies on.
//
// This performs an irreversible deletion, so it's treated as a real modal:
// role="dialog" + aria-modal, focus moves in on open and is trapped inside
// (background controls must not be reachable while it's up), focus returns
// to whatever triggered it on close, and Escape closes it — but only while
// not mid-delete (busy), so a click can't be raced by an accidental Escape.
const ClearDataConfirm = memo(({
    projectName, onClose, onClearAll, onClearOthers, busy,
}: {
    projectName?: string
    onClose: () => void
    onClearAll: () => void
    onClearOthers: () => void
    busy: boolean
}) => {
    const dialogRef = useRef<HTMLDivElement>(null)
    const previouslyFocused = useRef<HTMLElement | null>(null)
    // The effect below runs once (mount/unmount only) so it can safely
    // register/unregister its listener and do focus restoration exactly
    // once — but that means handleKeyDown's closure would otherwise
    // capture `busy` and `onClose` from that first render and never see
    // later updates (onClose is an inline arrow function in the parent,
    // not wrapped in useCallback, so it closes over `clearing` as it was
    // AT MOUNT — always false — and would ignore later changes too).
    // Mirroring both into refs, updated on every render, lets the handler
    // always read the current values without re-running the whole effect.
    const busyRef = useRef(busy)
    busyRef.current = busy
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        previouslyFocused.current = document.activeElement as HTMLElement | null
        dialogRef.current?.focus()

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (busyRef.current) return
                e.preventDefault()
                onCloseRef.current()
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={busy ? undefined : onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9000,
                    background: 'color-mix(in srgb, var(--bg-app) 45%, transparent)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                }}
            />
            <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="clear-data-title"
                aria-describedby="clear-data-desc"
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'fixed', inset: 0, margin: 'auto',
                    zIndex: 9001, width: 388, height: 'fit-content',
                    outline: 'none',
                }}
            >
                <div style={{
                    position: 'absolute', inset: -28, zIndex: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 65% 55% at 50% 8%, rgba(239,68,68,0.28), transparent 70%)',
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
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                        background: 'linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 32%)',
                    }} />

                    <button
                        className="icon-btn"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                        style={{ position: 'absolute', top: 14, right: 14, zIndex: 3, opacity: busy ? 0.5 : 1 }}
                    >
                        <X size={14} />
                    </button>

                    {/* Body */}
                    <div style={{ position: 'relative', zIndex: 1, padding: '26px 24px 20px' }}>
                        <div style={{ position: 'relative', width: 46, height: 46, marginBottom: 18 }}>
                            <div style={{
                                position: 'absolute', inset: -10, borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(239,68,68,0.28), transparent 72%)',
                            }} />
                            <div style={{
                                position: 'relative', width: 46, height: 46, borderRadius: 15,
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.28)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ color: '#f87171', display: 'flex' }}>
                                    <Trash2 size={20} strokeWidth={2.25} />
                                </span>
                            </div>
                        </div>

                        <p id="clear-data-title" style={{
                            fontSize: 15.5, fontWeight: 700, color: 'var(--tx-1)',
                            letterSpacing: '-0.3px', marginBottom: 8, lineHeight: 1.3,
                        }}>
                            Clear data?
                        </p>

                        <p id="clear-data-desc" style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.65 }}>
                            {projectName
                                ? `Choose how much to clear. "${projectName}" is currently open.`
                                : 'This permanently deletes every project, page, thumbnail, and export record stored in this browser.'}
                            {' '}This cannot be undone.
                        </p>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-soft)' }} />

                    {/* Actions */}
                    <div style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', gap: 8,
                        padding: '16px 24px 20px',
                        background: 'var(--bg-panel)',
                    }}>
                        <button
                            onClick={onClearAll}
                            disabled={busy}
                            style={{
                                flex: 1, padding: '10px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(239,68,68,0.35)',
                                background: 'rgba(239,68,68,0.10)',
                                color: '#f87171',
                                fontSize: 13, fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: busy ? 'default' : 'pointer',
                                opacity: busy ? 0.6 : 1,
                                transition: 'background 130ms, border-color 130ms',
                            }}
                            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(239,68,68,0.16)' }}
                            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                        >
                            Clear All
                        </button>

                        <button
                            onClick={onClearOthers}
                            disabled={busy || !projectName}
                            style={{
                                flex: 1, padding: '10px 16px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                color: '#fff',
                                fontSize: 13, fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: busy || !projectName ? 'default' : 'pointer',
                                opacity: busy || !projectName ? 0.6 : 1,
                                boxShadow: '0 4px 16px rgba(239,68,68,0.32)',
                                transition: 'transform 130ms, box-shadow 130ms',
                            }}
                            onMouseEnter={e => { if (!busy && projectName) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 7px 22px rgba(239,68,68,0.32)' } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.32)' }}
                        >
                            {projectName ? 'Clear Other Projects' : 'Clear Everything'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    )
})
ClearDataConfirm.displayName = 'ClearDataConfirm'

export const StorageWarningDialog = memo(() => {
    const { isFull, percentUsed, refresh } = useStorageWarning()
    const { currentProject } = useProjectStore()
    const [dismissed, setDismissed] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [clearing, setClearing] = useState(false)

    const visible = isFull && !dismissed

    const runClear = useCallback(async (mode: 'all' | 'others') => {
        setClearing(true)
        try {
            if (mode === 'others' && currentProject) {
                const count = await projectService.deleteAllProjectsExcept(currentProject.id)
                toast.success(count > 0 ? `Cleared ${count} other project${count === 1 ? '' : 's'}` : 'Nothing else to clear')
            } else {
                await clearDatabase()
                toast.success('All local data cleared')
            }
            await refresh()
            window.location.reload()
        } catch (err) {
            toast.error('Failed to clear data', { description: err instanceof Error ? err.message : undefined })
            setClearing(false)
            setShowConfirm(false)
        }
    }, [currentProject, refresh])

    return (
        <>
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
                                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                boxShadow: '0 2px 8px rgba(245,158,11,0.30)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <HardDrive size={15} color="#fff" strokeWidth={2.5} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                    Storage almost full
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1 }}>
                                    {Math.round(percentUsed * 100)}% of available storage used
                                </p>
                            </div>
                            <button
                                className="icon-btn"
                                onClick={() => setDismissed(true)}
                                style={{ flexShrink: 0 }}
                                aria-label="Dismiss storage warning"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={() => setShowConfirm(true)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                padding: '9px 16px',
                                background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff',
                                border: 'none', borderRadius: 'var(--r-md)',
                                fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
                                cursor: 'pointer',
                                boxShadow: '0 2px 10px rgba(239,68,68,0.32)',
                                transition: 'opacity 110ms, transform 110ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
                        >
                            <Trash2 size={13} strokeWidth={2.5} />
                            Clear Data
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showConfirm && (
                    <ClearDataConfirm
                        projectName={currentProject?.name}
                        busy={clearing}
                        onClose={() => { if (!clearing) setShowConfirm(false) }}
                        onClearAll={() => runClear('all')}
                        onClearOthers={() => runClear('others')}
                    />
                )}
            </AnimatePresence>
        </>
    )
})
StorageWarningDialog.displayName = 'StorageWarningDialog'