import { memo, useState, useEffect } from 'react'
import { User, Info, Eye, EyeOff, Trash2, Lock, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Spinner } from '@/components/ui/Spinner'
import { Card, CardRow } from '../primitives'

// ─── Shared field styles — used only by this section's username/email/
// password/delete-account inputs, so they live here rather than in a
// separate shared styles file. ─────────────────────────────────────────────

const textFieldStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8,
    background: 'var(--s3)', border: '1px solid var(--border)',
    color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
    outline: 'none', width: 220,
    transition: 'border-color 110ms, box-shadow 110ms',
}
const passwordFieldStyle: React.CSSProperties = { ...textFieldStyle, paddingRight: 34 }
const eyeButtonStyle: React.CSSProperties = {
    position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--tx-3)', padding: 5, borderRadius: 'var(--r-sm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const textFieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent)'
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'
}
const textFieldBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)'
    e.currentTarget.style.boxShadow = 'none'
}

const AccountSection = memo(() => {
    const { user, status, updateProfile, changePassword, deleteAccount, openAuthDialog, logout } = useAuthStore()
    const confirm = useConfirm()

    const [username, setUsername] = useState(user?.username ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [showDeletePassword, setShowDeletePassword] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    useEffect(() => {
        setUsername(user?.username ?? '')
        setEmail(user?.email ?? '')
    }, [user])

    if (status !== 'authenticated' || !user) {
        return (
            <Card title="Account" icon={Info}>
                <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 12, lineHeight: 1.6 }}>
                    Sign in to manage your username, email, and password, and to sync your
                    settings across devices.
                </p>
                <button
                    onClick={() => openAuthDialog('login')}
                    style={{
                        padding: '7px 14px', borderRadius: 'var(--r-md)', border: 'none',
                        background: 'var(--gradient-accent)', color: 'var(--accent-fg)',
                        fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                    }}
                >
                    Sign in
                </button>
            </Card>
        )
    }

    const handleUsernameBlur = async () => {
        if (username === (user.username ?? '')) return
        try {
            await updateProfile({ username })
            toast.success('Username updated')
        } catch (err) {
            toast.error('Could not update username', {
                description: err instanceof Error ? err.message : undefined,
            })
            setUsername(user.username ?? '')
        }
    }

    const handleEmailBlur = async () => {
        if (email === user.email) return
        try {
            await updateProfile({ email })
            toast.success('Email updated')
        } catch (err) {
            toast.error('Could not update email', {
                description: err instanceof Error ? err.message : undefined,
            })
            setEmail(user.email)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
        }
        setIsSavingPassword(true)
        try {
            await changePassword(currentPassword, newPassword)
            toast.success('Password updated')
            setCurrentPassword('')
            setNewPassword('')
            setShowNewPassword(false)
        } catch (err) {
            toast.error('Could not change password', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setIsSavingPassword(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Enter your password to confirm')
            return
        }
        const ok = await confirm({
            title: 'Delete your account?',
            message: 'This permanently deletes your account and any settings saved to it. Your local projects and pages on this device are not affected. This cannot be undone.',
            confirmLabel: 'Delete Account',
            cancelLabel: 'Cancel',
            variant: 'danger',
        })
        if (!ok) return

        setIsDeletingAccount(true)
        try {
            await deleteAccount(deletePassword)
            toast.success('Account deleted')
            useUIStore.getState().closeSettings()
        } catch (err) {
            toast.error('Could not delete account', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setIsDeletingAccount(false)
            setDeletePassword('')
        }
    }

    return (
        <div>
            <Card title="Profile" icon={User}>
                <CardRow label="Username" desc="Shown in the app header.">
                    <input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onBlur={handleUsernameBlur}
                        placeholder="Not set"
                        style={textFieldStyle}
                        onFocus={textFieldFocus}
                        onBlurCapture={textFieldBlurStyle}
                    />
                </CardRow>
                <CardRow label="Email" desc="Used to log in." last>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        style={textFieldStyle}
                        onFocus={textFieldFocus}
                        onBlurCapture={textFieldBlurStyle}
                    />
                </CardRow>
            </Card>

            <Card title="Password" desc="Changing your password does not affect other signed-in devices." icon={Lock}>
                <form onSubmit={handlePasswordSubmit}>
                    <CardRow label="Current password">
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            style={textFieldStyle}
                            onFocus={textFieldFocus}
                            onBlurCapture={textFieldBlurStyle}
                        />
                    </CardRow>
                    <CardRow label="New password" desc="At least 8 characters." last>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={passwordFieldStyle}
                                onFocus={textFieldFocus}
                                onBlurCapture={textFieldBlurStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(v => !v)}
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                style={eyeButtonStyle}
                            >
                                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </CardRow>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                        <button
                            type="submit"
                            disabled={isSavingPassword || !currentPassword || !newPassword}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 14px', borderRadius: 'var(--r-md)', border: 'none',
                                background: 'var(--gradient-accent)', color: 'var(--accent-fg)',
                                fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-sans)',
                                cursor: isSavingPassword ? 'not-allowed' : 'pointer',
                                opacity: (!currentPassword || !newPassword) ? 0.5 : 1,
                            }}
                        >
                            {isSavingPassword && <Spinner size={13} />}
                            Update password
                        </button>
                    </div>
                </form>
            </Card>

            <Card title="Sign out" desc="You'll need to log in again to sync settings on this device." icon={LogOut}>
                <button
                    onClick={() => logout()}
                    style={{
                        padding: '7px 14px', borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--tx-1)', fontSize: 12.5, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                    }}
                >
                    Sign out
                </button>
            </Card>

            <Card title="Delete Account" icon={Trash2}>
                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 12, lineHeight: 1.6 }}>
                    Permanently deletes your account and any settings saved to it. Your local
                    projects and pages on this device are not affected. This cannot be undone.
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--tx-3)', marginBottom: 5 }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showDeletePassword ? 'text' : 'password'}
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                placeholder="Confirm with your password"
                                style={{ ...passwordFieldStyle, width: '100%' }}
                                onFocus={textFieldFocus}
                                onBlurCapture={textFieldBlurStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowDeletePassword(v => !v)}
                                aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                                style={eyeButtonStyle}
                            >
                                {showDeletePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount || !deletePassword}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 'var(--r-md)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.08)',
                            color: '#ef4444', fontSize: 12, fontWeight: 500,
                            fontFamily: 'var(--font-sans)',
                            cursor: (isDeletingAccount || !deletePassword) ? 'default' : 'pointer',
                            opacity: (isDeletingAccount || !deletePassword) ? 0.6 : 1,
                            transition: 'background 110ms', flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (!isDeletingAccount && deletePassword) e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
                        onMouseLeave={e => { if (!isDeletingAccount && deletePassword) e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                    >
                        {isDeletingAccount ? <Spinner size={13} /> : <Trash2 size={13} />}
                        {isDeletingAccount ? 'Deleting…' : 'Delete Account'}
                    </button>
                </div>
            </Card>
        </div>
    )
})
AccountSection.displayName = 'AccountSection'

export default AccountSection
