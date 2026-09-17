import { test, expect } from './fixtures'

for (const width of [1440, 1100, 900, 390]) {
  test(`artifact instructions use the available margin at ${width}px, including with chat open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay')
    const prompt = page.getByTestId('magic-whales-rhythm').locator('.magic-surface')
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(prompt).toHaveCSS(`border-${side}-width`, '1px')
      await expect(prompt).not.toHaveCSS(`border-${side}-color`, 'rgba(0, 0, 0, 0)')
    }
    await expect(prompt).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(prompt.locator('.magic-composer-footer')).toHaveCSS('border-top-width', '0px')
    if (width === 1440) await prompt.screenshot({ path: 'test-results/prompt-outline.png' })
    const block = page.getByTestId('magic-whales-abundance')
    await block.scrollIntoViewIfNeeded()
    for (const chatOpen of [false, true]) {
      if (chatOpen) await block.getByRole('button', { name: 'Open in chat', exact: true }).click()
      const surface = await block.locator('.magic-surface').boundingBox()
      const margin = await block.getByRole('complementary', { name: 'Artifact edit instructions' }).boundingBox()
      const sheet = await page.locator('.essay-sheet').boundingBox()
      if (sheet!.width > 991) {
        expect(margin!.x).toBeGreaterThan(surface!.x + surface!.width)
        expect(Math.abs(margin!.y - surface!.y)).toBeLessThan(2)
      } else {
        expect(margin!.y).toBeGreaterThan(surface!.y + surface!.height)
        expect(margin!.x).toBeGreaterThanOrEqual(surface!.x)
        expect(margin!.x + margin!.width).toBeLessThanOrEqual(surface!.x + surface!.width + 1)
      }
      expect(margin!.x + margin!.width).toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
    await page.getByRole('button', { name: 'Close chat panel' }).click()
    await expect(page.locator('.panel-slot')).toHaveCSS('width', '0px')
    await expect(block.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
    await expect(block.locator('.artifact-version')).not.toBeVisible()
    await expect(block.locator('.magic-meta')).toHaveCount(0)
    await expect(page.getByText('A LITTLE MAGIC', { exact: true })).toHaveCount(0)
    await expect(page.getByText('IN THE MARGIN', { exact: true })).toHaveCount(0)
    expect(await page.locator('body').innerText()).not.toMatch(/[↗↙↖↘]/)
    await page.screenshot({ path: `test-results/margin-layout-${width}.png` })
  })
}
