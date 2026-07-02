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

    // Preview
    previewPageId: string | null
    isPreviewOpen: boolean

    // Focused page
    focusedPageId: string | null

    // Preview
    currentPreviewIndex: number

    // Import drop zone
    isDropZoneActive: boolean
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

    // Preview
    openPreview: (pageId: string) => void
    closePreview: () => void

    // Focus
    setFocusedPage: (id: string | null) => void
    setCurrentPreviewIndex: (index: number) => void
    setCurrentPreviewPageId: (id: string, pages: { id: string }[]) => void

    // Drop zone
    setDropZoneActive: (active: boolean) => void
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
    previewPageId: null,
    isPreviewOpen: false,
    focusedPageId: null,
    currentPreviewIndex: 0,
    isDropZoneActive: false,

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

    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleCommandPalette: () =>
        set((state) => ({
            isCommandPaletteOpen: !state.isCommandPaletteOpen,
        })),

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
}))
