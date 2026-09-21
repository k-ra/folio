import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readerBundle } from './server/readerBundle'
export default defineConfig({
  plugins: [react(), readerBundle()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
})
