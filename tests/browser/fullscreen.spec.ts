import { test, expect } from './fixtures'

for (const width of [1440, 390, 320]) {
  test(`fullscreen uses the existing top-right utilities at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const enter = page.getByRole('button', { name: 'Fullscreen', exact: true })
    await expect(enter).toBeVisible()
    const box = (await enter.boundingBox())!
    expect(box.x).toBeGreaterThan(width / 2)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.y).toBeLessThan(80)
    await enter.click()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true)
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
    await page.goto('/?qa=essay')
    const title = page.getByPlaceholder('Untitled', { exact: true })
    await title.fill('Fullscreen keeps my writing')
    await enter.click()
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toHaveAttribute('aria-pressed', 'true')
    // Browser-initiated exit (also what Escape causes) must update the control.
    await page.evaluate(() => document.exitFullscreen())
    await expect(enter).toHaveAttribute('aria-pressed', 'false')
    await expect(title).toHaveValue('Fullscreen keeps my writing')
    await page.screenshot({ path: `test-results/fullscreen-header-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

test('fullscreen rejection leaves the story usable and explains the browser limitation', async ({ page }) => {
  await page.goto('/?qa=essay')
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = async () => { throw new Error('Denied') }
  })
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Fullscreen is unavailable')
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toBeEditable()
})
