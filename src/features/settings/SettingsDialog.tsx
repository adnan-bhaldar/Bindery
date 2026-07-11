import { memo, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Search, Settings, Palette, Upload, Download,
    ScanText, Accessibility, Keyboard,
    Shield, Database, Info, RotateCcw, BookOpen,
    HardDrive, Image as ImageIcon, FileArchive, Loader2, Trash2,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore } from '@/stores/themeStore'
import { Toggle } from '@/components/ui/Toggle'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Tooltip } from '@/components/ui/Tooltip'
import { OCR_LANGUAGE_LABELS } from '@/constants'
import { getStorageStats, clearDatabase, type StorageStats } from '@/db/schema'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'
import type { AppSettings } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsSection {
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

const SECTIONS: SettingsSection[] = [
    { id: 'general', label: 'General', Icon: Settings },
    { id: 'appearance', label: 'Appearance', Icon: Palette },
    { id: 'import', label: 'Import', Icon: Upload },
    { id: 'export', label: 'Export', Icon: Download },
    { id: 'ocr', label: 'OCR', Icon: ScanText },
    { id: 'accessibility', label: 'Accessibility', Icon: Accessibility },
    { id: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
    { id: 'privacy', label: 'Privacy', Icon: Shield },
    { id: 'storage', label: 'Storage', Icon: Database },
    { id: 'about', label: 'About', Icon: Info },
]

// ─── Card primitives (the "modern cards" redesign) ────────────────────────────

const Card = memo(({ title, desc, icon: Icon, children }: {
    title?: string; desc?: string; icon?: React.FC<{ size?: number }>; children: React.ReactNode
}) => (
    <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: 16,
        marginBottom: 14,
        boxShadow: 'var(--sh-xs)',
    }}>
        {title && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {Icon && (
                    <div style={{
                        width: 24, height: 24, borderRadius: 7,
                        background: 'var(--accent-dim)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Icon size={13} />
                    </div>
                )}
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>{title}</p>
            </div>
        )}
        {desc && <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 10, lineHeight: 1.5 }}>{desc}</p>}
        <div>{children}</div>
    </div>
))
Card.displayName = 'Card'

const CardRow = memo(({ label, desc, children, last }: {
    label: string; desc?: string; children: React.ReactNode; last?: boolean
}) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, padding: '9px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-soft)',
    }}>
        <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx-1)' }}>{label}</p>
            {desc && (
                <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2, lineHeight: 1.5 }}>
                    {desc}
                </p>
            )}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
))
CardRow.displayName = 'CardRow'

const SegRow = memo(({ options, value, onChange }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
}) => (
    <div style={{
        display: 'flex', background: 'var(--s3)',
        borderRadius: 8, padding: 3, gap: 2,
    }}>
        {options.map(o => (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: value === o.value ? 'var(--bg-card)' : 'transparent',
                color: value === o.value ? 'var(--tx-1)' : 'var(--tx-3)',
                fontSize: 11.5, fontWeight: value === o.value ? 600 : 400,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                boxShadow: value === o.value ? 'var(--sh-xs)' : 'none',
                transition: 'all 110ms', whiteSpace: 'nowrap',
            }}>
                {o.label}
            </button>
        ))}
    </div>
))
SegRow.displayName = 'SegRow'

const SelectRow = memo(({ options, value, onChange }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
}) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'var(--s3)', border: '1px solid var(--border)',
            color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
            cursor: 'pointer', outline: 'none',
            transition: 'border-color 110ms',
            minWidth: 140,
        }}
    >
        {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
        ))}
    </select>
))
SelectRow.displayName = 'SelectRow'

// ─── Section panels ───────────────────────────────────────────────────────────

const GeneralSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Session" icon={Settings}>
                <CardRow label="Restore previous session" desc="Automatically reopen your last project on startup" last>
                    <Toggle checked={settings.restorePreviousSession} onChange={v => updateSetting('restorePreviousSession', v)} />
                </CardRow>
            </Card>
            <Card title="Auto Save" desc="Applies immediately — no restart needed.">
                <CardRow label="Auto save interval" desc="How often to automatically save your project">
                    <SegRow
                        value={String(settings.autoSaveInterval)}
                        options={[{ value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '1m' }, { value: '300', label: '5m' }]}
                        onChange={v => updateSetting('autoSaveInterval', Number(v))}
                    />
                </CardRow>
                <CardRow label="Recovery snapshots" desc="Number of recovery snapshots to keep per project" last>
                    <SegRow
                        value={String(settings.maxRecoverySnapshots)}
                        options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }]}
                        onChange={v => updateSetting('maxRecoverySnapshots', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
GeneralSection.displayName = 'GeneralSection'

// ─── Theme preview card ───────────────────────────────────────────────────────

const ThemePreviewCard = memo(({ previewTheme, accent, active, onClick }: {
    previewTheme: 'light' | 'dark'
    accent: string
    active: boolean
    onClick: () => void
}) => {
    const isDark = previewTheme === 'dark'
    const bg = isDark ? '#0d0d14' : '#f0f0f6'
    const nav = isDark ? '#0f0f1c' : '#e4e4ec'
    const sidebar = isDark ? '#13131f' : '#eaeaf2'
    const card = '#ffffff'
    const tx = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.30)'
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
    const shadow = isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)'

    return (
        <button
            onClick={onClick}
            style={{
                flex: 1, border: 'none', background: 'transparent',
                cursor: 'pointer', borderRadius: 14,
                outline: active ? `2.5px solid ${accent}` : `2.5px solid transparent`,
                outlineOffset: 3,
                transition: 'outline-color 160ms, transform 160ms, box-shadow 160ms',
                transform: active ? 'translateY(-2px)' : 'none',
                boxShadow: active ? `0 8px 24px ${accent}33` : 'none',
            }}
        >
            <div style={{
                borderRadius: 12, overflow: 'hidden',
                background: bg, border: `1px solid ${border}`,
                boxShadow: shadow,
            }}>
                <div style={{
                    height: 22, background: nav,
                    borderBottom: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px',
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}88` }} />
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: isDark ? '#1e1e2e' : '#d8d8e4', margin: '0 4px' }} />
                    <div style={{ height: 7, width: 24, borderRadius: 4, background: `linear-gradient(135deg,${accent},${accent}bb)` }} />
                </div>
                <div style={{ display: 'flex', height: 60 }}>
                    <div style={{
                        width: 30, background: sidebar,
                        borderRight: `1px solid ${border}`,
                        padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                        <div style={{ height: 14, borderRadius: 3, background: `${accent}33`, border: `1px solid ${accent}44` }} />
                        {[0.45, 0.35].map((op, i) => (
                            <div key={i} style={{ height: 5, borderRadius: 2, background: tx, opacity: op }} />
                        ))}
                    </div>
                    <div style={{
                        flex: 1, background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            width: 30, height: 40,
                            background: card,
                            borderRadius: 2,
                            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.14)',
                        }} />
                    </div>
                    <div style={{
                        width: 26, background: sidebar,
                        borderLeft: `1px solid ${border}`,
                        padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 3,
                    }}>
                        {[0.7, 0.5, 0.5, 0.4].map((w, i) => (
                            <div key={i} style={{ height: 3, width: `${w * 100}%`, borderRadius: 1, background: tx, opacity: 0.6 }} />
                        ))}
                    </div>
                </div>
            </div>
            <p style={{
                marginTop: 10, fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? accent : 'var(--tx-3)',
                textAlign: 'center', fontFamily: 'var(--font-sans)',
                letterSpacing: active ? '-0.2px' : '0',
                transition: 'color 150ms',
            }}>
                {previewTheme === 'dark' ? 'Dark' : 'Light'}
            </p>
        </button>
    )
})
ThemePreviewCard.displayName = 'ThemePreviewCard'

// ─── Layout preview toggle ────────────────────────────────────────────────────

const LayoutToggle = memo(({ value, onChange }: {
    value: 'list' | 'grid'; onChange: (v: 'list' | 'grid') => void
}) => (
    <div style={{ display: 'flex', gap: 8 }}>
        {(['list', 'grid'] as const).map(v => {
            const active = value === v
            return (
                <button
                    key={v}
                    onClick={() => onChange(v)}
                    style={{
                        width: 72, height: 52, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: active ? 'var(--accent-dim)' : 'var(--s3)',
                        outline: active ? '2px solid var(--accent-border)' : '2px solid var(--border)',
                        outlineOffset: 0,
                        transition: 'all 150ms',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        padding: 8,
                    }}
                >
                    {v === 'list' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                            {[1, 0.8, 0.9].map((w, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <div style={{ width: 10, height: 7, borderRadius: 1, background: active ? 'var(--accent)' : 'var(--tx-4)', opacity: 0.7, flexShrink: 0 }} />
                                    <div style={{ flex: w, height: 2, borderRadius: 1, background: active ? 'var(--accent)' : 'var(--tx-4)', opacity: 0.4 }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: '100%' }}>
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} style={{ height: 14, borderRadius: 2, background: active ? 'var(--accent)' : 'var(--tx-4)', opacity: i === 0 ? 0.8 : 0.4 }} />
                            ))}
                        </div>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--tx-4)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {v}
                    </span>
                </button>
            )
        })}
    </div>
))
LayoutToggle.displayName = 'LayoutToggle'

const AppearanceSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    const { theme, setTheme, resolvedTheme } = useThemeStore()
    const accent = '#6366f1' // Bindery's single, fixed accent — see note in the removed Accent Color card below

    return (
        <div>
            <Card title="Theme" icon={Palette}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                    <ThemePreviewCard previewTheme="light" accent={accent} active={resolvedTheme === 'light'} onClick={() => setTheme('light')} />
                    <ThemePreviewCard previewTheme="dark" accent={accent} active={resolvedTheme === 'dark'} onClick={() => setTheme('dark')} />
                </div>
                <CardRow label="Follow system theme" desc="Auto-switch based on OS preference" last>
                    <Toggle
                        checked={theme === 'system'}
                        onChange={v => setTheme(v ? 'system' : resolvedTheme === 'dark' ? 'dark' : 'light')}
                    />
                </CardRow>
            </Card>

            <Card title="Interface">
                <CardRow label="Compact mode" desc="Slightly denser layout throughout the app">
                    <Toggle checked={settings.compactMode} onChange={v => updateSetting('compactMode', v)} />
                </CardRow>
                <CardRow label="Reduce motion" desc="Minimize animations throughout the interface" last>
                    <Toggle checked={settings.reducedMotion} onChange={v => updateSetting('reducedMotion', v)} />
                </CardRow>
            </Card>

            <Card title="Sidebar">
                <CardRow label="Page list style" desc="How pages are displayed in the sidebar">
                    <LayoutToggle
                        value={settings.sidebarLayout ?? 'list'}
                        onChange={v => updateSetting('sidebarLayout', v)}
                    />
                </CardRow>
                <CardRow label="Allow drag when sorted" desc="Enable reordering while a sort is active" last>
                    <Toggle checked={settings.allowDragWhenSorted} onChange={v => updateSetting('allowDragWhenSorted', v)} />
                </CardRow>
            </Card>

            <Card title="Thumbnails">
                <CardRow label="Thumbnail size" desc="Size of page thumbnails — affects generation speed and sharpness" last>
                    <SegRow
                        value={String(settings.thumbnailSize)}
                        options={[{ value: '80', label: 'Small' }, { value: '120', label: 'Medium' }, { value: '160', label: 'Large' }]}
                        onChange={v => updateSetting('thumbnailSize', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
AppearanceSection.displayName = 'AppearanceSection'

const ImportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Import Behavior" icon={Upload}>
                <CardRow label="Generate thumbnails automatically" desc="Create preview thumbnails when images are imported">
                    <Toggle checked={settings.autoGenerateThumbnails} onChange={v => updateSetting('autoGenerateThumbnails', v)} />
                </CardRow>
                <CardRow label="Detect duplicates" desc="Skip images already in the project, based on real content hashing" last>
                    <Toggle checked={settings.detectDuplicates} onChange={v => updateSetting('detectDuplicates', v)} />
                </CardRow>
            </Card>
            <Card title="Quality Warnings">
                <CardRow label="Warn on low resolution" desc="Alert when images may look blurry at print size">
                    <Toggle checked={settings.warnLowResolution} onChange={v => updateSetting('warnLowResolution', v)} />
                </CardRow>
                <CardRow label="Low resolution threshold" desc="Effective DPI below which to warn" last>
                    <SegRow
                        value={String(settings.lowResolutionThreshold)}
                        options={[{ value: '72', label: '72 DPI' }, { value: '96', label: '96 DPI' }, { value: '150', label: '150 DPI' }]}
                        onChange={v => updateSetting('lowResolutionThreshold', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
ImportSection.displayName = 'ImportSection'

const ExportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Export Defaults" icon={Download}>
                <CardRow
                    label="Default filename"
                    desc="Used only when a project has no name of its own — a named project always exports as its own name"
                    last
                >
                    <input
                        value={settings.defaultFilename}
                        onChange={e => updateSetting('defaultFilename', e.target.value)}
                        style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: 'var(--s3)', border: '1px solid var(--border)',
                            color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
                            outline: 'none', width: 180,
                            transition: 'border-color 110ms, box-shadow 110ms',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
ExportSection.displayName = 'ExportSection'

const OCRSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="OCR Engine" icon={ScanText}>
                <CardRow label="Enable OCR" desc="Extract text from images to create searchable PDFs">
                    <Toggle checked={settings.ocrEnabled} onChange={v => updateSetting('ocrEnabled', v)} />
                </CardRow>
                <CardRow label="Run OCR automatically" desc="Process OCR when images are imported" last>
                    <Toggle checked={settings.autoRunOcr} onChange={v => updateSetting('autoRunOcr', v)} />
                </CardRow>
            </Card>
            <Card title="Language">
                <CardRow label="OCR language" desc="Primary language for text recognition" last>
                    <SelectRow
                        value={settings.ocrLanguage}
                        options={Object.entries(OCR_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
                        onChange={v => updateSetting('ocrLanguage', v as AppSettings['ocrLanguage'])}
                    />
                </CardRow>
            </Card>
            <Card title="Performance">
                <CardRow label="Skip OCR for large documents" desc="Avoid processing documents over the page limit">
                    <Toggle checked={settings.skipOcrForLargeDocuments} onChange={v => updateSetting('skipOcrForLargeDocuments', v)} />
                </CardRow>
                <CardRow label="Page limit" desc="Maximum pages to process with OCR" last>
                    <SegRow
                        value={String(settings.ocrPageLimit)}
                        options={[{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '500', label: '500' }]}
                        onChange={v => updateSetting('ocrPageLimit', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
OCRSection.displayName = 'OCRSection'

const AccessibilitySection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Visual" icon={Accessibility} desc="Takes effect immediately across the whole app.">
                <CardRow label="High contrast" desc="Stronger borders and text contrast for better legibility">
                    <Toggle checked={settings.highContrast} onChange={v => updateSetting('highContrast', v)} />
                </CardRow>
                <CardRow label="Always show focus ring" desc="Keep keyboard focus indicator visible at all times">
                    <Toggle checked={settings.focusRingAlwaysVisible} onChange={v => updateSetting('focusRingAlwaysVisible', v)} />
                </CardRow>
                <CardRow label="Large text" desc="Scale up the whole interface for easier reading" last>
                    <Toggle checked={settings.largeText} onChange={v => updateSetting('largeText', v)} />
                </CardRow>
            </Card>
        </div>
    )
})
AccessibilitySection.displayName = 'AccessibilitySection'

const ShortcutsSection = memo(() => {
    const shortcuts = [
        { action: 'Import Images', keys: ['⌘', 'O'] },
        { action: 'Save Project', keys: ['⌘', 'S'] },
        { action: 'Save As', keys: ['⌘', '⇧', 'S'] },
        { action: 'Export PDF', keys: ['⌘', 'E'] },
        { action: 'Undo', keys: ['⌘', 'Z'] },
        { action: 'Redo', keys: ['⌘', '⇧', 'Z'] },
        { action: 'Select All', keys: ['⌘', 'A'] },
        { action: 'Duplicate', keys: ['⌘', 'D'] },
        { action: 'Delete', keys: ['⌫'] },
        { action: 'Command Palette', keys: ['⌘', 'K'] },
        { action: 'Zoom In', keys: ['⌘', '+'] },
        { action: 'Zoom Out', keys: ['⌘', '−'] },
        { action: 'Reset Zoom', keys: ['⌘', '0'] },
        { action: 'Quick Preview', keys: ['Space'] },
        { action: 'Fullscreen', keys: ['F'] },
        { action: 'Navigate Pages', keys: ['← →'] },
    ]
    return (
        <Card title="Keyboard Shortcuts" icon={Keyboard}>
            {shortcuts.map(({ action, keys }, i) => (
                <div key={action} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i === shortcuts.length - 1 ? 'none' : '1px solid var(--border-soft)',
                }}>
                    <span style={{ fontSize: 12.5, color: 'var(--tx-1)' }}>{action}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
                    </div>
                </div>
            ))}
        </Card>
    )
})
ShortcutsSection.displayName = 'ShortcutsSection'

const PrivacySection = memo(() => (
    <Card title="Privacy First" icon={Shield}>
        <p style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7 }}>
            Bindery processes all images entirely on your device. No images, files, or project data
            are ever uploaded to any server. OCR runs via Tesseract.js in a browser worker.
            PDF generation uses pdf-lib entirely in your browser. There is no analytics or
            tracking of any kind built into the app — not a toggle to turn off, there's simply
            nothing here that phones home.
        </p>
    </Card>
))
PrivacySection.displayName = 'PrivacySection'

// ─── Storage section — real data ──────────────────────────────────────────────

const StorageSection = memo(() => {
    const [stats, setStats] = useState<StorageStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(false)
    const confirm = useConfirm()

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const s = await getStorageStats()
            setStats(s)
        } catch (err) {
            console.error('[Storage] Failed to read stats:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    const handleClearAll = useCallback(async () => {
        const ok = await confirm({
            title: 'Clear all data?',
            message: 'This permanently deletes every project, page, thumbnail, and export record stored in this browser. This cannot be undone.',
            confirmLabel: 'Clear Everything',
            cancelLabel: 'Cancel',
            variant: 'danger',
        })
        if (!ok) return
        setClearing(true)
        try {
            await clearDatabase()
            toast.success('All local data cleared')
            await load()
        } catch (err) {
            toast.error('Failed to clear data', { description: err instanceof Error ? err.message : undefined })
        } finally {
            setClearing(false)
        }
    }, [confirm, load])

    const usagePct = stats && stats.quotaBytes > 0
        ? Math.min(100, (stats.totalUsageBytes / stats.quotaBytes) * 100)
        : null

    return (
        <div>
            <Card title="Local Storage" icon={HardDrive} desc="Everything below lives in this browser's IndexedDB — nothing is stored remotely.">
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--tx-3)' }}>
                        <Loader2 size={14} className="spin" />
                        <span style={{ fontSize: 12 }}>Reading storage usage…</span>
                    </div>
                ) : stats ? (
                    <>
                        <CardRow label="Projects" desc="Total projects saved in this browser">
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {stats.projectCount}
                            </span>
                        </CardRow>
                        <CardRow label="Pages & images" desc={`${stats.pageCount} page${stats.pageCount === 1 ? '' : 's'} across all projects`}>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {formatFileSize(stats.pagesBytes)}
                            </span>
                        </CardRow>
                        <CardRow label="Thumbnails" desc="Cached preview images">
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {formatFileSize(stats.thumbnailBytes)}
                            </span>
                        </CardRow>
                        <CardRow label="Export history" desc="Records of past PDF exports" last>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--tx-2)' }}>
                                {stats.exportCount}
                            </span>
                        </CardRow>

                        {usagePct !== null && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                                        {formatFileSize(stats.totalUsageBytes)} of {formatFileSize(stats.quotaBytes)} used
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                                        {usagePct.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 99, background: 'var(--s3)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${usagePct}%`,
                                        background: usagePct > 85 ? '#ef4444' : 'var(--gradient-accent)',
                                        borderRadius: 99, transition: 'width 300ms var(--ease-out)',
                                    }} />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>Couldn't read storage usage.</p>
                )}
            </Card>

            <Card title="Danger Zone" icon={FileArchive}>
                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 12, lineHeight: 1.6 }}>
                    Permanently delete every project, page, thumbnail, and export record stored in
                    this browser. This cannot be undone.
                </p>
                <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 'var(--r-md)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#ef4444', fontSize: 12, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', cursor: clearing ? 'default' : 'pointer',
                        opacity: clearing ? 0.6 : 1,
                        transition: 'background 110ms',
                    }}
                    onMouseEnter={e => { if (!clearing) e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
                    onMouseLeave={e => { if (!clearing) e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                >
                    {clearing ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                    {clearing ? 'Clearing…' : 'Clear all data'}
                </button>
            </Card>
        </div>
    )
})
StorageSection.displayName = 'StorageSection'

const AboutSection = memo(() => (
    <div>
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'var(--gradient-accent)',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <BookOpen size={26} color="#fff" strokeWidth={2} />
                </div>
                <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.4px' }}>
                        Bindery
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>
                        Version 1.0.0 · Professional Image to PDF
                    </p>
                </div>
            </div>
        </Card>
        <Card title="Built With" icon={ImageIcon}>
            {[
                { label: 'Framework', value: 'React 19 + TypeScript' },
                { label: 'PDF Engine', value: 'pdf-lib' },
                { label: 'OCR Engine', value: 'Tesseract.js' },
                { label: 'Storage', value: 'IndexedDB via Dexie' },
                { label: 'Build', value: 'Vite' },
            ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft)',
                }}>
                    <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>{value}</span>
                </div>
            ))}
        </Card>
    </div>
))
AboutSection.displayName = 'AboutSection'

