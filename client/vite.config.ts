import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Stamps a unique build id into the deployed sw.js's CACHE_NAME. sw.js is a
// static /public asset copied verbatim by Vite, so without this its bytes
// never change between deploys — meaning the browser has nothing to diff
// and never realizes a new version shipped. Running this on closeBundle
// (after Vite writes dist/) gives every build a distinct CACHE_NAME, so the
// service worker file itself changes on every commit-triggered deploy and
// the browser's update-detection (see usePWA.ts) actually fires.
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)
        || process.env.GITHUB_SHA?.slice(0, 8)
        || process.env.COMMIT_REF?.slice(0, 8) // Netlify
        || Date.now().toString(36)
      const content = fs.readFileSync(swPath, 'utf-8').replace(/__BUILD_ID__/g, buildId)
      fs.writeFileSync(swPath, content)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  worker: { format: 'es' },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router-dom')) return 'vendor'
          if (id.includes('pdf-lib')) return 'pdf'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('dexie')) return 'db'
        },
      },
    },
  },
})