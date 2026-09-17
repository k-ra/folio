import { test, expect } from './fixtures'

for (const width of [1440, 1024, 768, 390]) {
  test(`library papers keep their proportions and crop long excerpts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.library-story').filter({ hasText: 'A small field guide' })).toHaveCount(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    ).toBeGreaterThanOrEqual(810)
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.9))
    const papers = page.locator('.library-paper')
    await expect(papers.first()).toBeVisible()
    await expect(page.locator('.library-story').first()).toHaveCSS('opacity', '1')
    const sizes = await papers.evaluateAll((els) =>
      els.map((el) => {
        const { width, height, left, right } = el.getBoundingClientRect()
        return { width, height, left, right, overflow: getComputedStyle(el).overflow }
      }),
    )
    for (const paper of sizes) {
      expect(Math.abs(paper.height / paper.width - 4 / 3)).toBeLessThan(0.01)
      expect(paper.left).toBeGreaterThanOrEqual(0)
      expect(paper.right).toBeLessThanOrEqual(width)
      expect(paper.overflow).toBe('hidden')
    }
    expect(Math.max(...sizes.map((p) => p.height)) - Math.min(...sizes.map((p) => p.height))).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: `test-results/library-paper-${width}.png` })
    const tile = page.locator('.library-story').filter({ hasText: 'A small field guide' })
    await tile.click()
    await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('A small field guide')
    await expect(page.getByTestId('story-opening')).toHaveCount(0)
  })
}
