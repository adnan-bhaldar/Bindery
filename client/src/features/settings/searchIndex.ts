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

// ─── Individual settings ────────────────────────────────────────────────────
// One entry per actual control, each carrying the DOM id placed on that
// control's row (via CardRow's `id` prop, or on the whole Card for the few
// sections — Shortcuts, Privacy, About — that aren't row-based). This is
// what lets a search (command palette or the in-dialog search) jump to,
// scroll to, and highlight the specific setting instead of just its section.
// It replaces the old flat per-section keyword list, which had drifted out
// of sync with the actual controls (e.g. it listed an "auto page size"
// export setting that had since been removed).
export interface SettingItem {
    id: string
    section: string
    label: string
    keywords?: string
    // Omit for settings always shown regardless of auth state. Set this for
    // the handful of Account cards that only render conditionally (signed-in
    // vs signed-out), so a signed-out user searching "password" doesn't get
    // pointed at a card that isn't actually on screen.
    authState?: 'signed-in' | 'signed-out'
}

export function isVisible(item: SettingItem, isSignedIn?: boolean): boolean {
    if (!item.authState) return true
    // Auth state unknown (caller didn't pass it) — don't filter rather than
    // guess wrong and hide something that's actually visible.
    if (isSignedIn === undefined) return true
    return item.authState === (isSignedIn ? 'signed-in' : 'signed-out')
}

