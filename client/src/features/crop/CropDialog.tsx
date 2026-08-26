import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crop as CropIcon, Square, Maximize2, ChevronDown, Copy, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { useUIStore } from '@/stores/uiStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { importService } from '@/services/importService'
import { Spinner } from '@/components/ui/Spinner'
import { clamp } from '@/lib/utils'
import type { Page } from '@/types'

// ─── Geometry types ───────────────────────────────────────────────────────────

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
type AspectMode = 'free' | 'square' | 'original'

interface Rect { x: number; y: number; w: number; h: number }

interface DragState {
    handle: Handle
    startCrop: Rect
    startLocalX: number
    startLocalY: number
    boxLeft: number
    boxTop: number
}

// Enforced in on-screen (display) pixels — the actual minimum in the source
// image ends up much larger once scaled back up to natural resolution.
const MIN_CROP_DISPLAY_PX = 24
const HANDLE_HIT = 14
const MIN_ZOOM = 1
const MAX_ZOOM = 4

// ─── Resize math ──────────────────────────────────────────────────────────────

/**
 * Computes the next crop rect for a given handle drag. `curX`/`curY` are the
 * current pointer position in the same local coordinate space as `start`
 * (already clamped to the viewport by the caller isn't required — this
 * function clamps the final result itself).
 *
 * `ratio` (width / height) is only honored for corner handles — edge handles
 * are hidden in the UI whenever an aspect ratio is locked, since resizing
 * just one axis can't honor a ratio without also moving the opposite edge,
 * which reads as surprising behavior for a drag the user didn't initiate.
 */
function resizeRect(
    handle: Handle,
    start: Rect,
    curX: number,
    curY: number,
    vw: number,
    vh: number,
    ratio: number | null
): Rect {
    const left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h

    let x0 = left, y0 = top, x1 = right, y1 = bottom

    if (handle.includes('e')) x1 = curX
    if (handle.includes('w')) x0 = curX
    if (handle.includes('s')) y1 = curY
    if (handle.includes('n')) y0 = curY

    // Normalize in case the handle was dragged past the opposite edge
    let nx0 = Math.min(x0, x1), nx1 = Math.max(x0, x1)
    let ny0 = Math.min(y0, y1), ny1 = Math.max(y0, y1)

    if (ratio && handle.length === 2) {
        // Corner handle with a locked ratio — always drive from the width,
        // then re-derive height from the anchor (the fixed opposite corner)
        // so that corner never moves.
        const anchorX = handle.includes('w') ? nx1 : nx0 // fixed x-side
        const anchorY = handle.includes('n') ? ny1 : ny0 // fixed y-side
        let w = nx1 - nx0
        let h = w / ratio

        // Don't let the derived height push past the viewport on the
        // anchor's fixed side.
        const maxH = handle.includes('n') ? anchorY : vh - anchorY
        if (h > maxH) { h = maxH; w = h * ratio }

        if (handle.includes('w')) { nx0 = anchorX - w; nx1 = anchorX } else { nx1 = anchorX + w; nx0 = anchorX }
        if (handle.includes('n')) { ny0 = anchorY - h; ny1 = anchorY } else { ny1 = anchorY + h; ny0 = anchorY }
    }

    let w = nx1 - nx0
    let h = ny1 - ny0

    // Universal safety clamp — guarantees a valid, in-bounds rect regardless
    // of which branch above produced it.
    w = clamp(w, MIN_CROP_DISPLAY_PX, vw)
    h = clamp(h, MIN_CROP_DISPLAY_PX, vh)
    const x = clamp(Math.min(nx0, nx1), 0, vw - w)
    const y = clamp(Math.min(ny0, ny1), 0, vh - h)

    return { x, y, w, h }
}

/**
 * Keeps the zoomed image covering the whole viewport — i.e. the crop stage
 * never shows empty space past the image's edge. `dispW`/`dispH` are the
 * image's current on-screen (post-zoom) bounding box.
 */
