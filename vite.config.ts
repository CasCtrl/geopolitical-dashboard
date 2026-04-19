import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@data': path.resolve(__dirname, './src/app/data'),
      '@imports': path.resolve(__dirname, './src/app/imports'),
      '@styles': path.resolve(__dirname, './src/app/styles'),
    },
  },
  server: {
    port: 3000,
    open: true,
    middlewareMode: false,
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    manifest: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('/@radix-ui/') ||
            id.includes('/@mui/') ||
            id.includes('/@emotion/') ||
            id.includes('/lucide-react/')
          ) {
            return 'ui-vendor';
          }

          if (
            id.includes('/recharts/') ||
            id.includes('/d3-geo/') ||
            id.includes('/topojson-client/')
          ) {
            return 'charts-vendor';
          }

          if (id.includes('/jspdf/')) {
            return 'pdf-vendor';
          }

          if (id.includes('/xlsx/')) {
            return 'xlsx-vendor';
          }

          if (id.includes('/html2canvas/')) {
            return 'capture-vendor';
          }

          if (
            id.includes('/date-fns/') ||
            id.includes('/zod/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'utils-vendor';
          }

          if (id.includes('/motion/')) {
            return 'motion-vendor';
          }

          if (id.includes('/react-router/')) {
            return 'router-vendor';
          }

          if (id.includes('/sonner/')) {
            return 'toast-vendor';
          }

          return 'misc-vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router'],
  },
})
