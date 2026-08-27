import { memo, useState, useCallback } from 'react'
import { Smartphone, CheckCircle2, WifiOff, Download } from 'lucide-react'
import { toast } from 'sonner'
import { usePWA } from '@/hooks/usePWA'
import { Spinner } from '@/components/ui/Spinner'
import { Card, CardRow } from '../primitives'

// ─── App section — real install prompt via usePWA, not decorative ────────────

const AppSection = memo(() => {
    const { canInstall, isInstalled, swRegistered, install } = usePWA()
    const [installing, setInstalling] = useState(false)

    const handleInstall = useCallback(async () => {
        setInstalling(true)
        try {
            const accepted = await install()
            if (accepted) toast.success('Bindery installed')
        } finally {
            setInstalling(false)
        }
    }, [install])

    return (
        <div>
            <Card id="setting-app-status" title="App Status" icon={Smartphone}>
                <CardRow label="Status">
                    {isInstalled ? (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 11.5, fontWeight: 600, color: '#34d399',
                            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            <CheckCircle2 size={12} />
                            Installed
                        </span>
                    ) : canInstall ? (
                        <span style={{
                            fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
                            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            Available
                        </span>
                    ) : (
                        <span style={{
                            fontSize: 11.5, fontWeight: 500, color: 'var(--tx-4)',
                            background: 'var(--s3)', border: '1px solid var(--border)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            Not available in this browser
                        </span>
                    )}
                </CardRow>
                <CardRow
                    id="setting-offline-support"
                    label="Offline support"
                    desc={swRegistered ? 'Service worker active — Bindery works without a connection' : 'Not active yet'}
                    last
                >
                    {swRegistered ? (
                        <CheckCircle2 size={16} color="#34d399" />
                    ) : (
                        <WifiOff size={16} color="var(--tx-4)" />
                    )}
                </CardRow>
            </Card>

            {!isInstalled && (
                <Card id="setting-install-prompt">
                    <p style={{ fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.65, marginBottom: canInstall ? 14 : 0 }}>
                        {canInstall
                            ? 'Install Bindery as a standalone app — it opens in its own window, works offline, and runs like any other app on your device.'
                            : 'Your browser has not offered an install prompt yet, or does not support installing web apps. Try Chrome, Edge, or a Chromium-based browser, or look for an Install or Add to Home Screen option in your browser’s own menu.'}
                    </p>
                    {canInstall && (
                        <button
                            onClick={handleInstall}
                            disabled={installing}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                width: '100%', padding: '10px 16px',
                                borderRadius: 12, border: 'none',
                                background: 'var(--gradient-accent)',
                                color: '#fff', fontSize: 13, fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: installing ? 'default' : 'pointer',
                                opacity: installing ? 0.7 : 1,
                                boxShadow: '0 4px 16px var(--accent-glow)',
                                transition: 'transform 130ms, box-shadow 130ms',
                            }}
                            onMouseEnter={e => { if (!installing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)' } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)' }}
                        >
                            {installing ? <Spinner size={14} /> : <Download size={14} />}
                            {installing ? 'Installing…' : 'Install App'}
                        </button>
                    )}
                </Card>
            )}
        </div>
    )
})
AppSection.displayName = 'AppSection'

export default AppSection