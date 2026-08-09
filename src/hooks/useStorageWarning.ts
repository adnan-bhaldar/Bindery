import { useEffect, useState, useCallback } from 'react'
import { getQuotaUsage } from '@/db/schema'
import { STORAGE_WARNING_THRESHOLD } from '@/constants'

// ─── Module-level singleton state ──────────────────────────────────────────────
// Same pattern as usePWA: storage usage is one piece of real browser state,
// not something each mounting component should measure independently.
// Every consumer of useStorageWarning sees the same numbers regardless of
// mount order, and the periodic check only ever runs once, no matter how
// many components use the hook.

let percentUsed = 0
let checked = false
const subscribers = new Set<() => void>()

function notifyAll() {
    subscribers.forEach(fn => fn())
}

async function checkStorage() {
    try {
        // getQuotaUsage() only reads navigator.storage.estimate() — unlike
        // getStorageStats() (used by the Settings page), it never loads
        // every page/thumbnail Blob via toArray() just to compute a
        // percentage. This runs on a timer plus every focus/visibility
        // change, so it needs to stay cheap — especially since it's
        // exactly the moment storage is already under pressure.
        const { usageBytes, quotaBytes } = await getQuotaUsage()
        if (quotaBytes <= 0) return
        percentUsed = usageBytes / quotaBytes
        checked = true
        notifyAll()
    } catch {
        // navigator.storage.estimate() unsupported or denied — leave
        // percentUsed at 0 rather than ever showing a false warning.
    }
}

let globalListenersAttached = false
function ensureGlobalListeners() {
    if (globalListenersAttached || typeof window === 'undefined') return
    globalListenersAttached = true

    void checkStorage()
    setInterval(checkStorage, 30_000)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void checkStorage()
    })
    window.addEventListener('focus', () => void checkStorage())
}

export function useStorageWarning() {
    ensureGlobalListeners()

    // Forces a re-render whenever the shared module-level state changes —
    // percentUsed/checked above are always the real source of truth.
    const [, setTick] = useState(0)
    useEffect(() => {
        const rerender = () => setTick(t => t + 1)
        subscribers.add(rerender)
        return () => { subscribers.delete(rerender) }
    }, [])

    const refresh = useCallback(() => checkStorage(), [])

    return {
        percentUsed,
        isFull: checked && percentUsed >= STORAGE_WARNING_THRESHOLD,
        refresh,
    }
}