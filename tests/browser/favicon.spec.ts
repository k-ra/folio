import { test, expect } from './fixtures'

test('Folio has a self-contained, scalable typographic page icon', async ({ page }) => {
  await page.goto('/')
  const icon = page.locator('link[rel="icon"]')
  await expect(icon).toHaveAttribute('type', 'image/svg+xml')
  const href = await icon.evaluate((el: HTMLLinkElement) => el.href)
  await page.setContent(`<body style="margin:32px;background:#d6d3ce;display:flex;align-items:center;gap:24px">
    ${[16, 32, 64, 256].map((size) => `<img alt="Folio ${size}" width="${size}" height="${size}" src="${href}">`).join('')}
  </body>`)
  await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((el) => (el as HTMLImageElement).naturalWidth > 0))).toBe(true)
  await page.screenshot({ path: 'test-results/folio-icon.png' })
})
