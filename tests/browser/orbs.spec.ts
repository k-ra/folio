import { test, expect } from './fixtures'

for (const width of [1440, 1100, 766, 390]) {
  test(`orbs start level with the body at ${width}px and remain sticky`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay')
    const title = page.getByPlaceholder('Untitled', { exact: true })
    const firstOrb = page.getByRole('button', { name: 'Open data', exact: true })
    const firstBlock = page.locator('[data-block-id]').first()
    const back = page.getByRole('button', { name: 'All stories', exact: true })
    const aligned = async () => {
      // Font loading / textarea fitting can move both rows between async reads.
      // Compare their geometry in the same layout snapshot and wait for fitting.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const body = document.querySelector('[data-block-id]')!.getBoundingClientRect()
            const tools = document.querySelector('.essay-orbs')!.getBoundingClientRect()
            return Math.abs(body.y - tools.y)
          }),
        )
        .toBeLessThan(1)
      const heading = await title.boundingBox()
      const body = await firstBlock.boundingBox()
      const orb = await firstOrb.boundingBox()
      expect(heading).not.toBeNull()
      expect(orb).not.toBeNull()
      expect(body!.y).toBeGreaterThan(heading!.y + heading!.height)
      // Read both controls in the same frame while the side panel is closing.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const circle = document.querySelector('.essay-orbs .rail-control')!.getBoundingClientRect()
            const arrow = document.querySelector('.essay-back span')!.getBoundingClientRect()
            return Math.abs(arrow.x + arrow.width / 2 - (circle.x + circle.width / 2))
          }),
        )
        .toBeLessThan(1)
      await expect(back).toHaveText('←')
    }
    await aligned()
    await title.fill('A long title that wraps across several lines on a small screen')
    await aligned()
    await title.blur()
    await page.screenshot({ path: `test-results/orbs-body-${width}.png` })
    await title.fill('')
    await aligned()
    await title.fill('Listening before translating')
    await aligned()

    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    const style = page.getByRole('region', { name: 'Style panel', exact: true })
    await style.getByRole('button', { name: 'Background', exact: true }).click()
    await style.getByRole('button', { name: 'Floating sheet', exact: true }).click()
    await style.getByRole('button', { name: 'Apply', exact: true }).click()
    await style.getByRole('button', { name: 'Close style', exact: true }).click()
    await aligned()

    await page.evaluate(() => window.scrollTo(0, 350))
    await expect
      .poll(async () => (await page.locator('.essay-orbs').boundingBox())!.y)
      .toBe(width === 390 ? 85 : 110)
    await back.focus()
    await back.press('Enter')
    await expect(page.getByRole('button', { name: 'New Story', exact: true })).toBeVisible()
  })
}

test('a new blank story begins its controls beside the first writing line', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'New Story', exact: true }).click()
  await expect(page.getByPlaceholder('Begin.', { exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const firstLine = document.querySelector('[placeholder="Begin."]')!.getBoundingClientRect()
        const orb = document.querySelector('[aria-label="Open data"]')!.getBoundingClientRect()
        return Math.abs(firstLine.y - orb.y)
      }),
    )
    .toBeLessThan(1)
})
