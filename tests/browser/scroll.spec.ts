import { test, expect } from './fixtures'

for (const width of [1440, 390])
  test(`scrolling stays put around focused long writing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?demo=magic')
    const paragraph = page.locator('[data-block-id] textarea.prose-input').first()
    const text = Array.from(
      { length: 80 },
      (_, i) => `Line ${i}: A long piece of writing, with room to scroll and read.`,
    ).join('\n')
    await paragraph.fill(text)
    await paragraph.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0))
    await page.evaluate(() => window.scrollTo(0, 1800))
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(1800)
    await page.mouse.move(width / 2, 450)
    // Hover expiry and background save renders must not move the reader either.
    await page.waitForTimeout(2100)
    await expect(page.locator('.essay-status')).toContainText('SAVED LOCALLY')
    expect(await page.evaluate(() => scrollY)).toBe(1800)
    for (const delta of [180, 180, -180, -180]) {
      const before = await page.evaluate(() => scrollY)
      await page.mouse.wheel(0, delta)
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before + delta)
      await page.mouse.move(width / 2 + 5, 455)
      await page.waitForTimeout(100)
      expect(await page.evaluate(() => scrollY)).toBe(before + delta)
    }
    await expect(paragraph).toHaveValue(text)
    await page.screenshot({ path: test.info().outputPath(`scroll-${width}.png`) })
  })

test('autosizing still grows, shrinks and responds to wrapping without clipping', async ({ page }) => {
  await page.goto('/?qa=essay')
  const paragraph = page.locator('[data-block-id] textarea.prose-input').first()
  await paragraph.fill('Short.')
  const short = (await paragraph.boundingBox())!.height
  await paragraph.fill('Words that should wrap naturally in the writing column. '.repeat(30))
  const wide = (await paragraph.boundingBox())!.height
  expect(wide).toBeGreaterThan(short)
  await page.setViewportSize({ width: 390, height: 900 })
  await expect.poll(async () => (await paragraph.boundingBox())!.height).toBeGreaterThan(wide)
  const clipped = await paragraph.evaluate((el) => el.scrollHeight - el.clientHeight)
  expect(clipped).toBeLessThanOrEqual(1)
  await paragraph.fill('Short again.')
  await expect.poll(async () => (await paragraph.boundingBox())!.height).toBe(short)
  await paragraph.press('ControlOrMeta+b')
  await expect(page.locator('[data-block-id] .rich-input').first()).toBeFocused()
  // Promoting a field to rich editing cleans up its measurement node.
  await expect(page.locator('body > textarea[aria-hidden="true"]')).toHaveCount(
    await page.locator('textarea[data-folio-input]').count(),
  )
})
