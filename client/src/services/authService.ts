import axios from 'axios'
import { API_BASE_URL } from '@/constants'
import type { AppSettings } from '@/types'

// ─── Client ───────────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // sends/receives the httpOnly auth cookie
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string
    email: string
    username: string
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

    async me(): Promise<AuthUser> {
        const res = await api.get<AuthUser>('/auth/me')
        return res.data
    }

    async updateProfile(updates: { username?: string; email?: string }): Promise<AuthUser> {
        const res = await api.patch<AuthUser>('/auth/profile', updates)
        return res.data
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.put('/auth/password', { currentPassword, newPassword })
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