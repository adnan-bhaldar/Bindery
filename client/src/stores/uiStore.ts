import { create } from 'zustand'
import type { SidebarTab, WorkspaceView, PropertiesPanelTab } from '@/types'
import { ZOOM_DEFAULT } from '@/constants'

// ─── State & Actions ──────────────────────────────────────────────────────────

interface UIState {
    // Sidebar
    isSidebarOpen: boolean
    sidebarTab: SidebarTab
    sidebarWidth: number

    // Properties panel
    isPropertiesPanelOpen: boolean
    propertiesPanelTab: PropertiesPanelTab

    // Workspace
    workspaceView: WorkspaceView
    zoom: number
    isFullscreen: boolean

    // Command palette
    isCommandPaletteOpen: boolean

    // Settings dialog
    isSettingsOpen: boolean
    settingsSection: string
    // The specific control to scroll to + flash once the dialog is open,
    // set when a search (command palette or in-dialog) jumps to one exact
    // setting rather than just its section. `settingsHighlightNonce` bumps
    // on every openSettings() call (whether or not a highlightId is given)
    // so SettingsDialog can re-sync activeSection even when the dialog was
    // already open, and so re-selecting the same setting re-triggers the
    // flash even though the id itself hasn't changed.
    settingsHighlightId: string | null
    settingsHighlightNonce: number

    // Preview
    previewPageId: string | null
    isPreviewOpen: boolean

    // Focused page
    focusedPageId: string | null

    // Preview
    currentPreviewIndex: number

    // Import drop zone
    isDropZoneActive: boolean

    // Crop dialog
    cropPageId: string | null
}

interface UIActions {
    // Sidebar
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    setSidebarTab: (tab: SidebarTab) => void
    setSidebarWidth: (width: number) => void

    // Properties panel
    togglePropertiesPanel: () => void
    setPropertiesPanelOpen: (open: boolean) => void
    setPropertiesPanelTab: (tab: PropertiesPanelTab) => void

    // Workspace
    setWorkspaceView: (view: WorkspaceView) => void
    setZoom: (zoom: number) => void
    zoomIn: () => void
    zoomOut: () => void
    resetZoom: () => void
    setFullscreen: (fullscreen: boolean) => void

    // Command palette
    openCommandPalette: () => void
    closeCommandPalette: () => void
    toggleCommandPalette: () => void

    // Settings dialog
    openSettings: (section?: string, highlightId?: string) => void
    closeSettings: () => void

    // Preview
    openPreview: (pageId: string) => void
    closePreview: () => void

    // Focus
    setFocusedPage: (id: string | null) => void
    setCurrentPreviewIndex: (index: number) => void
    setCurrentPreviewPageId: (id: string, pages: { id: string }[]) => void

    // Drop zone
    setDropZoneActive: (active: boolean) => void

    // Crop dialog
    openCropDialog: (pageId: string) => void
    closeCropDialog: () => void
}

type UIStore = UIState & UIActions

const ZOOM_STEP = 0.25
const ZOOM_MIN = 0.1
const ZOOM_MAX = 8.0

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    isSidebarOpen: true,
    sidebarTab: 'pages',
    sidebarWidth: 260,
    isPropertiesPanelOpen: true,
    propertiesPanelTab: 'page',
    workspaceView: 'single',
    zoom: ZOOM_DEFAULT,
    isFullscreen: false,
    isCommandPaletteOpen: false,
    isSettingsOpen: false,
    settingsSection: 'general',
    settingsHighlightId: null,
    settingsHighlightNonce: 0,
    previewPageId: null,
    isPreviewOpen: false,
    focusedPageId: null,
    currentPreviewIndex: 0,
    isDropZoneActive: false,
    cropPageId: null,

    // ── Sidebar ────────────────────────────────────────────────────────────────

    toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

    setSidebarTab: (sidebarTab) =>
        set({ sidebarTab, isSidebarOpen: true }),

    setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

    // ── Properties panel ───────────────────────────────────────────────────────

    togglePropertiesPanel: () =>
        set((state) => ({
            isPropertiesPanelOpen: !state.isPropertiesPanelOpen,
        })),

    setPropertiesPanelOpen: (isPropertiesPanelOpen) =>
        set({ isPropertiesPanelOpen }),

    setPropertiesPanelTab: (propertiesPanelTab) => set({ propertiesPanelTab }),

    // ── Workspace ──────────────────────────────────────────────────────────────

    setWorkspaceView: (workspaceView) => set({ workspaceView }),

    setZoom: (zoom) =>
        set({ zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)) }),

    zoomIn: () => {
        const { zoom } = get()
        set({ zoom: Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)) })
    },

    zoomOut: () => {
        const { zoom } = get()
        set({ zoom: Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)) })
    },

    resetZoom: () => set({ zoom: ZOOM_DEFAULT }),

    setFullscreen: (isFullscreen) => set({ isFullscreen }),

    // ── Command palette ────────────────────────────────────────────────────────
    
    openCommandPalette: () =>
        set((state) => (state.isSettingsOpen ? state : { isCommandPaletteOpen: true })),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleCommandPalette: () =>
        set((state) =>
            state.isSettingsOpen ? state : { isCommandPaletteOpen: !state.isCommandPaletteOpen }
        ),

    // ── Settings dialog ────────────────────────────────────────────────────────

    openSettings: (section = 'general', highlightId) =>
        set((state) => ({
            isSettingsOpen: true,
            settingsSection: section,
            settingsHighlightId: highlightId ?? null,
            // Bumped on every call, not just ones with a highlightId — this is
            // what SettingsDialog uses to know "a fresh jump request just came
            // in," including a plain section switch with no specific row to
            // highlight (e.g. the header's account icon). Without that, calling
            // openSettings() while the dialog is ALREADY open (isOpen doesn't
            // change) had no way to signal that activeSection should still be
            // re-synced to the newly requested section.
            settingsHighlightNonce: state.settingsHighlightNonce + 1,
        })),
    closeSettings: () => set({ isSettingsOpen: false }),

    // ── Preview ────────────────────────────────────────────────────────────────

    openPreview: (pageId) =>
        set({ isPreviewOpen: true, previewPageId: pageId }),

    closePreview: () => set({ isPreviewOpen: false, previewPageId: null }),

    // ── Focus ──────────────────────────────────────────────────────────────────

    setFocusedPage: (focusedPageId) => set({ focusedPageId }),
    setCurrentPreviewIndex: (currentPreviewIndex) => set({ currentPreviewIndex }),
    setCurrentPreviewPageId: (id, pages) => {
        const idx = pages.findIndex(p => p.id === id)
        if (idx !== -1) set({ currentPreviewIndex: idx })
    },

    // ── Drop zone ──────────────────────────────────────────────────────────────

    setDropZoneActive: (isDropZoneActive) => set({ isDropZoneActive }),

    // ── Crop dialog ────────────────────────────────────────────────────────────

    openCropDialog: (pageId) => set({ cropPageId: pageId }),
    closeCropDialog: () => set({ cropPageId: null }),
}))