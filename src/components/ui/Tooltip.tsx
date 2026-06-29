import {
    memo,
    useState,
    useRef,
    useCallback,
    useEffect,
    createContext,
    useContext,
    type ReactNode,
    type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

type Placement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipState {
    visible: boolean
    x: number
    y: number
    content: ReactNode
    placement: Placement
}

interface TooltipContextValue {
    show: (
        anchor: HTMLElement,
        content: ReactNode,
        placement?: Placement,
        offset?: number
    ) => void
    hide: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TooltipContext = createContext<TooltipContextValue | null>(null)

// ─── Positioning helper ───────────────────────────────────────────────────────

function computePosition(
    anchor: HTMLElement,
    tooltip: HTMLElement,
    placement: Placement,
    offset: number
): { x: number; y: number; actual: Placement } {
    const ar = anchor.getBoundingClientRect()
    const tr = tooltip.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const PAD = 8 // min distance from viewport edge

    let x = 0
    let y = 0
    let actual = placement

    const positions: Record<Placement, { x: number; y: number }> = {
        top: { x: ar.left + ar.width / 2 - tr.width / 2, y: ar.top - tr.height - offset },
        bottom: { x: ar.left + ar.width / 2 - tr.width / 2, y: ar.bottom + offset },
        left: { x: ar.left - tr.width - offset, y: ar.top + ar.height / 2 - tr.height / 2 },
        right: { x: ar.right + offset, y: ar.top + ar.height / 2 - tr.height / 2 },
    }

    // Auto-flip if overflowing
    const preferred = positions[placement]
    const fits = {
        top: preferred.y >= PAD,
        bottom: preferred.y + tr.height <= vh - PAD,
        left: preferred.x >= PAD,
        right: preferred.x + tr.width <= vw - PAD,
    }

    if (!fits[placement]) {
        const opposite: Record<Placement, Placement> = {
            top: 'bottom', bottom: 'top', left: 'right', right: 'left',
        }
        const flipped = opposite[placement]
        if (fits[flipped]) {
            actual = flipped
        }
    }

    const pos = positions[actual]
    x = Math.max(PAD, Math.min(pos.x, vw - tr.width - PAD))
    y = Math.max(PAD, Math.min(pos.y, vh - tr.height - PAD))

    return { x, y, actual }
}

// ─── The actual floating tooltip node ────────────────────────────────────────

const TooltipNode = memo(({ state }: { state: TooltipState }) => {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: -9999, y: -9999, actual: state.placement })

    useEffect(() => {
        if (!ref.current || !state.visible) return
        // Wait for element to be measured
        requestAnimationFrame(() => {
            if (!ref.current) return
            // We need the anchor — it's stored as data on the element
            const anchor = document.querySelector('[data-tooltip-anchor="true"]') as HTMLElement
            if (!anchor) {
                setPos({ x: state.x, y: state.y, actual: state.placement })
                return
            }
            const computed = computePosition(anchor, ref.current, state.placement, 8)
            setPos(computed)
        })
    }, [state])

    if (!state.visible) return null

    const arrowStyles: Record<Placement, CSSProperties> = {
        top: {
            bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
        },
        bottom: {
            top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
        },
        left: {
            right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
        },
        right: {
            left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
        },
    }

    return createPortal(
        <div
            ref={ref}
            role="tooltip"
            style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                zIndex: 9999,
                pointerEvents: 'none',
                animation: 'tooltipIn 120ms cubic-bezier(0.16,1,0.3,1) both',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    padding: '5px 10px',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    color: 'var(--tooltip-tx)',
                    fontSize: 11.5,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--tooltip-shadow)',
                    letterSpacing: '-0.1px',
                    maxWidth: 260,
                    whiteSpaceCollapse: 'preserve',
                } as CSSProperties}
            >
                {state.content}

                {/* Arrow */}
                <div
                    style={{
                        position: 'absolute',
                        width: 8,
                        height: 8,
                        background: 'var(--tooltip-bg)',
                        border: '1px solid var(--tooltip-border)',
                        borderRight: pos.actual === 'left' ? '1px solid var(--tooltip-border)' : 'none',
                        borderBottom: pos.actual === 'top' ? '1px solid var(--tooltip-border)' : 'none',
                        borderTop: pos.actual === 'bottom' ? '1px solid var(--tooltip-border)' : 'none',
                        borderLeft: pos.actual === 'right' ? '1px solid var(--tooltip-border)' : 'none',
                        ...arrowStyles[pos.actual],
                    }}
                />
            </div>
        </div>,
        document.body
    )
})
TooltipNode.displayName = 'TooltipNode'

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TooltipProvider = memo(({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        content: null,
        placement: 'top',
    })

    const anchorRef = useRef<HTMLElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const show = useCallback((
        anchor: HTMLElement,
        content: ReactNode,
        placement: Placement = 'top',
        offset = 8
    ) => {
        if (timerRef.current) clearTimeout(timerRef.current)

        // Mark current anchor for position calculation
        if (anchorRef.current) {
            anchorRef.current.removeAttribute('data-tooltip-anchor')
        }
        anchor.setAttribute('data-tooltip-anchor', 'true')
        anchorRef.current = anchor

        const ar = anchor.getBoundingClientRect()

        timerRef.current = setTimeout(() => {
            setState({
                visible: true,
                x: ar.left + ar.width / 2,
                y: ar.top,
                content,
                placement,
            })
        }, 400) // delay before showing
    }, [])

    const hide = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (anchorRef.current) {
            anchorRef.current.removeAttribute('data-tooltip-anchor')
            anchorRef.current = null
        }
        setState(s => ({ ...s, visible: false }))
    }, [])

    // Hide on scroll or resize
    useEffect(() => {
        const handler = () => hide()
        window.addEventListener('scroll', handler, true)
        window.addEventListener('resize', handler)
        return () => {
            window.removeEventListener('scroll', handler, true)
            window.removeEventListener('resize', handler)
        }
    }, [hide])

    return (
        <TooltipContext.Provider value={{ show, hide }}>
            {children}
            <TooltipNode state={state} />
        </TooltipContext.Provider>
    )
})
TooltipProvider.displayName = 'TooltipProvider'

