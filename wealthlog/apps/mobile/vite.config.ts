import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@wealthlog/shared': resolve(__dirname, '../../packages/shared/src'),
      '@wealthlog/ui': resolve(__dirname, '../../packages/ui/src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3001
  }
})
