import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── Module-level singleton state ──────────────────────────────────────────────
// The 'beforeinstallprompt' event fires exactly ONCE per page load. Previously
// this hook captured it into its own local useState — which meant every
// separate component calling usePWA() got its own independent, isolated copy
// of that state. Whichever component happened to be mounted when the event
// fired (InstallBanner, mounted at app startup) captured it correctly; any
// OTHER component calling the hook later (e.g. the Settings "App" section)
// got a blank slate that could never receive the event, since it had already
// fired and wasn't coming again. That's why Settings could report "not
// available" in the same session the banner had legitimately appeared.
//
// Moving the actual captured event and installed-state to module scope, with
// a simple subscriber list, means every component sees the exact same real
// state regardless of mount order — there's only one source of truth.

let capturedPrompt: BeforeInstallPromptEvent | null = null
let cachedIsInstalled = false
let swRegistered = false
let updateAvailable = false
let waitingWorker: ServiceWorker | null = null
let reloadTriggered = false
const subscribers = new Set<() => void>()

function notifyAll() {
    subscribers.forEach(fn => fn())
}

function handleWaitingWorker(worker: ServiceWorker) {
    waitingWorker = worker
    updateAvailable = true
    notifyAll()
}

let globalListenersAttached = false
function ensureGlobalListeners() {
    if (globalListenersAttached || typeof window === 'undefined') return
    globalListenersAttached = true

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        capturedPrompt = e as BeforeInstallPromptEvent
        notifyAll()
    })

    const mq = window.matchMedia('(display-mode: standalone)')
    cachedIsInstalled = mq.matches
    mq.addEventListener('change', (e) => {
        cachedIsInstalled = e.matches
        notifyAll()
    })

    if ('serviceWorker' in navigator) {
        // Reload once the new worker actually takes control — triggered by
        // reloadForUpdate() below, never on first install.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!reloadTriggered) return
            window.location.reload()
        })

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                swRegistered = true
                notifyAll()
                console.log('[PWA] Service worker registered:', reg.scope)

                // A new worker may already be sitting in "waiting" if the
                // update installed while this tab was open but idle.
                if (reg.waiting && navigator.serviceWorker.controller) {
                    handleWaitingWorker(reg.waiting)
                }

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing
                    newWorker?.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New version available')
                            handleWaitingWorker(newWorker)
                        }
                    })
                })

                // Catch updates deployed while the tab is already open —
                // the browser only checks for a new sw.js on navigation by
                // default, so poll periodically too, and also the moment the
                // tab regains focus (the most common way people notice a
                // stale tab — switching back after time away).
                const checkForUpdate = () => { reg.update().catch(() => { }) }
                setInterval(checkForUpdate, 15_000)
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') checkForUpdate()
                })
                window.addEventListener('focus', checkForUpdate)
            })
            .catch(err => {
                console.warn('[PWA] Service worker registration failed:', err)
            })
    }
}

export function usePWA() {
    ensureGlobalListeners()

    // A tiny piece of local state purely to force a re-render whenever the
    // shared module-level state changes — the actual values read below
    // (capturedPrompt, cachedIsInstalled, swRegistered) always come straight
    // from the shared singletons above, never from this.
    const [, setTick] = useState(0)

    useEffect(() => {
        const rerender = () => setTick(t => t + 1)
        subscribers.add(rerender)
        return () => { subscribers.delete(rerender) }
    }, [])

    const install = async (): Promise<boolean> => {
        if (!capturedPrompt) return false
        await capturedPrompt.prompt()
        const { outcome } = await capturedPrompt.userChoice
        if (outcome === 'accepted') {
            capturedPrompt = null
            cachedIsInstalled = true
            notifyAll()
            return true
        }
        return false
    }

    return {
        canInstall: !!capturedPrompt && !cachedIsInstalled,
        isInstalled: cachedIsInstalled,
        swRegistered,
        updateAvailable,
        install,
        reloadForUpdate: () => {
            if (!waitingWorker) return
            reloadTriggered = true
            waitingWorker.postMessage({ type: 'SKIP_WAITING' })
            // controllerchange should fire once the new worker takes over and
            // trigger the reload — but it's not 100% reliable across browsers/
            // dev setups, so force it after a short grace period regardless.
            setTimeout(() => {
                if (reloadTriggered) window.location.reload()
            }, 2000)
        },
    }
}