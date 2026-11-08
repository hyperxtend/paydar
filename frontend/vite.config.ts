import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep big, rarely-changing libraries in their own long-cached chunks
        // (MUI depends on vendor, never the reverse, so the chunks can't import each other in a cycle)
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Dynamically imported websocket libs keep their own lazy chunks
          if (/node_modules[\\/](@stomp|sockjs-client)[\\/]/.test(id)) return
          if (/node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) return 'mui'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
