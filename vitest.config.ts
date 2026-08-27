import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    // happy-dom нужен только ради localStorage и window-событий:
    // компонентных тестов в проекте нет.
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    restoreMocks: true,
  },
})
