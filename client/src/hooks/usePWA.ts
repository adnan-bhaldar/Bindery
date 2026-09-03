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
// Bumped by appinstalled and the optimistic install() success path, and
// captured by each refreshInstallState() call at its start. A pending async
// check (getInstalledRelatedApps can take a moment) that resolves AFTER one
// of those authoritative updates would otherwise overwrite it with a stale
// "not installed" result — comparing generations lets a superseded call
// detect that and discard its own result instead of applying it.
let installCheckGeneration = 0

// getInstalledRelatedApps() has existed since Chrome 80 for Android/Windows
// app checks, so its presence doesn't confirm THIS check — desktop PWA
// self-detection — is supported (that's Chrome/Edge 140+; Android's been
// fine since 84). On an unsupported version it resolves fine but always
// returns [], indistinguishable from "confirmed not installed" without
// knowing the version. A positive result is always trusted (no realistic
// false positives); a negative one only counts when this returns true —
// otherwise it'd wipe the working appinstalled/localStorage signal.
function isDesktopSelfCheckSupported(): boolean {
    try {
        const uaData = (navigator as Navigator & {
            userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] }
        }).userAgentData
        if (uaData?.platform && /android/i.test(uaData.platform)) return true
        if (/android/i.test(navigator.userAgent)) return true
        const brand = uaData?.brands?.find((b) => /chromium|chrome|edge/i.test(b.brand))
        if (brand) {
            const major = parseInt(brand.version, 10)
            if (!Number.isNaN(major)) return major >= 140
        }
        // Client Hints (userAgentData) aren't available in every Chromium
        // build, so fall back to parsing the UA string directly.
        const match = navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/)
        if (match) return parseInt(match[1], 10) >= 140
    } catch { /* ignore */ }
    return false
}
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
    // standalone window. Treat it as an immediate, optimistic "yes" (no need
    // to wait on an async OS query for the common case of installing right
    // here), backed up by the authoritative check below for everything else.
    window.addEventListener('appinstalled', () => {
        installCheckGeneration++ // supersede any in-flight refreshInstallState() so it can't overwrite this with a stale result
        capturedPrompt = null
        cachedIsInstalled = true
        try { localStorage.setItem(INSTALLED_STORAGE_KEY, 'true') } catch { /* ignore */ }
        notifyAll()
    })

    const mq = window.matchMedia('(display-mode: standalone)')

    // localStorage alone only ever records a past install — nothing clears
    // it on uninstall — so getInstalledRelatedApps() is used as the
    // authoritative source where supported, correcting the stored guess in
    // both directions. Unsupported browsers (Safari, Firefox) fall back to
    // the flag/display-mode heuristic. Requires this origin listed under
    // `related_applications` in manifest.json.
    async function refreshInstallState() {
        const gen = ++installCheckGeneration
        const standalone = mq.matches
        if ('getInstalledRelatedApps' in navigator) {
            try {
                const related = await (navigator as Navigator & {
                    getInstalledRelatedApps: () => Promise<unknown[]>
                }).getInstalledRelatedApps()
                if (gen !== installCheckGeneration) return // superseded — e.g. appinstalled fired while this was in flight
                const confirmed = standalone || related.length > 0
                if (confirmed) {
                    cachedIsInstalled = true
                    try { localStorage.setItem(INSTALLED_STORAGE_KEY, 'true') } catch { /* ignore */ }
                    notifyAll()
                    return
                }
                if (isDesktopSelfCheckSupported()) {
                    cachedIsInstalled = false
                    try { localStorage.removeItem(INSTALLED_STORAGE_KEY) } catch { /* ignore */ }
                    notifyAll()
                    return
                }
                // Empty result on a version that may not actually support
                // this check yet — inconclusive, not confirmation of
                // absence. Fall through to the heuristic below instead of
                // treating it as authoritative.
            } catch {
                // Falls through to the heuristic below.
            }
        }
        if (gen !== installCheckGeneration) return
        let previouslyInstalled = false
        try { previouslyInstalled = localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true' } catch { /* ignore */ }
        cachedIsInstalled = standalone || previouslyInstalled
        notifyAll()
    }

    refreshInstallState()
    mq.addEventListener('change', () => refreshInstallState())

    // A tab left open through an uninstall, or a deploy, never gets told
    // about it directly — nothing pushes that news to an open tab. Recheck
    // both install status and SW updates whenever the tab becomes relevant
    // again, via one shared pair of listeners rather than one pair per
    // concern.
    const onVisibleOrFocus: Array<() => void> = [refreshInstallState]
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onVisibleOrFocus.forEach((fn) => fn())
    })
    window.addEventListener('focus', () => onVisibleOrFocus.forEach((fn) => fn()))

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
                onVisibleOrFocus.push(checkForUpdate)
            })
            .catch(err => {
                console.warn('[PWA] Service worker registration failed:', err)
            })
    }
}

export function usePWA() {
    // A tiny piece of local state purely to force a re-render whenever the
    // shared module-level state changes — the actual values read below
    // (capturedPrompt, cachedIsInstalled, swRegistered) always come straight
    // from the shared singletons above, never from this.
    const [, setTick] = useState(0)

    useEffect(() => {
        const rerender = () => setTick(t => t + 1)
        subscribers.add(rerender)
        // Subscribing before calling ensureGlobalListeners matters: on the
        // very first usePWA() mount, ensureGlobalListeners kicks off an
        // async getInstalledRelatedApps() check. If that promise settled
        // before this effect ran, notifyAll() would fire into an empty
        // subscriber set and the real result would be silently dropped
        // until some later, unrelated change happened to trigger a
        // re-render. All components mounted in this same commit have
        // already run this effect (React flushes passive effects
        // synchronously as a batch) well before any real async I/O
        // resolves, so this ordering is safe regardless of mount order.
        ensureGlobalListeners()
        return () => { subscribers.delete(rerender) }
    }, [])

    const install = async (): Promise<boolean> => {
        if (!capturedPrompt) return false
        await capturedPrompt.prompt()
        const { outcome } = await capturedPrompt.userChoice
        if (outcome === 'accepted') {
            installCheckGeneration++ // same reasoning as the appinstalled handler
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