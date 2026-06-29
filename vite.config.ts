import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['tesseract.js'] },
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