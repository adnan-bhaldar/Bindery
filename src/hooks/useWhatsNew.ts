import { useState } from 'react'
import { CHANGELOG, type ChangelogEntry } from '@/constants/changelog'
import { APP_VERSION } from '@/constants'

const STORAGE_KEY = 'bindery:lastSeenVersion'

function computeEntry(): ChangelogEntry | null {
    const currentVersion = APP_VERSION
    let lastSeen: string | null

    try {
        lastSeen = localStorage.getItem(STORAGE_KEY)
    } catch {
        // localStorage unavailable — nothing to compare against, stay quiet
        return null
    }

    if (lastSeen === null) {
        // First-ever visit — nothing "new" to announce yet. Just remember
        // this version and stay quiet.
        try { localStorage.setItem(STORAGE_KEY, currentVersion) } catch { /* ignore */ }
        return null
    }

    if (lastSeen !== currentVersion) {
        try { localStorage.setItem(STORAGE_KEY, currentVersion) } catch { /* ignore */ }
        return CHANGELOG.find(c => c.version === currentVersion) ?? null
    }

    return null
}

export function useWhatsNew() {
    // Computed once, synchronously, on mount — not in a useEffect, since
    // this is a one-time read from an external source (localStorage) with
    // no need for the extra render cycle a useEffect+setState pattern
    // would add.
    const [entry, setEntry] = useState<ChangelogEntry | null>(() => computeEntry())
    const dismiss = () => setEntry(null)
    return { entry, dismiss }
}