export const SETTINGS_ITEMS: SettingItem[] = [
    // account
    { id: 'setting-signin', section: 'account', label: 'Sign in', keywords: 'log in login create account register auth not signed in signed out authenticate', authState: 'signed-out' },
    { id: 'setting-account-username', section: 'account', label: 'Username', keywords: 'profile name display name rename change username edit username handle', authState: 'signed-in' },
    { id: 'setting-account-email', section: 'account', label: 'Email', keywords: 'log in sign in email address change email update email login credentials', authState: 'signed-in' },
    { id: 'setting-account-password', section: 'account', label: 'Change password', keywords: 'update password new password current password reset password security credentials', authState: 'signed-in' },
    { id: 'setting-account-backup-codes', section: 'account', label: 'Backup codes', keywords: 'password reset generate regenerate recovery codes 2fa lost password no email reset without email', authState: 'signed-in' },
    // signout/delete-account cards only render once signed in (AccountSection
    // returns the sign-in card instead when logged out) — searching "sign in"
    // while logged out should land on setting-signin above, not these.
    { id: 'setting-signout', section: 'account', label: 'Sign out', keywords: 'log out logout exit session end session switch account', authState: 'signed-in' },
    { id: 'setting-delete-account', section: 'account', label: 'Delete account', keywords: 'remove account danger delete profile close account deactivate erase account permanently delete', authState: 'signed-in' },
    // general
    { id: 'setting-restore-session', section: 'general', label: 'Restore previous session', keywords: 'reopen last project on startup resume open last file continue where I left off launch behavior' },
    { id: 'setting-autosave-interval', section: 'general', label: 'Auto save interval', keywords: 'how often to automatically save instant autosave frequency save every save timer save automatically' },
    { id: 'setting-recovery-snapshots', section: 'general', label: 'Recovery snapshots', keywords: 'number of recovery snapshots to keep backups undo history crash recovery version history restore point' },
    // appearance
    { id: 'setting-theme', section: 'appearance', label: 'Theme', keywords: 'light dark auto-switch based on os dark mode light mode color scheme night mode day mode system theme appearance mode follow system theme' },
    { id: 'setting-compact-mode', section: 'appearance', label: 'Compact mode', keywords: 'denser layout smaller spacing tighter ui condensed density' },
    { id: 'setting-reduce-motion', section: 'appearance', label: 'Reduce motion', keywords: 'minimize animations disable animations less motion accessibility motion sickness turn off transitions' },
    { id: 'setting-context-menu', section: 'appearance', label: 'Workspace right-click menu', keywords: 'rotate duplicate delete right click context menu page actions menu' },
    { id: 'setting-page-list-style', section: 'appearance', label: 'Page list style', keywords: 'sidebar list grid view thumbnails layout page view mode' },
    { id: 'setting-drag-when-sorted', section: 'appearance', label: 'Allow drag when sorted', keywords: 'reordering while sort active drag and drop pages manual order' },
    { id: 'setting-thumbnail-size', section: 'appearance', label: 'Thumbnail size', keywords: 'small medium large preview size image size zoom thumbnails' },
    // import
    { id: 'setting-auto-thumbnails', section: 'import', label: 'Generate thumbnails automatically', keywords: 'auto thumbnail generation preview generation on import' },
    { id: 'setting-detect-duplicates', section: 'import', label: 'Detect duplicates', keywords: 'content hashing duplicate detection skip duplicates same image warning' },
    { id: 'setting-choose-import-type', section: 'import', label: 'Choose import type', keywords: 'images or pdf file picker import dialog import mode add files' },
    { id: 'setting-low-res-warning', section: 'import', label: 'Warn on low resolution', keywords: 'blurry print size low quality image quality warning small image' },
    { id: 'setting-low-res-threshold', section: 'import', label: 'Low resolution threshold', keywords: 'dpi minimum resolution pixel threshold quality cutoff' },
    // export
    { id: 'setting-default-filename', section: 'export', label: 'Default filename', keywords: 'export pdf file name naming pattern output name default name' },
    { id: 'setting-doc-title', section: 'export', label: 'Allow custom document title', keywords: 'title locked title pdf metadata document properties custom title' },
    { id: 'setting-default-author', section: 'export', label: 'Default author name', keywords: 'author pdf metadata creator name document properties' },
    // ocr
    { id: 'setting-enable-ocr', section: 'ocr', label: 'Enable OCR', keywords: 'extract text searchable pdf text recognition turn on ocr enable text extraction' },
    { id: 'setting-ocr-auto', section: 'ocr', label: 'Run OCR automatically', keywords: 'automatic ocr auto text extraction ocr on import' },
    { id: 'setting-ocr-language', section: 'ocr', label: 'OCR language', keywords: 'text recognition language select language document language' },
    { id: 'setting-ocr-skip-large', section: 'ocr', label: 'Skip OCR for large documents', keywords: 'page limit performance large files skip long documents' },
    { id: 'setting-ocr-page-limit', section: 'ocr', label: 'Page limit', keywords: 'max pages maximum pages ocr cutoff' },
    // accessibility
    { id: 'setting-high-contrast', section: 'accessibility', label: 'High contrast', keywords: 'stronger borders and text contrast better legibility contrast mode visibility low vision' },
    { id: 'setting-focus-ring', section: 'accessibility', label: 'Always show focus ring', keywords: 'keyboard focus indicator keyboard navigation outline tab focus visible focus' },
    { id: 'setting-large-text', section: 'accessibility', label: 'Large text', keywords: 'scale up interface bigger text font size zoom text readability' },
    // shortcuts (single card, not row-based — see note above)
    {
        id: 'setting-shortcuts', section: 'shortcuts', label: 'Keyboard shortcuts',
        keywords: 'import images save project save as export pdf undo redo select all duplicate delete command palette zoom in zoom out reset zoom quick preview fullscreen navigate pages hotkeys key bindings keyboard commands cmd ctrl shortcut list',
    },
    // privacy (single card)
    { id: 'setting-privacy', section: 'privacy', label: 'Privacy', keywords: 'local no analytics no tracking tesseract pdf-lib data collection offline processing browser only nothing leaves your device' },
    // app
    { id: 'setting-app-status', section: 'app', label: 'App Status', keywords: 'pwa progressive web app is bindery installed offline support service worker status installed or not' },
    { id: 'setting-install-prompt', section: 'app', label: 'Install Bindery', keywords: 'install button add to home screen standalone app not installed yet download prompt desktop app native app' },
    { id: 'setting-offline-support', section: 'app', label: 'Offline support', keywords: 'offline mode service worker no internet works offline' },
    // storage
    { id: 'setting-storage-usage', section: 'storage', label: 'Storage usage', keywords: 'projects pages images thumbnails export history disk usage space used indexeddb how much storage' },
    { id: 'setting-clear-data', section: 'storage', label: 'Clear all data', keywords: 'danger zone delete everything reset app wipe data erase all factory reset' },
    // about (single card)
    { id: 'setting-about', section: 'about', label: 'About', keywords: 'version app version changelog release info' },
    { id: 'setting-developer', section: 'about', label: 'Developer', keywords: 'adnan bhaldar github repository source code contact author maintainer owner git' },
    { id: 'setting-built-with', section: 'about', label: 'Built With', keywords: 'react typescript dexie vite tech stack libraries dependencies credits' },
]

export function sectionMatches(section: SettingsSection, query: string, isSignedIn?: boolean): boolean {
    if (!query) return true
    const q = query.toLowerCase()
    if (section.label.toLowerCase().includes(q)) return true
    return SETTINGS_ITEMS.some(item =>
        item.section === section.id &&
        isVisible(item, isSignedIn) &&
        (item.label.toLowerCase().includes(q) || (item.keywords ?? '').toLowerCase().includes(q))
    )
}

// Individual settings matching a query, for surfaces that jump straight to
// one control (command palette, in-dialog search results) rather than just
// filtering the section list.
export function matchingSettings(query: string, isSignedIn?: boolean): SettingItem[] {
    if (!query) return []
    const q = query.toLowerCase()
    return SETTINGS_ITEMS.filter(item =>
        isVisible(item, isSignedIn) &&
        (item.label.toLowerCase().includes(q) || (item.keywords ?? '').toLowerCase().includes(q))
    )
}