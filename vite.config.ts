import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const apiPort = Number(env.PORT || 8787)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
      '/uploads': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
      '/sitemap.xml': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
})
