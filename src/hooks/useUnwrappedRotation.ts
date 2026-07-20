import { useRef, useState, useEffect } from 'react'

/**
 * CSS `transform: rotate(Xdeg)` transitions always interpolate the literal
 * numeric angle, not the visually shortest rotation path. Since page
 * rotation is stored wrapped to 0/90/180/270 (required for all the actual
 * rotation logic elsewhere — dimension swapping, PDF export, etc.), a step
 * from 270° to 0° (which is what "270 + 90, wrapped" produces) has the CSS
 * engine animate backward through 260°, 250°...0° — a 270° counter-
 * clockwise sweep — instead of continuing forward to 360° (visually
 * identical to 0°, but a genuine +90° step in the direction the user
 * actually rotated).
 *
 * This hook keeps a separate, unwrapped angle purely for feeding into a CSS
 * transform, incrementing/decrementing by 90° in whichever direction the
 * wrapped value actually moved, so the animation always continues smoothly
 * in the same direction rather than snapping the long way around whenever
 * it crosses the 0°/270° wrap boundary. The canonical wrapped value (what
 * you pass in) is untouched and should still be used for everything else.
 */
export function useUnwrappedRotation(rotation: number): number {
    const [display, setDisplay] = useState(rotation)
    const prevRef = useRef(rotation)

    useEffect(() => {
        const prev = prevRef.current
        if (prev === rotation) return

        // Normalized forward difference — e.g. 270→0 gives 90 (a +90 step
        // that happens to wrap), 0→270 gives 270 (a -90 step that wraps
        // the other way).
        const diff = (rotation - prev + 360) % 360

        setDisplay(d => {
            if (diff === 90) return d + 90
            if (diff === 270) return d - 90
            // Anything else (e.g. a direct reset, or a 180° flip) isn't a
            // simple single-step rotation — just snap directly, there's no
            // "smooth direction" to preserve for those.
            return d + (rotation - prev)
        })
        prevRef.current = rotation
    }, [rotation])

    return display
}