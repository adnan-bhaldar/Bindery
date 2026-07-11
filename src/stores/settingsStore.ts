import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
    // General
    restorePreviousSession: true,
    autoSaveInterval: 30,
    maxRecoverySnapshots: 10,

    // Appearance
    theme: 'system',
    reducedMotion: false,
    compactMode: false,

    // Import
    autoGenerateThumbnails: true,
    thumbnailSize: 120,
    sidebarLayout: 'list',
    allowDragWhenSorted: false,
    detectDuplicates: true,
    warnLowResolution: true,
    lowResolutionThreshold: 72,

    // Export
    defaultPresetId: 'preset-print',
    defaultFilename: 'bindery-export',

    // OCR
    ocrEnabled: true,
    ocrLanguage: 'eng',
    autoRunOcr: true,
    skipOcrForLargeDocuments: true,
    ocrPageLimit: 100,

    // Accessibility
    highContrast: false,
    focusRingAlwaysVisible: false,
    largeText: false,
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface SettingsState {
    settings: AppSettings
}

interface SettingsActions {
    updateSetting: <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ) => void
    updateSettings: (updates: Partial<AppSettings>) => void
    resetSettings: () => void
    resetSection: (keys: (keyof AppSettings)[]) => void
}

type SettingsStore = SettingsState & SettingsActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            // ── Initial state ────────────────────────────────────────────────────────
            settings: DEFAULT_SETTINGS,

            // ── Actions ──────────────────────────────────────────────────────────────

            updateSetting: (key, value) =>
                set((state) => ({
                    settings: { ...state.settings, [key]: value },
                })),

            updateSettings: (updates) =>
                set((state) => ({
                    settings: { ...state.settings, ...updates },
                })),

            resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

            resetSection: (keys) =>
                set((state) => {
                    const updates: Partial<AppSettings> = {}
                    for (const key of keys) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ; (updates as any)[key] = DEFAULT_SETTINGS[key]
                    }
                    return { settings: { ...state.settings, ...updates } }
                }),
        }),
        {
            name: 'bindery:settings',
            version: 2,
            // v1 → v2: dropped accentColor/customAccentColor (moved out of
            // settings entirely), showWelcomeScreen, showExportPreview, the
            // whole Cover Page section (that picker was removed from the
            // app), maxConcurrentWorkers, enableImageCache, cacheMaxSizeMb
            // (no such worker pool / cache layer exists), and
            // virtualizationOverscan (the page list is no longer
            // virtualized). Any of these lingering in an old persisted
            // blob are simply ignored by the AppSettings type going forward.
            migrate: (persisted) => persisted as SettingsState,
        }
    )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSetting =
    <K extends keyof AppSettings>(key: K) =>
        (state: SettingsStore): AppSettings[K] =>
            state.settings[key]