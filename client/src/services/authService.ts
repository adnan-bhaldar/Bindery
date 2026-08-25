import axios from 'axios'
import { API_BASE_URL } from '@/constants'
import type { AppSettings } from '@/types'

// ─── Client ───────────────────────────────────────────────────────────────────

const api = axios.create({
    // Strips a trailing slash so VITE_API_URL can be set either way
    // (with or without one) without producing a double slash before /api.
    baseURL: `${API_BASE_URL.replace(/\/$/, '')}/api`,
    withCredentials: true, // sends/receives the httpOnly auth cookie
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string
    email: string
    username: string
    createdAt: string
}

interface RemoteSettings {
    data: Partial<AppSettings>
    updatedAt: string
}

// ─── Auth service ─────────────────────────────────────────────────────────────

class AuthService {
    async signup(email: string, password: string): Promise<AuthUser> {
        const res = await api.post<AuthUser>('/auth/signup', { email, password })
        return res.data
    }

    async login(email: string, password: string): Promise<AuthUser> {
        const res = await api.post<AuthUser>('/auth/login', { email, password })
        return res.data
    }

    async logout(): Promise<void> {
        await api.post('/auth/logout')
    }

    async me(): Promise<AuthUser | null> {
        // 401 here means "no active session" — a totally expected outcome on
        // every fresh page load, not an error. Without validateStatus, axios
        // throws on any non-2xx status, and the browser logs that as a red
        // console error regardless of try/catch around the call site. Telling
        // axios that <500 is an acceptable response lets it resolve normally
        // instead, so a logged-out visit produces a clean console.
        const res = await api.get<AuthUser>('/auth/me', {
            validateStatus: (status) => status < 500,
        })
        if (res.status === 401) return null
        return res.data
    }

    async updateProfile(updates: { username?: string; email?: string }): Promise<AuthUser> {
        const res = await api.patch<AuthUser>('/auth/profile', updates)
        return res.data
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.put('/auth/password', { currentPassword, newPassword })
    }

    async deleteAccount(password: string): Promise<void> {
        await api.delete('/auth/account', { data: { password } })
    }

    async getBackupCodesStatus(): Promise<{ total: number; unused: number; generatedAt: string | null }> {
        const res = await api.get<{ total: number; unused: number; generatedAt: string | null }>(
            '/auth/backup-codes/status'
        )
        return res.data
    }

    async generateBackupCodes(password: string): Promise<{ backupCodes: string[]; generatedAt: string }> {
        const res = await api.post<{ backupCodes: string[]; generatedAt: string }>('/auth/backup-codes', { password })
        return res.data
    }

    async resetPasswordWithBackupCode(
        email: string,
        backupCode: string,
        newPassword: string
    ): Promise<{ newBackupCode: string }> {
        const res = await api.post<{ message: string; newBackupCode: string }>('/auth/reset-password', {
            email,
            backupCode,
            newPassword,
        })
        return { newBackupCode: res.data.newBackupCode }
    }
}

export const authService = new AuthService()

// ─── Settings sync service ────────────────────────────────────────────────────

class SettingsSyncService {
    async getRemoteSettings(): Promise<RemoteSettings> {
        const res = await api.get<RemoteSettings>('/settings')
        return res.data
    }

    async updateRemoteSettings(data: Partial<AppSettings>): Promise<RemoteSettings> {
        const res = await api.put<RemoteSettings>('/settings', { data })
        return res.data
    }
}

export const settingsSyncService = new SettingsSyncService()