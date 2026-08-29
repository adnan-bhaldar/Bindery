import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, KeyRound, Copy, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Spinner } from '@/components/ui/Spinner'

// ─── Shared field style (mirrors the input pattern used in SettingsDialog) ────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 'var(--r-md)',
  background: 'var(--s3)',
  border: '1px solid var(--border)',
  color: 'var(--tx-1)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 110ms, box-shadow 110ms',
}

// Password fields get extra right padding to make room for the eye toggle
const passwordFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingRight: 38,
}

const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--tx-3)', padding: 6, borderRadius: 'var(--r-sm)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const focusField = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)'
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'
}
const blurField = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--border)'
  e.currentTarget.style.boxShadow = 'none'
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

/**
 * Rendered once, at app root (see App.tsx) — same pattern as RecoveryDialog,
 * WhatsNewDialog, etc. Do NOT render this nested inside TopNav/HeaderAuthControl:
 * a `position: fixed` element nested deep in the header's DOM tree can end up
 * containing-blocked by an ancestor, breaking centering. Open it from anywhere
 * via `useAuthStore.getState().openAuthDialog()`.
 */
export function AuthDialog() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { dialogOpen, dialogMode, login, signup, status, error, clearError, closeAuthDialog } =
    useAuthStore()

  // Reset-password-with-backup-code is a standalone flow, not part of the
  // shared login/signup dialogMode — it doesn't touch the session at all.
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [showResetNewPassword, setShowResetNewPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [newReplacementCode, setNewReplacementCode] = useState<string | null>(null)
  const [copiedReplacement, setCopiedReplacement] = useState(false)

  const isLoading = status === 'loading'

  const switchMode = (next: 'login' | 'signup') => {
    useAuthStore.setState({ dialogMode: next })
    clearError()
    setConfirmError(null)
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const closeDialogAndReset = () => {
    closeAuthDialog()
    setShowReset(false)
    setNewReplacementCode(null)
  }

  const openReset = () => {
    setShowReset(true)
    setResetError(null)
    setNewReplacementCode(null)
    setResetEmail(email) // carry over whatever they already typed on the login form
  }

  const backToLogin = () => {
    setShowReset(false)
    setNewReplacementCode(null)
    setResetCode('')
    setResetNewPassword('')
    useAuthStore.setState({ dialogMode: 'login' })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (dialogMode === 'signup' && password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }
    setConfirmError(null)
    try {
      if (dialogMode === 'signup') await signup(email, password)
      else await login(email, password)
    } catch {
      // error is already surfaced via the store
    }
  }

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (resetNewPassword.length < 8) {
      setResetError('New password must be at least 8 characters')
      return
    }
    setResetError(null)
    setIsResetting(true)
    try {
      const { newBackupCode } = await authService.resetPasswordWithBackupCode(
        resetEmail,
        resetCode,
        resetNewPassword
      )
      setNewReplacementCode(newBackupCode)
    } catch (err) {
      setResetError(
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Could not reset password'
          : 'Could not reset password'
      )
    } finally {
      setIsResetting(false)
    }
  }

  const handleCopyReplacement = () => {
    if (!newReplacementCode) return
    navigator.clipboard.writeText(newReplacementCode)
    setCopiedReplacement(true)
  }

  return (
    <AnimatePresence>
      {dialogOpen && (
        <>
          {/* Backdrop — same treatment as ConfirmDialog */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeDialogAndReset}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'color-mix(in srgb, var(--bg-app) 45%, transparent)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, margin: 'auto',
              zIndex: 9001, width: 380, height: 'fit-content',
            }}
          >
            <div style={{
              position: 'absolute', inset: -28, zIndex: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 65% 55% at 50% 8%, var(--accent-glow), transparent 70%)',
              filter: 'blur(6px)',
            }} />

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative', zIndex: 1,
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-hard)',
                borderRadius: 'var(--r-2xl)',
                boxShadow: 'var(--sh-dialog)',
                overflow: 'hidden',
                padding: '24px 24px 22px',
              }}
            >
              <button
                onClick={closeDialogAndReset}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--tx-3)', padding: 4, borderRadius: 'var(--r-sm)',
                }}
              >
                <X size={16} />
              </button>

              {showReset ? (
                // ─── Reset password with backup code ──────────────────────
                newReplacementCode ? (
                  <div style={{ marginTop: 6 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'var(--accent-dim)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                    }}>
                      <KeyRound size={18} color="var(--accent)" />
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx-1)', margin: '0 0 4px' }}>
                      Password reset
                    </h2>
                    <p style={{ fontSize: 12.5, color: 'var(--tx-2)', margin: '0 0 16px', lineHeight: 1.5 }}>
                      That backup code has now been used and won't work again. Here's your
                      replacement code — save it now, it won't be shown again.
                    </p>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 'var(--r-md)',
                      background: 'var(--s3)', border: '1px solid var(--border)',
                      marginBottom: 16,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 16,
                        color: 'var(--tx-1)', letterSpacing: '0.1em',
                      }}>
                        {newReplacementCode}
                      </span>
                      <button
                        onClick={handleCopyReplacement}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--tx-2)', fontSize: 11.5, cursor: 'pointer',
                        }}
                      >
                        {copiedReplacement ? <Check size={12} /> : <Copy size={12} />}
                        {copiedReplacement ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <button
                      onClick={backToLogin}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 'var(--r-lg)',
                        border: 'none', background: 'var(--gradient-accent)',
                        color: 'var(--accent-fg)', fontSize: 13, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                      }}
                    >
                      Back to log in
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx-1)', margin: '0 0 4px' }}>
                      Reset your password
                    </h2>
                    <p style={{ fontSize: 12.5, color: 'var(--tx-2)', margin: '0 0 18px' }}>
                      Use one of your backup codes — find them under Settings → Account on a
                      device where you're still signed in.
                    </p>

                    <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="you@example.com"
                          style={fieldStyle}
                          onFocus={focusField}
                          onBlur={blurField}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                          Backup code
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="6-digit code"
                          style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                          onFocus={focusField}
                          onBlur={blurField}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                          New password
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showResetNewPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            style={passwordFieldStyle}
                            onFocus={focusField}
                            onBlur={blurField}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetNewPassword((v) => !v)}
                            aria-label={showResetNewPassword ? 'Hide password' : 'Show password'}
                            style={eyeButtonStyle}
                          >
                            {showResetNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {resetError && (
                        <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{resetError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isResetting}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '10px 0', marginTop: 4,
                          borderRadius: 'var(--r-lg)', border: 'none',
                          background: 'var(--gradient-accent)',
                          color: 'var(--accent-fg)',
                          fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                          cursor: isResetting ? 'not-allowed' : 'pointer',
                          opacity: isResetting ? 0.65 : 1,
                          boxShadow: '0 2px 12px var(--accent-glow)',
                        }}
                      >
                        {isResetting && <Spinner size={14} />}
                        Reset password
                      </button>

                      <button
                        type="button"
                        onClick={backToLogin}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--tx-3)', fontSize: 12, fontFamily: 'var(--font-sans)',
                          padding: 4,
                        }}
                      >
                        ← Back to log in
                      </button>
                    </form>
                  </>
                )
              ) : (
                // ─── Log in / Sign up ──────────────────────────────────────
                <>
                  {/* Mode tabs */}
                  <div style={{
                    display: 'flex', gap: 4, padding: 4, marginBottom: 20,
                    marginTop: 30,
                    background: 'var(--s2)', borderRadius: 'var(--r-lg)',
                  }}>
                    {(['login', 'signup'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 'var(--r-md)',
                          border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                          background: dialogMode === m ? 'var(--gradient-accent)' : 'transparent',
                          color: dialogMode === m ? 'var(--accent-fg)' : 'var(--tx-2)',
                          transition: 'background 110ms, color 110ms',
                        }}
                      >
                        {m === 'login' ? 'Log in' : 'Sign up'}
                      </button>
                    ))}
                  </div>

                  <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx-1)', margin: '0 0 4px' }}>
                    {dialogMode === 'signup' ? 'Create your account' : 'Welcome back'}
                  </h2>
                  <p style={{ fontSize: 12.5, color: 'var(--tx-2)', margin: '0 0 18px' }}>
                    {dialogMode === 'signup'
                      ? 'Sync your settings across devices.'
                      : 'Log in to load your saved settings.'}
                  </p>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={fieldStyle}
                        onFocus={focusField}
                        onBlur={blurField}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                          Password
                        </label>
                        {dialogMode === 'login' && (
                          <button
                            type="button"
                            onClick={openReset}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-sans)',
                              padding: 0,
                            }}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          style={passwordFieldStyle}
                          onFocus={focusField}
                          onBlur={blurField}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={eyeButtonStyle}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {dialogMode === 'signup' && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                          Confirm password
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null) }}
                            placeholder="Re-enter your password"
                            style={passwordFieldStyle}
                            onFocus={focusField}
                            onBlur={blurField}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            style={eyeButtonStyle}
                          >
                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {confirmError && (
                          <p style={{ fontSize: 11.5, color: '#f87171', margin: '5px 0 0' }}>{confirmError}</p>
                        )}
                      </div>
                    )}

                    {error && (
                      <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 0', marginTop: 4,
                        borderRadius: 'var(--r-lg)', border: 'none',
                        background: 'var(--gradient-accent)',
                        color: 'var(--accent-fg)',
                        fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.65 : 1,
                        boxShadow: '0 2px 12px var(--accent-glow)',
                      }}
                    >
                      {isLoading && <Spinner size={14} />}
                      {dialogMode === 'signup' ? 'Create account' : 'Log in'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
