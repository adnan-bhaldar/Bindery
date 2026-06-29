import { memo, useState } from 'react'
import { RotateCw, Trash2, Copy, Crown } from 'lucide-react'
import { usePagesStore } from '@/stores/pagesStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Page } from '@/types'

interface Props {
    page: Page
    index: number
    allPageIds: string[]
}

export const PageThumbnailGrid = memo(({ page, index, allPageIds }: Props) => {
    const [hovered, setHovered] = useState(false)
    const { removePage, rotatePage, duplicatePage } = usePagesStore()
    const isSelected = useSelectionStore(s => s.selectedIds.has(page.id))
    const anchorId = useSelectionStore(s => s.anchorId)
    const { selectOnly, toggle, selectRange, setAnchor } = useSelectionStore()

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey && anchorId) selectRange(allPageIds, anchorId, page.id)
        else if (e.metaKey || e.ctrlKey) toggle(page.id)
        else { selectOnly(page.id); setAnchor(page.id) }
    }

    return (
        <div
            onClick={handleClick}
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
            }}>
                {page.thumbnailUrl ? (
                    <img
                        src={page.thumbnailUrl}
                        alt={`Page ${index + 1}`}
                        draggable={false}
                        style={{
                            width: '100%', height: '100%',
                            objectFit: 'contain',
                            transform: `rotate(${page.rotation}deg)`,
                            transition: 'transform 280ms var(--ease-out)',
                            display: 'block',
                        }}
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

                {/* Hover actions */}
                {hovered && (
                    <div style={{
                        position: 'absolute', top: 3, right: 3,
                        display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                        {[
                            {
                                tip: 'Rotate', icon: <RotateCw size={10} />,
                                onClick: (e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    rotatePage(page.id, ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270)
                                },
                                danger: false,
                            },
                            {
                                tip: 'Duplicate', icon: <Copy size={10} />,
                                onClick: (e: React.MouseEvent) => { e.stopPropagation(); duplicatePage(page.id) },
                                danger: false,
                            },
                            {
                                tip: 'Delete', icon: <Trash2 size={10} />,
                                onClick: (e: React.MouseEvent) => { e.stopPropagation(); removePage(page.id) },
                                danger: true,
                            },
                        ].map(({ tip, icon, onClick, danger }) => (
                            <Tooltip key={tip} content={tip} placement="left">
                                <button
                                    onClick={onClick}
                                    style={{
                                        width: 20, height: 20, borderRadius: 5, border: 'none',
                                        background: danger ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.70)',
                                        backdropFilter: 'blur(4px)',
                                        color: '#fff', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'background 110ms',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = danger
                                            ? 'rgba(239,68,68,1)' : 'rgba(0,0,0,0.92)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = danger
                                            ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.70)'
                                    }}
                                >
                                    {icon}
                                </button>
                            </Tooltip>
                        ))}
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