// ─── useTooltip hook ──────────────────────────────────────────────────────────

export function useTooltipContext() {
    const ctx = useContext(TooltipContext)
    if (!ctx) throw new Error('useTooltipContext must be used inside <TooltipProvider>')
    return ctx
}

// ─── <Tooltip> wrapper component — drop-in replacement for title="" ───────────

interface TooltipProps {
    content: ReactNode
    placement?: Placement
    delay?: boolean
    disabled?: boolean
    children: ReactNode
    shortcut?: string // e.g. "⌘K"
}

export const Tooltip = memo(({
    content,
    placement = 'top',
    disabled = false,
    children,
    shortcut,
}: TooltipProps) => {
    const { show, hide } = useTooltipContext()
    const ref = useRef<HTMLDivElement>(null)

    const handleMouseEnter = useCallback(() => {
        if (disabled || !ref.current) return
        const el = ref.current.firstElementChild as HTMLElement ?? ref.current
        const tooltipContent = shortcut ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{content}</span>
                <kbd style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '1px 5px', borderRadius: 4,
                    background: 'var(--tooltip-kbd-bg)',
                    border: '1px solid var(--tooltip-kbd-border)',
                    color: 'var(--tooltip-kbd-tx)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10, lineHeight: 1.5,
                }}>
                    {shortcut}
                </kbd>
            </span>
        ) : content
        show(el, tooltipContent, placement)
    }, [disabled, show, content, placement, shortcut])

    return (
        <div
            ref={ref}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={hide}
            onMouseDown={hide}
            onFocus={handleMouseEnter}
            onBlur={hide}
            style={{ display: 'contents' }}
        >
            {children}
        </div>
    )
})
Tooltip.displayName = 'Tooltip'