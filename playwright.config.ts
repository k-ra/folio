import { defineConfig } from '@playwright/test'
const preview = process.env.FOLIO_QA_PREVIEW === '1'
const baseURL = preview ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173'
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: preview
      ? 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort'
      : 'npm run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !preview && !process.env.CI,
  },
  reporter: 'list',
})
