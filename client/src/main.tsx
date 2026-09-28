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


// Disable browser context menu globally except for interactive elements (inputs, textareas, links)
// document.addEventListener('contextmenu', (e) => {
//   if (
//     e.target instanceof Element &&
//     e.target.closest('input, textarea, [contenteditable="true"], a')
//   ) {
//     return
//   }
//   e.preventDefault()
// })

// Forces the browser to re-apply the body's cursor by toggling it for one
// frame. Clearing the inline value hands control back to the stylesheet, so
// deleting the --cursor-app block in index.css still restores the default.
const refreshCursor = () => {
  document.body.style.cursor = 'none'
  void document.body.offsetHeight // force the browser to apply it
  document.body.style.cursor = ''
}

// Chromium/Firefox sometimes fail to show a custom `cursor: url(...)` on the
// very first paint if the image hasn't finished decoding yet, and don't retry
// once it has -- leaving the default arrow until a full reload. Reads
// --cursor-app instead of hardcoding it, so it stays in sync with index.css
// (and does nothing if that variable is ever removed).
const cursorUrl = getComputedStyle(document.documentElement)
  .getPropertyValue('--cursor-app')
  .match(/url\((['"]?)(.*?)\1\)/)?.[2]
if (cursorUrl) {
  const preload = new Image()
  preload.onload = refreshCursor
  preload.src = cursorUrl

  // After a native OS dialog (the Import Images file picker) closes, the
  // browser can keep showing the default arrow until something forces a
  // style recalculation. Refresh on window focus, and once more on the first
  // pointer movement afterwards, since focus can fire before the dialog has
  // fully released the pointer.
  window.addEventListener('focus', () => {
    refreshCursor()
    window.addEventListener('pointermove', refreshCursor, { once: true })
  })
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