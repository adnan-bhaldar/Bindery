// ─── App Identity ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Bindery'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'Professional image to PDF converter'
export const APP_AUTHOR = 'Bindery'
export const APP_FILE_EXTENSION = '.bindery'
export const APP_MIME_TYPE = 'application/x-bindery'

// ─── Database ─────────────────────────────────────────────────────────────────

export const DB_NAME = 'bindery-db'
export const DB_VERSION = 1

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
    LAST_PROJECT_ID: 'bindery:last-project-id',
    THEME: 'bindery:theme',
    ACCENT_COLOR: 'bindery:accent-color',
    SETTINGS: 'bindery:settings',
} as const

// ─── Layout ───────────────────────────────────────────────────────────────────

export const LAYOUT = {
    TOPNAV_HEIGHT: 48,
    SIDEBAR_WIDTH: 260,
    SIDEBAR_COLLAPSED_WIDTH: 0,
    PROPERTIES_PANEL_WIDTH: 280,
    THUMBNAIL_SIZE_SM: 80,
    THUMBNAIL_SIZE_MD: 120,
    THUMBNAIL_SIZE_LG: 160,
} as const

// ─── Zoom ─────────────────────────────────────────────────────────────────────

export const ZOOM_LEVELS = [
    0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0,
] as const

export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 8.0
export const ZOOM_DEFAULT = 1.0
export const ZOOM_STEP = 0.1

// ─── Accepted File Types ──────────────────────────────────────────────────────

export const ACCEPTED_IMAGE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tif', '.tiff'],
    'image/heic': ['.heic'],
    'image/heif': ['.heif'],
} as const

export const ACCEPTED_IMAGE_MIME_TYPES = Object.keys(ACCEPTED_IMAGE_TYPES)

// ─── Performance ──────────────────────────────────────────────────────────────

export const PERF = {
    THUMBNAIL_CONCURRENCY: 4,
    OCR_CONCURRENCY: 2,
    AUTO_SAVE_INTERVAL_MS: 30_000,
    DEBOUNCE_SEARCH_MS: 200,
    DEBOUNCE_SETTINGS_MS: 300,
    MAX_RECOVERY_SNAPSHOTS: 10,
    VIRTUALIZATION_OVERSCAN: 5,
    CACHE_MAX_SIZE_MB: 256,
    LOW_RESOLUTION_THRESHOLD_PX: 72,
} as const

// ─── PDF Page Sizes (in points: 1pt = 1/72 inch) ─────────────────────────────

export const PAGE_SIZES = {
    a4: { width: 595.28, height: 841.89 },
    a3: { width: 841.89, height: 1190.55 },
    a5: { width: 419.53, height: 595.28 },
    letter: { width: 612, height: 792 },
    legal: { width: 612, height: 1008 },
} as const

// ─── Margin Sizes (in points) ─────────────────────────────────────────────────

export const MARGIN_SIZES = {
    none: { top: 0, right: 0, bottom: 0, left: 0 },
    small: { top: 14, right: 14, bottom: 14, left: 14 },
    medium: { top: 28, right: 28, bottom: 28, left: 28 },
    large: { top: 56, right: 56, bottom: 56, left: 56 },
} as const

// ─── Export Presets ───────────────────────────────────────────────────────────

export const BUILT_IN_PRESET_IDS = {
    PRINT: 'preset-print',
    OFFICE: 'preset-office',
    EMAIL: 'preset-email',
    PORTFOLIO: 'preset-portfolio',
    ARCHIVE: 'preset-archive',
} as const

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

export const SHORTCUTS = {
    IMPORT: 'mod+o',
    SAVE: 'mod+s',
    SAVE_AS: 'mod+shift+s',
    EXPORT: 'mod+e',
    UNDO: 'mod+z',
    REDO: 'mod+shift+z',
    DELETE: 'delete',
    SELECT_ALL: 'mod+a',
    DUPLICATE: 'mod+d',
    ZOOM_IN: 'mod+equal',
    ZOOM_OUT: 'mod+minus',
    QUICK_PREVIEW: 'space',
    COMMAND_PALETTE: 'mod+k',
} as const

// ─── OCR Languages ────────────────────────────────────────────────────────────

export const OCR_LANGUAGE_LABELS: Record<string, string> = {
    eng: 'English',
    hin: 'Hindi',
    mar: 'Marathi',
    auto: 'Auto Detect',
}

// ─── Accent Colors ────────────────────────────────────────────────────────────

// ─── Error Messages ───────────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
    IMPORT_FAILED: 'Failed to import one or more images.',
    EXPORT_FAILED: 'PDF export failed. Please try again.',
    OCR_FAILED: 'OCR processing failed for this page.',
    SAVE_FAILED: 'Project could not be saved.',
    DB_INIT_FAILED: 'Database failed to initialize.',
    UNSUPPORTED_FORMAT: 'This file format is not supported.',
    DUPLICATE_DETECTED: 'Duplicate image detected.',
    LOW_RESOLUTION: 'Image resolution may be too low for print quality.',
} as const