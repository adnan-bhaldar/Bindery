// ─── Page ────────────────────────────────────────────────────────────────────

export type PageRotation = 0 | 90 | 180 | 270

export type ImageFit = 'fit' | 'fill' | 'original' | 'stretch'

export type PageMargin = 'none' | 'small' | 'medium' | 'large' | 'custom'

export interface CustomMargin {
    top: number
    right: number
    bottom: number
    left: number
}

export interface PageDimensions {
    width: number
    height: number
}

export interface ImageMetadata {
    filename: string
    width: number
    height: number
    fileSize: number
    mimeType: string
    createdAt: number
    hash?: string
}

export interface Page {
    id: string
    projectId: string
    order: number
    rotation: PageRotation
    imageBlob: Blob
    thumbnailBlob?: Blob
    thumbnailUrl?: string
    imageUrl?: string
    metadata: ImageMetadata
    ocrText?: string
    ocrStatus: OCRStatus
    isCover: boolean
    margin: PageMargin
    customMargin?: CustomMargin
    imageFit: ImageFit
    createdAt: number
    updatedAt: number
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

export type OCRStatus = 'idle' | 'pending' | 'processing' | 'done' | 'error'

export type OCRLanguage = 'eng' | 'hin' | 'mar' | 'auto'

export interface OCRResult {
    pageId: string
    text: string
    confidence: number
    language: string
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'new' | 'saved' | 'modified' | 'recovering'

export interface ProjectMetadata {
    title: string
    author: string
    subject: string
    keywords: string
    creator: string
    producer: string
    copyright: string
}

export interface Project {
    id: string
    name: string
    filePath?: string
    status: ProjectStatus
    pageCount: number
    metadata: ProjectMetadata
    coverPageId?: string
    createdAt: number
    updatedAt: number
    lastOpenedAt: number
}

// ─── Export ──────────────────────────────────────────────────────────────────

export type PageSize =
    | 'auto'
    | 'a4'
    | 'a3'
    | 'a5'
    | 'letter'
    | 'legal'
    | 'original'

export type PageOrientation = 'portrait' | 'landscape' | 'auto'

export type OrientationStrategy = 'per-page' | 'document'

export type CompressionQuality = 'original' | 95 | 85 | 75 | 50

export type ExportScope = 'all' | 'selected' | 'range'

export type PageNumberPosition =
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'none'

export interface ExportPreset {
    id: string
    name: string
    isBuiltIn: boolean
    pageSize: PageSize
    orientation: PageOrientation
    orientationStrategy: OrientationStrategy
    compression: CompressionQuality
    imageFit: ImageFit
    margin: PageMargin
    pageNumbers: boolean
    pageNumberPosition: PageNumberPosition
    includeOcr: boolean
    autoOptimize: boolean
    watermark?: WatermarkConfig
}

export interface WatermarkConfig {
    text: string
    opacity: number
    fontSize: number
    color: string
    position: 'center' | 'top-left' | 'bottom-right'
    rotation: number
}

export interface ExportOptions {
    scope: ExportScope
    selectedPageIds?: string[]
    pageRange?: { from: number; to: number }
    preset: ExportPreset
    filename: string
    metadata: ProjectMetadata
}

export interface ExportProgress {
    stage:
    | 'idle'
    | 'preparing'
    | 'processing'
    | 'ocr'
    | 'generating'
    | 'finalizing'
    | 'done'
    | 'error'
    current: number
    total: number
    message: string
    error?: string
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system'

export type AccentColor =
    | 'blue'
    | 'purple'
    | 'green'
    | 'orange'
    | 'red'
    | 'pink'
    | 'custom'

export interface AppSettings {
    // General
    restorePreviousSession: boolean
    autoSaveInterval: number
    maxRecoverySnapshots: number
    showWelcomeScreen: boolean

    // Appearance
    theme: Theme
    accentColor: AccentColor
    customAccentColor: string
    reducedMotion: boolean
    compactMode: boolean

    // Import
    autoGenerateThumbnails: boolean
    thumbnailSize: number
    sidebarLayout: 'list' | 'grid'
    allowDragWhenSorted: boolean
    detectDuplicates: boolean
    warnLowResolution: boolean
    lowResolutionThreshold: number

    // Export
    defaultPresetId: string
    defaultFilename: string
    showExportPreview: boolean

    // OCR
    ocrEnabled: boolean
    ocrLanguage: OCRLanguage
    autoRunOcr: boolean
    skipOcrForLargeDocuments: boolean
    ocrPageLimit: number

    // Cover Page
    useFirstPageAsCover: boolean
    enableCustomCover: boolean
    askBeforeReplacingCover: boolean
    autoUpdateCover: boolean
    showCoverBadge: boolean

    // Performance
    maxConcurrentWorkers: number
    enableImageCache: boolean
    cacheMaxSizeMb: number
    virtualizationOverscan: number

    // Accessibility
    highContrast: boolean
    focusRingAlwaysVisible: boolean
    largeText: boolean

    // Privacy
    enableTelemetry: boolean
}

// ─── History ─────────────────────────────────────────────────────────────────

export type HistoryActionType =
    | 'add-pages'
    | 'delete-pages'
    | 'reorder-pages'
    | 'rotate-pages'
    | 'duplicate-pages'
    | 'update-settings'
    | 'set-cover'

export interface HistoryEntry {
    id: string
    type: HistoryActionType
    description: string
    timestamp: number
    // Serialized state snapshots for undo/redo
    before: unknown
    after: unknown
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type SidebarTab = 'pages' | 'project'

export type WorkspaceView = 'single' | 'continuous' | 'grid'

export type PropertiesPanelTab = 'page' | 'export' | 'metadata'

export interface ZoomLevel {
    value: number // 0.1 to 8.0
    label: string // e.g. "100%"
}

// ─── Command Palette ─────────────────────────────────────────────────────────

export interface CommandItem {
    id: string
    label: string
    description?: string
    icon?: string
    shortcut?: string[]
    group: string
    action: () => void
    disabled?: boolean
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

// ─── Recovery ────────────────────────────────────────────────────────────────

export interface RecoverySnapshot {
    id: string
    projectId: string
    timestamp: number
    pageCount: number
    description: string
}