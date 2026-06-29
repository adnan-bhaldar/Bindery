import { memo, useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Page } from '@/types'
import { clamp } from '@/lib/utils'

interface Props {
    page: Page
    zoom: number
    onZoomChange: (z: number) => void
}

interface PanState {
    x: number
    y: number
    isDragging: boolean
    startX: number
    startY: number
    originX: number
    originY: number
}

export const PreviewCanvas = memo(({ page, zoom, onZoomChange }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [pan, setPan] = useState<PanState>({ x: 0, y: 0, isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 })
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
    const [loaded, setLoaded] = useState(false)

    // Create object URL from blob
    useEffect(() => {
        const url = URL.createObjectURL(page.imageBlob)
        setImageUrl(url)
        setLoaded(false)
        setPan(p => ({ ...p, x: 0, y: 0 }))
        return () => URL.revokeObjectURL(url)
    }, [page.id, page.imageBlob])

    // Wheel zoom (ctrl/cmd + scroll)
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            const delta = e.deltaY > 0 ? -0.08 : 0.08
            onZoomChange(clamp(zoom + delta, 0.1, 8))
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [zoom, onZoomChange])

    // Pan with mouse drag
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        setPan(p => ({ ...p, isDragging: true, startX: e.clientX, startY: e.clientY, originX: p.x, originY: p.y }))
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        setPan(p => {
            if (!p.isDragging) return p
            return { ...p, x: p.originX + (e.clientX - p.startX), y: p.originY + (e.clientY - p.startY) }
        })
    }, [])

    const onMouseUp = useCallback(() => {
        setPan(p => ({ ...p, isDragging: false }))
    }, [])

    // Double-click resets pan
    const onDblClick = useCallback(() => {
        setPan(p => ({ ...p, x: 0, y: 0 }))
        onZoomChange(1)
    }, [onZoomChange])

    // Compute rendered image size to fill container nicely
    const getImageStyle = () => {
        if (!containerRef.current || !imgDims.w || !imgDims.h) return {}
        const cw = containerRef.current.clientWidth
        const ch = containerRef.current.clientHeight
        const PAD = 48
        const aw = cw - PAD * 2
        const ah = ch - PAD * 2
        const ratio = Math.min(aw / imgDims.w, ah / imgDims.h, 1)
        const w = imgDims.w * ratio * zoom
        const h = imgDims.h * ratio * zoom
        return { width: w, height: h }
    }

    const imgStyle = getImageStyle()

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
            {/* Page shadow background */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <AnimatePresence mode="wait">
                    {imageUrl && (
                        <motion.div
                            key={page.id}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: loaded ? 1 : 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px)`,
                                willChange: 'transform',
                                position: 'relative',
                            }}
                        >
                            {/* Drop shadow */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                                borderRadius: 2,
                                pointerEvents: 'none',
                            }} />

                            <img
                                src={imageUrl}
                                alt={page.metadata.filename}
                                draggable={false}
                                onLoad={e => {
                                    const img = e.currentTarget
                                    setImgDims({ w: img.naturalWidth, h: img.naturalHeight })
                                    setLoaded(true)
                                }}
                                style={{
                                    display: 'block',
                                    width: imgStyle.width,
                                    height: imgStyle.height,
                                    objectFit: 'contain',
                                    transform: `rotate(${page.rotation}deg)`,
                                    transition: 'transform 300ms var(--ease-out)',
                                    background: '#fff',
                                    borderRadius: 2,
                                    maxWidth: 'none',
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading skeleton */}
                {!loaded && (
                    <div
                        className="skeleton"
                        style={{ width: 400, height: 566, borderRadius: 2 }}
                    />
                )}
            </div>
        </div>
    )
})
PreviewCanvas.displayName = 'PreviewCanvas'