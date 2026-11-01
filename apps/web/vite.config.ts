import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Le .env est à la racine du monorepo (voir .env.example), pas dans apps/web.
  envDir: '../..',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
