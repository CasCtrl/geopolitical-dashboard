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
  },
})
