/**
 * Custom-cursor reliability fixes, split out of main.tsx to keep that file
 * short. Call initCursorRefresh() once at startup; it's a no-op if
 * --cursor-app isn't defined (e.g. if that block is ever removed from
 * index.css), and cleans up its own listeners if you ever need to undo it.
 */
export function initCursorRefresh(): () => void {
    // Chromium/Firefox sometimes fail to show a custom `cursor: url(...)` on
    // the very first paint if the image hasn't finished decoding yet, and
    // don't retry once it has -- leaving the default arrow until a full
    // reload. Reads --cursor-app instead of hardcoding it, so it stays in
    // sync with index.css.
    const cursorUrl = getComputedStyle(document.documentElement)
        .getPropertyValue('--cursor-app')
        .match(/url\((['"]?)(.*?)\1\)/)?.[2]
    if (!cursorUrl) return () => { }

    // Forces the browser to re-apply the custom cursor on EVERY element by
    // flipping the shared --cursor-app variable to `default` for a moment.
    // (Toggling only body's cursor is not enough: the hovered element -- e.g.
    // the Import Images button -- gets its cursor from its own rule.)
    // Removing the inline value hands control back to the stylesheet.
    const refreshCursor = () => {
        const html = document.documentElement
        const restore = () => html.style.removeProperty('--cursor-app')
        html.style.setProperty('--cursor-app', 'default')
        void html.offsetHeight // apply the change now
        requestAnimationFrame(restore)
        setTimeout(restore, 50) // fallback in case rAF is throttled
    }

    const preload = new Image()
    preload.onload = refreshCursor
    preload.src = cursorUrl

    // Track the pointer so we can force a synthetic mousemove at its last
    // known position -- this is the actual fix for the file-picker case:
    // browsers only repaint the cursor bitmap in response to a pointer/
    // hit-test event, not merely because a CSS value changed underneath it.
    // A raw style toggle (refreshCursor above) fixes the *computed* value but
    // does not by itself force that repaint.
    let lastX = 0
    let lastY = 0
    const trackPointer = (e: MouseEvent) => { lastX = e.clientX; lastY = e.clientY }
    window.addEventListener('mousemove', trackPointer, { passive: true })

    const nudgeCursor = () => {
        refreshCursor()
        const el = document.elementFromPoint(lastX, lastY)
        el?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true, cancelable: true, clientX: lastX, clientY: lastY,
        }))
    }

    // After a native OS dialog (the Import Images file picker) closes, the
    // browser keeps showing the default arrow until it re-evaluates the
    // cursor. Nudge as soon as the dialog reports back (file chosen or
    // cancelled), when the window regains focus, and a few more times
    // shortly after, since these events can fire before the dialog has fully
    // released the pointer.
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const nudgeSoon = () => {
        nudgeCursor()
        for (const ms of [50, 150, 300, 600, 1000]) timeouts.push(setTimeout(nudgeCursor, ms))
    }
    const onVisibility = () => { if (!document.hidden) nudgeSoon() }
    const onFileEvent = (e: Event) => {
        if (e.target instanceof HTMLInputElement && e.target.type === 'file') nudgeSoon()
    }

    window.addEventListener('focus', nudgeSoon)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('change', onFileEvent, true)
    document.addEventListener('cancel', onFileEvent, true)

    // Belt-and-braces: 'cancel' on a file input isn't supported everywhere,
    // and 'focus' isn't guaranteed to fire the same way for every browser/OS
    // combination when a dialog is dismissed vs. when a file is picked --
    // which is exactly the asymmetry (works after importing, not after
    // closing without picking a file) this is meant to catch. Poll actual
    // focus state directly instead of trusting any single event to fire.
    let wasFocused = document.hasFocus()
    const pollId = window.setInterval(() => {
        const isFocused = document.hasFocus()
        if (isFocused && !wasFocused) nudgeSoon()
        wasFocused = isFocused
    }, 200)

    return () => {
        window.removeEventListener('mousemove', trackPointer)
        window.removeEventListener('focus', nudgeSoon)
        document.removeEventListener('visibilitychange', onVisibility)
        document.removeEventListener('change', onFileEvent, true)
        document.removeEventListener('cancel', onFileEvent, true)
        window.clearInterval(pollId)
        timeouts.forEach(clearTimeout)
    }
}