import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { App } from './App'
import '@/stores/storeLinks'
// @ts-ignore
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

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
