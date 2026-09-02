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

const INSTALLED_STORAGE_KEY = 'bindery-pwa-installed'

let capturedPrompt: BeforeInstallPromptEvent | null = null
let cachedIsInstalled = false
let swRegistered = false
let updateAvailable = false
let waitingWorker: ServiceWorker | null = null
let reloadTriggered = false
// Flips true the moment our OWN periodic poll / focus / visibility check
// runs at least once. An updatefound event that fires before this flag is
// set (e.g. from the automatic check register() performs on its own) means
// the deploy happened while this tab was CLOSED — the HTML/JS this page
// just loaded already came straight from the network and is the latest
// build, so there's nothing stale actually running yet, and prompting
// "Update Available" would be redundant. Only updatefound events that occur
// AFTER this flag is set are genuine mid-session updates, where the JS
// currently running in memory really has gone stale and a reload is
// actually needed.
let activeSessionCheckHappened = false
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

    // 'appinstalled' fires once, in whichever tab triggered the install —
    // including the ordinary browser tab that showed the prompt, not just a
    // standalone window. It's our only reliable signal that installation
    // actually happened, so persist it: without this, a later visit to the
    // site in a plain browser tab has no way to know the app is already
    // installed (display-mode won't be 'standalone' there, and the browser
    // won't re-fire beforeinstallprompt for an app it already installed) —
    // it would wrongly fall through to "not available in this browser".
    window.addEventListener('appinstalled', () => {
        capturedPrompt = null
        cachedIsInstalled = true
        try { localStorage.setItem(INSTALLED_STORAGE_KEY, 'true') } catch { /* ignore */ }
        notifyAll()
    })

    const mq = window.matchMedia('(display-mode: standalone)')
    let previouslyInstalled = false
    try { previouslyInstalled = localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true' } catch { /* ignore */ }
    cachedIsInstalled = mq.matches || previouslyInstalled
    mq.addEventListener('change', (e) => {
        // A live display-mode change is authoritative in both directions —
        // e.g. reflects an actual uninstall — so let it override the stored
        // flag rather than only ever setting it.
        cachedIsInstalled = e.matches
        try {
            if (e.matches) {
                localStorage.setItem(INSTALLED_STORAGE_KEY, 'true')
            } else {
                localStorage.removeItem(INSTALLED_STORAGE_KEY)
            }
        } catch { /* ignore */ }
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

                // A waiting worker found right here — either already
                // waiting the instant we register, or found by the
                // automatic check the browser performs as part of
                // register() itself — means the deploy happened while this
                // tab was CLOSED. The HTML/JS this page just loaded came
                // straight from the network and is already the latest
                // build (see useWhatsNew/APP_VERSION), so surfacing
                // "Update Available" here would be redundant. Activate
                // silently instead; no reload needed since the content is
                // already current.
                if (reg.waiting && navigator.serviceWorker.controller) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
                }

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing
                    newWorker?.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (activeSessionCheckHappened) {
                                // Found by our own periodic poll or a
                                // focus/visibility check — a genuine
                                // mid-session deploy. The JS currently
                                // running in memory really is stale now, so
                                // this legitimately needs a user-triggered
                                // reload.
                                console.log('[PWA] New version available')
                                handleWaitingWorker(newWorker)
                            } else {
                                // Same "tab was closed, already fresh" case
                                // as above — this fired from register()'s
                                // own automatic check, not from our polling.
                                newWorker.postMessage({ type: 'SKIP_WAITING' })
                            }
                        }
                    })
                })

                // Catch updates deployed while the tab is already open —
                // the browser only checks for a new sw.js on navigation by
                // default, so poll periodically too, and also the moment the
                // tab regains focus (the most common way people notice a
                // stale tab — switching back after time away). Any
                // updatefound resulting from THESE checks is a real
                // mid-session update, so it's safe to prompt for it.
                const checkForUpdate = () => {
                    activeSessionCheckHappened = true
                    reg.update().catch(() => { })
                }
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
            // controllerchange fires once the new worker takes over, but
            // isn't 100% reliable across browsers — fall back quickly rather
            // than waiting long, since HTML is fetched network-first and
            // assets are content-hashed per build, so reloading doesn't
            // depend on the new worker having fully taken control yet.
            setTimeout(() => {
                if (reloadTriggered) window.location.reload()
            }, 300)
        },
    }
}