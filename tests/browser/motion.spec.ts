import { test, expect } from './fixtures'

test('Weave spans the block and visibly traces its paths', async ({ page }) => {
  // Hold the response so the drawing can be inspected independent of backend speed.
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', () => {})
  await page.goto('/?qa=essay')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByLabel('Generation provider').first().selectOption('live')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const loading = page.locator('.magic-loading.loading-weave')
  await expect(loading).toBeVisible()
  await expect
    .poll(() =>
      loading
        .locator('path')
        .nth(25)
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).strokeDashoffset)),
    )
    .toBeLessThan(0.4)
  const surface = await page.getByTestId('magic-whales-rhythm').locator('.magic-surface').boundingBox()
  const drawing = await loading.boundingBox()
  expect(Math.abs(surface!.width - drawing!.width)).toBeLessThan(3)
  await loading.screenshot({ path: 'test-results/loading-weave.png', animations: 'allow' })
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(loading).toHaveCount(0)
})
