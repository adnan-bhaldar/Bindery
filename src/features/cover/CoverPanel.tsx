import { memo, useCallback } from 'react'
import { Crown, RotateCw } from 'lucide-react'
import { usePagesStore, selectCoverPage } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { Toggle } from '@/components/ui/Toggle'

// ─── Cover preview card ───────────────────────────────────────────────────────

const CoverPreview = memo(() => {
    const coverPage = usePagesStore(selectCoverPage)
    const { setCoverPage, rotatePage } = usePagesStore()
    const pages = usePagesStore((s) => s.pages)

    const handleSetCover = useCallback((pageId: string) => {
        setCoverPage(pageId)
    }, [setCoverPage])

    if (!coverPage) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: '32px 20px', textAlign: 'center',
            }}>
                <div style={{
                    width: 80, height: 108, borderRadius: 8,
                    background: 'var(--s3)', border: '2px dashed var(--border-hard)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Crown size={24} color="var(--tx-4)" strokeWidth={1.5} />
                </div>
                <div>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)', marginBottom: 4 }}>
                        No cover page
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.6 }}>
                        Import images first — the first page becomes your cover
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 14px' }}>
            {/* Cover image */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    width: 100, height: 136, borderRadius: 8,
                    overflow: 'hidden', border: '2px solid var(--accent)',
                    boxShadow: '0 0 0 3px var(--accent-dim), var(--sh-lg)',
                    position: 'relative', background: 'var(--s3)',
                }}>
                    {coverPage.thumbnailUrl ? (
                        <img
                            src={coverPage.thumbnailUrl}
                            alt="Cover"
                            style={{
                                width: '100%', height: '100%', objectFit: 'contain',
                                transform: `rotate(${coverPage.rotation}deg)`,
                                transition: 'transform 300ms var(--ease-out)',
                            }}
                        />
                    ) : (
                        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                    )}

                    {/* Crown badge */}
                    <div style={{
                        position: 'absolute', top: 5, left: 5,
                        width: 20, height: 20, borderRadius: 99,
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Crown size={10} color="#f59e0b" />
                    </div>
                </div>

                {/* Cover actions */}
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                    <Tooltip content="Rotate cover" placement="left">
                        <button
                            onClick={() => rotatePage(coverPage.id, ((coverPage.rotation + 90) % 360) as 0 | 90 | 180 | 270)}
                            style={actionBtnStyle}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                        >
                            <RotateCw size={12} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Filename */}
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx-2)', marginBottom: 2 }}>
                    Page {(pages.findIndex(p => p.id === coverPage.id) + 1)}
                </p>
                <p style={{
                    fontSize: 10.5, color: 'var(--tx-3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {coverPage.metadata.filename}
                </p>
            </div>

            {/* Pick different cover */}
            {pages.length > 1 && (
                <div>
                    <p className="section-label" style={{ marginBottom: 8 }}>Change cover</p>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6, maxHeight: 180, overflowY: 'auto',
                    }}>
                        {pages.map((page, i) => (
                            <Tooltip key={page.id} content={`Page ${i + 1}: ${page.metadata.filename}`} placement="top">
                                <button
                                    onClick={() => handleSetCover(page.id)}
                                    style={{
                                        padding: 0, border: 'none', background: 'transparent',
                                        cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                                        outline: page.id === coverPage.id ? '2px solid var(--accent)' : '2px solid transparent',
                                        outlineOffset: 1,
                                        transition: 'outline-color 110ms',
                                        aspectRatio: '3/4',
                                    }}
                                >
                                    {page.thumbnailUrl ? (
                                        <img
                                            src={page.thumbnailUrl}
                                            alt={`Page ${i + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                                    )}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
})
CoverPreview.displayName = 'CoverPreview'

// ─── Cover settings ───────────────────────────────────────────────────────────

const CoverSettings = memo(() => {
    const { settings, updateSetting } = useSettingsStore()

    const rows = [
        {
            key: 'useFirstPageAsCover' as const,
            label: 'First page is cover',
            desc: 'Automatically use the first page as the cover',
        },
        {
            key: 'showCoverBadge' as const,
            label: 'Show cover badge',
            desc: 'Display a crown badge on the cover thumbnail',
        },
        {
            key: 'askBeforeReplacingCover' as const,
            label: 'Confirm cover change',
            desc: 'Ask before replacing the current cover',
        },
    ]

    return (
        <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p className="section-label" style={{ padding: '12px 0 6px' }}>Cover settings</p>
            {rows.map(({ key, label, desc }) => (
                <div key={key} className="settings-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)' }}>{label}</p>
                        <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1, lineHeight: 1.4 }}>{desc}</p>
                    </div>
                    <Toggle
                        checked={settings[key] as boolean}
                        onChange={v => updateSetting(key, v)}
                        size="sm"
                    />
                </div>
            ))}
        </div>
    )
})
CoverSettings.displayName = 'CoverSettings'

// ─── CoverPanel ───────────────────────────────────────────────────────────────

export const CoverPanel = memo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <CoverPreview />
        <div className="divider" />
        <CoverSettings />
    </div>
))
CoverPanel.displayName = 'CoverPanel'

const actionBtnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--s4)', color: 'var(--tx-2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background 110ms',
}
