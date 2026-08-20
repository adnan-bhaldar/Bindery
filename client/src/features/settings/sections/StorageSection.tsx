import { memo, useState, useCallback, useEffect } from 'react'
import { HardDrive, TriangleAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/hooks/useConfirm'
import { Spinner } from '@/components/ui/Spinner'
import { getStorageStats, clearDatabase, type StorageStats } from '@/db/schema'
import { formatFileSize } from '@/lib/utils'
import { Card, CardRow } from '../primitives'

// ─── Storage section — real data ──────────────────────────────────────────────

const StorageSection = memo(() => {
    const [stats, setStats] = useState<StorageStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(false)
    const confirm = useConfirm()

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const s = await getStorageStats()
            setStats(s)
        } catch (err) {
            console.error('[Storage] Failed to read stats:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    const handleClearAll = useCallback(async () => {
        const ok = await confirm({
            title: 'Clear all data?',
            message: 'This permanently deletes every project, page, thumbnail, and export record stored in this browser. This cannot be undone.',
            confirmLabel: 'Clear Everything',
            cancelLabel: 'Cancel',
            variant: 'danger',
        })
        if (!ok) return
        setClearing(true)
        try {
            await clearDatabase()
            toast.success('All local data cleared')
            window.location.reload()
        } catch (err) {
            toast.error('Failed to clear data', { description: err instanceof Error ? err.message : undefined })
        } finally {
            setClearing(false)
        }
    }, [confirm])

    const usagePct = stats && stats.quotaBytes > 0
        ? Math.min(100, (stats.totalUsageBytes / stats.quotaBytes) * 100)
        : null

    return (
        <div>
            <Card title="Local Storage" icon={HardDrive} desc="Everything below lives in this browser's IndexedDB — nothing is stored remotely.">
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--tx-3)' }}>
                        <Spinner size={14} />
                        <span style={{ fontSize: 12 }}>Reading storage usage…</span>
                    </div>
                ) : stats ? (
                    <>
                        <CardRow label="Projects" desc="Total projects saved in this browser">
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {stats.projectCount}
                            </span>
                        </CardRow>
                        <CardRow label="Pages & images" desc={`${stats.pageCount} page${stats.pageCount === 1 ? '' : 's'} across all projects`}>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {formatFileSize(stats.pagesBytes)}
                            </span>
                        </CardRow>
                        <CardRow label="Thumbnails" desc="Cached preview images">
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {formatFileSize(stats.thumbnailBytes)}
                            </span>
                        </CardRow>
                        <CardRow label="Export history" desc="Records of past PDF exports" last>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {stats.exportCount}
                            </span>
                        </CardRow>

                        {usagePct !== null && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                                        {formatFileSize(stats.totalUsageBytes)} of {formatFileSize(stats.quotaBytes)} used
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                                        {usagePct.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 99, background: 'var(--s3)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${usagePct}%`,
                                        background: usagePct > 85 ? '#ef4444' : 'var(--gradient-accent)',
                                        borderRadius: 99, transition: 'width 300ms var(--ease-out)',
                                    }} />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>Couldn't read storage usage.</p>
                )}
            </Card>

            <Card title="Danger Zone" icon={TriangleAlert}>
                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 12, lineHeight: 1.6 }}>
                    Permanently delete every project, page, thumbnail, and export record stored in
                    this browser. This cannot be undone.
                </p>
                <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 'var(--r-md)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#ef4444', fontSize: 12, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', cursor: clearing ? 'default' : 'pointer',
                        opacity: clearing ? 0.6 : 1,
                        transition: 'background 110ms',
                    }}
                    onMouseEnter={e => { if (!clearing) e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
                    onMouseLeave={e => { if (!clearing) e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                >
                    {clearing ? <Spinner size={13} /> : <Trash2 size={13} />}
                    {clearing ? 'Clearing…' : 'Clear all data'}
                </button>
            </Card>
        </div>
    )
})
StorageSection.displayName = 'StorageSection'

export default StorageSection
