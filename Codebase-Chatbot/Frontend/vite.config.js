import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            // Suppress proxy error logs - errors are handled by axios interceptors
            // This prevents noisy console output when backend isn't running
          });
        },
      },
    },
  },
  alias: {
      '@': path.resolve(__dirname, 'src'),
    },
})

