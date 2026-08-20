import { create } from 'zustand'
import { authService, type AuthUser } from '@/services/authService'
import { STORAGE_KEYS } from '@/constants'

// ─── State & Actions ──────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
  dialogOpen: boolean
  dialogMode: 'login' | 'signup'
}

interface AuthActions {
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void> // checks for an existing session on app load
  updateProfile: (updates: { username?: string; email?: string }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  clearError: () => void
  openAuthDialog: (mode?: 'login' | 'signup') => void
  closeAuthDialog: () => void
}

type AuthStore = AuthState & AuthActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────────
  user: null,
  status: 'idle',
  error: null,
  dialogOpen: false,
  dialogMode: 'signup',

  // ── Actions ──────────────────────────────────────────────────────────────

  openAuthDialog: (mode = 'signup') => set({ dialogOpen: true, dialogMode: mode, error: null }),
  closeAuthDialog: () => set({ dialogOpen: false }),

  signup: async (email, password) => {
    set({ status: 'loading', error: null })
    try {
      const user = await authService.signup(email, password)
      localStorage.setItem(STORAGE_KEYS.HAD_SESSION, '1')
      set({ user, status: 'authenticated', dialogOpen: false })
    } catch (err) {
      const message = extractErrorMessage(err, 'Signup failed')
      set({ status: 'unauthenticated', error: message })
      throw new Error(message, { cause: err })
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: null })
    try {
      const user = await authService.login(email, password)
      localStorage.setItem(STORAGE_KEYS.HAD_SESSION, '1')
      set({ user, status: 'authenticated', dialogOpen: false })
    } catch (err) {
      const message = extractErrorMessage(err, 'Login failed')
      set({ status: 'unauthenticated', error: message })
      throw new Error(message, { cause: err })
    }
  },

  logout: async () => {
    await authService.logout().catch(() => { })
    localStorage.removeItem(STORAGE_KEYS.HAD_SESSION)
    set({ user: null, status: 'unauthenticated' })
  },

  // Checks for an existing session on app load — but only actually makes
  // the /auth/me request if HAD_SESSION says there might be one. The auth
  // cookie itself is httpOnly (unreadable from JS by design), so this
  // localStorage flag is the only client-visible trace of "has this
  // visitor ever logged in on this browser". Skipping the request
  // entirely for a never-logged-in visitor means zero 401s — Chrome logs
  // any non-2xx XHR response in the console regardless of how the JS
  // handles it, so the only real fix is not making the request at all.
  hydrate: async () => {
    if (localStorage.getItem(STORAGE_KEYS.HAD_SESSION) !== '1') {
      set({ user: null, status: 'unauthenticated' })
      return
    }
    set({ status: 'loading' })
    try {
      const user = await authService.me()
      if (user) {
        set({ user, status: 'authenticated' })
      } else {
        // Flag said "maybe" but the cookie is gone/expired — clear it
        // so future loads skip the request too.
        localStorage.removeItem(STORAGE_KEYS.HAD_SESSION)
        set({ user: null, status: 'unauthenticated' })
      }
    } catch {
      set({ user: null, status: 'unauthenticated' })
    }
  },

  updateProfile: async (updates) => {
    try {
      const user = await authService.updateProfile(updates)
      set({ user, error: null })
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not update profile')
      set({ error: message })
      throw new Error(message, { cause: err })
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      await authService.changePassword(currentPassword, newPassword)
      set({ error: null })
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not change password')
      set({ error: message })
      throw new Error(message, { cause: err })
    }
  },

  deleteAccount: async (password) => {
    try {
      await authService.deleteAccount(password)
      localStorage.removeItem(STORAGE_KEYS.HAD_SESSION)
      set({ user: null, status: 'unauthenticated', error: null })
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not delete account')
      set({ error: message })
      throw new Error(message, { cause: err })
    }
  },

  clearError: () => set({ error: null }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}
