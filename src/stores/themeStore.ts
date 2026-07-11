import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '@/types'

interface ThemeState {
    theme: Theme
    resolvedTheme: 'light' | 'dark'
}

interface ThemeActions {
    setTheme: (theme: Theme) => void
    setResolvedTheme: (resolved: 'light' | 'dark') => void
}

type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            theme: 'dark',
            resolvedTheme: 'dark',

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
        }),
        {
            name: 'bindery:theme',
            version: 1,
        }
    )
)