import { test, expect } from './fixtures'

const references = [
  'Cobalt atlas',
  'Garden press',
  'Coastal halftone',
  'Mist print',
  'Spring contours',
  'Signal city',
  'Water ink',
  'Citrus sketch',
]

for (const width of [1440, 390, 320]) {
  test(`image reference pills select, preview, reset and send their direction at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const requests: {
      instruction: string
      style: { imageDirection: string; imageStyle: string }
      attachments: unknown[]
    }[] = []
    await page.route('**/api/magic/status', (route) =>
      route.fulfill({ json: { configured: true, images: true } }),
    )
    await page.route('**/api/magic', (route) => {
      requests.push(route.request().postDataJSON())
      return route.fulfill({
        json: {
          kind: 'image',
          caption: 'Image recipe result',
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
        },
      })
    })
    await page.goto('/?qa=essay')
    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    const panel = page.getByRole('region', {
      name: 'Style panel',
      exact: true,
    })
    await panel.getByRole('button', { name: 'Images', exact: true }).click()
    const choices = panel.getByRole('group', { name: 'Image styles' })
    await expect(choices.locator('img')).toHaveCount(references.length)
    for (const name of ['Paper miniature', 'Torn paper', 'Electric grain', 'Summer coast']) {
      await expect(choices.getByRole('button', { name, exact: true })).toHaveCount(0)
    }
    for (const name of references) {
      const pill = choices.getByRole('button', { name, exact: true })
      await pill.scrollIntoViewIfNeeded()
      await expect
        .poll(() =>
          pill.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
        )
        .toBe(true)
      await pill.focus()
      await pill.press('Enter')
      await expect(pill).toHaveAttribute('aria-pressed', 'true')
      await expect(choices.locator('[aria-pressed="true"]')).toHaveCount(1)
      const bounds = (await pill.boundingBox())!
      expect(bounds.height).toBeGreaterThanOrEqual(44)
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    }
    await panel.getByRole('button', { name: 'Garden press', exact: true }).click()
    const direction = await panel.getByLabel('Image direction', { exact: true }).inputValue()
    await panel.screenshot({
      path: `test-results/image-style-pills-${width}.png`,
    })
    await panel.getByRole('button', { name: 'Back to Style', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Images', exact: true })).toContainText('Garden press')
    await expect(panel.getByAltText('Garden press style reference')).toBeVisible()
    await panel.getByRole('button', { name: 'Apply', exact: true }).click()
    await panel.getByRole('button', { name: 'Images', exact: true }).click()
    await panel.getByRole('button', { name: 'Cobalt atlas', exact: true }).click()
    await panel.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Garden press', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await panel.getByRole('button', { name: 'Mist print', exact: true }).click()
    await panel.getByRole('button', { name: 'Close style', exact: true }).click()
    await page.getByRole('button', { name: 'Open style', exact: true }).click()
    await panel.getByRole('button', { name: 'Images', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Garden press', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await panel.getByRole('button', { name: 'Close style', exact: true }).click()
    const block = page.getByTestId('magic-whales-rhythm')
    await block.getByRole('button', { name: 'Image', exact: true }).click()
    await block.getByLabel('Magic prompt', { exact: true }).fill('An octopus, no words')
    expect(requests).toHaveLength(0)
    await block.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(block.getByRole('img', { name: 'Image recipe result', exact: true })).toBeVisible()
    expect(requests).toHaveLength(1)
    expect(requests[0].style.imageDirection).toBe(direction)
    expect(requests[0].attachments).toEqual([])
    await expect(block.locator('.artifact-image')).toHaveCSS('filter', 'none')
  })
}

test('a saved image recipe persists while a custom direction is not mislabeled as the preset', async ({
  page,
}) => {
  await page.goto('/?demo=magic')
  await page.getByRole('button', { name: 'Open style', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Style panel', exact: true })
  await panel.getByRole('button', { name: 'Images', exact: true }).click()
  await panel.getByRole('button', { name: 'Cobalt atlas', exact: true }).click()
  await panel.getByRole('button', { name: 'Apply', exact: true }).click()
  await panel.getByRole('button', { name: 'Close style', exact: true }).click()
  await expect(page.locator('.essay-header')).toContainText('WORDS · SAVED')
  await page.reload()
  await page
    .getByRole('button', {
      name: 'Open Listening before translating',
      exact: true,
    })
    .first()
    .click()
  await page.getByRole('button', { name: 'Open style', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Images', exact: true })).toContainText('Cobalt atlas')
  await panel.getByRole('button', { name: 'Images', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Cobalt atlas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await panel.getByLabel('Image direction', { exact: true }).fill('A softer blue with much less stippling')
  await expect(
    panel.getByRole('group', { name: 'Image styles' }).locator('[aria-pressed="true"]'),
  ).toHaveCount(0)
  await panel.getByRole('button', { name: 'Back to Style', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Images', exact: true })).toContainText('Custom natural')
})
