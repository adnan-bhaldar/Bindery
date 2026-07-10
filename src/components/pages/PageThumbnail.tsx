import { memo, useState } from 'react'
import { RotateCw, Trash2, Copy, Crown } from 'lucide-react'
import { usePagesStore } from '@/stores/pagesStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUIStore } from '@/stores/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { RotatedImage } from '@/components/common/RotatedImage'
import type { Page } from '@/types'

interface Props {
    page: Page
    index: number
    allPageIds: string[]
}

export const PageThumbnail = memo(({ page, index, allPageIds }: Props) => {
    const [hovered, setHovered] = useState(false)
    const { removePage, rotatePage, duplicatePage } = usePagesStore()
    const isSelected = useSelectionStore(s => s.selectedIds.has(page.id))
    const anchorId = useSelectionStore(s => s.anchorId)
    const { selectOnly, toggle, selectRange, setAnchor } = useSelectionStore()
    const setPreviewPage = useUIStore(s => s.setCurrentPreviewPageId)

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey && anchorId) selectRange(allPageIds, anchorId, page.id)
        else if (e.metaKey || e.ctrlKey) toggle(page.id)
        else { selectOnly(page.id); setAnchor(page.id) }
        setPreviewPage(page.id, allPageIds.map(id => ({ id })))
    }

    const { width, height } = page.metadata
    const isLandscape = width > 0 && height > 0 && width > height
    const thumbH = isLandscape ? 38 : 64

    const pageNum = String(index + 1).padStart(2, '0')
    const filename = page.metadata.filename.replace(/\.[^/.]+$/, '') // strip extension

    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 8px', borderRadius: 9, cursor: 'pointer',
                background: isSelected ? 'var(--accent-dim)' : hovered ? 'var(--hover)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent-border)' : 'transparent'}`,
                transition: 'background 110ms, border-color 110ms',
                userSelect: 'none',
            }}
        >
            {/* Page number badge */}
            <div style={{
                width: 22, flexShrink: 0, textAlign: 'center',
            }}>
                <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: isSelected ? 'var(--accent)' : 'var(--tx-4)',
                    lineHeight: 1,
                }}>
                    {pageNum}
                </span>
            </div>

            {/* Thumbnail */}
            <div style={{
                flexShrink: 0, width: 48, height: thumbH,
                borderRadius: 5, overflow: 'hidden',
                background: 'var(--s3)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : hovered ? 'var(--border-hard)' : 'var(--border)'}`,
                boxShadow: isSelected ? '0 0 0 2px var(--accent-dim)' : hovered ? 'var(--sh-sm)' : 'var(--sh-xs)',
                transition: 'border-color 110ms, box-shadow 110ms',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {page.thumbnailUrl ? (
                    <RotatedImage
                        src={page.thumbnailUrl}
                        alt={`Page ${index + 1}`}
                        rotation={page.rotation}
                    />
                ) : (
                    <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                )}

                {/* Cover crown */}
                {page.isCover && (
                    <div style={{
                        position: 'absolute', top: 2, left: 2,
                        width: 14, height: 14, borderRadius: 99,
                        background: 'rgba(0,0,0,0.72)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Crown size={7} color="#f59e0b" />
                    </div>
                )}

                {/* OCR dot */}
                {page.ocrStatus === 'done' && (
                    <div style={{
                        position: 'absolute', bottom: 2, right: 2,
                        width: 7, height: 7, borderRadius: 99,
                        background: '#22c55e', border: '1px solid rgba(0,0,0,0.3)',
                    }} />
                )}
            </div>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip content={page.metadata.filename} placement="right">
                    <p style={{
                        fontSize: 11.5, fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--accent)' : 'var(--tx-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: 1.3,
                    }}>
                        {filename}
                    </p>
                </Tooltip>
                <p style={{
                    fontSize: 10, color: 'var(--tx-4)', marginTop: 2,
                    fontFamily: 'var(--font-mono)', lineHeight: 1,
                }}>
                    {width > 0 ? `${width}×${height}` : '—'}
                    {page.isCover && (
                        <span style={{ marginLeft: 6, color: '#f59e0b', fontFamily: 'var(--font-sans)' }}>
                            Cover
                        </span>
                    )}
                </p>
            </div>

            {/* Hover actions */}
            {hovered && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <Tooltip content="Rotate 90°" placement="left">
                        <button onClick={e => {
                            e.stopPropagation()
                            rotatePage(page.id, ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270)
                        }} style={actionBtn}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                        >
                            <RotateCw size={11} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Duplicate" placement="left">
                        <button onClick={e => { e.stopPropagation(); duplicatePage(page.id) }} style={actionBtn}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                        >
                            <Copy size={11} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Delete" placement="left">
                        <button onClick={e => { e.stopPropagation(); removePage(page.id) }}
                            style={{ ...actionBtn, color: '#ef4444' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = '#ef4444' }}
                        >
                            <Trash2 size={11} />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    )
})
PageThumbnail.displayName = 'PageThumbnail'

const actionBtn: React.CSSProperties = {
    width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: 'none',
    background: 'var(--s4)', color: 'var(--tx-2)',
    cursor: 'pointer', transition: 'background 110ms, color 110ms',
    flexShrink: 0,
}