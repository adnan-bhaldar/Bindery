import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Search, Settings, Palette, Upload, Download,
    ScanText, BookOpen, Zap, Accessibility, Keyboard,
    Shield, Database, Info, RotateCcw,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore } from '@/stores/themeStore'
import { Toggle } from '@/components/ui/Toggle'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Tooltip } from '@/components/ui/Tooltip'
import { OCR_LANGUAGE_LABELS, ACCENT_COLOR_VALUES } from '@/constants'
import type { AppSettings, AccentColor } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsSection {
    id: string
    label: string
    Icon: React.FC<{ size?: number }>
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const SECTIONS: SettingsSection[] = [
    { id: 'general', label: 'General', Icon: Settings },
    { id: 'appearance', label: 'Appearance', Icon: Palette },
    { id: 'import', label: 'Import', Icon: Upload },
    { id: 'export', label: 'Export', Icon: Download },
    { id: 'ocr', label: 'OCR', Icon: ScanText },
    { id: 'cover', label: 'Cover Page', Icon: BookOpen },
    { id: 'performance', label: 'Performance', Icon: Zap },
    { id: 'accessibility', label: 'Accessibility', Icon: Accessibility },
    { id: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
    { id: 'privacy', label: 'Privacy', Icon: Shield },
    { id: 'storage', label: 'Storage', Icon: Database },
    { id: 'about', label: 'About', Icon: Info },
]

// ─── Row primitives ───────────────────────────────────────────────────────────

const Row = memo(({ label, desc, children }: {
    label: string; desc?: string; children: React.ReactNode
}) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, padding: '10px 0',
        borderBottom: '1px solid var(--border-soft)',
    }}>
        <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx-1)' }}>{label}</p>
            {desc && (
                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 2, lineHeight: 1.5 }}>
                    {desc}
                </p>
            )}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
))
Row.displayName = 'Row'

const SectionTitle = memo(({ children }: { children: React.ReactNode }) => (
    <h3 style={{
        fontSize: 11, fontWeight: 700, color: 'var(--tx-4)',
        textTransform: 'uppercase', letterSpacing: '0.8px',
        marginBottom: 4, marginTop: 20,
    }}>
        {children}
    </h3>
))
SectionTitle.displayName = 'SectionTitle'

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
            <SectionTitle>Session</SectionTitle>
            <Row label="Restore previous session" desc="Automatically reopen your last project on startup">
                <Toggle checked={settings.restorePreviousSession} onChange={v => updateSetting('restorePreviousSession', v)} />
            </Row>
            <Row label="Show welcome screen" desc="Display the welcome screen when no project is open">
                <Toggle checked={settings.showWelcomeScreen} onChange={v => updateSetting('showWelcomeScreen', v)} />
            </Row>
            <SectionTitle>Auto Save</SectionTitle>
            <Row label="Auto save interval" desc="How often to automatically save your project">
                <SegRow
                    value={String(settings.autoSaveInterval)}
                    options={[{ value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '1m' }, { value: '300', label: '5m' }]}
                    onChange={v => updateSetting('autoSaveInterval', Number(v))}
                />
            </Row>
            <Row label="Recovery snapshots" desc="Number of recovery snapshots to keep">
                <SegRow
                    value={String(settings.maxRecoverySnapshots)}
                    options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }]}
                    onChange={v => updateSetting('maxRecoverySnapshots', Number(v))}
                />
            </Row>
        </div>
    )
})
GeneralSection.displayName = 'GeneralSection'

