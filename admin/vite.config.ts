import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production on Railway is served from the API at /admin/
const base = process.env.VITE_ADMIN_BASE || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
})