// ─── Section map ──────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, React.FC> = {
    general: GeneralSection,
    appearance: AppearanceSection,
    import: ImportSection,
    export: ExportSection,
    ocr: OCRSection,
    accessibility: AccessibilitySection,
    shortcuts: ShortcutsSection,
    privacy: PrivacySection,
    storage: StorageSection,
    about: AboutSection,
}

// ─── SettingsDialog ───────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean
    onClose: () => void
}

export const SettingsDialog = memo(({ isOpen, onClose }: Props) => {
    const [activeSection, setActiveSection] = useState('general')
    const [search, setSearch] = useState('')
    const { resetSettings } = useSettingsStore()
    const confirm = useConfirm()

    const filtered = SECTIONS.filter(s =>
        !search || s.label.toLowerCase().includes(search.toLowerCase())
    )

    const ActivePanel = SECTION_COMPONENTS[activeSection] ?? GeneralSection

    const handleReset = useCallback(async () => {
        const ok = await confirm({
            title: 'Reset all settings?',
            message: 'This will restore every preference to its default value. Your pages and project data will not be affected.',
            confirmLabel: 'Reset Settings',
            cancelLabel: 'Keep Current',
            variant: 'warning',
        })
        if (ok) resetSettings()
    }, [resetSettings, confirm])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 200,
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -12 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed',
                            inset: 0, margin: 'auto',
                            zIndex: 201,
                            width: '90vw', maxWidth: 880,
                            height: '82vh', maxHeight: 680,
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 'var(--r-3xl)',
                            boxShadow: 'var(--sh-dialog)',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <Settings size={16} color="var(--tx-2)" />
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx-1)', flex: 1, letterSpacing: '-0.3px' }}>
                                Settings
                            </span>

                            <Tooltip content="Reset all settings" placement="bottom">
                                <button onClick={handleReset} className="icon-btn" style={{ color: 'var(--tx-3)' }}>
                                    <RotateCcw size={14} />
                                </button>
                            </Tooltip>

                            <Tooltip content="Close" shortcut="Esc" placement="bottom">
                                <button className="icon-btn" onClick={onClose}>
                                    <X size={15} />
                                </button>
                            </Tooltip>
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            <div style={{
                                width: 200, flexShrink: 0,
                                borderRight: '1px solid var(--border)',
                                display: 'flex', flexDirection: 'column',
                                background: 'var(--bg-panel)',
                            }}>
                                <div style={{ padding: '10px 10px 6px' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        padding: '6px 10px',
                                        background: 'var(--s3)', border: '1px solid var(--border)',
                                        borderRadius: 8,
                                    }}>
                                        <Search size={12} color="var(--tx-3)" />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Search…"
                                            style={{
                                                flex: 1, background: 'transparent', border: 'none',
                                                outline: 'none', fontSize: 12, color: 'var(--tx-1)',
                                                fontFamily: 'var(--font-sans)',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
                                    {filtered.map(({ id, label, Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setActiveSection(id)}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                                                padding: '7px 10px', borderRadius: 8, border: 'none',
                                                background: activeSection === id ? 'var(--accent-dim)' : 'transparent',
                                                color: activeSection === id ? 'var(--accent)' : 'var(--tx-2)',
                                                fontSize: 12, fontWeight: activeSection === id ? 600 : 400,
                                                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                                textAlign: 'left', transition: 'background 110ms, color 110ms',
                                                marginBottom: 1,
                                            }}
                                            onMouseEnter={e => {
                                                if (activeSection !== id) {
                                                    e.currentTarget.style.background = 'var(--hover)'
                                                    e.currentTarget.style.color = 'var(--tx-1)'
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (activeSection !== id) {
                                                    e.currentTarget.style.background = 'transparent'
                                                    e.currentTarget.style.color = 'var(--tx-2)'
                                                }
                                            }}
                                        >
                                            <Icon size={14} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>
                                <h2 style={{
                                    fontSize: 17, fontWeight: 700, color: 'var(--tx-1)',
                                    letterSpacing: '-0.4px', marginBottom: 16,
                                }}>
                                    {SECTIONS.find(s => s.id === activeSection)?.label}
                                </h2>
                                <ActivePanel />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})
SettingsDialog.displayName = 'SettingsDialog'