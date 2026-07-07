import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Configuration Vite pour l'application Vue.js 3 (100% frontend, pas de backend)
export default defineConfig({
  base: '/MesProjets/educatbot-src/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) {
            return 'vue-vendor'
          }
          if (id.includes('node_modules/chart.js')) {
            return 'chart-vendor'
          }
          if (id.includes('node_modules/markdown-it') || id.includes('node_modules/highlight.js')) {
            return 'markdown-vendor'
          }
        }
      }
    }
  }
})
