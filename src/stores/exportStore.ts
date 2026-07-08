import { create } from 'zustand'
import type { ExportPreset, ExportOptions, ExportProgress, ExportScope } from '@/types'
import { BUILT_IN_PRESET_IDS } from '@/constants'

// ─── Built-in presets ─────────────────────────────────────────────────────────

export const BUILT_IN_PRESETS: ExportPreset[] = [
    {
        id: BUILT_IN_PRESET_IDS.PRINT,
        name: 'Print Quality',
        isBuiltIn: true,
        pageSize: 'auto',
        orientation: 'auto',
        orientationStrategy: 'per-page',
        compression: 'original',
        imageFit: 'fit',
        margin: 'none',
        pageNumbers: false,
        pageNumberPosition: 'bottom-center',
        includeOcr: true,
        autoOptimize: false,
    },
    {
        id: BUILT_IN_PRESET_IDS.OFFICE,
        name: 'Office Quality',
        isBuiltIn: true,
        pageSize: 'a4',
        orientation: 'auto',
        orientationStrategy: 'per-page',
        compression: 85,
        imageFit: 'fit',
        margin: 'small',
        pageNumbers: false,
        pageNumberPosition: 'bottom-center',
        includeOcr: true,
        autoOptimize: true,
    },
    {
        id: BUILT_IN_PRESET_IDS.EMAIL,
        name: 'Email Friendly',
        isBuiltIn: true,
        pageSize: 'a4',
        orientation: 'auto',
        orientationStrategy: 'per-page',
        compression: 75,
        imageFit: 'fit',
        margin: 'small',
        pageNumbers: false,
        pageNumberPosition: 'none',
        includeOcr: false,
        autoOptimize: true,
    },
    {
        id: BUILT_IN_PRESET_IDS.PORTFOLIO,
        name: 'Portfolio',
        isBuiltIn: true,
        pageSize: 'original',
        orientation: 'auto',
        orientationStrategy: 'per-page',
        compression: 95,
        imageFit: 'fill',
        margin: 'none',
        pageNumbers: true,
        pageNumberPosition: 'bottom-right',
        includeOcr: false,
        autoOptimize: false,
    },
    {
        id: BUILT_IN_PRESET_IDS.ARCHIVE,
        name: 'Archive',
        isBuiltIn: true,
        pageSize: 'original',
        orientation: 'auto',
        orientationStrategy: 'per-page',
        compression: 'original',
        imageFit: 'original',
        margin: 'none',
        pageNumbers: false,
        pageNumberPosition: 'none',
        includeOcr: true,
        autoOptimize: false,
    },
]

// ─── State & Actions ──────────────────────────────────────────────────────────

interface ExportState {
    isDialogOpen: boolean
    presets: ExportPreset[]
    activePresetId: string
    scope: ExportScope
    filename: string
    progress: ExportProgress
}

interface ExportActions {
    openDialog: () => void
    closeDialog: () => void
    setScope: (scope: ExportScope) => void
    setFilename: (filename: string) => void
    setActivePreset: (id: string) => void
    updatePreset: (id: string, updates: Partial<ExportPreset>) => void
    addPreset: (preset: ExportPreset) => void
    removePreset: (id: string) => void
    setProgress: (progress: Partial<ExportProgress>) => void
    resetProgress: () => void
    buildExportOptions: (selectedIds: string[]) => ExportOptions
}

type ExportStore = ExportState & ExportActions

const INITIAL_PROGRESS: ExportProgress = {
    stage: 'idle',
    current: 0,
    total: 0,
    message: '',
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useExportStore = create<ExportStore>()((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    isDialogOpen: false,
    presets: BUILT_IN_PRESETS,
    activePresetId: BUILT_IN_PRESET_IDS.PRINT,
    scope: 'all',
    filename: 'bindery-export',
    progress: INITIAL_PROGRESS,

    // ── Actions ────────────────────────────────────────────────────────────────

    openDialog: () => set({ isDialogOpen: true }),
    closeDialog: () => set({ isDialogOpen: false }),

    setScope: (scope) => set({ scope }),
    setFilename: (filename) => set({ filename }),

    setActivePreset: (activePresetId) => set({ activePresetId }),

    updatePreset: (id, updates) =>
        set((state) => ({
            presets: state.presets.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            ),
        })),

    addPreset: (preset) =>
        set((state) => ({ presets: [...state.presets, preset] })),

    removePreset: (id) =>
        set((state) => ({
            presets: state.presets.filter((p) => p.id !== id),
        })),

    setProgress: (progress) =>
        set((state) => ({ progress: { ...state.progress, ...progress } })),

    resetProgress: () => set({ progress: INITIAL_PROGRESS }),

    buildExportOptions: (selectedIds) => {
        const { presets, activePresetId, scope, filename } = get()
        const preset =
            presets.find((p) => p.id === activePresetId) ?? BUILT_IN_PRESETS[0]

        return {
            scope,
            selectedPageIds: scope === 'selected' ? selectedIds : undefined,
            preset,
            filename,
            metadata: {
                title: '',
                author: '',
                subject: '',
                keywords: '',
                creator: 'Bindery',
                producer: 'Bindery PDF Engine',
                copyright: '',
            },
        }
    },
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectActivePreset = (state: ExportStore) =>
    state.presets.find((p) => p.id === state.activePresetId) ??
    BUILT_IN_PRESETS[0]

export const selectIsExporting = (state: ExportStore) =>
    state.progress.stage !== 'idle' && state.progress.stage !== 'done'

// ─── Stable hook for active preset (avoids infinite loop) ────────────────────
import { useShallow } from 'zustand/react/shallow'

export function useActivePreset() {
    return useExportStore(
        useShallow((state) =>
            state.presets.find((p) => p.id === state.activePresetId) ?? BUILT_IN_PRESETS[0]
        )
    )
}
