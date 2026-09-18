import { test, expect } from './fixtures'

for (const width of [1440, 390]) {
  test(`Style categories replace the whole panel at ${width}px, preserving drafts and keyboard focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?qa=essay')
    await page.getByRole('button', { name: 'Open style' }).click()
    const panel = page.getByRole('region', { name: 'Style panel', exact: true })
    for (const name of ['Text', 'Color', 'Images', 'Graphics', 'Data', 'Background']) {
      const category = panel.getByRole('button', { name, exact: true })
      await expect(category).toHaveCSS('border-bottom-width', '0px')
      await category.click()
      await expect(panel.getByRole('heading', { name, exact: true })).toBeFocused()
      await expect(panel.locator('.style-categories, .theme-entry, .style-preview')).toHaveCount(0)
      if (name === 'Images') {
        await expect(panel.getByRole('group', { name: 'Image styles' }).getByRole('button')).toHaveCount(14)
        await panel.getByRole('button', { name: 'Etching', exact: true }).click()
        await panel.getByLabel('Image model', { exact: true }).selectOption('gpt-image-2.5-flare')
        await panel.screenshot({ path: `test-results/images-panel-${width}.png` })
      }
      await panel.getByRole('button', { name: 'Back to Style' }).click()
      await expect(category).toBeFocused()
      if (name === 'Images') await expect(category).toContainText('Etching')
    }
    await expect(panel.locator('.theme-entry')).toHaveCSS('border-bottom-width', '1px')
    await panel.getByRole('button', { name: 'Images', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Etching', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(panel.getByLabel('Image model')).toHaveValue('gpt-image-2.5-flare')
    await panel.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(panel.getByLabel('Image model')).toHaveValue('default')
    await expect(panel.getByLabel('Image direction')).toHaveValue('')
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await panel.getByRole('button', { name: 'Close style' }).click()
    await expect(page.getByRole('button', { name: 'Reset playground' })).toBeVisible()
  })
}

test('image model and style persist; navigation makes no generation calls, and Create sends the selected model', async ({
  page,
}) => {
  const requests: {
    style: { imageModel: string; imageStyle: string }
    imageBackground?: string
    previous?: { kind: string }
  }[] = []
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', (route) => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        kind: 'image',
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
        caption: 'Model selection test',
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'New Story' }).click()
  await page.getByPlaceholder('Untitled', { exact: true }).fill('Image model study')
  await page.getByRole('button', { name: 'Open style' }).click()
  const panel = page.getByRole('region', { name: 'Style panel', exact: true })
  await panel.getByRole('button', { name: 'Images', exact: true }).click()
  await panel.getByRole('button', { name: 'Grain', exact: true }).click()
  await panel.getByLabel('Image model').selectOption('gpt-image-2.5-flare')
  await panel.getByRole('button', { name: 'Back to Style' }).click()
  await panel.locator('.theme-entry').click()
  await panel.locator('.preset-card').filter({ hasText: 'Blueprint' }).click()
  await panel.getByRole('button', { name: 'Back to Style' }).click()
  await panel.getByRole('button', { name: 'Images', exact: true }).click()
  await expect(panel.getByLabel('Image model')).toHaveValue('gpt-image-2.5-flare')
  await panel.getByRole('button', { name: 'Grain', exact: true }).click()
  await panel.getByRole('button', { name: 'Apply', exact: true }).click()
  await panel.getByRole('button', { name: 'Close style' }).click()
  await expect(page.getByText(/WORDS · SAVED/)).toBeVisible()
  await page.reload()
  await page.getByText('Image model study', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Open style' }).click()
  await panel.getByRole('button', { name: 'Images', exact: true }).click()
  await expect(panel.getByLabel('Image model')).toHaveValue('gpt-image-2.5-flare')
  await expect(panel.getByRole('button', { name: 'Grain', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // Closing without Apply revokes subsequent configuration edits.
  await panel.getByLabel('Image model').selectOption('gpt-image-2.5-sunburst')
  await panel.getByRole('button', { name: 'Close style' }).click()
  await page.getByPlaceholder('Begin.', { exact: true }).click()
  await page.getByTitle('Add a block: magic, upload, padding or fancy text').click()
  await page.getByRole('button', { name: '✳ magic', exact: true }).click()
  await page.getByRole('button', { name: 'Image', exact: true }).click()
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByLabel('Generation provider').selectOption('live')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByLabel('Magic prompt', { exact: true }).fill('An image study')
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Model selection test', exact: true })).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(requests[0].style.imageModel).toBe('gpt-image-2.5-flare')
  expect(requests[0].style.imageStyle).toBe('grain')
  await page.getByLabel('Artifact settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Remove background', exact: true }).click()
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[1].imageBackground).toBe('transparent')
  expect(requests[1].previous?.kind).toBe('image')
  await page.getByText('Versions', { exact: true }).click()
  await expect(page.locator('.artifact-version')).toContainText('VERSION 2 / 2')
  await page.getByRole('button', { name: 'Undo edit', exact: true }).click()
  await expect(page.locator('.artifact-version')).toContainText('VERSION 1 / 2')
})
