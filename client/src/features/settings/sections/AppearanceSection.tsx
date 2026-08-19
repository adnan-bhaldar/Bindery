import { memo } from 'react'
import { Palette, Sun, Moon, Check, LayoutPanelTop, PanelLeft, Image } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore } from '@/stores/themeStore'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardRow, SegRow } from '../primitives'

const ThemePreviewCard = memo(({ previewTheme, accent, active, onClick, disabled }: {
    previewTheme: 'light' | 'dark'
    accent: string
    active: boolean
    onClick: () => void
    disabled?: boolean
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
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                position: 'relative', flex: 1, cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none', borderRadius: 18, padding: 14, marginTop: 10,
                background: active
                    ? `linear-gradient(180deg, ${accent}12, transparent 65%)`
                    : 'var(--s2)',
                outline: active ? `2px solid ${accent}` : '1.5px solid var(--border)',
                outlineOffset: active ? 1 : -1.5,
                boxShadow: active
                    ? `0 14px 36px ${accent}2e, inset 0 1px 0 rgba(255,255,255,0.04)`
                    : 'var(--sh-xs)',
                transform: active && !disabled ? 'translateY(-2px)' : 'none',
                opacity: disabled ? 0.45 : 1,
                transition: 'all 220ms var(--ease-out)',
            }}
            onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.transform = 'none' }}
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
                    <ThemePreviewCard previewTheme="light" accent={accent} active={resolvedTheme === 'light'} onClick={() => setTheme('light')} disabled={theme === 'system'} />
                    <ThemePreviewCard previewTheme="dark" accent={accent} active={resolvedTheme === 'dark'} onClick={() => setTheme('dark')} disabled={theme === 'system'} />
                </div>
                <CardRow label="Follow system theme" desc="Auto-switch based on OS preference" last>
                    <Toggle
                        checked={theme === 'system'}
                        onChange={v => setTheme(v ? 'system' : resolvedTheme === 'dark' ? 'dark' : 'light')}
                    />
                </CardRow>
            </Card>

            <Card title="Interface" icon={LayoutPanelTop}>
                <CardRow label="Compact mode" desc="Slightly denser layout throughout the app">
                    <Toggle checked={settings.compactMode} onChange={v => updateSetting('compactMode', v)} />
                </CardRow>
                <CardRow label="Reduce motion" desc="Minimize animations throughout the interface">
                    <Toggle checked={settings.reducedMotion} onChange={v => updateSetting('reducedMotion', v)} />
                </CardRow>
                <CardRow label="Workspace right-click menu" desc="Right-click a page in the main workspace for rotate/duplicate/delete" last>
                    <Toggle checked={settings.enableWorkspaceContextMenu} onChange={v => updateSetting('enableWorkspaceContextMenu', v)} />
                </CardRow>
            </Card>

            <Card title="Sidebar" icon={PanelLeft}>
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

            <Card title="Thumbnails" icon={Image}>
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

export default AppearanceSection
