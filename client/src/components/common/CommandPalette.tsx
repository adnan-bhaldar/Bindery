import { memo, useCallback } from 'react'
import { Command } from 'cmdk'
import {
    Upload, Download, RotateCw, Trash2,
    Moon, Sun, ScanText, Save,
    Plus, Layers,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useExportStore } from '@/stores/exportStore'
import { useThemeStore } from '@/stores/themeStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { useSelectionStore, useSelectedIdsArray } from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { SECTIONS, SETTINGS_ITEMS, isVisible } from '@/features/settings/searchIndex'
import { cn } from '@/lib/utils'
import type { Theme } from '@/types'

interface Cmd {
    id: string
    label: string
    desc?: string
    Icon: React.FC<{ size?: number }>
    shortcut?: string[]
    group: string
    action: () => void
    danger?: boolean
    disabled?: boolean
    // Extra terms folded into the cmdk search value but never rendered —
    // lets typing an actual setting's name (e.g. "high contrast", "auto
    // page size") match its section here, not just the section's own label.
    keywords?: string
}

interface Props {
    onRunOCR: () => void
    onImport: () => void
    onSave: () => void
    onNewProject: () => void
}

export const CommandPalette = memo(({
    onRunOCR, onImport, onSave, onNewProject,
}: Props) => {
    const { isCommandPaletteOpen, closeCommandPalette, openSettings } = useUIStore()
    const { status: authStatus, user: authUser } = useAuthStore()
    const isSignedIn = authStatus === 'authenticated' && !!authUser
    const { openDialog: openExport } = useExportStore()
    const { resolvedTheme, setTheme } = useThemeStore()
    const pageCount = usePagesStore(selectPageCount)
    const selectedIds = useSelectedIdsArray()
    const { removePages, rotatePages, duplicatePages } = usePagesStore()
    const { deselectAll } = useSelectionStore()
    const { push: pushHistory } = useHistoryStore()

    const run = useCallback((fn: () => void) => {
        closeCommandPalette()
        setTimeout(fn, 80)
    }, [closeCommandPalette])

    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark'
    const ThemeIcon = resolvedTheme === 'dark' ? Sun : Moon
    const hasPages = pageCount > 0
    const hasSelection = selectedIds.length > 0

    const rotateSelected = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = usePagesStore.getState().pages
        selectedIds.forEach(id => {
            const page = before.find(p => p.id === id)
            if (page) rotatePages([id], ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270)
        })
        const after = usePagesStore.getState().pages
        pushHistory('rotate-pages', `Rotated ${selectedIds.length} page${selectedIds.length > 1 ? 's' : ''}`, before, after)
    }, [selectedIds, rotatePages, pushHistory])

    const duplicateSelected = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = usePagesStore.getState().pages
        duplicatePages(selectedIds)
        const after = usePagesStore.getState().pages
        pushHistory('duplicate-pages', `Duplicated ${selectedIds.length} page${selectedIds.length > 1 ? 's' : ''}`, before, after)
    }, [selectedIds, duplicatePages, pushHistory])

    const deleteSelected = useCallback(() => {
        if (selectedIds.length === 0) return
        const before = usePagesStore.getState().pages
        removePages(selectedIds)
        const after = usePagesStore.getState().pages
        pushHistory('delete-pages', `Deleted ${selectedIds.length} page${selectedIds.length > 1 ? 's' : ''}`, before, after)
        deselectAll()
    }, [selectedIds, removePages, deselectAll, pushHistory])

    const cmds: Cmd[] = [
        {
            id: 'import', label: 'Import Images', desc: 'Add images to the project',
            Icon: Upload, shortcut: ['⌘', 'O'], group: 'Actions',
            action: onImport,
        },
        {
            id: 'export', label: 'Export PDF', desc: 'Generate and download PDF',
            Icon: Download, shortcut: ['⌘', 'E'], group: 'Actions',
            action: openExport, disabled: !hasPages,
        },
        {
            id: 'save', label: 'Save Project', desc: 'Save current project',
            Icon: Save, shortcut: ['⌘', 'S'], group: 'Actions',
            action: onSave, disabled: !hasPages,
        },
        {
            id: 'new', label: 'New Project', desc: 'Start fresh',
            Icon: Plus, shortcut: ['N'], group: 'Actions', action: onNewProject,
        },
        {
            id: 'rotate', label: 'Rotate Selected Pages', desc: '90° clockwise',
            Icon: RotateCw, group: 'Pages',
            action: rotateSelected, disabled: !hasSelection,
        },
        {
            id: 'dup', label: 'Duplicate Selected', desc: 'Copy selected pages',
            Icon: Layers, group: 'Pages',
            action: duplicateSelected, disabled: !hasSelection,
        },
        {
            id: 'delete', label: 'Delete Selected Pages',
            Icon: Trash2, shortcut: ['⌫'], group: 'Pages',
            action: deleteSelected, danger: true, disabled: !hasSelection,
        },
        {
            id: 'ocr', label: 'Run OCR', desc: 'Extract text for searchable PDF',
            Icon: ScanText, group: 'Tools',
            action: onRunOCR, disabled: !hasPages,
        },
        {
            id: 'theme', label: `Switch to ${nextTheme} theme`,
            Icon: ThemeIcon, group: 'Appearance',
            action: () => setTheme(nextTheme),
        },
        // One entry per individual setting (not just per section) — each
        // labeled "<setting> · <section>" and searchable via its own
        // keywords, so typing e.g. "high contrast" surfaces "High contrast ·
        // Accessibility" directly. Selecting it opens Settings on that
        // section AND scrolls to + flashes that exact row, instead of just
        // landing on the section with the user having to hunt for it.
        ...SETTINGS_ITEMS.filter(item => isVisible(item, isSignedIn)).map((item): Cmd => {
            const section = SECTIONS.find(s => s.id === item.section)
            return {
                id: `settings-${item.id}`,
                label: item.label,
                desc: section?.label,
                Icon: section?.Icon ?? Sun,
                group: 'Settings',
                keywords: `${section?.label ?? ''} ${item.keywords ?? ''}`,
                action: () => openSettings(item.section, item.id),
            }
        }),
    ]

    const groups = cmds.reduce((a, c) => {
        ; (a[c.group] ??= []).push(c)
        return a
    }, {} as Record<string, Cmd[]>)

    return (
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        onClick={closeCommandPalette}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'color-mix(in srgb, var(--bg-app) 50%, transparent)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed', left: 0, right: 0, top: 0,
                            marginTop: '12vh', zIndex: 101,
                            display: 'flex', justifyContent: 'center',
                            padding: '0 16px', pointerEvents: 'none',
                        }}
                    >
                        <div style={{ width: '100%', maxWidth: 540, pointerEvents: 'auto' }}>
                            <Command className="cmd-wrap" label="Command palette" shouldFilter>
                                <div className="cmd-search">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                        stroke="var(--tx-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <Command.Input className="cmd-input" autoFocus placeholder="Search commands…" />
                                    <kbd className="kbd">ESC</kbd>
                                </div>

                                <Command.List className="cmd-list">
                                    <Command.Empty className="cmd-empty">No results found</Command.Empty>

                                    {Object.entries(groups).map(([group, items]) => (
                                        <Command.Group key={group}>
                                            <div className="cmd-group-label">{group}</div>
                                            {items.map(item => {
                                                const Icon = item.Icon
                                                return (
                                                    <Command.Item
                                                        key={item.id}
                                                        value={`${item.label} ${item.desc ?? ''} ${group} ${item.keywords ?? ''}`}
                                                        onSelect={() => !item.disabled && run(item.action)}
                                                        className={cn('cmd-item', item.danger && 'danger')}
                                                        style={{ opacity: item.disabled ? 0.4 : 1 }}
                                                    >
                                                        <div className="cmd-item-icon">
                                                            <Icon size={14} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="cmd-item-label">{item.label}</div>
                                                            {item.desc && <div className="cmd-item-desc">{item.desc}</div>}
                                                        </div>
                                                        {item.shortcut && (
                                                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                                                {item.shortcut.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
                                                            </div>
                                                        )}
                                                    </Command.Item>
                                                )
                                            })}
                                        </Command.Group>
                                    ))}
                                </Command.List>

                                <div className="cmd-footer">
                                    {[['↑↓', 'navigate'], ['↵', 'select'], ['ESC', 'close']].map(([k, l]) => (
                                        <div key={k} className="cmd-footer-hint">
                                            <kbd className="kbd">{k}</kbd>
                                            <span>{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </Command>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})
CommandPalette.displayName = 'CommandPalette'