function clampPan(pan: { x: number; y: number }, dispW: number, dispH: number, viewport: { w: number; h: number }) {
    const maxX = Math.max(0, (dispW - viewport.w) / 2)
    const maxY = Math.max(0, (dispH - viewport.h) / 2)
    return { x: clamp(pan.x, -maxX, maxX), y: clamp(pan.y, -maxY, maxY) }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Mounted once at app root (see App.tsx), same pattern as AuthDialog /
 * RecoveryDialog — opened imperatively via useUIStore.getState().openCropDialog(pageId).
 *
 * Cropping is destructive: on Apply, the currently-rotated view of the image
 * (exactly what's shown here) is re-rendered to a canvas at full resolution,
 * the selected region is extracted, and the page's imageBlob is replaced —
 * see setPageImage in pagesStore. The page's rotation is reset to 0 since
 * it's now baked into the cropped pixels.
 */
export const CropDialog = memo(() => {
    const cropPageId = useUIStore(s => s.cropPageId)
    const closeCropDialog = useUIStore(s => s.closeCropDialog)
    const page = usePagesStore(s => s.pages.find(p => p.id === cropPageId) ?? null)
    const setPageImage = usePagesStore(s => s.setPageImage)
    const setThumbnail = usePagesStore(s => s.setThumbnail)
    const duplicatePage = usePagesStore(s => s.duplicatePage)
    const thumbnailSize = useSettingsStore(s => s.settings.thumbnailSize)

    const isOpen = page !== null

    const boxRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)
    const panRef = useRef<{ startPanX: number; startPanY: number; startClientX: number; startClientY: number; dispW: number; dispH: number } | null>(null)

    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
    const [viewport, setViewport] = useState({ w: 0, h: 0 })
    const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
    const [aspect, setAspect] = useState<AspectMode>('free')
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isApplyMenuOpen, setIsApplyMenuOpen] = useState(false)
    const applyMenuRef = useRef<HTMLDivElement>(null)

    const rotation = page?.rotation ?? 0
    const isRotated90 = rotation === 90 || rotation === 270
    const rotW = isRotated90 ? naturalSize.h : naturalSize.w
    const rotH = isRotated90 ? naturalSize.w : naturalSize.h

    // Geometry of the displayed image within the stage, accounting for zoom
    // and pan. This is the single source of truth for both rendering the
    // <img> and mapping the crop rect back to natural pixels on Apply.
    const imageBox = useMemo(() => {
        if (!viewport.w || !viewport.h || !rotW || !rotH) {
            return { effScale: 1, dispW: 0, dispH: 0, left: 0, top: 0, imgLeft: 0, imgTop: 0, preW: 0, preH: 0 }
        }
        const baseScale = viewport.w / rotW
        const effScale = baseScale * zoom
        const dispW = rotW * effScale
        const dispH = rotH * effScale
        const left = (viewport.w - dispW) / 2 + pan.x
        const top = (viewport.h - dispH) / 2 + pan.y
        // The <img>'s own box, pre-rotation — swapped so that after a 90/270°
        // CSS rotation (which always pivots around the element's own center)
        // its bounding box lands exactly on (left, top, dispW, dispH).
        const preW = isRotated90 ? dispH : dispW
        const preH = isRotated90 ? dispW : dispH
        const imgLeft = left + dispW / 2 - preW / 2
        const imgTop = top + dispH / 2 - preH / 2
        return { effScale, dispW, dispH, left, top, imgLeft, imgTop, preW, preH }
    }, [viewport, rotW, rotH, zoom, pan, isRotated90])

    // Local object URL for the source blob — same pattern as PreviewCanvas.
    useEffect(() => {
        if (!page) { setImageUrl(null); return }
        const url = URL.createObjectURL(page.imageBlob)
        setImageUrl(url)
        return () => URL.revokeObjectURL(url)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page?.id, page?.imageBlob])

    // Reset everything for a fresh page
    useEffect(() => {
        setNaturalSize({ w: 0, h: 0 })
        setViewport({ w: 0, h: 0 })
        setAspect('free')
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [cropPageId])

    // Fit the (rotated) image into a viewport once we know its natural size
    useEffect(() => {
        if (!rotW || !rotH) return
        const maxW = Math.min(window.innerWidth * 0.7, 640)
        const maxH = Math.min(window.innerHeight * 0.6, 520)
        const scale = Math.min(maxW / rotW, maxH / rotH, 3) // cap upscale so tiny images don't blow up
        const vw = Math.round(rotW * scale)
        const vh = Math.round(rotH * scale)
        setViewport({ w: vw, h: vh })
        setCrop({ x: 0, y: 0, w: vw, h: vh })
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [rotW, rotH])

    const applyAspect = useCallback((mode: AspectMode) => {
        setAspect(mode)
        if (!viewport.w || !viewport.h) return
        const ratio = mode === 'square' ? 1 : mode === 'original' ? rotW / rotH : null
        if (!ratio) return // 'free' — leave the current rect as-is

        // Re-fit the current crop's center to the new ratio, staying inside the viewport.
        const cx = crop.x + crop.w / 2
        const cy = crop.y + crop.h / 2
        let w = crop.w
        let h = w / ratio
        if (h > viewport.h) { h = viewport.h; w = h * ratio }
        if (w > viewport.w) { w = viewport.w; h = w / ratio }
        const x = clamp(cx - w / 2, 0, viewport.w - w)
        const y = clamp(cy - h / 2, 0, viewport.h - h)
        setCrop({ x, y, w, h })
    }, [viewport, rotW, rotH, crop])

    // ── Drag handling ───────────────────────────────────────────────────────

    const onPointerMove = useCallback((e: PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return
        const localX = e.clientX - drag.boxLeft
        const localY = e.clientY - drag.boxTop

        if (drag.handle === 'move') {
            const dx = localX - drag.startLocalX
            const dy = localY - drag.startLocalY
            setCrop({
                x: clamp(drag.startCrop.x + dx, 0, viewport.w - drag.startCrop.w),
                y: clamp(drag.startCrop.y + dy, 0, viewport.h - drag.startCrop.h),
                w: drag.startCrop.w,
                h: drag.startCrop.h,
            })
            return
        }

        const ratio = aspect === 'square' ? 1 : aspect === 'original' ? rotW / rotH : null
        setCrop(resizeRect(drag.handle, drag.startCrop, localX, localY, viewport.w, viewport.h, ratio))
    }, [viewport, aspect, rotW, rotH])

    const onPointerUp = useCallback(() => {
        dragRef.current = null
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    }, [onPointerMove])

    const beginDrag = useCallback((handle: Handle) => (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const rect = boxRef.current?.getBoundingClientRect()
        if (!rect) return
        dragRef.current = {
            handle,
            startCrop: crop,
            startLocalX: e.clientX - rect.left,
            startLocalY: e.clientY - rect.top,
            boxLeft: rect.left,
            boxTop: rect.top,
        }
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
    }, [crop, onPointerMove, onPointerUp])

    // ── Zoom & pan ───────────────────────────────────────────────────────────

    /** Zooms to `newZoomRaw`, keeping the point at stage-local (px, py) fixed on screen. */
    const applyZoom = useCallback((newZoomRaw: number, px: number, py: number) => {
        if (!viewport.w || !viewport.h || !rotW || !rotH) return
        const newZoom = clamp(newZoomRaw, MIN_ZOOM, MAX_ZOOM)
        if (newZoom === zoom) return
        const baseScale = viewport.w / rotW
        const oldDispW = rotW * baseScale * zoom
        const oldDispH = rotH * baseScale * zoom
        const oldLeft = (viewport.w - oldDispW) / 2 + pan.x
        const oldTop = (viewport.h - oldDispH) / 2 + pan.y
        const fx = oldDispW > 0 ? (px - oldLeft) / oldDispW : 0.5
        const fy = oldDispH > 0 ? (py - oldTop) / oldDispH : 0.5
        const newDispW = rotW * baseScale * newZoom
        const newDispH = rotH * baseScale * newZoom
        const rawPan = {
            x: px - fx * newDispW - (viewport.w - newDispW) / 2,
            y: py - fy * newDispH - (viewport.h - newDispH) / 2,
        }
        setZoom(newZoom)
        setPan(clampPan(rawPan, newDispW, newDispH, viewport))
    }, [viewport, rotW, rotH, zoom, pan])

    const onWheel = useCallback((e: React.WheelEvent) => {
        if (!viewport.w || !viewport.h) return
        e.preventDefault()
        const rect = boxRef.current?.getBoundingClientRect()
        if (!rect) return
        const factor = Math.exp(-e.deltaY * 0.0015)
        applyZoom(zoom * factor, e.clientX - rect.left, e.clientY - rect.top)
    }, [viewport, zoom, applyZoom])

    const resetZoom = useCallback(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [])

    const onPanPointerMove = useCallback((e: PointerEvent) => {
        const d = panRef.current
        if (!d) return
        const dx = e.clientX - d.startClientX
        const dy = e.clientY - d.startClientY
        setPan(clampPan({ x: d.startPanX + dx, y: d.startPanY + dy }, d.dispW, d.dispH, viewport))
    }, [viewport])

    const onPanPointerUp = useCallback(() => {
        panRef.current = null
        setIsPanning(false)
        window.removeEventListener('pointermove', onPanPointerMove)
        window.removeEventListener('pointerup', onPanPointerUp)
    }, [onPanPointerMove])

    // Attached to the stage itself, so it only fires for pointerdowns that
    // land outside the crop rect (the crop rect's own handler stops
    // propagation) — i.e. dragging the dimmed background pans the image.
    const beginPan = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0 || zoom <= MIN_ZOOM) return
        e.preventDefault()
        panRef.current = {
            startPanX: pan.x, startPanY: pan.y,
            startClientX: e.clientX, startClientY: e.clientY,
            dispW: imageBox.dispW, dispH: imageBox.dispH,
        }
        setIsPanning(true)
        window.addEventListener('pointermove', onPanPointerMove)
        window.addEventListener('pointerup', onPanPointerUp)
    }, [zoom, pan, imageBox, onPanPointerMove, onPanPointerUp])

    // Clean up any listeners left dangling if the dialog closes mid-drag
    useEffect(() => () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointermove', onPanPointerMove)
        window.removeEventListener('pointerup', onPanPointerUp)
    }, [onPointerMove, onPointerUp, onPanPointerMove, onPanPointerUp])

    // ── Apply ───────────────────────────────────────────────────────────────

    const handleClose = useCallback(() => {
        if (isApplying) return
        closeCropDialog()
    }, [isApplying, closeCropDialog])

    // Close the "Apply as Copy" dropdown on outside click or Escape
    useEffect(() => {
        if (!isApplyMenuOpen) return
        const onDown = (e: MouseEvent) => {
            if (applyMenuRef.current && !applyMenuRef.current.contains(e.target as Node)) setIsApplyMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsApplyMenuOpen(false) }
        window.addEventListener('mousedown', onDown)
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('mousedown', onDown)
            window.removeEventListener('keydown', onKey)
        }
    }, [isApplyMenuOpen])

    /**
     * Renders the current crop selection (rotation baked in) to a full-
     * resolution blob. Pure with respect to the store — callers decide which
     * page id the result gets written to, which is what lets "Apply Crop"
     * and "Apply as Copy" share this instead of duplicating the canvas math.
     */
    const renderCroppedBlob = useCallback(async (source: Page): Promise<{ blob: Blob; sw: number; sh: number }> => {
        const bitmap = await createImageBitmap(source.imageBlob)
        const rW = isRotated90 ? bitmap.height : bitmap.width
        const rH = isRotated90 ? bitmap.width : bitmap.height

        // Render the image exactly as it's displayed — rotation baked in —
        // at full natural resolution.
        const rotatedCanvas = document.createElement('canvas')
        rotatedCanvas.width = rW
        rotatedCanvas.height = rH
        const rctx = rotatedCanvas.getContext('2d')
        if (!rctx) throw new Error('Canvas not supported')
        rctx.translate(rW / 2, rH / 2)
        rctx.rotate((rotation * Math.PI) / 180)
        rctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
        bitmap.close()

        // Map the on-screen crop rect back to natural pixels, using the
        // image's current zoom/pan geometry (not just the base fit scale).
        const { left, top, effScale } = imageBox
        const rawSx = Math.round((crop.x - left) / effScale)
        const rawSy = Math.round((crop.y - top) / effScale)
        const rawSw = Math.max(1, Math.round(crop.w / effScale))
        const rawSh = Math.max(1, Math.round(crop.h / effScale))
        // Safety clamp — zoom/pan float math can drift a pixel or two past
        // the source bounds, which would otherwise throw in drawImage below.
        const sx = clamp(rawSx, 0, rW - 1)
        const sy = clamp(rawSy, 0, rH - 1)
        const sw = clamp(rawSw, 1, rW - sx)
        const sh = clamp(rawSh, 1, rH - sy)

        const outCanvas = document.createElement('canvas')
        outCanvas.width = sw
        outCanvas.height = sh
        const octx = outCanvas.getContext('2d')
        if (!octx) throw new Error('Canvas not supported')
        octx.drawImage(rotatedCanvas, sx, sy, sw, sh, 0, 0, sw, sh)

        const outputType = ['image/jpeg', 'image/png', 'image/webp'].includes(source.metadata.mimeType)
            ? source.metadata.mimeType
            : 'image/png'

        const blob = await new Promise<Blob | null>(resolve =>
            outCanvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? 0.92 : undefined)
        )
        if (!blob) throw new Error('Could not encode cropped image')

        return { blob, sw, sh }
    }, [imageBox, crop, rotation, isRotated90])

    // Writes a rendered crop to `targetId` and regenerates its thumbnail.
    const writeCropToPage = useCallback(async (targetId: string, blob: Blob, sw: number, sh: number, thumbSource: Page) => {
        setPageImage(targetId, blob, sw, sh)
        const thumb = await importService.regenerateThumbnail(
            { ...thumbSource, id: targetId, imageBlob: blob, rotation: 0 },
            thumbnailSize
        )
        if (thumb) setThumbnail(targetId, thumb.blob, thumb.url)
    }, [setPageImage, setThumbnail, thumbnailSize])

    const handleApplyReplace = useCallback(async () => {
        if (!page || !viewport.w || !viewport.h) return
        setIsApplying(true)
        try {
            const { blob, sw, sh } = await renderCroppedBlob(page)
            await writeCropToPage(page.id, blob, sw, sh, page)
            toast.success('Image cropped')
            closeCropDialog()
        } catch (err) {
            toast.error('Could not crop image', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setIsApplying(false)
        }
    }, [page, viewport, renderCroppedBlob, writeCropToPage, closeCropDialog])

    // Duplicates the page first, then writes the crop to the duplicate only —
    // the original page (and its imageBlob) is never touched.
    const handleApplyCopy = useCallback(async () => {
        if (!page || !viewport.w || !viewport.h) return
        setIsApplyMenuOpen(false)
        setIsApplying(true)
        try {
            const duplicate = duplicatePage(page.id)
            if (!duplicate) throw new Error('Could not duplicate page')
            const { blob, sw, sh } = await renderCroppedBlob(page)
            await writeCropToPage(duplicate.id, blob, sw, sh, duplicate)
            toast.success('Cropped copy created')
            closeCropDialog()
        } catch (err) {
            toast.error('Could not crop image', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setIsApplying(false)
        }
    }, [page, viewport, duplicatePage, renderCroppedBlob, writeCropToPage, closeCropDialog])

    // ── Render ──────────────────────────────────────────────────────────────

    const handles: Handle[] = aspect === 'free'
        ? ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']
        : ['nw', 'ne', 'sw', 'se']

    const cursorFor: Record<Handle, string> = {
        move: 'move', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
    }

    const handlePos: Record<Handle, React.CSSProperties> = {
        move: {},
        n: { top: -HANDLE_HIT / 2, left: '50%', marginLeft: -HANDLE_HIT / 2 },
        s: { bottom: -HANDLE_HIT / 2, left: '50%', marginLeft: -HANDLE_HIT / 2 },
        e: { right: -HANDLE_HIT / 2, top: '50%', marginTop: -HANDLE_HIT / 2 },
        w: { left: -HANDLE_HIT / 2, top: '50%', marginTop: -HANDLE_HIT / 2 },
        nw: { top: -HANDLE_HIT / 2, left: -HANDLE_HIT / 2 },
        ne: { top: -HANDLE_HIT / 2, right: -HANDLE_HIT / 2 },
        sw: { bottom: -HANDLE_HIT / 2, left: -HANDLE_HIT / 2 },
        se: { bottom: -HANDLE_HIT / 2, right: -HANDLE_HIT / 2 },
    }

    const aspectButtons: { mode: AspectMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'free', label: 'Free', icon: <CropIcon size={12} /> },
        { mode: 'square', label: 'Square', icon: <Square size={12} /> },
        { mode: 'original', label: 'Original', icon: <Maximize2 size={12} /> },
    ]

    return (
        <AnimatePresence>
            {isOpen && page && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9000,
                            background: 'color-mix(in srgb, var(--bg-app) 55%, transparent)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed', inset: 0, margin: 'auto',
                            zIndex: 9001, width: 'fit-content', height: 'fit-content',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'relative',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-hard)',
                                borderRadius: 'var(--r-2xl)',
                                boxShadow: 'var(--sh-dialog)',
                                padding: '18px 20px 20px',
                                display: 'flex', flexDirection: 'column', gap: 14,
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CropIcon size={15} color="var(--accent)" />
                                    <h2 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--tx-1)', margin: 0 }}>
                                        Crop Image
                                    </h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    aria-label="Close"
                                    style={{
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        color: 'var(--tx-3)', padding: 4, borderRadius: 'var(--r-sm)',
                                        display: 'flex',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Aspect ratio switcher */}
                            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--s2)', borderRadius: 'var(--r-lg)' }}>
                                {aspectButtons.map(({ mode, label, icon }) => (
                                    <button
                                        key={mode}
                                        onClick={() => applyAspect(mode)}
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            padding: '6px 0', borderRadius: 'var(--r-md)',
                                            border: 'none', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                                            background: aspect === mode ? 'var(--gradient-accent)' : 'transparent',
                                            color: aspect === mode ? 'var(--accent-fg)' : 'var(--tx-2)',
                                            transition: 'background 110ms, color 110ms',
                                        }}
                                    >
                                        {icon}{label}
                                    </button>
                                ))}
                            </div>

                            {/* Crop stage */}
                            <div
                                ref={boxRef}
                                onWheel={onWheel}
                                onPointerDown={beginPan}
                                style={{
                                    position: 'relative',
                                    width: viewport.w || 320, height: viewport.h || 240,
                                    background: 'repeating-conic-gradient(var(--s3) 0% 25%, var(--s2) 0% 50%) 50% / 16px 16px',
                                    borderRadius: 'var(--r-md)',
                                    overflow: 'hidden',
                                    touchAction: 'none',
                                    cursor: isPanning ? 'grabbing' : zoom > MIN_ZOOM ? 'grab' : 'default',
                                }}
                            >
                                {imageUrl && (
                                    <img
                                        src={imageUrl}
                                        alt={page.metadata.filename}
                                        draggable={false}
                                        onLoad={e => setNaturalSize({
                                            w: e.currentTarget.naturalWidth,
                                            h: e.currentTarget.naturalHeight,
                                        })}
                                        style={{
                                            position: 'absolute',
                                            left: imageBox.imgLeft, top: imageBox.imgTop,
                                            width: imageBox.preW, height: imageBox.preH,
                                            maxWidth: 'none', maxHeight: 'none',
                                            display: 'block', userSelect: 'none', pointerEvents: 'none',
                                            transform: `rotate(${rotation}deg)`,
                                            transformOrigin: 'center',
                                        }}
                                    />
                                )}

                                {viewport.w > 0 && (
                                    <div
                                        onPointerDown={beginDrag('move')}
                                        style={{
                                            position: 'absolute',
                                            left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                                            border: '1.5px solid rgba(255,255,255,0.9)',
                                            cursor: 'move',
                                        }}
                                    >
                                        {/* Rule-of-thirds grid */}
                                        {[1, 2].map(i => (
                                            <div key={`v${i}`} style={{
                                                position: 'absolute', top: 0, bottom: 0, left: `${(i / 3) * 100}%`,
                                                width: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                                            }} />
                                        ))}
                                        {[1, 2].map(i => (
                                            <div key={`h${i}`} style={{
                                                position: 'absolute', left: 0, right: 0, top: `${(i / 3) * 100}%`,
                                                height: 1, background: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                                            }} />
                                        ))}

                                        {handles.map(h => (
                                            <div
                                                key={h}
                                                onPointerDown={beginDrag(h)}
                                                style={{
                                                    position: 'absolute',
                                                    width: HANDLE_HIT, height: HANDLE_HIT,
                                                    cursor: cursorFor[h],
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    ...handlePos[h],
                                                }}
                                            >
                                                <div style={{
                                                    width: h.length === 2 ? 8 : 6, height: h.length === 2 ? 8 : 6,
                                                    borderRadius: 2,
                                                    background: 'var(--accent-fg)',
                                                    border: '1.5px solid var(--accent)',
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Zoom toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <button
                                        onClick={() => applyZoom(zoom / 1.3, viewport.w / 2, viewport.h / 2)}
                                        disabled={zoom <= MIN_ZOOM + 0.001}
                                        aria-label="Zoom out"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 26, height: 26, borderRadius: 'var(--r-sm)', border: 'none',
                                            background: 'transparent', color: zoom <= MIN_ZOOM + 0.001 ? 'var(--tx-4)' : 'var(--tx-2)',
                                            cursor: zoom <= MIN_ZOOM + 0.001 ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <ZoomOut size={14} />
                                    </button>
                                    <button
                                        onClick={resetZoom}
                                        title="Reset zoom"
                                        style={{
                                            minWidth: 42, padding: '3px 6px', borderRadius: 'var(--r-sm)', border: 'none',
                                            background: 'transparent', color: 'var(--tx-2)', fontSize: 11.5,
                                            fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                        }}
                                    >
                                        {Math.round(zoom * 100)}%
                                    </button>
                                    <button
                                        onClick={() => applyZoom(zoom * 1.3, viewport.w / 2, viewport.h / 2)}
                                        disabled={zoom >= MAX_ZOOM - 0.001}
                                        aria-label="Zoom in"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 26, height: 26, borderRadius: 'var(--r-sm)', border: 'none',
                                            background: 'transparent', color: zoom >= MAX_ZOOM - 0.001 ? 'var(--tx-4)' : 'var(--tx-2)',
                                            cursor: zoom >= MAX_ZOOM - 0.001 ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                                    Scroll to zoom · drag background to pan
                                </span>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                    onClick={handleClose}
                                    disabled={isApplying}
                                    style={{
                                        padding: '8px 14px', borderRadius: 'var(--r-md)',
                                        border: '1px solid var(--border)', background: 'transparent',
                                        color: 'var(--tx-2)', fontSize: 12.5, fontWeight: 500,
                                        fontFamily: 'var(--font-sans)', cursor: isApplying ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>

                                {/* Split button: primary action replaces the page's image;
                                    the chevron opens a menu with "Apply as Copy", which
                                    duplicates the page first and crops the duplicate only. */}
                                <div ref={applyMenuRef} style={{ position: 'relative', display: 'flex' }}>
                                    <AnimatePresence>
                                        {isApplyMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                                transition={{ duration: 0.12 }}
                                                style={{
                                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                                    minWidth: 190, background: 'var(--bg-overlay)',
                                                    border: '1px solid var(--border-hard)', borderRadius: 'var(--r-lg)',
                                                    boxShadow: 'var(--sh-dialog)', padding: 4, zIndex: 1,
                                                }}
                                            >
                                                <button
                                                    onClick={handleApplyCopy}
                                                    disabled={isApplying}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                                        padding: '8px 10px', borderRadius: 'var(--r-md)', border: 'none',
                                                        background: 'transparent', color: 'var(--tx-1)',
                                                        fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-sans)',
                                                        cursor: isApplying ? 'not-allowed' : 'pointer', textAlign: 'left',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <Copy size={14} />
                                                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                                                        Apply as Copy
                                                        <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--tx-3)' }}>
                                                            Keeps the original untouched
                                                        </span>
                                                    </span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        onClick={handleApplyReplace}
                                        disabled={isApplying}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 16px', borderRadius: 'var(--r-md) 0 0 var(--r-md)', border: 'none',
                                            background: 'var(--gradient-accent)', color: 'var(--accent-fg)',
                                            fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-sans)',
                                            cursor: isApplying ? 'not-allowed' : 'pointer',
                                            opacity: isApplying ? 0.7 : 1,
                                            boxShadow: '0 2px 12px var(--accent-glow)',
                                        }}
                                    >
                                        {isApplying && <Spinner size={13} />}
                                        Apply Crop
                                    </button>
                                    <button
                                        onClick={() => setIsApplyMenuOpen(o => !o)}
                                        disabled={isApplying}
                                        aria-label="More apply options"
                                        aria-expanded={isApplyMenuOpen}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 28, borderRadius: '0 var(--r-md) var(--r-md) 0', border: 'none',
                                            borderLeft: '1px solid color-mix(in srgb, var(--accent-fg) 25%, transparent)',
                                            background: 'var(--gradient-accent)', color: 'var(--accent-fg)',
                                            cursor: isApplying ? 'not-allowed' : 'pointer',
                                            opacity: isApplying ? 0.7 : 1,
                                            boxShadow: '0 2px 12px var(--accent-glow)',
                                        }}
                                    >
                                        <ChevronDown size={14} style={{
                                            transform: isApplyMenuOpen ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 120ms',
                                        }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})
CropDialog.displayName = 'CropDialog'