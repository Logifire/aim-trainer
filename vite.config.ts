import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/aim-trainer/',
  plugins: [react()],
  server: {
    host: true,
  },
})
