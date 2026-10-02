import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works from any path (GitHub Pages, subfolder, file host).
export default defineConfig({
  base: './',
  plugins: [react()],
})
