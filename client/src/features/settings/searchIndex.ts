import {
    Settings, Palette, Upload, Download, ScanText, Accessibility,
    Keyboard, Shield, Smartphone, Database, Info, User,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsSection {
    id: string
    label: string
    Icon: React.FC<{ size?: number }>
}

// ─── Sections ─────────────────────────────────────────────────────────────────
// NOTE: "Cover Page" and "Performance" tabs were removed entirely — the
// former described a custom-cover picker that no longer exists in the app
// (the first page is now unconditionally the cover), and the latter's
// settings (worker concurrency, image cache size) never had any actual
// worker pool or cache layer behind them to control. Rather than leave
// settings that quietly do nothing, they were removed outright.

export const SECTIONS: SettingsSection[] = [
    { id: 'account', label: 'Account', Icon: User },
    { id: 'general', label: 'General', Icon: Settings },
    { id: 'appearance', label: 'Appearance', Icon: Palette },
    { id: 'import', label: 'Import', Icon: Upload },
    { id: 'export', label: 'Export', Icon: Download },
    { id: 'ocr', label: 'OCR', Icon: ScanText },
    { id: 'accessibility', label: 'Accessibility', Icon: Accessibility },
    { id: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
    { id: 'privacy', label: 'Privacy', Icon: Shield },
    { id: 'app', label: 'App', Icon: Smartphone },
    { id: 'storage', label: 'Storage', Icon: Database },
    { id: 'about', label: 'About', Icon: Info },
]

// ─── Search index ─────────────────────────────────────────────────────────────
// A flat list of every actual setting's label + description, per section.
// Previously the search box only matched against the 10 broad section names
// above — so searching for the name of an actual setting (e.g. "duplicate",
// "resolution", "recovery") matched nothing and the whole list emptied out,
// which is what made search look completely broken. This index is what lets
// a search term match the real thing the user is looking for.
export const SEARCH_INDEX: Record<string, string[]> = {
    account: [
        'username', 'email', 'password', 'change password', 'sign in', 'sign out',
        'log in', 'log out', 'profile',
    ],
    general: [
        'restore previous session', 'reopen last project on startup',
        'auto save interval', 'how often to automatically save', 'instant',
        'recovery snapshots', 'number of recovery snapshots to keep',
    ],
    appearance: [
        'theme', 'light', 'dark', 'follow system theme', 'auto-switch based on os',
        'compact mode', 'denser layout', 'reduce motion', 'minimize animations',
        'page list style', 'sidebar list grid', 'allow drag when sorted',
        'thumbnail size', 'small medium large',
    ],
    import: [
        'generate thumbnails automatically', 'detect duplicates', 'content hashing',
        'warn on low resolution', 'low resolution threshold', 'dpi', 'blurry print size',
    ],
    export: [
        'default filename', 'export pdf',
        'auto page size', 'exact fit', 'canvas', 'blank space',
        'custom document title', 'title', 'locked title',
        'default author name', 'author',
    ],
    ocr: [
        'enable ocr', 'extract text', 'searchable pdf',
        'run ocr automatically', 'ocr language',
        'skip ocr for large documents', 'page limit',
    ],
    accessibility: [
        'high contrast', 'stronger borders and text contrast',
        'always show focus ring', 'keyboard focus indicator',
        'large text', 'scale up interface',
    ],
    shortcuts: [
        'import images', 'save project', 'save as', 'export pdf', 'undo', 'redo',
        'select all', 'duplicate', 'delete', 'command palette',
        'zoom in', 'zoom out', 'reset zoom', 'quick preview', 'fullscreen', 'navigate pages',
    ],
    privacy: [
        'privacy', 'local', 'no analytics', 'no tracking', 'tesseract', 'pdf-lib',
    ],
    app: [
        'install app', 'install bindery', 'pwa', 'progressive web app',
        'offline support', 'offline mode', 'add to home screen',
    ],
    storage: [
        'projects', 'pages images', 'thumbnails', 'export history',
        'storage usage', 'clear all data', 'danger zone',
    ],
    about: [
        'version', 'developer', 'adnan bhaldar', 'github', 'repository',
        'react', 'typescript', 'dexie', 'vite',
    ],
}


export function sectionMatches(section: SettingsSection, query: string): boolean {
    if (!query) return true
    const q = query.toLowerCase()
    if (section.label.toLowerCase().includes(q)) return true
    return (SEARCH_INDEX[section.id] ?? []).some(entry => entry.includes(q))
}
