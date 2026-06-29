import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, AccentColor } from '@/types'

interface ThemeState {
    theme: Theme
    resolvedTheme: 'light' | 'dark'
    accentColor: AccentColor
    customAccentColor: string
}

interface ThemeActions {
    setTheme: (theme: Theme) => void
    setResolvedTheme: (resolved: 'light' | 'dark') => void
    setAccentColor: (color: AccentColor) => void
    setCustomAccentColor: (hex: string) => void
}

type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            theme: 'dark',
            resolvedTheme: 'dark',
            accentColor: 'blue',
            customAccentColor: '#6366f1',

            setTheme: (theme) => {
                // Immediately resolve non-system themes so there's zero async gap
                const resolved =
                    theme === 'system'
                        ? window.matchMedia('(prefers-color-scheme: dark)').matches
                            ? 'dark'
                            : 'light'
                        : theme
                set({ theme, resolvedTheme: resolved })
            },

            setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
            setAccentColor: (accentColor) => set({ accentColor }),
            setCustomAccentColor: (customAccentColor) => set({ customAccentColor }),
        }),
        {
            name: 'bindery:theme',
            version: 1,
        }
    )
)
