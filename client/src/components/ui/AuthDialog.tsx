import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
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

  const isLoading = status === 'loading'

  const switchMode = (next: 'login' | 'signup') => {
    useAuthStore.setState({ dialogMode: next })
    clearError()
    setConfirmError(null)
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
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

  return (
    <AnimatePresence>
      {dialogOpen && (
        <>
          {/* Backdrop — same treatment as ConfirmDialog */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeAuthDialog}
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
                onClick={closeAuthDialog}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--tx-3)', padding: 4, borderRadius: 'var(--r-sm)',
                }}
              >
                <X size={16} />
              </button>

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
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: 'var(--tx-3)', marginBottom: 5 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={passwordFieldStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
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
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}