import { memo, useRef, useState, useEffect } from 'react'

interface Props {
    src: string
    alt: string
    rotation: number // 0 | 90 | 180 | 270
    objectFit?: React.CSSProperties['objectFit']
    onLoad?: (dims: { w: number; h: number }) => void
    /** Applied to the outer container div (the box RotatedImage fills at 100%×100%) */
    style?: React.CSSProperties
    /** Merged onto the <img> itself, after the computed rotation-safe sizing */
    imgStyle?: React.CSSProperties
    transitionMs?: number
}

/**
 * Renders an image that can be rotated 0/90/180/270° WITHOUT the classic
 * "margin appears after rotating" bug.
 *
 * Why this needs to exist: rotating a non-square box in place with a plain
 * CSS `transform: rotate()` swaps its VISUAL footprint (width↔height) but
 * not its LAYOUT footprint — so a box sized to fill its parent will overhang
 * on one axis and fall short on the other the moment it's rotated 90/270°.
 *
 * The fix: measure the parent slot's actual pixel size (works for both fixed
 * and responsive/aspect-ratio-driven containers, which plain CSS percentages
 * can't cross-reference between axes), give the <img> the PRE-rotation
 * (axis-swapped) dimensions, center it with flexbox, then rotate it in
 * place. Rotating an element about its own center never moves that center,
 * so a flex-centered unrotated box stays centered once rotated too — no
 * percentage/transform math traps.
 */
export const RotatedImage = memo(({
    src, alt, rotation, objectFit = 'contain', onLoad, style, imgStyle, transitionMs = 280,
}: Props) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ w: 0, h: 0 })

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        setSize({ w: el.clientWidth, h: el.clientHeight })
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            if (width > 0 && height > 0) setSize({ w: width, h: height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const isRotated90 = rotation === 90 || rotation === 270
    // Pre-rotation box, swapped relative to the measured container — so that
    // once rotated, its visual footprint exactly matches the container again.
    const boxW = isRotated90 ? size.h : size.w
    const boxH = isRotated90 ? size.w : size.h
    const ready = size.w > 0 && size.h > 0

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', height: '100%',
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 0, minHeight: 0, // defends against the same implicit
                // min-content-size issue in whatever flex/grid ancestor this
                // ends up mounted inside — see the note in VirtualizedPageList's
                // SortableGridCell for the full explanation.
                ...style,
            }}
        >
            {ready && (
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    onLoad={e => onLoad?.({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    style={{
                        width: boxW, height: boxH,
                        maxWidth: 'none', maxHeight: 'none',
                        flexShrink: 0, flexGrow: 0,
                        objectFit, display: 'block',
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center',
                        transition: `transform ${transitionMs}ms var(--ease-out), width 200ms, height 200ms`,
                        ...imgStyle,
                    }}
                />
            )}
        </div>
    )
})
RotatedImage.displayName = 'RotatedImage'