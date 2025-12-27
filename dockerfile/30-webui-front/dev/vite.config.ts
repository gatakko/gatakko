import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        secure: false
      }
    }
  },
  plugins: [preact()]
})
