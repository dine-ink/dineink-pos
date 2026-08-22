import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor code into its own cacheable chunks, separate
        // from app code that changes every deploy — pure build config, no
        // runtime/UI behavior difference.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-redux') || id.includes('redux-persist') || id.includes('@reduxjs')) {
            return 'vendor-redux'
          }
          if (id.includes('react-router')) return 'vendor-router'
          if (/[\\/]react[\\/]|[\\/]react-dom[\\/]|[\\/]scheduler[\\/]/.test(id)) return 'vendor-react'
          if (id.includes('radix-ui') || id.includes('@headlessui')) return 'vendor-ui'
          return 'vendor'
        },
      },
    },
  },
})