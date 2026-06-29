import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
    // General
    restorePreviousSession: true,
    autoSaveInterval: 30,
    maxRecoverySnapshots: 10,
    showWelcomeScreen: true,

    // Appearance
    theme: 'system',
    accentColor: 'blue',
    customAccentColor: '#3b82f6',
    reducedMotion: false,
    compactMode: false,

    // Import
    autoGenerateThumbnails: true,
    thumbnailSize: 120,
    detectDuplicates: true,
    warnLowResolution: true,
    lowResolutionThreshold: 72,

    // Export
    defaultPresetId: 'preset-print',
    defaultFilename: 'bindery-export',
    showExportPreview: true,

    // OCR
    ocrEnabled: true,
    ocrLanguage: 'eng',
    autoRunOcr: true,
    skipOcrForLargeDocuments: true,
    ocrPageLimit: 100,

    // Cover Page
    useFirstPageAsCover: true,
    enableCustomCover: false,
    askBeforeReplacingCover: true,
    autoUpdateCover: false,
    showCoverBadge: true,

    // Performance
    maxConcurrentWorkers: 4,
    enableImageCache: true,
    cacheMaxSizeMb: 256,
    virtualizationOverscan: 5,

    // Accessibility
    highContrast: false,
    focusRingAlwaysVisible: false,
    largeText: false,

    // Privacy
    enableTelemetry: false,
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
            version: 1,
        }
    )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSetting =
    <K extends keyof AppSettings>(key: K) =>
        (state: SettingsStore): AppSettings[K] =>
            state.settings[key]