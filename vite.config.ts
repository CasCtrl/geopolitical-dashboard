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

          if (
            id.includes('/jspdf/') ||
            id.includes('/html2canvas/') ||
            id.includes('/xlsx/')
          ) {
            return 'export-vendor';
          }

          if (
            id.includes('/date-fns/') ||
            id.includes('/zod/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'utils-vendor';
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
