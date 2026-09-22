import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { App } from './App'
import '@/stores/storeLinks'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

// Disable the browser's right-click menu app-wide (custom menus still work)
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Chromium/Firefox sometimes fail to show a custom `cursor: url(...)` on the
// very first paint if the image hasn't finished decoding yet, and don't
// retry once it has -- leaving the browser's default arrow until a full
// page reload. Preloading the same image and forcing one style
// recalculation once it's ready fixes this without changing how the
// cursor looks. Reads --cursor-app instead of hardcoding it, so it stays
// in sync with index.css automatically (and does nothing if that variable
// is ever removed).
const cursorUrl = getComputedStyle(document.documentElement)
  .getPropertyValue('--cursor-app')
  .match(/url\((['"]?)(.*?)\1\)/)?.[2]
if (cursorUrl) {
  const preload = new Image()
  preload.onload = () => {
    document.body.style.cursor = 'none'
    void document.body.offsetHeight // force the browser to apply it
    document.body.style.cursor = ''
  }
  preload.src = cursorUrl
}

createRoot(root).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border)',
          color: 'var(--tx-1)',
          fontSize: '12.5px',
          fontFamily: 'var(--font-sans)',
          borderRadius: '10px',
          boxShadow: 'var(--sh-lg)',
        },
      }}
      richColors
    />
  </StrictMode>
)