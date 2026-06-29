import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [swRegistered, setSwRegistered] = useState(false)

    // Register service worker
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                setSwRegistered(true)
                console.log('[PWA] Service worker registered:', reg.scope)

                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing
                    newWorker?.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New version available')
                        }
                    })
                })
            })
            .catch(err => {
                console.warn('[PWA] Service worker registration failed:', err)
            })
    }, [])

    // Capture install prompt
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    // Detect if already installed
    useEffect(() => {
        const mq = window.matchMedia('(display-mode: standalone)')
        setIsInstalled(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const install = async (): Promise<boolean> => {
        if (!installPrompt) return false
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setInstallPrompt(null)
            setIsInstalled(true)
            return true
        }
        return false
    }

    return { canInstall: !!installPrompt && !isInstalled, isInstalled, swRegistered, install }
}