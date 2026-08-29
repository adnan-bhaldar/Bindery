import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode; onError?: (e: Error, i: ErrorInfo) => void }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info)
        this.props.onError?.(error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children
        if (this.props.fallback) return this.props.fallback

        return (
            <>
                <style>{`
          .eb-wrap {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 14px; padding: 48px 32px;
            height: 100%; text-align: center;
          }
          .eb-icon {
            width: 48px; height: 48px; border-radius: var(--r-xl);
            background: color-mix(in srgb, #ef4444 12%, transparent);
            border: 1px solid color-mix(in srgb, #ef4444 25%, transparent);
            display: flex; align-items: center; justify-content: center;
          }
          .eb-title { font-size: 13px; font-weight: 600; color: var(--tx-1); letter-spacing: -0.2px; }
          .eb-msg { font-size: 12px; color: var(--tx-3); max-width: 280px; line-height: 1.6; }
          .eb-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: var(--r-md);
            background: var(--s3); border: 1px solid var(--border);
            color: var(--tx-1); font-size: 12px; font-weight: 500;
            font-family: var(--font-sans); cursor: pointer;
            transition: background var(--dur-fast), border-color var(--dur-fast);
          }
          .eb-btn:hover { background: var(--s4); border-color: var(--border-hard); }
        `}</style>
                <div className="eb-wrap" role="alert">
                    <div className="eb-icon">
                        <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <p className="eb-title">Something went wrong</p>
                    <p className="eb-msg">{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
                    <button className="eb-btn" onClick={() => this.setState({ hasError: false, error: null })}>
                        <RefreshCw size={13} />
                        Try again
                    </button>
                </div>
            </>
        )
    }
}