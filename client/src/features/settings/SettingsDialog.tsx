import { memo, useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Settings, RotateCcw, CloudUpload, CloudDownload } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore, extractErrorMessage } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { settingsSyncService } from '@/services/authService'
import { useThemeStore } from '@/stores/themeStore'
import { Spinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/hooks/useConfirm'
import { Tooltip } from '@/components/ui/Tooltip'
import { diffKeys } from '@/lib/utils'
import { toast } from 'sonner'

import { SECTIONS, sectionMatches, matchingSettings } from './searchIndex'
import AccountSection from './sections/AccountSection'
import GeneralSection from './sections/GeneralSection'
import AppearanceSection from './sections/AppearanceSection'
import ImportSection from './sections/ImportSection'
import ExportSection from './sections/ExportSection'
import OCRSection from './sections/OCRSection'
import AccessibilitySection from './sections/AccessibilitySection'
import ShortcutsSection from './sections/ShortcutsSection'
import PrivacySection from './sections/PrivacySection'
import AppSection from './sections/AppSection'
import StorageSection from './sections/StorageSection'
import AboutSection from './sections/AboutSection'

// ─── Section map ──────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, React.FC> = {
    account: AccountSection,
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
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingRemote, setIsLoadingRemote] = useState(false)
    const { settings, resetSettings, updateSettings } = useSettingsStore()
    const { status: authStatus, user: authUser, openAuthDialog } = useAuthStore()
    const settingsSection = useUIStore((s) => s.settingsSection)
    const settingsHighlightId = useUIStore((s) => s.settingsHighlightId)
    const settingsHighlightNonce = useUIStore((s) => s.settingsHighlightNonce)
    const confirm = useConfirm()

    // Jump to whichever section the dialog was opened/redirected to. Depends
    // on settingsHighlightNonce (which now bumps on every openSettings() call,
    // see uiStore.ts) rather than just [isOpen] — otherwise a jump request
    // arriving while the dialog was ALREADY open (e.g. selecting a setting in
    // the command palette without closing Settings first) wouldn't switch
    // sections at all, since `isOpen` never actually changed value. That left
    // highlightSetting() searching for a row that was never mounted, silently
    // no-opping — this was the actual cause of some settings (e.g. "Large
    // text") never flashing when jumped to.
    useEffect(() => {
        if (isOpen) setActiveSection(settingsSection)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, settingsHighlightNonce])

    // Scrolls a specific setting's row into view and flashes it briefly, so a
    // search that matched one exact setting (not just its section) actually
    // lands the user's eye on that row. Waits a tick for the section switch /
    // dialog-open animation to finish painting before measuring layout.
    const highlightSetting = useCallback((id: string) => {
        window.setTimeout(() => {
            const el = document.getElementById(id)
            if (!el) return
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.remove('setting-flash')
            // Force reflow so the animation restarts even if the same
            // element was flashed a moment ago.
            void el.offsetWidth
            el.classList.add('setting-flash')
        }, 220)
    }, [])

    useEffect(() => {
        if (isOpen && settingsHighlightId) highlightSetting(settingsHighlightId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, settingsHighlightNonce])

    const filtered = useMemo(
        () => SECTIONS.filter(s => sectionMatches(s, search, authStatus === 'authenticated' && !!authUser)),
        [search, authStatus, authUser]
    )

    // Individual settings matching the search — lets the in-dialog search
    // jump straight to one control, the same way the command palette does,
    // instead of only ever landing on its section.
    const matchedSettings = useMemo(
        () => matchingSettings(search, authStatus === 'authenticated' && !!authUser),
        [search, authStatus, authUser]
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

    const handleSaveToAccount = useCallback(async () => {
        if (authStatus !== 'authenticated') {
            openAuthDialog('login')
            return
        }
        setIsSaving(true)
        try {
            // settingsStore.settings.theme exists in the AppSettings type but
            // isn't actually what drives the rendered theme — that's
            // useThemeStore, a separate persisted store (see useTheme.ts).
            // Overwrite the payload's theme with the real live value so a
            // save actually captures what the user currently sees.
            const liveTheme = useThemeStore.getState().theme
            const payload = { ...settings, theme: liveTheme }
            await settingsSyncService.updateRemoteSettings(payload)
            toast.success('Settings saved to your account')
        } catch (err) {
            toast.error('Failed to save settings', {
                description: extractErrorMessage(err, 'Something went wrong'),
            })
        } finally {
            setIsSaving(false)
        }
    }, [authStatus, openAuthDialog, settings])

    const handleLoadFromAccount = useCallback(async () => {
        if (authStatus !== 'authenticated') {
            openAuthDialog('login')
            return
        }
        const ok = await confirm({
            title: 'Load settings from your account?',
            message: 'This will overwrite your current local settings with whatever was last saved to your account. This cannot be undone.',
            confirmLabel: 'Load Settings',
            cancelLabel: 'Cancel',
            variant: 'warning',
        })
        if (!ok) return

        setIsLoadingRemote(true)
        try {
            const { data } = await settingsSyncService.getRemoteSettings()

            if (!data || Object.keys(data).length === 0) {
                toast.error('No settings have been saved to your account yet')
                return
            }

            // Only apply keys that actually differ — a field already matching
            // locally is genuinely a no-op, not just an invisible same-value write.
            const currentSettings = useSettingsStore.getState().settings
            const changed = diffKeys(currentSettings, data)
            const themeChanged = data.theme && data.theme !== useThemeStore.getState().theme

            if (Object.keys(changed).length === 0 && !themeChanged) {
                toast.success('Already up to date — nothing to load')
                return
            }

            if (Object.keys(changed).length > 0) updateSettings(changed)
            // Same reason as the save side: theme is actually rendered from
            // useThemeStore, not settingsStore, so it needs applying separately.
            if (themeChanged) useThemeStore.getState().setTheme(data.theme!)

            toast.success('Settings loaded from your account')
        } catch (err) {
            toast.error('Failed to load settings', {
                description: extractErrorMessage(err, 'Something went wrong'),
            })
        } finally {
            setIsLoadingRemote(false)
        }
    }, [authStatus, openAuthDialog, confirm, updateSettings])

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

                            <Tooltip
                                content={authStatus === 'authenticated' ? 'Save settings to your account' : 'Sign in to save settings to your account'}
                                placement="bottom"
                            >
                                <button
                                    onClick={handleSaveToAccount}
                                    disabled={isSaving}
                                    className="icon-btn"
                                    style={{ color: 'var(--tx-3)', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                                >
                                    {isSaving ? <Spinner size={14} /> : <CloudUpload size={14} />}
                                </button>
                            </Tooltip>

                            <Tooltip
                                content={authStatus === 'authenticated' ? 'Load settings from your account' : 'Sign in to load settings from your account'}
                                placement="bottom"
                            >
                                <button
                                    onClick={handleLoadFromAccount}
                                    disabled={isLoadingRemote}
                                    className="icon-btn"
                                    style={{ color: 'var(--tx-3)', cursor: isLoadingRemote ? 'not-allowed' : 'pointer' }}
                                >
                                    {isLoadingRemote ? <Spinner size={14} /> : <CloudDownload size={14} />}
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

                                    {search && matchedSettings.length > 0 && (
                                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
                                            <p style={{
                                                fontSize: 10, fontWeight: 600, color: 'var(--tx-4)',
                                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                                padding: '0 10px 5px',
                                            }}>
                                                Jump to setting
                                            </p>
                                            {matchedSettings.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        setActiveSection(item.section)
                                                        highlightSetting(item.id)
                                                    }}
                                                    style={{
                                                        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                                        padding: '6px 10px', borderRadius: 8, border: 'none',
                                                        background: 'transparent', color: 'var(--tx-2)',
                                                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                                        textAlign: 'left', transition: 'background 110ms, color 110ms',
                                                        marginBottom: 1,
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = 'var(--hover)'
                                                        e.currentTarget.style.color = 'var(--tx-1)'
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'transparent'
                                                        e.currentTarget.style.color = 'var(--tx-2)'
                                                    }}
                                                >
                                                    <span style={{ fontSize: 12 }}>{item.label}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--tx-4)' }}>
                                                        {SECTIONS.find(s => s.id === item.section)?.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
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