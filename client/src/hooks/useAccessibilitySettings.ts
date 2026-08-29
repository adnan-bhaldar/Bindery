import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Applies the "Interface"/"Accessibility" settings to the actual document,
 * via data-attributes on <html> that index.css keys off of. Previously these
 * settings were stored (and the toggles flipped in the UI) but nothing ever
 * read them — this hook is what makes them real.
 */
export function useAccessibilitySettings() {
    const { settings } = useSettingsStore()

    useEffect(() => {
        const html = document.documentElement
        html.dataset.reducedMotion = String(settings.reducedMotion)
        html.dataset.compact = String(settings.compactMode)
        html.dataset.highContrast = String(settings.highContrast)
        html.dataset.largeText = String(settings.largeText)
        html.dataset.focusRingAlways = String(settings.focusRingAlwaysVisible)
    }, [
        settings.reducedMotion,
        settings.compactMode,
        settings.highContrast,
        settings.largeText,
        settings.focusRingAlwaysVisible,
    ])
}