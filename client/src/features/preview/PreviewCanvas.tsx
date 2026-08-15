import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useActivePreset } from '@/stores/exportStore'
import { MARGIN_SIZES } from '@/constants'
import { resolvePageAspect } from '@/lib/pageLayout'
import { useUnwrappedRotation } from '@/hooks/useUnwrappedRotation'
import type { Page } from '@/types'
import { clamp } from '@/lib/utils'

interface Props {
    page: Page
    zoom: number
    onZoomChange: (z: number) => void
}

interface PanState {
    x: number; y: number; isDragging: boolean
    startX: number; startY: number; originX: number; originY: number
}

export const PreviewCanvas = memo(({ page, zoom, onZoomChange }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
    const [loaded, setLoaded] = useState(false)
    const [containerSize, setContainerSize] = useState({ w: 800, h: 600 }) // non-zero default
    const [pan, setPan] = useState<PanState>({
        x: 0, y: 0, isDragging: false,
        startX: 0, startY: 0, originX: 0, originY: 0,
    })

    const preset = useActivePreset()
    const marginKey = (page.margin ?? 'none') as keyof typeof MARGIN_SIZES
    const marginPts = MARGIN_SIZES[marginKey] ?? MARGIN_SIZES.none
    const hasMargin = marginPts.top > 0
    const isAutoSize = preset.pageSize === 'auto' || preset.pageSize === 'original'
    const isRotated90 = page.rotation === 90 || page.rotation === 270
    // Used ONLY for the CSS transform in the two <img> blocks below — every
    // other use of rotation in this file must keep using the real wrapped
    // value (isRotated90 above, the dimension-swap logic, etc.).
    const displayRotation = useUnwrappedRotation(page.rotation)

    // Object URL
    useEffect(() => {
        const url = URL.createObjectURL(page.imageBlob)
        setImageUrl(url)
        setLoaded(false)
        setPan(p => ({ ...p, x: 0, y: 0 }))
        return () => URL.revokeObjectURL(url)
    }, [page.id, page.imageBlob])

    // Container size via ResizeObserver
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        // Read initial size immediately
        setContainerSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Wheel zoom — plain scroll zooms directly; this is a single-page
    // viewer, not a scrollable list, so there's no competing vertical-
    // scroll behavior to preserve here.
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            e.preventDefault()
            onZoomChange(clamp(zoom + (e.deltaY > 0 ? -0.08 : 0.08), 0.1, 8))
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [zoom, onZoomChange])

    // Layout — reactive, always produces a value. Computed here (before the
    // pan effects below) since they need layout.cardW/cardH/availW/availH
    // to clamp panning bounds.
    const layout = useMemo(() => {
        const OUTER_PAD = 48
        const availW = Math.max(100, containerSize.w - OUTER_PAD * 2)
        const availH = Math.max(100, containerSize.h - OUTER_PAD * 2)

        // Use image dims if loaded, otherwise use natural A4 fallback
        const srcW = imgDims.w || 1
        const srcH = imgDims.h || 1

        const aspect = resolvePageAspect(preset.pageSize, preset.orientation, srcW, srcH, page.rotation)
        const baseScale = Math.min(availW / aspect.w, availH / aspect.h)
        const scale = baseScale * zoom

        const cardW = aspect.w * scale
        const cardH = aspect.h * scale

        const ptToPx = cardW / aspect.w
        const inset = {
            top: marginPts.top * ptToPx,
            right: marginPts.right * ptToPx,
            bottom: marginPts.bottom * ptToPx,
            left: marginPts.left * ptToPx,
        }

        return { cardW, cardH, inset, availW, availH }
    }, [imgDims, containerSize, preset.pageSize, preset.orientation, marginPts, zoom, page.rotation])

    // Pan — tracked on window, not the container's own mouse events. The
    // container is a fixed size, but a zoomed-in image is larger than it,
    // so panning naturally drags the cursor past the container's edge —
    // an onMouseLeave-based cancel (the previous approach) would kill the
    // drag the instant that happened, which is exactly when zoomed in.
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        setPan(p => ({ ...p, isDragging: true, startX: e.clientX, startY: e.clientY, originX: p.x, originY: p.y }))
    }, [])
    const onDblClick = useCallback(() => { setPan(p => ({ ...p, x: 0, y: 0 })); onZoomChange(1) }, [onZoomChange])

    useEffect(() => {
        if (!pan.isDragging) return
        // Bounds are recomputed here (not just read from a stale closure)
        // since this effect's dependency array includes the layout values
        // it depends on — if zoom or container size changes mid-drag, the
        // clamp stays correct rather than using whatever bounds existed
        // when the drag started.
        const maxPanX = Math.max(0, (layout.cardW - layout.availW) / 2)
        const maxPanY = Math.max(0, (layout.cardH - layout.availH) / 2)
        const handleMove = (e: MouseEvent) => {
            setPan(p => !p.isDragging ? p : {
                ...p,
                x: clamp(p.originX + (e.clientX - p.startX), -maxPanX, maxPanX),
                y: clamp(p.originY + (e.clientY - p.startY), -maxPanY, maxPanY),
            })
        }
        const handleUp = () => setPan(p => ({ ...p, isDragging: false }))
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleUp)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleUp)
        }
    }, [pan.isDragging, layout.cardW, layout.cardH, layout.availW, layout.availH])

    // Re-clamp whenever zoom/layout changes even without an active drag —
    // e.g. zooming back down to 100% (or lower) after having panned should
    // snap the image back within bounds immediately, not leave it sitting
    // wherever it was dragged to at a higher zoom level. At 100% or less
    // the image already fits entirely, so maxPan collapses to 0 and this
    // locks panning back to center.
    useEffect(() => {
        const maxPanX = Math.max(0, (layout.cardW - layout.availW) / 2)
        const maxPanY = Math.max(0, (layout.cardH - layout.availH) / 2)
        setPan(p => {
            const nx = clamp(p.x, -maxPanX, maxPanX)
            const ny = clamp(p.y, -maxPanY, maxPanY)
            if (nx === p.x && ny === p.y) return p
            return { ...p, x: nx, y: ny }
        })
    }, [layout.cardW, layout.cardH, layout.availW, layout.availH])

    // Content-area (post-margin) dimensions — the box the image must actually fill
    const frameW = layout.cardW - layout.inset.left - layout.inset.right
    const frameH = layout.cardH - layout.inset.top - layout.inset.bottom

    // Image fit
    const imgObjectFit: React.CSSProperties['objectFit'] =
        page.imageFit === 'fill' ? 'cover' :
            page.imageFit === 'stretch' ? 'fill' :
                page.imageFit === 'original' ? 'none' : 'contain'

    // Badge
    const badge = useMemo(() => {
        const parts: string[] = []
        if (!isAutoSize) parts.push(preset.pageSize.toUpperCase())
        if (preset.orientation !== 'auto') parts.push(preset.orientation.charAt(0).toUpperCase() + preset.orientation.slice(1))
        if (marginKey !== 'none') parts.push(marginKey.charAt(0).toUpperCase() + marginKey.slice(1) + ' margin')
        return parts.join(' · ')
    }, [preset.pageSize, preset.orientation, marginKey, isAutoSize])

    return (
        <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onDoubleClick={onDblClick}
            style={{
                width: '100%', height: '100%',
                overflow: 'hidden', position: 'relative',
                cursor: pan.isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
            }}
        >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                    {imageUrl && (
                        <motion.div
                            key={page.id}
                            initial={{ opacity: 0, scale: 0.97, x: pan.x, y: pan.y }}
                            animate={{ opacity: loaded ? 1 : 0, scale: 1, x: pan.x, y: pan.y }}
                            exit={{ opacity: 0 }}
                            transition={{
                                opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                                scale: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                                x: { duration: 0 },
                                y: { duration: 0 },
                            }}
                            style={{ willChange: 'transform' }}
                        >
                            {isAutoSize ? (
                                /* Auto/Original — image fills naturally, no white page card.
                                   The outer box is already sized to the ROTATED aspect ratio
                                   (see resolvePageAspect). The <img> itself is given the
                                   pre-rotation (swapped) dimensions and centered via flexbox,
                                   then rotated in place — rotating about its own center never
                                   moves that center, so flex-centering the unrotated box keeps
                                   the rotated result centered too, with zero drift. */
                                <div style={{
                                    width: layout.cardW, height: layout.cardH,
                                    position: 'relative',
                                    borderRadius: 2,
                                    boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                                    overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'width 200ms, height 200ms',
                                }}>
                                    <img
                                        src={imageUrl}
                                        alt={page.metadata.filename}
                                        draggable={false}
                                        onLoad={e => {
                                            setImgDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                                            setLoaded(true)
                                        }}
                                        style={{
                                            width: isRotated90 ? layout.cardH : layout.cardW,
                                            height: isRotated90 ? layout.cardW : layout.cardH,
                                            maxWidth: 'none', maxHeight: 'none',
                                            objectFit: 'contain', display: 'block',
                                            transform: `rotate(${displayRotation}deg)`,
                                            transformOrigin: 'center',
                                            transition: 'transform 300ms var(--ease-out), width 200ms, height 200ms',
                                        }}
                                    />
                                </div>
                            ) : (
                                /* Named page size — white card with correct aspect ratio.
                                   The margin guide always represents the true, unrotated
                                   content area of the page. The image sits in its own
                                   clipped, flex-centered frame inside that same content
                                   area, so it rotates in place without ever drifting off
                                   the margin bounds. */
                                <motion.div
                                    animate={{ width: layout.cardW, height: layout.cardH }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        background: '#fff', borderRadius: 2, position: 'relative',
                                        boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Margin guide */}
                                    {hasMargin && (
                                        <div style={{
                                            position: 'absolute',
                                            top: layout.inset.top, left: layout.inset.left,
                                            width: frameW,
                                            height: frameH,
                                            border: '1px dashed rgba(99,102,241,0.4)',
                                            pointerEvents: 'none', zIndex: 2,
                                            transition: 'all 200ms',
                                        }} />
                                    )}

                                    {/* Content frame — clips to the margin inset, centers the (possibly rotated) image */}
                                    <div style={{
                                        position: 'absolute',
                                        top: layout.inset.top, left: layout.inset.left,
                                        width: frameW,
                                        height: frameH,
                                        overflow: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <img
                                            src={imageUrl}
                                            alt={page.metadata.filename}
                                            draggable={false}
                                            onLoad={e => {
                                                setImgDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                                                setLoaded(true)
                                            }}
                                            style={{
                                                width: isRotated90 ? frameH : frameW,
                                                height: isRotated90 ? frameW : frameH,
                                                maxWidth: 'none', maxHeight: 'none',
                                                objectFit: imgObjectFit, display: 'block',
                                                transform: `rotate(${displayRotation}deg)`,
                                                transformOrigin: 'center',
                                                transition: 'transform 300ms var(--ease-out)',
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loaded && (
                    <div className="skeleton" style={{ width: layout.cardW, height: layout.cardH, borderRadius: 2 }} />
                )}
            </div>

            {/* Info badge */}
            {loaded && badge && (
                <div style={{
                    position: 'absolute', bottom: 72, right: 12,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    fontSize: 10.5, fontWeight: 500, color: 'var(--tx-3)',
                    fontFamily: 'var(--font-sans)', pointerEvents: 'none',
                    backdropFilter: 'blur(8px)', boxShadow: 'var(--sh-sm)',
                }}>
                    {badge}
                </div>
            )}
        </div>
    )
})
PreviewCanvas.displayName = 'PreviewCanvas'