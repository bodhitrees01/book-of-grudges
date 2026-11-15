import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // When deploying to GitHub Pages at https://<user>.github.io/<repo>/
  // set base to '/<repo>/'. For a custom domain or root deployment leave as '/'.
  base: process.env.VITE_BASE_PATH ?? '/book-of-grudges/',
})
