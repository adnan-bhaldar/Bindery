import { memo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePreview } from '@/hooks/usePreview'
import { useActivePreset } from '@/stores/exportStore'
import { resolvePageAspect } from '@/lib/pageLayout'
import { PreviewCanvas } from './PreviewCanvas'
import { PreviewToolbar } from './PreviewToolbar'
import { PageFramePreview } from './PageFramePreview'
import type { Page } from '@/types'

// ─── Grid view ────────────────────────────────────────────────────────────────
// Each cell's own aspect ratio is now computed from the SAME page-size/
// orientation/rotation logic PreviewCanvas uses (resolvePageAspect), instead
// of a fixed 3:4 box every card was squeezed into regardless of its actual
// page shape. PageFramePreview renders the page-size/margin/fit-aware
// content inside it, matching what Single view (and the real export) shows.

const GridView = memo(({ pages, currentIndex, onSelect }: {
    pages: Page[]
    currentIndex: number
    onSelect: (i: number) => void
}) => {
    const preset = useActivePreset()

    return (
        <div style={{
            flex: 1, overflowY: 'auto', padding: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
            alignContent: 'start',
        }}>
            {pages.map((page, i) => {
                const isActive = i === currentIndex
                const aspect = resolvePageAspect(
                    preset.pageSize, preset.orientation,
                    page.metadata.width, page.metadata.height, page.rotation
                )
                return (
                    <motion.div
                        key={page.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        onClick={() => onSelect(i)}
                        style={{
                            display: 'flex', flexDirection: 'column', gap: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            aspectRatio: `${aspect.w} / ${aspect.h}`,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                            background: 'var(--canvas-bg)',
                            boxShadow: isActive
                                ? '0 0 0 3px var(--accent-dim), var(--sh-md)'
                                : 'var(--sh-sm)',
                            transition: 'border-color 110ms, box-shadow 110ms',
                            position: 'relative',
                        }}>
                            <PageFramePreview page={page} loading="lazy" />
                        </div>
                        <p style={{
                            fontSize: 10.5, textAlign: 'center',
                            color: isActive ? 'var(--accent)' : 'var(--tx-3)',
                            fontFamily: 'var(--font-mono)', fontWeight: isActive ? 600 : 400,
                        }}>
                            {i + 1}
                        </p>
                    </motion.div>
                )
            })}
        </div>
    )
})
GridView.displayName = 'GridView'

// ─── Continuous view ──────────────────────────────────────────────────────────
// Same idea: the wrapper's aspect ratio previously came from the raw image's
// own metadata dimensions only (rotation-aware, but with no idea what page
// size/orientation preset was active). Now uses the full resolvePageAspect,
// so a page set to A4/Letter/etc. actually shows as that shape here too.

const ContinuousView = memo(({ pages, zoom }: {
    pages: Page[]
    zoom: number
}) => {
    const preset = useActivePreset()

    return (
        <div style={{
            flex: 1, overflowY: 'auto',
            padding: 32,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 24,
        }}>
            {pages.map((page, i) => {
                const aspect = resolvePageAspect(
                    preset.pageSize, preset.orientation,
                    page.metadata.width, page.metadata.height, page.rotation
                )

                return (
                    <motion.div
                        key={page.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        style={{
                            position: 'relative',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            borderRadius: 2,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: 'transform 200ms var(--ease-out)',
                            width: '100%', maxWidth: 600,
                            aspectRatio: `${aspect.w} / ${aspect.h}`,
                            background: 'var(--canvas-bg)',
                        }}
                    >
                        <PageFramePreview page={page} loading="lazy" />
                        {/* Page number label */}
                        <div style={{
                            position: 'absolute', bottom: -24, left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 10.5, color: 'var(--tx-4)',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                        }}>
                            {i + 1} / {pages.length}
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
})
ContinuousView.displayName = 'ContinuousView'

// ─── PreviewWorkspace ─────────────────────────────────────────────────────────

export const PreviewWorkspace = memo(() => {
    const {
        pages, currentPage, currentPageIndex,
        view, zoom, isFullscreen,
        canGoPrev, canGoNext,
        goTo, goNext, goPrev, goFirst, goLast,
        setView, zoomIn, zoomOut, resetZoom, setZoom,
        toggleFullscreen,
    } = usePreview()

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault(); goNext(); break
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault(); goPrev(); break
                case 'Home':
                    e.preventDefault(); goFirst(); break
                case 'End':
                    e.preventDefault(); goLast(); break
                case 'f':
                case 'F':
                    toggleFullscreen(); break
                case '+':
                case '=':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); zoomIn() } break
                case '-':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); zoomOut() } break
                case '0':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); resetZoom() } break
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [goNext, goPrev, goFirst, goLast, zoomIn, zoomOut, resetZoom, toggleFullscreen])

    if (pages.length === 0) return null

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative',
            background: 'var(--canvas-bg)',
        }}>
            {/* Main content area */}
            {view === 'single' && currentPage && (
                <PreviewCanvas
                    page={currentPage}
                    zoom={zoom}
                    onZoomChange={setZoom}
                />
            )}

            {view === 'grid' && (
                <GridView
                    pages={pages}
                    currentIndex={currentPageIndex}
                    onSelect={goTo}
                />
            )}

            {view === 'continuous' && (
                <ContinuousView pages={pages} zoom={zoom} />
            )}

            {/* Floating toolbar */}
            <PreviewToolbar
                currentIndex={currentPageIndex}
                total={pages.length}
                zoom={zoom}
                view={view}
                isFullscreen={isFullscreen}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                onFirst={goFirst}
                onLast={goLast}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onViewChange={setView}
                onFullscreen={toggleFullscreen}
                onGoTo={goTo}
            />
        </div>
    )
})
PreviewWorkspace.displayName = 'PreviewWorkspace'