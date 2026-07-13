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
    defaultFilename: 'Bindery',
    useExactAutoPageSize: true,

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
            version: 3,
            // v1 → v2: dropped accentColor/customAccentColor (moved out of
            // settings entirely), showWelcomeScreen, showExportPreview, the
            // whole Cover Page section (that picker was removed from the
            // app), maxConcurrentWorkers, enableImageCache, cacheMaxSizeMb
            // (no such worker pool / cache layer exists), and
            // virtualizationOverscan (the page list is no longer
            // virtualized).
            // v2 → v3: defaultFilename's default changed from 'bindery-export'
            // to 'Bindery' (it's now just a prefix — the date/time gets
            // appended at export time instead of being baked into the saved
            // setting). Persisted state overrides the in-code default on
            // reload, so anyone who already had the old default saved would
            // otherwise be stuck seeing 'bindery-export' forever even after
            // this update — this migration corrects exactly that case
            // without touching a value the user deliberately customized to
            // something else.
            migrate: (persisted) => {
                const state = persisted as SettingsState
                if (state?.settings?.defaultFilename === 'bindery-export') {
                    state.settings.defaultFilename = 'Bindery'
                }
                return state
            },
        }
    )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSetting =
    <K extends keyof AppSettings>(key: K) =>
        (state: SettingsStore): AppSettings[K] =>
            state.settings[key]