import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { usePagesStore } from '@/stores/pagesStore'
import { useSettingsStore } from '@/stores/settingsStore'

// autoSaveInterval === 0 means "Instant" — see the branch below.
const INSTANT_DEBOUNCE_MS = 1000

export function useAutoSave(onSave: () => Promise<void>) {
    const isDirty = useProjectStore(s => s.isDirty)
    const currentProject = useProjectStore(s => s.currentProject)
    const hasProject = currentProject !== null
    // `pages` gets a new array reference on every mutation (rotate, reorder,
    // duplicate, delete, margin, fit, cover, OCR text — see storeLinks.ts,
    // which watches this same reference to flip isDirty in the first place).
    // isDirty itself only flips false→true once and then stays true through
    // an entire editing burst, so it can't be used alone to detect each new
    // edit — subscribing to `pages` (and `currentProject`, for renames/status
    // changes that don't touch pages) is what actually lets the debounce
    // below reset on every change instead of just the first one.
    const pages = usePagesStore(s => s.pages)
    const { settings } = useSettingsStore()
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isSavingRef = useRef(false)

    const isInstant = settings.autoSaveInterval === 0

    const runSave = async () => {
        if (isSavingRef.current) return
        isSavingRef.current = true
        try {
            await onSave()
        } catch (err) {
            console.error('[AutoSave] Failed:', err)
        } finally {
            isSavingRef.current = false
        }
    }

    // ── Instant mode ─────────────────────────────────────────────────────────────
    // Saves shortly after each change instead of waiting for a fixed interval to
    // elapse. Debounced (rather than saving on every single change) so a burst of
    // edits — dragging pages around, batch-rotating a selection — collapses into
    // one save instead of hammering IndexedDB on every intermediate state. Because
    // the effect depends on `pages` and `currentProject` (not just `isDirty`), the
    // timeout genuinely restarts on every edit in the burst, so the save only
    // fires once things actually settle.
    useEffect(() => {
        if (!isInstant) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!isDirty || !hasProject) return

        debounceRef.current = setTimeout(() => { void runSave() }, INSTANT_DEBOUNCE_MS)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInstant, isDirty, hasProject, pages, currentProject, onSave])

    // ── Interval mode ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isInstant) return
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const intervalMs = settings.autoSaveInterval * 1000

        timerRef.current = setInterval(() => {
            if (!isDirty || !hasProject) return
            void runSave()
        }, intervalMs)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInstant, isDirty, hasProject, settings.autoSaveInterval, onSave])
}
