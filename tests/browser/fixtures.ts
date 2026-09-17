import { test as base, expect } from '@playwright/test'

/** Browser QA is offline unless a test explicitly mocks the provider contract. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: false } }))
    await page.route(/\/api\/(magic|chat|background|fancy)$/, (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'Live generation is disabled during automated QA.' },
      }),
    )
    await use(page)
  },
})
export { expect }
export type { Page } from '@playwright/test'
