import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

export function useTheme() {
    const { theme, resolvedTheme, setResolvedTheme } = useThemeStore()

    // Resolve system preference
    useEffect(() => {
        if (theme !== 'system') { setResolvedTheme(theme); return }
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        setResolvedTheme(mq.matches ? 'dark' : 'light')
        const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme, setResolvedTheme])

    // Apply theme class — block all transitions during swap so nothing "slides" between colors
    useEffect(() => {
        const html = document.documentElement

        // 1. Block all transitions immediately
        html.classList.add('theme-switching')

        // 2. Swap theme class
        html.classList.remove('theme-light', 'theme-dark')
        html.classList.add(`theme-${resolvedTheme}`)

        // 3. Force a reflow so the browser applies the new CSS variables before
        //    we re-enable transitions — this is the key step
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        html.offsetHeight

        // 4. Re-enable transitions on the next animation frame
        requestAnimationFrame(() => {
            html.classList.remove('theme-switching')
        })
    }, [resolvedTheme])

    return {
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        isLight: resolvedTheme === 'light',
    }
}
