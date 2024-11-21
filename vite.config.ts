import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['fs', 'path', 'util', 'stream', 'os', 'buffer'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      fs: 'node-stdlib-browser/mock/empty',
      path: 'node-stdlib-browser/mock/empty',
      stream: 'node-stdlib-browser/mock/empty',
    },
  },
  optimizeDeps: {
    exclude: ['puppeteer', 'pdf-parse']
  },
  build: {
    rollupOptions: {
      external: ['puppeteer', 'pdf-parse']
    }
  }
})
