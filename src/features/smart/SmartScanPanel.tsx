import { useShallow } from 'zustand/react/shallow'
import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Scan, Copy, FileX, AlertTriangle,
    CheckCircle2, Loader2, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { usePagesStore } from '@/stores/pagesStore'
import { runSmartScan, type SmartScanResult } from '@/services/smartService'
import { Tooltip } from '@/components/ui/Tooltip'
import { toast } from 'sonner'

// ─── Result section ───────────────────────────────────────────────────────────

const ResultSection = memo(({
    icon, label, count, color, children, defaultOpen = false,
}: {
    icon: React.ReactNode
    label: string
    count: number
    color: string
    children: React.ReactNode
    defaultOpen?: boolean
}) => {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
        }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'var(--s3)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 110ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)' }}
            >
                <span style={{ color, display: 'flex' }}>{icon}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)', textAlign: 'left' }}>
                    {label}
                </span>
                <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    padding: '1px 7px', borderRadius: 99,
                    background: count > 0 ? `${color}18` : 'var(--s4)',
                    color: count > 0 ? color : 'var(--tx-3)',
                    border: `1px solid ${count > 0 ? `${color}30` : 'var(--border)'}`,
                }}>
                    {count}
                </span>
                {open
                    ? <ChevronDown size={13} color="var(--tx-3)" />
                    : <ChevronRight size={13} color="var(--tx-3)" />
                }
            </button>
            {open && (
                <div style={{ padding: '8px 12px 12px', background: 'var(--s2)' }}>
                    {children}
                </div>
            )}
        </div>
    )
})
ResultSection.displayName = 'ResultSection'

// ─── SmartScanPanel ───────────────────────────────────────────────────────────

export const SmartScanPanel = memo(() => {
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<SmartScanResult | null>(null)
    const pageCount = usePagesStore(s => s.pages.length)
    const { removePages } = usePagesStore(
        useShallow(s => ({ removePages: s.removePages }))
    )

    const handleScan = useCallback(async () => {
        setScanning(true)
        setResult(null)
        try {
            const r = await runSmartScan(usePagesStore.getState().pages)
            setResult(r)
            const issues = r.duplicates.length + r.blankPageIds.length + r.resolutionWarnings.length
            if (issues === 0) {
                toast.success('Smart scan complete — no issues found')
            } else {
                toast.warning(`Found ${issues} issue${issues > 1 ? 's' : ''}`)
            }
        } catch {
            toast.error('Smart scan failed')
        } finally {
            setScanning(false)
        }
    }, [])

    const removeDuplicates = useCallback((_keepId: string, removeIds: string[]) => {
        removePages(removeIds)
        toast.success(`Removed ${removeIds.length} duplicate${removeIds.length > 1 ? 's' : ''}`)
    }, [removePages])

    const removeBlanks = useCallback(() => {
        if (!result) return
        removePages(result.blankPageIds)
        setResult(r => r ? { ...r, blankPageIds: [] } : null)
        toast.success(`Removed ${result.blankPageIds.length} blank page${result.blankPageIds.length > 1 ? 's' : ''}`)
    }, [removePages])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 14px' }}>
            {/* Scan button */}
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                    Smart Scan
                </p>
                <button
                    onClick={handleScan}
                    disabled={scanning || pageCount === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', justifyContent: 'center',
                        padding: '9px 16px', borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)',
                        background: scanning ? 'var(--s3)' : 'var(--accent-dim)',
                        borderColor: scanning ? 'var(--border)' : 'var(--accent-border)',
                        color: scanning ? 'var(--tx-3)' : 'var(--accent)',
                        fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        cursor: (scanning || pageCount === 0) ? 'not-allowed' : 'pointer',
                        opacity: pageCount === 0 ? 0.4 : 1,
                        transition: 'all 110ms',
                    }}
                >
                    {scanning
                        ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Scanning…</>
                        : <><Scan size={14} /> Scan for Issues</>
                    }
                </button>
            </div>

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                        {/* Duplicates */}
                        <ResultSection
                            icon={<Copy size={14} />}
                            label="Duplicate Pages"
                            count={result.duplicates.length}
                            color="#f59e0b"
                        >
                            {result.duplicates.length === 0 ? (
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', padding: '4px 0' }}>No duplicates found</p>
                            ) : result.duplicates.map((group, i) => {
                                const removeIds = group.pageIds.slice(1)
                                const pg = usePagesStore.getState().pages.find(p => p.id === group.pageIds[0])
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 11.5, color: 'var(--tx-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {pg?.metadata.filename ?? 'Unknown'}
                                            </p>
                                            <p style={{ fontSize: 11, color: 'var(--tx-3)' }}>{group.pageIds.length} copies</p>
                                        </div>
                                        <Tooltip content="Remove duplicates, keep first" placement="left">
                                            <button
                                                onClick={() => removeDuplicates(group.pageIds[0], removeIds)}
                                                style={{ ...iconActionBtn, color: '#f59e0b' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )
                            })}
                        </ResultSection>

                        {/* Blank pages */}
                        <ResultSection
                            icon={<FileX size={14} />}
                            label="Blank Pages"
                            count={result.blankPageIds.length}
                            color="#6366f1"
                        >
                            {result.blankPageIds.length === 0 ? (
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', padding: '4px 0' }}>No blank pages found</p>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <p style={{ fontSize: 11.5, color: 'var(--tx-2)' }}>
                                        {result.blankPageIds.length} blank page{result.blankPageIds.length > 1 ? 's' : ''} detected
                                    </p>
                                    <button
                                        onClick={removeBlanks}
                                        style={{ ...iconActionBtn, color: '#ef4444', gap: 4, padding: '4px 8px', borderRadius: 'var(--r-md)' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <Trash2 size={11} />
                                        <span style={{ fontSize: 11 }}>Remove all</span>
                                    </button>
                                </div>
                            )}
                        </ResultSection>

                        {/* Resolution warnings */}
                        <ResultSection
                            icon={<AlertTriangle size={14} />}
                            label="Low Resolution"
                            count={result.resolutionWarnings.length}
                            color="#ef4444"
                        >
                            {result.resolutionWarnings.length === 0 ? (
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', padding: '4px 0' }}>All images look good</p>
                            ) : result.resolutionWarnings.map(w => (
                                <div key={w.pageId} style={{ padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
                                    <p style={{ fontSize: 11.5, color: 'var(--tx-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {w.filename}
                                    </p>
                                    <p style={{ fontSize: 11, color: w.severity === 'very-low' ? '#ef4444' : '#f59e0b', marginTop: 2 }}>
                                        ~{w.estimatedDpi} DPI · {w.width}×{w.height}px
                                    </p>
                                </div>
                            ))}
                        </ResultSection>

                        {/* All clear */}
                        {result.duplicates.length === 0 && result.blankPageIds.length === 0 && result.resolutionWarnings.length === 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px', borderRadius: 'var(--r-lg)',
                                background: 'rgba(34,197,94,0.08)',
                                border: '1px solid rgba(34,197,94,0.20)',
                            }}>
                                <CheckCircle2 size={16} color="#22c55e" />
                                <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>
                                    No issues found — your project looks great
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})
SmartScanPanel.displayName = 'SmartScanPanel'

const iconActionBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 'var(--r-md)',
    border: 'none', background: 'transparent',
    cursor: 'pointer', transition: 'background 110ms',
    flexShrink: 0,
}