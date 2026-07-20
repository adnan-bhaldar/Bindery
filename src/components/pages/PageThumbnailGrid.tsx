import { memo, useState } from 'react'
import { Crown } from 'lucide-react'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUIStore } from '@/stores/uiStore'
import { RotatedImage } from '@/components/common/RotatedImage'
import { usePageContextMenu } from '@/hooks/usePageContextMenu'
import type { Page } from '@/types'

interface Props {
    page: Page
    index: number
    allPageIds: string[]
}

export const PageThumbnailGrid = memo(({ page, index, allPageIds }: Props) => {
    const [hovered, setHovered] = useState(false)
    const isSelected = useSelectionStore(s => s.selectedIds.has(page.id))
    const anchorId = useSelectionStore(s => s.anchorId)
    const { selectOnly, toggle, selectRange, setAnchor } = useSelectionStore()
    const setPreviewPage = useUIStore(s => s.setCurrentPreviewPageId)
    const { openPageContextMenu } = usePageContextMenu()

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey && anchorId) selectRange(allPageIds, anchorId, page.id)
        else if (e.metaKey || e.ctrlKey) toggle(page.id)
        else { selectOnly(page.id); setAnchor(page.id) }
        setPreviewPage(page.id, allPageIds.map(id => ({ id })))
    }

    return (
        <div
            onClick={handleClick}
            onContextMenu={e => openPageContextMenu(e, page)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '6px 4px 8px',
                borderRadius: 10, cursor: 'pointer',
                background: isSelected ? 'var(--accent-dim)' : hovered ? 'var(--hover)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent-border)' : 'transparent'}`,
                transition: 'background 110ms, border-color 110ms',
                userSelect: 'none', position: 'relative',
                minWidth: 0, // flex items default to min-width:auto — without this,
                // this column's own intrinsic content size (walking down to the
                // deliberately-oversized rotated <img>) can push it wider than
                // its 1fr grid track, the same class of issue as the grid item
                // itself further up in VirtualizedPageList.
            }}
        >
            {/* Thumbnail */}
            <div style={{
                width: '100%', aspectRatio: '3/4',
                borderRadius: 6, overflow: 'hidden',
                background: 'var(--s3)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : hovered ? 'var(--border-hard)' : 'var(--border)'}`,
                boxShadow: isSelected
                    ? '0 0 0 2px var(--accent-dim), var(--sh-sm)'
                    : hovered ? 'var(--sh-md)' : 'var(--sh-xs)',
                transition: 'border-color 110ms, box-shadow 110ms, transform 120ms',
                transform: hovered && !isSelected ? 'translateY(-2px)' : 'none',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 0, minHeight: 0,
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

                {/* Cover badge */}
                {page.isCover && (
                    <div style={{
                        position: 'absolute', top: 3, left: 3,
                        width: 16, height: 16, borderRadius: 99,
                        background: 'rgba(0,0,0,0.72)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Crown size={8} color="#f59e0b" />
                    </div>
                )}

                {/* OCR dot */}
                {page.ocrStatus === 'done' && (
                    <div style={{
                        position: 'absolute', bottom: 3, right: 3,
                        width: 7, height: 7, borderRadius: 99,
                        background: '#22c55e', border: '1px solid rgba(0,0,0,0.3)',
                    }} />
                )}
            </div>

            {/* Label */}
            <p style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', lineHeight: 1,
                color: isSelected ? 'var(--accent)' : 'var(--tx-3)',
                fontWeight: isSelected ? 600 : 400,
            }}>
                {String(index + 1).padStart(2, '0')}
            </p>
        </div>
    )
})
PageThumbnailGrid.displayName = 'PageThumbnailGrid'