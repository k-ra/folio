import { test, expect } from './fixtures'

test('capture the clean homepage and studio for the README', async ({ page }) => {
  test.skip(process.env.FOLIO_README_SHOTS !== '1', 'Regenerate checked-in screenshots deliberately.')
  await page.setViewportSize({ width: 1440, height: 1080 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/magic/status', (route) =>
    route.fulfill({ json: { configured: false, byok: true } }),
  )
  await page.goto('/')
  await expect(
    page
      .getByRole('button', {
        name: 'Open Listening before translating',
        exact: true,
      })
      .first(),
  ).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: 'docs/images/homepage.png',
    animations: 'disabled',
  })
  await page
    .getByRole('button', {
      name: 'Open Listening before translating',
      exact: true,
    })
    .first()
    .click()
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
  await expect(page.getByTestId('story-opening')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.setViewportSize({ width: 1440, height: 1680 })
  await expect
    .poll(() =>
      page
        .locator('.essay-content textarea')
        .first()
        .evaluate((el) => el.getBoundingClientRect().y),
    )
    .toBeLessThan(300)
  await page.screenshot({ path: 'docs/images/studio.png' })
})
