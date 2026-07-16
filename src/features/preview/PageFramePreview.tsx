import { memo, useRef, useEffect, useState } from 'react'
import { useActivePreset } from '@/stores/exportStore'
import { MARGIN_SIZES } from '@/constants'
import { resolvePageAspect } from '@/lib/pageLayout'
import type { Page } from '@/types'

interface Props {
    page: Page
    /** Native lazy-loading passthrough — see RotatedImage for why this matters
     * when many of these render at once (Grid/Continuous views). */
    loading?: 'lazy' | 'eager'
}

/**
 * Renders a page exactly the way PreviewCanvas does for the single-page
 * view — same page-size/orientation/margin-aware sizing, same margin guide,
 * same rotation-safe image fitting — but as a static, non-interactive card
 * that fits whatever container it's placed in (measured via ResizeObserver,
 * the same technique RotatedImage uses), instead of PreviewCanvas's
 * pan/zoom/wheel-interactive viewport.
 *
 * This exists because Grid/Continuous views previously just showed the raw
 * image with no awareness of page size, orientation, or margin at all — so
 * what you saw there didn't match either the single-page preview or what
 * the actual exported PDF would look like. Sharing resolvePageAspect (moved
 * to src/lib/pageLayout.ts) with PreviewCanvas keeps all three in sync
 * without duplicating — or risking diverging from — that logic.
 */
export const PageFramePreview = memo(({ page, loading = 'lazy' }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)

    const preset = useActivePreset()
    const marginKey = (preset.margin ?? 'none') as keyof typeof MARGIN_SIZES
    const marginPts = MARGIN_SIZES[marginKey] ?? MARGIN_SIZES.none
    const hasMargin = marginPts.top > 0
    const isAutoSize = preset.pageSize === 'auto' || preset.pageSize === 'original'
    const isRotated90 = page.rotation === 90 || page.rotation === 270

    // Object URL for the full-resolution image
    useEffect(() => {
        const url = URL.createObjectURL(page.imageBlob)
        setImageUrl(url)
        setLoaded(false)
        return () => URL.revokeObjectURL(url)
    }, [page.id, page.imageBlob])

    // Measure our own container — fills whatever slot the parent gives us
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        setContainerSize({ w: el.clientWidth, h: el.clientHeight })
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Use stored metadata dimensions for the aspect calculation — available
    // immediately, no need to wait for the full image to load just to know
    // its size (that still happens for the actual crisp render below).
    const srcW = page.metadata.width || 1
    const srcH = page.metadata.height || 1

    const aspect = resolvePageAspect(preset.pageSize, preset.orientation, srcW, srcH, page.rotation)
    const availW = Math.max(1, containerSize.w)
    const availH = Math.max(1, containerSize.h)
    const scale = containerSize.w > 0 ? Math.min(availW / aspect.w, availH / aspect.h) : 0

    const cardW = aspect.w * scale
    const cardH = aspect.h * scale

    const ptToPx = cardW > 0 ? cardW / aspect.w : 0
    const inset = {
        top: marginPts.top * ptToPx,
        right: marginPts.right * ptToPx,
        bottom: marginPts.bottom * ptToPx,
        left: marginPts.left * ptToPx,
    }
    const frameW = cardW - inset.left - inset.right
    const frameH = cardH - inset.top - inset.bottom

    const imgObjectFit: React.CSSProperties['objectFit'] =
        preset.imageFit === 'fill' ? 'cover' :
            preset.imageFit === 'stretch' ? 'fill' :
                preset.imageFit === 'original' ? 'none' : 'contain'

    const ready = imageUrl && cardW > 0 && cardH > 0

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {!ready ? (
                <div className="skeleton" style={{ width: '90%', height: '90%', borderRadius: 2 }} />
            ) : isAutoSize ? (
                // Auto/Original — same technique as PreviewCanvas: the <img>
                // gets pre-rotation (swapped) dimensions and is flex-centered,
                // then rotated in place.
                <div style={{
                    width: cardW, height: cardH,
                    position: 'relative', borderRadius: 2, overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: loaded ? 1 : 0, transition: 'opacity 200ms',
                }}>
                    <img
                        src={imageUrl}
                        alt={page.metadata.filename}
                        draggable={false}
                        loading={loading}
                        onLoad={() => setLoaded(true)}
                        style={{
                            width: isRotated90 ? cardH : cardW,
                            height: isRotated90 ? cardW : cardH,
                            maxWidth: 'none', maxHeight: 'none',
                            objectFit: 'contain', display: 'block',
                            transform: `rotate(${page.rotation}deg)`,
                            transformOrigin: 'center',
                        }}
                    />
                </div>
            ) : (
                // Named page size — white card with margin guide + clipped,
                // flex-centered content frame, same as PreviewCanvas.
                <div style={{
                    width: cardW, height: cardH,
                    background: '#fff', borderRadius: 2, position: 'relative', overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
                    opacity: loaded ? 1 : 0, transition: 'opacity 200ms',
                }}>
                    {hasMargin && (
                        <div style={{
                            position: 'absolute',
                            top: inset.top, left: inset.left,
                            width: frameW, height: frameH,
                            border: '1px dashed rgba(99,102,241,0.4)',
                            pointerEvents: 'none', zIndex: 2,
                        }} />
                    )}
                    <div style={{
                        position: 'absolute',
                        top: inset.top, left: inset.left,
                        width: frameW, height: frameH,
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <img
                            src={imageUrl}
                            alt={page.metadata.filename}
                            draggable={false}
                            loading={loading}
                            onLoad={() => setLoaded(true)}
                            style={{
                                width: isRotated90 ? frameH : frameW,
                                height: isRotated90 ? frameW : frameH,
                                maxWidth: 'none', maxHeight: 'none',
                                objectFit: imgObjectFit, display: 'block',
                                transform: `rotate(${page.rotation}deg)`,
                                transformOrigin: 'center',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
})
PageFramePreview.displayName = 'PageFramePreview'