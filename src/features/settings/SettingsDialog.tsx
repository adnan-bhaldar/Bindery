import { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Search, Settings, Palette, Upload, Download,
    ScanText, Accessibility, Keyboard,
    Shield, Database, Info, RotateCcw, BookOpen,
    HardDrive, Image as ImageIcon, FileArchive, Trash2,
    Sun, Moon, Check, ExternalLink, ChevronDown,
    Smartphone, WifiOff, CheckCircle2,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePWA } from '@/hooks/usePWA'
import { useThemeStore } from '@/stores/themeStore'
import { Toggle } from '@/components/ui/Toggle'
import { Spinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Tooltip } from '@/components/ui/Tooltip'
import { OCR_LANGUAGE_LABELS } from '@/constants'
import { getStorageStats, clearDatabase, type StorageStats } from '@/db/schema'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'
import type { AppSettings } from '@/types'

// lucide-react removed all brand/logo icons (GitHub, Twitter, etc.) from
// v1.0 onward — this project is pinned to ^1.21.0, so `Github` no longer
// exists as an export. A small inline SVG of the mark is the standard
// substitute other apps use once a icon library drops brand glyphs.
const GithubMark = memo(({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.75 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.56-.29-5.26-1.28-5.26-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.11 3.05.75.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
))
GithubMark.displayName = 'GithubMark'

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
const SEARCH_INDEX: Record<string, string[]> = {
    general: [
        'restore previous session', 'reopen last project on startup',
        'auto save interval', 'how often to automatically save',
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

function sectionMatches(section: SettingsSection, query: string): boolean {
    if (!query) return true
    const q = query.toLowerCase()
    if (section.label.toLowerCase().includes(q)) return true
    return (SEARCH_INDEX[section.id] ?? []).some(entry => entry.includes(q))
}

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
}) => {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const current = options.find(o => o.value === value)

    // Close on outside click and on Escape — standard custom-dropdown behavior
    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--s3)',
                    border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: open ? '0 0 0 3px var(--accent-dim)' : 'none',
                    color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
                    cursor: 'pointer', outline: 'none',
                    transition: 'border-color 130ms, box-shadow 130ms',
                    minWidth: 140, justifyContent: 'space-between',
                }}
            >
                <span>{current?.label ?? value}</span>
                <ChevronDown
                    size={13}
                    color="var(--tx-3)"
                    style={{ transition: 'transform 180ms var(--ease-out)', transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                            minWidth: 160, zIndex: 50,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 12,
                            boxShadow: 'var(--sh-md)',
                            padding: 4,
                            maxHeight: 220, overflowY: 'auto',
                            transformOrigin: 'top right',
                        }}
                    >
                        {options.map(o => {
                            const active = o.value === value
                            return (
                                <button
                                    key={o.value}
                                    onClick={() => { onChange(o.value); setOpen(false) }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: 10, padding: '7px 10px', borderRadius: 8, border: 'none',
                                        background: active ? 'var(--accent-dim)' : 'transparent',
                                        color: active ? 'var(--accent)' : 'var(--tx-1)',
                                        fontSize: 12.5, fontWeight: active ? 600 : 400,
                                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                        textAlign: 'left', transition: 'background 100ms',
                                    }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)' }}
                                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                                >
                                    {o.label}
                                    {active && <Check size={13} strokeWidth={2.75} />}
                                </button>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})
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
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    const shadow = isDark ? '0 10px 36px rgba(0,0,0,0.65)' : '0 10px 36px rgba(0,0,0,0.14)'
    const Icon = isDark ? Moon : Sun

    return (
        <button
            onClick={onClick}
            style={{
                position: 'relative', flex: 1, cursor: 'pointer',
                border: 'none', borderRadius: 18, padding: 14, marginTop: 10,
                background: active
                    ? `linear-gradient(180deg, ${accent}12, transparent 65%)`
                    : 'var(--s2)',
                outline: active ? `2px solid ${accent}` : '1.5px solid var(--border)',
                outlineOffset: active ? 1 : -1.5,
                boxShadow: active
                    ? `0 14px 36px ${accent}2e, inset 0 1px 0 rgba(255,255,255,0.04)`
                    : 'var(--sh-xs)',
                transform: active ? 'translateY(-2px)' : 'none',
                transition: 'all 220ms var(--ease-out)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.transform = 'none' }}
        >
            {/* Ambient glow — only for the active card, gives it a "lit up" feel */}
            {active && (
                <div style={{
                    position: 'absolute', inset: -18, zIndex: 0, pointerEvents: 'none',
                    background: `radial-gradient(ellipse 70% 60% at 50% 20%, ${accent}30, transparent 72%)`,
                    filter: 'blur(4px)',
                }} />
            )}

            <div style={{
                position: 'relative', zIndex: 1,
                borderRadius: 13, overflow: 'hidden',
                background: bg, border: `1px solid ${border}`,
                boxShadow: shadow,
            }}>
                {/* Glass shine — a soft diagonal highlight for a premium, glossy feel */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                    background: `linear-gradient(115deg, rgba(255,255,255,${isDark ? 0.05 : 0.35}) 0%, transparent 30%)`,
                }} />

                <div style={{
                    position: 'relative', height: 25, background: nav,
                    borderBottom: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
                }}>
                    {/* Logo mark — mirrors the real topnav's gradient "B" square */}
                    <div style={{
                        width: 12, height: 12, borderRadius: 4,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        flexShrink: 0,
                    }} />
                    <div style={{ width: 20, height: 4, borderRadius: 2, background: tx, opacity: 0.5, flexShrink: 0 }} />
                    {/* Search pill */}
                    <div style={{
                        flex: 1, height: 11, borderRadius: 5, margin: '0 4px',
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${border}`,
                    }} />
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: tx, opacity: 0.4 }} />
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: tx, opacity: 0.4 }} />
                    {/* Export button */}
                    <div style={{
                        height: 10, width: 30, borderRadius: 4, flexShrink: 0,
                        background: `linear-gradient(135deg,${accent},${accent}cc)`,
                        boxShadow: `0 2px 6px ${accent}55`,
                    }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', height: 72 }}>
                    {/* Sidebar — 2×2 grid of thumbnails, one "selected" */}
                    <div style={{
                        width: 40, background: sidebar,
                        borderRight: `1px solid ${border}`,
                        padding: '6px 5px', display: 'flex', flexDirection: 'column', gap: 3,
                    }}>
                        <div style={{ height: 4, width: 16, borderRadius: 2, background: tx, opacity: 0.4, marginBottom: 1 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                            {[
                                isDark ? '#3a3a48' : '#d4d4de',
                                isDark ? '#2e2e3a' : '#e0e0e8',
                                isDark ? '#34343f' : '#dadae2',
                                isDark ? '#2a2a35' : '#e4e4ec',
                            ].map((tone, i) => (
                                <div key={i} style={{
                                    aspectRatio: '3/4', borderRadius: 3, background: tone,
                                    outline: i === 0 ? `1.5px solid ${accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                    outlineOffset: i === 0 ? 1 : 0,
                                    boxShadow: i === 0 ? `0 0 0 2px ${accent}33` : 'none',
                                }} />
                            ))}
                        </div>
                    </div>

                    {/* Canvas — a "photo" page with realistic layered content, drop shadow, slight lift */}
                    <div style={{
                        flex: 1, background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                    }}>
                        <div style={{
                            width: 36, height: 48,
                            background: card,
                            borderRadius: 2, overflow: 'hidden',
                            boxShadow: isDark
                                ? '0 8px 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)'
                                : '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)',
                            display: 'flex', flexDirection: 'column',
                        }}>
                            <div style={{
                                height: '55%',
                                background: isDark
                                    ? `linear-gradient(135deg, #2a2a38, #3a3a4a 60%, ${accent}22)`
                                    : `linear-gradient(135deg, #e2e2ea, #ccccd8 60%, ${accent}18)`,
                            }} />
                            <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                                <div style={{ height: 2, width: '70%', borderRadius: 1, background: 'rgba(0,0,0,0.12)' }} />
                                <div style={{ height: 2, width: '45%', borderRadius: 1, background: 'rgba(0,0,0,0.08)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Properties panel — Fit / Margin chip groups, like the real one */}
                    <div style={{
                        width: 34, background: sidebar,
                        borderLeft: `1px solid ${border}`,
                        padding: '6px 5px', display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                        <div>
                            <div style={{ height: 3, width: 18, borderRadius: 1.5, background: tx, opacity: 0.4, marginBottom: 3 }} />
                            <div style={{ display: 'flex', gap: 2 }}>
                                <div style={{ flex: 1, height: 8, borderRadius: 2, background: `${accent}30`, border: `1px solid ${accent}50` }} />
                                <div style={{ flex: 1, height: 8, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ height: 3, width: 20, borderRadius: 1.5, background: tx, opacity: 0.4, marginBottom: 3 }} />
                            <div style={{ display: 'flex', gap: 1.5 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{
                                        flex: 1, height: 7, borderRadius: 2,
                                        background: i === 1 ? `${accent}30` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                                        border: i === 1 ? `1px solid ${accent}50` : 'none',
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 12,
            }}>
                <Icon size={13} color={active ? accent : 'var(--tx-3)'} strokeWidth={2.25} />
                <span style={{
                    fontSize: 12.5, fontWeight: active ? 700 : 500,
                    color: active ? accent : 'var(--tx-3)',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: active ? '-0.2px' : '0',
                    transition: 'color 150ms',
                }}>
                    {previewTheme === 'dark' ? 'Dark' : 'Light'}
                </span>
                {active && (
                    <div style={{
                        width: 15, height: 15, borderRadius: '50%',
                        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: 2,
                    }}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                    </div>
                )}
            </div>
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
                    desc="Used as a prefix (combined with the current date/time) only when a project has no name of its own — a named project always exports as its own name"
                    last
                >
                    <input
                        value={settings.defaultFilename}
                        onChange={e => updateSetting('defaultFilename', e.target.value)}
                        placeholder="Bindery"
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

            <Card title="Auto Page Size" desc="Applies whenever a page's size is set to Auto.">
                <CardRow
                    label="Exact fit (no canvas)"
                    desc="Page sized exactly to each image — the exported PDF matches the preview exactly, no blank space around it"
                    last
                >
                    <Toggle
                        checked={settings.useExactAutoPageSize}
                        onChange={v => updateSetting('useExactAutoPageSize', v)}
                    />
                </CardRow>
            </Card>

            <Card title="Document Title" desc="Controls the sidebar Info tab's Title field.">
                <CardRow
                    label="Allow custom document title"
                    desc="When off, the exported PDF's title always matches the project name — the sidebar's Title field stays locked to it"
                    last
                >
                    <Toggle
                        checked={settings.allowCustomDocumentTitle}
                        onChange={v => updateSetting('allowCustomDocumentTitle', v)}
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

// ─── App section — real install prompt via usePWA, not decorative ────────────

const AppSection = memo(() => {
    const { canInstall, isInstalled, swRegistered, install } = usePWA()
    const [installing, setInstalling] = useState(false)

    const handleInstall = useCallback(async () => {
        setInstalling(true)
        try {
            const accepted = await install()
            if (accepted) toast.success('Bindery installed')
        } finally {
            setInstalling(false)
        }
    }, [install])

    return (
        <div>
            <Card title="Install App" icon={Smartphone}>
                <CardRow label="Status">
                    {isInstalled ? (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 11.5, fontWeight: 600, color: '#34d399',
                            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            <CheckCircle2 size={12} />
                            Installed
                        </span>
                    ) : canInstall ? (
                        <span style={{
                            fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
                            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            Available
                        </span>
                    ) : (
                        <span style={{
                            fontSize: 11.5, fontWeight: 500, color: 'var(--tx-4)',
                            background: 'var(--s3)', border: '1px solid var(--border)',
                            borderRadius: 99, padding: '3px 9px',
                        }}>
                            Not available in this browser
                        </span>
                    )}
                </CardRow>
                <CardRow
                    label="Offline support"
                    desc={swRegistered ? 'Service worker active — Bindery works without a connection' : 'Not active yet'}
                    last
                >
                    {swRegistered ? (
                        <CheckCircle2 size={16} color="#34d399" />
                    ) : (
                        <WifiOff size={16} color="var(--tx-4)" />
                    )}
                </CardRow>
            </Card>

            {!isInstalled && (
                <Card>
                    <p style={{ fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.65, marginBottom: canInstall ? 14 : 0 }}>
                        {canInstall
                            ? 'Install Bindery as a standalone app — it opens in its own window, works offline, and runs like any other app on your device.'
                            : 'Your browser has not offered an install prompt yet, or does not support installing web apps. Try Chrome, Edge, or a Chromium-based browser, or look for an Install or Add to Home Screen option in your browser’s own menu.'}
                    </p>
                    {canInstall && (
                        <button
                            onClick={handleInstall}
                            disabled={installing}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                width: '100%', padding: '10px 16px',
                                borderRadius: 12, border: 'none',
                                background: 'var(--gradient-accent)',
                                color: '#fff', fontSize: 13, fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: installing ? 'default' : 'pointer',
                                opacity: installing ? 0.7 : 1,
                                boxShadow: '0 4px 16px var(--accent-glow)',
                                transition: 'transform 130ms, box-shadow 130ms',
                            }}
                            onMouseEnter={e => { if (!installing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)' } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)' }}
                        >
                            {installing ? <Spinner size={14} /> : <Download size={14} />}
                            {installing ? 'Installing…' : 'Install App'}
                        </button>
                    )}
                </Card>
            )}
        </div>
    )
})
AppSection.displayName = 'AppSection'

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
                        <Spinner size={14} />
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
                    {clearing ? <Spinner size={13} /> : <Trash2 size={13} />}
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

        <Card title="Developer" icon={GithubMark}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--s3)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 5,
                }}>
                    <GithubMark size={20} color="var(--tx-1)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)' }}>Adnan Bhaldar</p>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 1 }}>@adnan-bhaldar</p>
                </div>
                <a
                    href="https://github.com/adnan-bhaldar"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 9,
                        background: 'var(--s3)', border: '1px solid var(--border)',
                        color: 'var(--tx-1)', fontSize: 12, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', textDecoration: 'none',
                        transition: 'background 110ms, border-color 110ms',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.borderColor = 'var(--border-hard)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                    Profile
                    <ExternalLink size={12} />
                </a>
            </div>
            <a
                href="https://github.com/adnan-bhaldar/Bindery"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid var(--border-soft)',
                    textDecoration: 'none', color: 'var(--tx-3)',
                    fontSize: 12, transition: 'color 110ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx-3)' }}
            >
                <span>View source on GitHub</span>
                <ExternalLink size={12} />
            </a>
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
    app: AppSection,
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

    const filtered = useMemo(
        () => SECTIONS.filter(s => sectionMatches(s, search)),
        [search]
    )

    // If the currently-active section gets filtered out by a search term,
    // jump to the first remaining match instead of showing a blank panel
    // for a section that's no longer even visible in the nav.
    useEffect(() => {
        if (filtered.length > 0 && !filtered.some(s => s.id === activeSection)) {
            setActiveSection(filtered[0].id)
        }
    }, [filtered, activeSection])

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
                                            placeholder="Search settings…"
                                            style={{
                                                flex: 1, background: 'transparent', border: 'none',
                                                outline: 'none', fontSize: 12, color: 'var(--tx-1)',
                                                fontFamily: 'var(--font-sans)', minWidth: 0,
                                            }}
                                        />
                                        {search && (
                                            <button
                                                onClick={() => setSearch('')}
                                                style={{
                                                    border: 'none', background: 'transparent',
                                                    color: 'var(--tx-4)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', padding: 0,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
                                    {filtered.length === 0 ? (
                                        <p style={{
                                            fontSize: 11.5, color: 'var(--tx-4)',
                                            textAlign: 'center', padding: '20px 10px',
                                        }}>
                                            No settings match "{search}"
                                        </p>
                                    ) : (
                                        filtered.map(({ id, label, Icon }) => (
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
                                        ))
                                    )}
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