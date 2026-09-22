import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for OmniDrive AI SPA
// Explicitly reloaded for Tailwind class-based dark mode
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    host: true,
    port: 3000,
    open: false,
    proxy: {
      '/nvidia-api': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
        secure: true,
      },
    },
  },
})
