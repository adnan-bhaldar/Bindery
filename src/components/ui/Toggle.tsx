import { memo } from 'react'

interface ToggleProps {
    checked: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
    label?: string
    size?: 'sm' | 'md'
}

// Injected once at module load (not per-instance) — previously every single
// <Toggle> on screen (Settings has 15+) mounted its own identical <style>
// block, which is wasteful DOM duplication for zero benefit.
let stylesInjected = false
function ensureStyles() {
    if (stylesInjected || typeof document === 'undefined') return
    stylesInjected = true
    const style = document.createElement('style')
    style.textContent = `
        .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0; }
        .toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
        .toggle-track {
          border-radius: 9999px;
          transition: background 240ms var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                      box-shadow 240ms var(--ease-out, cubic-bezier(0.16,1,0.3,1));
        }
        .toggle-track.on {
          background: var(--accent);
          box-shadow: 0 0 0 5px var(--accent-glow);
        }
        .toggle-track.off {
          background: var(--s5);
          box-shadow: 0 0 0 0 transparent;
        }
        .toggle:hover .toggle-track.off { background: var(--s6, var(--s5)); }
        .toggle:hover .toggle-track.on { filter: brightness(1.08); }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .toggle:disabled { opacity: 0.4; cursor: not-allowed; }
        .toggle:disabled:hover .toggle-track.off { background: var(--s5); }
        .toggle:disabled:hover .toggle-track.on { filter: none; }
    `
    document.head.appendChild(style)
}

export const Toggle = memo(({ checked, onChange, disabled = false, label, size = 'md' }: ToggleProps) => {
    ensureStyles()

    const w = size === 'sm' ? 30 : 36
    const h = size === 'sm' ? 17 : 20
    const d = size === 'sm' ? 13 : 16
    const tx = size === 'sm' ? (checked ? 15 : 2) : (checked ? 18 : 2)

    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className="toggle"
            style={{ width: w, height: h }}
        >
            <input type="checkbox" readOnly checked={checked} aria-hidden />
            <span className={`toggle-track ${checked ? 'on' : 'off'}`} style={{ width: w, height: h }} />
            <span
                className="toggle-thumb"
                style={{ width: d, height: d, transform: `translateX(${tx}px)` }}
            />
        </button>
    )
})
Toggle.displayName = 'Toggle'