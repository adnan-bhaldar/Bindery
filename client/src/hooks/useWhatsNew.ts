import { useState, useEffect } from 'react'
import { CHANGELOG, type ChangelogEntry } from '@/constants/changelog'
import { APP_VERSION } from '@/constants'

const STORAGE_KEY = 'bindery:lastSeenVersion'

// Pure read — safe to call more than once (e.g. under StrictMode's
// double-invocation of state initializers), since it never mutates
// anything. Persisting the "seen" version is handled separately, in an
// effect after mount (see useWhatsNew below) — combining the read and the
// write in one function previously caused a real bug: under StrictMode,
// the second invocation could see the first invocation's own write
// already applied and incorrectly conclude there was nothing new,
// silently discarding the dialog on a genuinely new version.
function getEntryToShow(): ChangelogEntry | null {
    let lastSeen: string | null
    try {
        lastSeen = localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }

    // First-ever visit (nothing stored yet) — nothing "new" to announce.
    if (lastSeen === null || lastSeen === APP_VERSION) return null

    return CHANGELOG.find(c => c.version === APP_VERSION) ?? null
}

export function useWhatsNew() {
    const [entry, setEntry] = useState<ChangelogEntry | null>(() => getEntryToShow())

    // Persist "seen" once after mount, in a real effect — decoupled from
    // the state computation above, so it can't race with StrictMode's
    // initializer replays. Runs unconditionally (including on a first-ever
    // visit and on a repeat visit with no new version) so the stored
    // version always ends up correct regardless of which case this was.
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, APP_VERSION) } catch { /* ignore */ }
    }, [])

    const dismiss = () => setEntry(null)
    return { entry, dismiss }
}