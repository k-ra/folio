import { test, expect, type Page } from './fixtures'

async function expectBleed(page: Page, id: string) {
  const block = page.getByTestId(`magic-${id}`)
  await expect
    .poll(() =>
      block.evaluate((el) => {
        // Read all geometry in one layout frame, including while a panel resizes the sheet.
        const visual = el.querySelector('.magic-surface')!.getBoundingClientRect()
        const note = el.querySelector('[aria-label="Edit instruction"]')?.getBoundingClientRect()
        const title = document.querySelector('.essay-title')!.getBoundingClientRect()
        const prose = document.querySelector('[data-block-id="whales-listening"]')!.getBoundingClientRect()
        const sheet = document.querySelector('.essay-sheet')!.getBoundingClientRect()
        return Math.max(
          Math.abs(sheet.x - visual.x),
          Math.abs(sheet.width - visual.width),
          note ? Math.max(0, visual.bottom - note.top) : 0,
          Math.abs(title.x - prose.x),
          Math.abs(title.width - prose.width),
          Math.abs(title.x + title.width / 2 - sheet.x - sheet.width / 2),
        )
      }),
    )
    .toBeLessThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

for (const width of [1440, 1280, 390, 320]) {
  test(`full bleed follows the sheet and preserves the column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay')
    const block = page.getByTestId('magic-whales-abundance')
    await block.getByLabel('Artifact settings', { exact: true }).click()
    await block.getByRole('button', { name: 'Full bleed', exact: true }).click()
    await expect(block.getByRole('button', { name: 'Full bleed', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await block.getByLabel('Artifact settings', { exact: true }).click()
    await expectBleed(page, 'whales-abundance')
    await expect(block.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
    await expect(block.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
    await block.locator('.magic-surface').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/full-bleed-${width}.png` })

    await block.getByRole('button', { name: 'Open in chat', exact: true }).click()
    await expectBleed(page, 'whales-abundance')
    await page.getByRole('button', { name: 'Close chat panel', exact: true }).click()
    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    const style = page.getByRole('region', { name: 'Style panel', exact: true })
    await style.getByRole('button', { name: 'Background', exact: true }).click()
    await style.getByRole('button', { name: 'Floating sheet', exact: true }).click()
    await style.getByRole('button', { name: 'Apply', exact: true }).click()
    await style.getByRole('button', { name: 'Close style', exact: true }).click()
    await expectBleed(page, 'whales-abundance')
    await block.locator('.magic-surface').scrollIntoViewIfNeeded()
    if (width === 1440) await page.screenshot({ path: 'test-results/full-bleed-floating.png' })

    await block.getByLabel('Artifact settings', { exact: true }).click()
    await block.getByRole('button', { name: 'Column', exact: true }).click()
    const visual = (await block.locator('.magic-surface').boundingBox())!
    const title = (await page.locator('.essay-title').boundingBox())!
    expect(Math.abs(visual.x - title.x)).toBeLessThan(1)
    expect(Math.abs(visual.width - title.width)).toBeLessThan(1)
    await block.getByText('Versions', { exact: true }).click()
    await expect(block.locator('.artifact-version')).toContainText('VERSION 1 / 1')
  })
}

test('a full-bleed prompt stays in the column; loading and interactive output expand without losing controls', async ({
  page,
}) => {
  let finish!: () => void
  let request: { layout?: string } | undefined
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', async (route) => {
    request = route.request().postDataJSON()
    await gate
    await route.fulfill({
      json: {
        kind: 'html',
        caption: 'An expansive little world',
        html: '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#20383d;color:#fff}button{font:20px sans-serif;color:inherit;background:none;border:0}</style><button onclick="this.textContent=\'Orbit paused\'">Pause orbit</button>',
      },
    })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Full bleed', exact: true }).click()
  await block.getByLabel('Prompt settings', { exact: true }).click()
  const title = (await page.locator('.essay-title').boundingBox())!
  expect((await block.locator('.magic-surface').boundingBox())!.width).toBe(title.width)
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(block.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
  await expectBleed(page, 'whales-rhythm')
  await expect.poll(() => request?.layout).toBe('full-bleed')
  finish()
  const frame = block.locator('iframe')
  await expect(frame).toBeVisible()
  await expectBleed(page, 'whales-rhythm')
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(frame).toHaveCSS('height', '720px')
  await frame.contentFrame().getByRole('button', { name: 'Pause orbit' }).click()
  await expect(frame.contentFrame().getByRole('button', { name: 'Orbit paused' })).toBeVisible()
  await block.locator('.magic-surface').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/full-bleed-interactive-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expectBleed(page, 'whales-rhythm')
  await expect(frame).toHaveCSS('height', '330px')
  await block.locator('.magic-surface').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/full-bleed-interactive-mobile.png' })
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Column', exact: true }).click()
  // Resizing, unlike regeneration, does not remount/reset the interactive document.
  await expect(frame.contentFrame().getByRole('button', { name: 'Orbit paused' })).toBeVisible()
})

test('full-bleed images retain their aspect ratio and use the sheet width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByRole('button', { name: 'Image', exact: true }).click()
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Full bleed', exact: true }).click()
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(block.locator('.artifact-image')).toBeVisible()
  await expectBleed(page, 'whales-rhythm')
  const image = (await block.locator('.artifact-image').boundingBox())!
  expect(image.width).toBeGreaterThan(1400)
  expect(image.width / image.height).toBeCloseTo(900 / 560, 2)
})

test('layout persists on the ordinary saved story after reloading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?demo=magic')
  const block = page.getByTestId('magic-whales-abundance')
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Full bleed', exact: true }).click()
  await expect(page.locator('.essay-header')).toContainText('WORDS · SAVED')
  await page.reload()
  await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
  await expect(block).toHaveAttribute('data-layout', 'full-bleed')
  await expectBleed(page, 'whales-abundance')
})
