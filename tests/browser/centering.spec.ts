import { test, expect, type Page } from './fixtures'

async function expectCentered(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const sheet = document.querySelector('.essay-sheet')!.getBoundingClientRect()
        const writing = document.querySelector('[data-block-id="whales-listening"]')!.getBoundingClientRect()
        return Math.abs(writing.x + writing.width / 2 - (sheet.x + sheet.width / 2))
      }),
    )
    .toBeLessThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
  await expect(page.locator('textarea[data-id="whales-listening"]')).toHaveCSS('text-align', 'start')
  // The opening panel changes the sheet width. Sample the breakpoint and note
  // position together, rather than freezing an expectation from an earlier frame.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const sheet = document.querySelector('.essay-sheet')!
        const note = document.querySelector('[aria-label="Artifact edit instructions"]')!
        const narrow = parseFloat(getComputedStyle(sheet).width) <= 991
        return getComputedStyle(note).position === (narrow ? 'relative' : 'absolute')
      }),
    )
    .toBe(true)
}

for (const width of [1440, 1280, 1100, 900, 766, 600, 390, 320]) {
  test(`writing stays centered in a ${width}px workshop`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay&story=whales')
    await expectCentered(page)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const body = document.querySelector('[data-block-id]')!.getBoundingClientRect()
          const orb = document.querySelector('[aria-label="Open data"]')!.getBoundingClientRect()
          return Math.abs(body.y - orb.y)
        }),
      )
      .toBeLessThan(1)
    if ([766, 390].includes(width))
      await page.screenshot({ path: `test-results/centered-writing-${width}.png` })

    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    await expectCentered(page)
    const style = page.getByRole('region', { name: 'Style panel', exact: true })
    await style.getByRole('button', { name: 'Background', exact: true }).click()
    await style.getByRole('button', { name: 'Floating sheet', exact: true }).click()
    await style.getByRole('button', { name: 'Apply', exact: true }).click()
    await expectCentered(page)
    await style.getByRole('button', { name: 'Close style', exact: true }).click()
    await expectCentered(page)
  })
}

test('ordinary notes and their add control stay inside a narrow centered page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 })
  await page.goto('/?qa=essay&story=whales')
  await page.locator('textarea[data-id="whales-listening"]').click()
  const add = page.locator('[data-block-id="whales-listening"] .note-add')
  const control = await add.boundingBox()
  expect(control!.x + control!.width).toBeLessThanOrEqual(390)
  await add.click()
  const row = page.locator('[data-block-id="whales-listening"]')
  await row
    .getByPlaceholder('a note in the margin')
    .fill('A small thought, still connected to this paragraph.')
  const note = row.getByRole('complementary', { name: 'Margin note', exact: true })
  await expect(note).toHaveCSS('position', 'relative')
  const bounds = await note.boundingBox()
  const paragraph = await page.locator('textarea[data-id="whales-listening"]').boundingBox()
  expect(bounds!.y).toBeGreaterThan(paragraph!.y + paragraph!.height)
  await expectCentered(page)
})
