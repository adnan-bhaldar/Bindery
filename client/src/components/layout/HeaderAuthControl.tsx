import { memo, useEffect } from 'react'
import { User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders in TopNav's right-hand icon cluster, after the existing
 * "Export PDF" button — same `nav-sep` divider pattern used between
 * the other icon groups.
 *
 * Logged out: a "Sign up" pill, opens the auth dialog via the store.
 * Logged in: a profile icon only (no visible email) — clicking it opens
 * SettingsDialog directly to the Account section via `openSettings('account')`.
 *
 * Does NOT render <AuthDialog /> or <SettingsDialog /> itself — both are
 * mounted once at app root (App.tsx / AppShell.tsx). Rendering a
 * `position: fixed` dialog nested this deep in the header broke centering,
 * since an ancestor in TopNav's DOM tree ends up containing-blocking it.
 */
export const HeaderAuthControl = memo(() => {
    const { user, status, hydrate, openAuthDialog } = useAuthStore()
    const openSettings = useUIStore((s) => s.openSettings)

    useEffect(() => {
        hydrate() // silently check for an existing session (cookie) on mount
    }, [hydrate])

    if (status === 'authenticated' && user) {
        return (
            <>
                <span className="nav-sep" />
                <Tooltip content={user.username || user.email} placement="bottom">
                    <button
                        className="icon-btn"
                        onClick={() => openSettings('account')}
                        aria-label="Account"
                        style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'var(--accent-dim)', color: 'var(--accent)',
                            boxShadow: '0 0 0 1px var(--accent-border), 0 0 14px 2px rgba(99, 102, 241, 0.55)',
                        }}
                    >
                        <User size={13} />
                    </button>
                </Tooltip>
            </>
        )
    }

    return (
        <>
            <span className="nav-sep" />
            <Tooltip content="Sign up to sync settings" placement="bottom">
                <button className="nav-export-btn" onClick={() => openAuthDialog('signup')}>
                    Sign up
                </button>
            </Tooltip>
        </>
    )
})
HeaderAuthControl.displayName = 'HeaderAuthControl'