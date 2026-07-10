import { memo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePreview } from '@/hooks/usePreview'
import { PreviewCanvas } from './PreviewCanvas'
import { PreviewToolbar } from './PreviewToolbar'
import { RotatedImage } from '@/components/common/RotatedImage'

// ─── Grid view ────────────────────────────────────────────────────────────────

const GridView = memo(({ pages, currentIndex, onSelect }: {
    pages: { id: string; thumbnailUrl?: string; rotation: number }[]
    currentIndex: number
    onSelect: (i: number) => void
}) => {
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
                            aspectRatio: '3/4',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                            background: '#fff',
                            boxShadow: isActive
                                ? '0 0 0 3px var(--accent-dim), var(--sh-md)'
                                : 'var(--sh-sm)',
                            transition: 'border-color 110ms, box-shadow 110ms',
                            position: 'relative',
                        }}>
                            {page.thumbnailUrl ? (
                                <RotatedImage
                                    src={page.thumbnailUrl}
                                    alt={`Page ${i + 1}`}
                                    rotation={page.rotation}
                                    transitionMs={300}
                                />
                            ) : (
                                <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
                            )}
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

const ContinuousView = memo(({ pages, zoom }: {
    pages: { id: string; thumbnailUrl?: string; rotation: number; metadata: { width: number; height: number } }[]
    zoom: number
}) => {
    return (
        <div style={{
            flex: 1, overflowY: 'auto',
            padding: 32,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 24,
        }}>
            {pages.map((page, i) => {
                const url = page.thumbnailUrl
                const isRotated90 = page.rotation === 90 || page.rotation === 270
                const { width: metaW, height: metaH } = page.metadata

                // The wrapper's own aspect ratio must reflect the ROTATED
                // shape (swap width/height for 90/270°) — this is what
                // actually determines the auto-computed height in this
                // "natural document flow" layout, same role that cardW/cardH
                // plays in the single-page PreviewCanvas.
                const aspectRatio = metaW && metaH
                    ? isRotated90 ? `${metaH} / ${metaW}` : `${metaW} / ${metaH}`
                    : '3 / 4' // fallback while metadata/thumbnail hasn't loaded yet

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
                            aspectRatio,
                            background: '#fff',
                        }}
                    >
                        {url ? (
                            <RotatedImage
                                src={url}
                                alt={`Page ${i + 1}`}
                                rotation={page.rotation}
                            />
                        ) : (
                            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                        )}
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