import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Hosted on Railway under /admin/; local `vite` dev stays at /
export default defineConfig(({ command }) => {
  const base = process.env.VITE_ADMIN_BASE || (command === 'serve' ? '/' : '/admin/')

  return {
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
  }
})
