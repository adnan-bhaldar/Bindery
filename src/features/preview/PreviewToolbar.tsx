import { memo } from 'react'
import {
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ZoomIn, ZoomOut, Maximize2, Minimize2, Grid3X3,
    BookOpen, AlignJustify,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { type PreviewView } from '@/hooks/usePreview'

interface Props {
    currentIndex: number
    total: number
    zoom: number
    view: PreviewView
    isFullscreen: boolean
    canGoPrev: boolean
    canGoNext: boolean
    onPrev: () => void
    onNext: () => void
    onFirst: () => void
    onLast: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
    onViewChange: (v: PreviewView) => void
    onFullscreen: () => void
    onGoTo: (i: number) => void
}

const VIEW_OPTIONS: { id: PreviewView; Icon: React.FC<{ size?: number }>; label: string }[] = [
    { id: 'single', Icon: BookOpen, label: 'Single page' },
    { id: 'continuous', Icon: AlignJustify, label: 'Continuous scroll' },
    { id: 'grid', Icon: Grid3X3, label: 'Grid view' },
]

export const PreviewToolbar = memo((props: Props) => {
    const {
        currentIndex, total, zoom, view, isFullscreen,
        canGoPrev, canGoNext,
        onPrev, onNext, onFirst, onLast,
        onZoomIn, onZoomOut, onResetZoom,
        onViewChange, onFullscreen,
    } = props

    return (
        <div style={{
            position: 'absolute', bottom: 20, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 1,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-hard)',
            borderRadius: 'var(--r-full)',
            padding: '4px 6px',
            boxShadow: 'var(--sh-xl)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            userSelect: 'none',
        }}>

            {/* ── Navigation ───────────────────────────── */}
            <Tooltip content="First page" placement="top">
                <button className="icon-btn" onClick={onFirst} disabled={!canGoPrev}>
                    <ChevronsLeft size={14} />
                </button>
            </Tooltip>

            <Tooltip content="Previous page" shortcut="←" placement="top">
                <button className="icon-btn" onClick={onPrev} disabled={!canGoPrev}>
                    <ChevronLeft size={14} />
                </button>
            </Tooltip>

            {/* Page indicator */}
            <div style={{
                padding: '0 10px', height: 30,
                display: 'flex', alignItems: 'center', gap: 4,
                borderLeft: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                margin: '0 2px',
            }}>
                <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--tx-1)',
                    fontFamily: 'var(--font-mono)',
                }}>
                    {currentIndex + 1}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tx-4)' }}>/</span>
                <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                    {total}
                </span>
            </div>

            <Tooltip content="Next page" shortcut="→" placement="top">
                <button className="icon-btn" onClick={onNext} disabled={!canGoNext}>
                    <ChevronRight size={14} />
                </button>
            </Tooltip>

            <Tooltip content="Last page" placement="top">
                <button className="icon-btn" onClick={onLast} disabled={!canGoNext}>
                    <ChevronsRight size={14} />
                </button>
            </Tooltip>

            {/* ── Separator ──────────────────────────────── */}
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

            {/* ── Zoom ───────────────────────────────────── */}
            <Tooltip content="Zoom out" shortcut="⌘−" placement="top">
                <button className="icon-btn" onClick={onZoomOut}>
                    <ZoomOut size={14} />
                </button>
            </Tooltip>

            <Tooltip content="Reset zoom" shortcut="⌘0" placement="top">
                <button
                    onClick={onResetZoom}
                    style={{
                        height: 30, padding: '0 10px',
                        border: 'none', background: 'transparent',
                        color: 'var(--tx-2)', fontSize: 11,
                        fontFamily: 'var(--font-mono)', fontWeight: 500,
                        cursor: 'pointer', borderRadius: 'var(--r-md)',
                        transition: 'background 110ms, color 110ms',
                        minWidth: 52, textAlign: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--tx-1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-2)' }}
                >
                    {Math.round(zoom * 100)}%
                </button>
            </Tooltip>

            <Tooltip content="Zoom in" shortcut="⌘+" placement="top">
                <button className="icon-btn" onClick={onZoomIn}>
                    <ZoomIn size={14} />
                </button>
            </Tooltip>

            {/* ── Separator ──────────────────────────────── */}
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

            {/* ── View toggle ─────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 1,
                background: 'var(--s3)', borderRadius: 8, padding: 2,
            }}>
                {VIEW_OPTIONS.map(({ id, Icon, label }) => (
                    <Tooltip key={id} content={label} placement="top">
                        <button
                            onClick={() => onViewChange(id)}
                            style={{
                                width: 28, height: 26, borderRadius: 6, border: 'none',
                                background: view === id ? 'var(--bg-card)' : 'transparent',
                                color: view === id ? 'var(--tx-1)' : 'var(--tx-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 110ms',
                                boxShadow: view === id ? 'var(--sh-xs)' : 'none',
                            }}
                        >
                            <Icon size={13} />
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* ── Separator ──────────────────────────────── */}
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

            {/* ── Fullscreen ──────────────────────────────── */}
            <Tooltip content={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} shortcut="F" placement="top">
                <button className="icon-btn" onClick={onFullscreen}>
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
            </Tooltip>
        </div>
    )
})
PreviewToolbar.displayName = 'PreviewToolbar'