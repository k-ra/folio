import { test, expect, type Page } from './fixtures'

async function expectRail(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const nodes = [
          document.querySelector('.essay-back'),
          ...document.querySelectorAll('.essay-orbs .rail-control'),
          document.querySelector('.essay-history > button'),
        ]
        const centers = nodes.map((node) => {
          const rect = node!.getBoundingClientRect()
          return rect.x + rect.width / 2
        })
        return Math.max(...centers) - Math.min(...centers)
      }),
    )
    .toBeLessThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

for (const width of [1440, 1280, 1100, 766, 600, 390, 320]) {
  test(`back, orbs and History share the sheet rail at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay&story=whales')
    const history = page.getByRole('button', { name: 'History', exact: true })
    await expectRail(page)
    const restingY = (await history.boundingBox())!.y
    expect(restingY).toBeGreaterThan(900)
    expect(restingY).toBeLessThan(975)
    await page.evaluate(() => window.scrollTo(0, 450))
    await expectRail(page)
    await expect.poll(async () => (await history.boundingBox())!.y).toBe(restingY)
    await history.click()
    const menu = page.getByRole('region', { name: 'Story history' })
    await expect(menu).toBeVisible()
    await expect(history).toHaveAttribute('aria-expanded', 'true')
    const menuBox = (await menu.boundingBox())!
    expect(menuBox.x).toBeGreaterThanOrEqual(0)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width)
    await history.click()

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    await expectRail(page)
    const style = page.getByRole('region', { name: 'Style panel', exact: true })
    await style.getByRole('button', { name: 'Background', exact: true }).click()
    await style.getByRole('button', { name: 'Floating sheet', exact: true }).click()
    await expectRail(page)
    await style.getByRole('button', { name: 'Apply', exact: true }).click()
    await style.getByRole('button', { name: 'Close style', exact: true }).click()
    await expect(page.locator('.panel-slot')).toHaveCSS('width', '0px')
    await expectRail(page)
    await page.screenshot({ path: `test-results/shared-rail-${width}.png` })
    await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 800 })
    await expectRail(page)
  })
}
