import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'

export function useAutoSave(onSave: () => Promise<void>) {
    const { isDirty, currentProject } = useProjectStore()
    const { settings } = useSettingsStore()
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isSavingRef = useRef(false)

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const intervalMs = settings.autoSaveInterval * 1000

        timerRef.current = setInterval(async () => {
            if (!isDirty || !currentProject || isSavingRef.current) return

            isSavingRef.current = true
            try {
                await onSave()
            } catch (err) {
                console.error('[AutoSave] Failed:', err)
            } finally {
                isSavingRef.current = false
            }
        }, intervalMs)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [isDirty, currentProject, settings.autoSaveInterval, onSave])
}