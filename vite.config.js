import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use a relative base so the app works when served
// from a subpath (avoids asset 404s like "page not found").
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: false },
})
