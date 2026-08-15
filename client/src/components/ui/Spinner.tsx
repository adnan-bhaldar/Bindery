import { memo } from 'react'

interface SpinnerProps { size?: number; className?: string }

export const Spinner = memo(({ size = 16, className }: SpinnerProps) => (
    <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className={className}
        style={{ animation: 'spin 0.65s linear infinite', color: 'var(--accent)', flexShrink: 0 }}
        aria-hidden
    >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
            opacity={0.15} />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" />
    </svg>
))
Spinner.displayName = 'Spinner'