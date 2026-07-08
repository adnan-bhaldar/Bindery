import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useActivePreset } from '@/stores/exportStore'
import { PAGE_SIZES, MARGIN_SIZES } from '@/constants'
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

function resolvePageAspect(pageSize: string, orientation: string, imgW: number, imgH: number, rotation: number) {
    if (!imgW || !imgH) return { w: 210, h: 297 }

    // Swap effective dimensions when image is rotated 90/270
    const isRotated90 = rotation === 90 || rotation === 270
    const effW = isRotated90 ? imgH : imgW
    const effH = isRotated90 ? imgW : imgH

    if (pageSize === 'auto' || pageSize === 'original') {
        return { w: effW, h: effH }
    }

    const sizes = PAGE_SIZES as Record<string, { width: number; height: number }>
    const def = sizes[pageSize] ?? PAGE_SIZES.a4
    let { width: w, height: h } = def

    const isLandscape =
        orientation === 'landscape' ||
        (orientation === 'auto' && effW > effH)

    if (isLandscape && w < h) [w, h] = [h, w]
    return { w, h }
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
    const marginKey = (preset.margin ?? 'none') as keyof typeof MARGIN_SIZES
    const marginPts = MARGIN_SIZES[marginKey] ?? MARGIN_SIZES.none
    const hasMargin = marginPts.top > 0
    const isAutoSize = preset.pageSize === 'auto' || preset.pageSize === 'original'

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

    // Wheel zoom
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            onZoomChange(clamp(zoom + (e.deltaY > 0 ? -0.08 : 0.08), 0.1, 8))
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [zoom, onZoomChange])

    // Pan
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        setPan(p => ({ ...p, isDragging: true, startX: e.clientX, startY: e.clientY, originX: p.x, originY: p.y }))
    }, [])
    const onMouseMove = useCallback((e: React.MouseEvent) => {
        setPan(p => !p.isDragging ? p : { ...p, x: p.originX + (e.clientX - p.startX), y: p.originY + (e.clientY - p.startY) })
    }, [])
    const onMouseUp = useCallback(() => setPan(p => ({ ...p, isDragging: false })), [])
    const onDblClick = useCallback(() => { setPan(p => ({ ...p, x: 0, y: 0 })); onZoomChange(1) }, [onZoomChange])

    // Layout — reactive, always produces a value
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

        return { cardW, cardH, inset }
    }, [imgDims, containerSize, preset.pageSize, preset.orientation, marginPts, zoom, page.rotation])

    // Image fit
    const imgObjectFit: React.CSSProperties['objectFit'] =
        preset.imageFit === 'fill' ? 'cover' :
            preset.imageFit === 'stretch' ? 'fill' :
                preset.imageFit === 'original' ? 'none' : 'contain'

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
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
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
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: loaded ? 1 : 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px)`,
                                willChange: 'transform',
                            }}
                        >
                            {isAutoSize ? (
                                /* Auto/Original — image fills naturally, no white page card */
                                <div style={{
                                    width: layout.cardW, height: layout.cardH,
                                    position: 'relative',
                                    borderRadius: 2,
                                    boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                                    transition: 'width 200ms, height 200ms',
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
                                            width: '100%', height: '100%',
                                            objectFit: 'contain', display: 'block',
                                            transform: `rotate(${page.rotation}deg)`,
                                            transformOrigin: 'center',
                                            transition: 'transform 300ms var(--ease-out)',
                                        }}
                                    />
                                </div>
                            ) : (
                                /* Named page size — white card with correct aspect ratio */
                                <motion.div
                                    animate={{ width: layout.cardW, height: layout.cardH }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        background: '#fff', borderRadius: 2, position: 'relative',
                                        boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                                    }}
                                >
                                    {/* Margin guide */}
                                    {hasMargin && (
                                        <div style={{
                                            position: 'absolute',
                                            top: layout.inset.top, left: layout.inset.left,
                                            width: layout.cardW - layout.inset.left - layout.inset.right,
                                            height: layout.cardH - layout.inset.top - layout.inset.bottom,
                                            border: '1px dashed rgba(99,102,241,0.4)',
                                            pointerEvents: 'none', zIndex: 2,
                                            transition: 'all 200ms',
                                        }} />
                                    )}
                                    <img
                                        src={imageUrl}
                                        alt={page.metadata.filename}
                                        draggable={false}
                                        onLoad={e => {
                                            setImgDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                                            setLoaded(true)
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: layout.inset.top,
                                            left: layout.inset.left,
                                            width: layout.cardW - layout.inset.left - layout.inset.right,
                                            height: layout.cardH - layout.inset.top - layout.inset.bottom,
                                            objectFit: imgObjectFit, display: 'block',
                                            transform: `rotate(${page.rotation}deg)`,
                                            transformOrigin: 'center',
                                            transition: 'transform 300ms var(--ease-out)',
                                        }}
                                    />
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