// ─── Theme preview card (premium redesign) ───────────────────────────────────

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
    const card = isDark ? '#ffffff' : '#ffffff'
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
            {/* Mini app chrome */}
            <div style={{
                borderRadius: 12, overflow: 'hidden',
                background: bg, border: `1px solid ${border}`,
                boxShadow: shadow,
            }}>
                {/* Nav bar */}
                <div style={{
                    height: 22, background: nav,
                    borderBottom: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px',
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}88` }} />
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: isDark ? '#1e1e2e' : '#d8d8e4', margin: '0 4px' }} />
                    <div style={{ height: 7, width: 24, borderRadius: 4, background: `linear-gradient(135deg,${accent},${accent}bb)` }} />
                </div>

                {/* Body */}
                <div style={{ display: 'flex', height: 60 }}>
                    {/* Sidebar */}
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

                    {/* Canvas area */}
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

                    {/* Right panel */}
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

            {/* Label */}
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

// ─── Accent swatch ────────────────────────────────────────────────────────────

const AccentSwatch = memo(({ color, value, active, onClick }: {
    color: string; value: string; active: boolean; onClick: () => void
}) => (
    <Tooltip content={color.charAt(0).toUpperCase() + color.slice(1)} placement="top">
        <button
            onClick={onClick}
            style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: value, cursor: 'pointer', position: 'relative',
                transition: 'transform 150ms, box-shadow 150ms',
                transform: active ? 'scale(1.2)' : 'scale(1)',
                boxShadow: active
                    ? `0 0 0 2.5px var(--bg-card), 0 0 0 5px ${value}, 0 4px 12px ${value}66`
                    : `0 2px 6px ${value}55`,
            }}
        />
    </Tooltip>
))
AccentSwatch.displayName = 'AccentSwatch'

// ─── Layout preview toggle ────────────────────────────────────────────────────

const LayoutToggle = memo(({ value, onChange }: {
    value: 'list' | 'grid'; onChange: (v: 'list' | 'grid') => void
}) => (
    <div style={{
        display: 'flex', gap: 8,
    }}>
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
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 3,
                                }}>
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
    const { theme, setTheme, resolvedTheme, accentColor, setAccentColor } = useThemeStore()
    const accent = ACCENT_COLOR_VALUES[accentColor] ?? '#6366f1'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── Theme ──────────────────────────────────────────────────── */}
            <SectionTitle>Theme</SectionTitle>
            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <ThemePreviewCard previewTheme="light" accent={accent} active={resolvedTheme === 'light'} onClick={() => setTheme('light')} />
                <ThemePreviewCard previewTheme="dark" accent={accent} active={resolvedTheme === 'dark'} onClick={() => setTheme('dark')} />
            </div>

            <Row label="Follow system theme" desc="Auto-switch based on OS preference">
                <Toggle
                    checked={theme === 'system'}
                    onChange={v => setTheme(v ? 'system' : resolvedTheme === 'dark' ? 'dark' : 'light')}
                />
            </Row>

            {/* ── Accent color ────────────────────────────────────────────── */}
            <SectionTitle>Accent Color</SectionTitle>
            <div style={{
                padding: '14px 16px',
                background: 'var(--s3)', borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
                marginBottom: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)' }}>Accent Color</p>
                        <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>Used for buttons, selections and highlights</p>
                    </div>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: accent,
                        boxShadow: `0 4px 12px ${accent}66`,
                        border: '2px solid rgba(255,255,255,0.15)',
                    }} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {(Object.keys(ACCENT_COLOR_VALUES) as AccentColor[]).map(color => (
                        <AccentSwatch
                            key={color}
                            color={color}
                            value={ACCENT_COLOR_VALUES[color]}
                            active={accentColor === color}
                            onClick={() => setAccentColor(color)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Interface ───────────────────────────────────────────────── */}
            <SectionTitle>Interface</SectionTitle>
            <Row label="Compact mode" desc="Reduce spacing for a denser layout">
                <Toggle checked={settings.compactMode} onChange={v => updateSetting('compactMode', v)} />
            </Row>
            <Row label="Reduce motion" desc="Minimize animations throughout the interface">
                <Toggle checked={settings.reducedMotion} onChange={v => updateSetting('reducedMotion', v)} />
            </Row>

            {/* ── Sidebar layout ───────────────────────────────────────────── */}
            <SectionTitle>Sidebar Layout</SectionTitle>
            <div style={{
                padding: '14px 16px',
                background: 'var(--s3)', borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                marginBottom: 8,
            }}>
                <div>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)' }}>Page List Style</p>
                    <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>How pages are displayed in the sidebar</p>
                </div>
                <LayoutToggle
                    value={settings.sidebarLayout ?? 'list'}
                    onChange={v => updateSetting('sidebarLayout', v)}
                />
            </div>

            <Row label="Allow drag when sorted" desc="Enable reordering while a sort is active">
                <Toggle checked={settings.allowDragWhenSorted} onChange={v => updateSetting('allowDragWhenSorted', v)} />
            </Row>

            {/* ── Thumbnails ───────────────────────────────────────────────── */}
            <SectionTitle>Thumbnails</SectionTitle>
            <Row label="Thumbnail size" desc="Size of page thumbnails in the sidebar">
                <SegRow
                    value={String(settings.thumbnailSize)}
                    options={[{ value: '80', label: 'Small' }, { value: '120', label: 'Medium' }, { value: '160', label: 'Large' }]}
                    onChange={v => updateSetting('thumbnailSize', Number(v))}
                />
            </Row>
        </div>
    )
})
AppearanceSection.displayName = 'AppearanceSection'

const ImportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Import Behavior</SectionTitle>
            <Row label="Generate thumbnails automatically" desc="Create preview thumbnails when images are imported">
                <Toggle checked={settings.autoGenerateThumbnails} onChange={v => updateSetting('autoGenerateThumbnails', v)} />
            </Row>
            <Row label="Detect duplicates" desc="Skip images that are already in the project">
                <Toggle checked={settings.detectDuplicates} onChange={v => updateSetting('detectDuplicates', v)} />
            </Row>
            <SectionTitle>Quality Warnings</SectionTitle>
            <Row label="Warn on low resolution" desc="Alert when images may be too low-res for quality output">
                <Toggle checked={settings.warnLowResolution} onChange={v => updateSetting('warnLowResolution', v)} />
            </Row>
            <Row label="Low resolution threshold" desc="DPI below which to show warnings">
                <SegRow
                    value={String(settings.lowResolutionThreshold)}
                    options={[{ value: '72', label: '72 DPI' }, { value: '96', label: '96 DPI' }, { value: '150', label: '150 DPI' }]}
                    onChange={v => updateSetting('lowResolutionThreshold', Number(v))}
                />
            </Row>
        </div>
    )
})
ImportSection.displayName = 'ImportSection'

const ExportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Export Defaults</SectionTitle>
            <Row label="Default filename" desc="Base filename for exported PDFs">
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
            </Row>
            <Row label="Show export preview" desc="Preview PDF summary before generating">
                <Toggle checked={settings.showExportPreview} onChange={v => updateSetting('showExportPreview', v)} />
            </Row>
        </div>
    )
})
ExportSection.displayName = 'ExportSection'

const OCRSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>OCR Engine</SectionTitle>
            <Row label="Enable OCR" desc="Extract text from images to create searchable PDFs">
                <Toggle checked={settings.ocrEnabled} onChange={v => updateSetting('ocrEnabled', v)} />
            </Row>
            <Row label="Run OCR automatically" desc="Process OCR when images are imported">
                <Toggle checked={settings.autoRunOcr} onChange={v => updateSetting('autoRunOcr', v)} />
            </Row>
            <SectionTitle>Language</SectionTitle>
            <Row label="OCR language" desc="Primary language for text recognition">
                <SelectRow
                    value={settings.ocrLanguage}
                    options={Object.entries(OCR_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
                    onChange={v => updateSetting('ocrLanguage', v as AppSettings['ocrLanguage'])}
                />
            </Row>
            <SectionTitle>Performance</SectionTitle>
            <Row label="Skip OCR for large documents" desc="Avoid processing documents over the page limit">
                <Toggle checked={settings.skipOcrForLargeDocuments} onChange={v => updateSetting('skipOcrForLargeDocuments', v)} />
            </Row>
            <Row label="Page limit" desc="Maximum pages to process with OCR">
                <SegRow
                    value={String(settings.ocrPageLimit)}
                    options={[{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '500', label: '500' }]}
                    onChange={v => updateSetting('ocrPageLimit', Number(v))}
                />
            </Row>
        </div>
    )
})
OCRSection.displayName = 'OCRSection'

const CoverSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Cover Page Behavior</SectionTitle>
            <Row label="Use first page as cover" desc="Automatically assign the first page as the cover">
                <Toggle checked={settings.useFirstPageAsCover} onChange={v => updateSetting('useFirstPageAsCover', v)} />
            </Row>
            <Row label="Enable custom cover" desc="Allow setting a custom cover separate from page content">
                <Toggle checked={settings.enableCustomCover} onChange={v => updateSetting('enableCustomCover', v)} />
            </Row>
            <Row label="Ask before replacing" desc="Show confirmation before replacing the current cover">
                <Toggle checked={settings.askBeforeReplacingCover} onChange={v => updateSetting('askBeforeReplacingCover', v)} />
            </Row>
            <Row label="Update cover automatically" desc="Update cover when the first page changes">
                <Toggle checked={settings.autoUpdateCover} onChange={v => updateSetting('autoUpdateCover', v)} />
            </Row>
            <Row label="Show cover badge" desc="Display a crown badge on cover thumbnails">
                <Toggle checked={settings.showCoverBadge} onChange={v => updateSetting('showCoverBadge', v)} />
            </Row>
        </div>
    )
})
CoverSection.displayName = 'CoverSection'

const PerformanceSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Workers</SectionTitle>
            <Row label="Concurrent workers" desc="Number of parallel workers for thumbnail and OCR processing">
                <SegRow
                    value={String(settings.maxConcurrentWorkers)}
                    options={[{ value: '2', label: '2' }, { value: '4', label: '4' }, { value: '6', label: '6' }, { value: '8', label: '8' }]}
                    onChange={v => updateSetting('maxConcurrentWorkers', Number(v))}
                />
            </Row>
            <SectionTitle>Cache</SectionTitle>
            <Row label="Enable image cache" desc="Cache processed images to speed up re-rendering">
                <Toggle checked={settings.enableImageCache} onChange={v => updateSetting('enableImageCache', v)} />
            </Row>
            <Row label="Cache size limit" desc="Maximum memory to use for image cache">
                <SegRow
                    value={String(settings.cacheMaxSizeMb)}
                    options={[{ value: '128', label: '128 MB' }, { value: '256', label: '256 MB' }, { value: '512', label: '512 MB' }]}
                    onChange={v => updateSetting('cacheMaxSizeMb', Number(v))}
                />
            </Row>
        </div>
    )
})
PerformanceSection.displayName = 'PerformanceSection'

const AccessibilitySection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Visual</SectionTitle>
            <Row label="High contrast" desc="Increase contrast for better legibility">
                <Toggle checked={settings.highContrast} onChange={v => updateSetting('highContrast', v)} />
            </Row>
            <Row label="Always show focus ring" desc="Keep keyboard focus indicator visible at all times">
                <Toggle checked={settings.focusRingAlwaysVisible} onChange={v => updateSetting('focusRingAlwaysVisible', v)} />
            </Row>
            <Row label="Large text" desc="Increase base font size throughout the interface">
                <Toggle checked={settings.largeText} onChange={v => updateSetting('largeText', v)} />
            </Row>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            {shortcuts.map(({ action, keys }) => (
                <div key={action} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--border-soft)',
                }}>
                    <span style={{ fontSize: 12.5, color: 'var(--tx-1)' }}>{action}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
                    </div>
                </div>
            ))}
        </div>
    )
})
ShortcutsSection.displayName = 'ShortcutsSection'

const PrivacySection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <SectionTitle>Data</SectionTitle>
            <Row label="Enable analytics" desc="Send anonymous usage data to help improve Bindery">
                <Toggle checked={settings.enableTelemetry} onChange={v => updateSetting('enableTelemetry', v)} />
            </Row>
            <div style={{
                marginTop: 16, padding: 14, borderRadius: 'var(--r-lg)',
                background: 'var(--s3)', border: '1px solid var(--border)',
            }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx-1)', marginBottom: 6 }}>
                    Privacy First
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.6 }}>
                    Bindery processes all images locally on your device. No images, files, or project data
                    are ever uploaded to any server. OCR runs via Tesseract.js in a browser worker.
                    PDF generation uses pdf-lib entirely in your browser.
                </p>
            </div>
        </div>
    )
})
PrivacySection.displayName = 'PrivacySection'

const StorageSection = memo(() => (
    <div>
        <SectionTitle>IndexedDB Storage</SectionTitle>
        <div style={{
            padding: 16, borderRadius: 'var(--r-lg)',
            background: 'var(--s3)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>Projects</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>—</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>Pages & Images</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>—</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>Thumbnails</span>
                <span style={{ fontSize: 11.5, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>—</span>
            </div>
        </div>
        <div style={{ marginTop: 12 }}>
            <button style={{
                padding: '8px 16px', borderRadius: 'var(--r-md)',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444', fontSize: 12, fontWeight: 500,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                transition: 'background 110ms',
            }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            >
                Clear all data
            </button>
        </div>
    </div>
))
StorageSection.displayName = 'StorageSection'

const AboutSection = memo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
        <div style={{
            padding: 14, borderRadius: 'var(--r-lg)',
            background: 'var(--s3)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 8,
        }}>
            {[
                { label: 'Framework', value: 'React 19 + TypeScript' },
                { label: 'PDF Engine', value: 'pdf-lib' },
                { label: 'OCR Engine', value: 'Tesseract.js' },
                { label: 'Storage', value: 'IndexedDB via Dexie' },
                { label: 'Build', value: 'Vite' },
            ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>{value}</span>
                </div>
            ))}
        </div>
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
    cover: CoverSection,
    performance: PerformanceSection,
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
                    {/* Backdrop */}
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

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -12 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed',
                            inset: 0, margin: 'auto',
                            zIndex: 201,
                            width: '90vw', maxWidth: 820,
                            height: '80vh', maxHeight: 640,
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 'var(--r-3xl)',
                            boxShadow: 'var(--sh-dialog)',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
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
                                <button
                                    onClick={handleReset}
                                    className="icon-btn"
                                    style={{ color: 'var(--tx-3)' }}
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </Tooltip>

                            <Tooltip content="Close" shortcut="Esc" placement="bottom">
                                <button className="icon-btn" onClick={onClose}>
                                    <X size={15} />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Sidebar nav */}
                            <div style={{
                                width: 200, flexShrink: 0,
                                borderRight: '1px solid var(--border)',
                                display: 'flex', flexDirection: 'column',
                                background: 'var(--bg-panel)',
                            }}>
                                {/* Search */}
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

                                {/* Nav items */}
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

                            {/* Content panel */}
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
