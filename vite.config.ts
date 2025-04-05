import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Explicitly use relative paths for GitHub Pages
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  server: {
    host: '0.0.0.0',
    hmr: false,
    watch: {
      usePolling: true,
    },
    // Automatically open browser
    open: true,
    proxy: {
      '/query': {
        target: 'https://aaup-assistant-api.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    cors: true
  },
  // Optimize deps
  optimizeDeps: {
    include: ['zustand', 'uuid']
  }
})
