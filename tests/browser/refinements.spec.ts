import { test, expect } from './fixtures'

test('one margin action opens an existing conversation or sends an unsent edit, and chat keeps the margin current', async ({
  page,
}) => {
  const requests: {
    instruction: string
    history: string[]
    previous?: { caption: string }
  }[] = []
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', (route) => {
    const request = route.request().postDataJSON()
    requests.push(request)
    return route.fulfill({
      json: {
        kind: 'html',
        caption: request.instruction,
        html: '<p>A small world.</p>',
      },
    })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await block.getByLabel('Generation provider').selectOption('live')
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  const margin = block.getByRole('complementary', {
    name: 'Artifact edit instructions',
  })
  const edit = margin.getByLabel('Edit instruction', { exact: true })
  const action = margin.getByRole('button')
  await expect(action).toHaveCount(1)
  await expect(action).toHaveText('Open in chat')
  expect(requests).toHaveLength(1)
  const original = requests[0].instruction

  // The margin shortcut follows the same no-regeneration action as the button.
  await edit.press('Control+Enter')
  const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
  await expect(chat).toBeVisible()
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByText('Versions', { exact: true }).click()
  await expect(block.locator('.artifact-version')).toContainText('VERSION 1 / 1')
  await expect(chat.getByRole('log')).toContainText(original)
  expect(requests).toHaveLength(1)
  await action.click()
  expect(requests).toHaveLength(1)

  // Whitespace alone is not a new instruction; an empty edit cannot be sent.
  await edit.fill(`  ${original}  `)
  await expect(action).toHaveText('Open in chat')
  await action.click()
  expect(requests).toHaveLength(1)
  await edit.fill('   ')
  await expect(action).toHaveText('Send to chat')
  await expect(action).toBeDisabled()
  await edit.fill('Keep the world, add a quieter orbit.')
  await expect(action).toHaveText('Send to chat')
  await expect(action).toBeEnabled()
  await action.click()
  await expect(action).toHaveText('Open in chat')
  await expect(block.locator('.artifact-version')).toContainText('VERSION 2 / 2')
  expect(requests).toHaveLength(2)
  expect(requests[1].previous?.caption).toBe(original)
  expect(requests[1].history).toEqual([original])

  await chat.getByLabel('Chat message', { exact: true }).fill('Let the orbit settle into a thin line.')
  await chat.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(edit).toHaveValue('Let the orbit settle into a thin line.')
  await expect(action).toHaveText('Open in chat')
  await expect(block.locator('.artifact-version')).toContainText('VERSION 3 / 3')
  expect(requests).toHaveLength(3)
  expect(requests[2].previous?.caption).toBe('Keep the world, add a quieter orbit.')
  expect(requests[2].history).toEqual([original, 'Keep the world, add a quieter orbit.'])
  await action.click()
  await expect(block.locator('.artifact-version')).toContainText('VERSION 3 / 3')
  expect(requests).toHaveLength(3)
  await expect(action).toHaveCount(1)
})

for (const entry of ['saved story', 'new story', 'QA fixture']) {
  test(`prompt invitations are native placeholders only in the ${entry}`, async ({ page }) => {
    await page.goto(entry === 'QA fixture' ? '/?qa=essay' : '/')
    if (entry === 'saved story')
      await page
        .getByRole('button', { name: 'Open Listening before translating', exact: true })
        .first()
        .click()
    if (entry === 'new story') {
      await page.getByRole('button', { name: 'New Story', exact: true }).click()
      await page.getByPlaceholder('Begin.', { exact: true }).click()
      await page.getByTitle('Add a block: magic, upload, padding or fancy text').click()
      await page.getByRole('button', { name: '✳ magic', exact: true }).click()
    }
    const block = page
      .locator('.magic-block')
      .filter({ has: page.getByLabel('Magic prompt', { exact: true }) })
    const prompt = block.getByLabel('Magic prompt', { exact: true })
    await expect(block.locator('.prompt-guidance, .magic-composer-heading')).toHaveCount(0)
    if (entry !== 'new story') {
      await expect(prompt).not.toHaveValue('')
      expect(await prompt.evaluate((el) => el.matches(':placeholder-shown'))).toBe(false)
    }
    for (const [mode, text] of [
      ['Graphics', 'Ask for a diagram, a little world, a decorative animation, something to play with…'],
      ['Image', 'Ask to generate an image of something you can almost see…'],
      ['Data', 'Ask to visualize your data in some way…'],
    ]) {
      await block.getByRole('button', { name: mode, exact: true }).click()
      await prompt.fill('A thought taking shape.')
      expect(await prompt.evaluate((el) => el.matches(':placeholder-shown'))).toBe(false)
      await expect(block.getByText(text, { exact: true })).toHaveCount(0)
      await expect(prompt).toHaveAttribute('placeholder', text)
      await expect(block.getByText('Prompt', { exact: true })).toHaveCount(0)
      await prompt.fill('')
      expect(await prompt.evaluate((el) => el.matches(':placeholder-shown'))).toBe(true)
      await expect(prompt).toHaveAttribute('placeholder', text)
      await expect(block.getByRole('button', { name: 'Create', exact: true })).toBeDisabled()
    }
  })
}

for (const width of [1440, 390]) {
  test(`block removal controls are vertically centered at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay')
    for (const id of ['whales-rhythm', 'whales-abundance']) {
      const row = page.locator(`[data-block-id="${id}"]`)
      await row.locator('.magic-surface').click({ position: { x: 8, y: 8 } })
      const remove = row.getByRole('button', {
        name: 'Remove block',
        exact: true,
      })
      await expect(remove).toBeVisible()
      const bounds = await row.boundingBox()
      const control = await remove.boundingBox()
      expect(Math.abs(control!.y + control!.height / 2 - (bounds!.y + bounds!.height / 2))).toBeLessThan(1)
      expect(control!.x).toBeGreaterThanOrEqual(0)
      expect(control!.x + control!.width).toBeLessThanOrEqual(bounds!.x)
    }
    await page.screenshot({
      path: `test-results/refined-block-controls-${width}.png`,
    })
  })
}

test('focusing or reopening the same artifact chat preserves its unsent draft', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-abundance')
  const open = block.getByRole('button', { name: 'Open in chat', exact: true })
  await open.click()
  const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
  const input = chat.getByLabel('Chat message', { exact: true })
  await input.fill('A thought I am still working on.')
  await open.click()
  await expect(input).toHaveValue('A thought I am still working on.')
  await expect(input).toBeFocused()
  await chat.getByRole('button', { name: 'Close chat panel', exact: true }).click()
  await open.click()
  await expect(input).toHaveValue('A thought I am still working on.')
  await block.getByLabel('Edit instruction', { exact: true }).fill('Use bars for the observations.')
  await block.getByRole('button', { name: 'Send to chat', exact: true }).click()
  await expect(open).toBeVisible()
  await expect(input).toHaveValue('A thought I am still working on.')
  await expect(block.getByLabel('Edit instruction', { exact: true })).toHaveValue(
    'Use bars for the observations.',
  )
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByText('Versions', { exact: true }).click()
  await expect(block.locator('.artifact-version')).toContainText('VERSION 2 / 2')
})

test('Regenerate applies replacement data with the same prompt and keeps the margin synchronized', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-abundance')
  const edit = block.getByLabel('Edit instruction', { exact: true })
  const original = await edit.inputValue()
  await block.getByRole('button', { name: 'Open in chat', exact: true }).click()
  const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
  const regenerate = block.getByRole('button', { name: 'Regenerate', exact: true })
  await expect(regenerate).not.toBeVisible()
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByText('Sources & generation', { exact: true }).click()
  await expect(regenerate).toBeEnabled()
  await edit.fill('   ')
  await expect(regenerate).toBeDisabled()
  await edit.fill(original)
  await block.getByRole('button', { name: 'Remove right-whale-abundance.csv', exact: true }).click()
  await block.getByLabel('Attach files to data block').setInputFiles({
    name: 'observations-revised.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Day,Value\nMon,9\nTue,42\nWed,15'),
  })
  await expect(
    block.getByRole('button', { name: 'Remove observations-revised.csv', exact: true }),
  ).toBeVisible()
  // Changing inputs does not silently regenerate or relabel the displayed chart.
  await expect(block.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
  await expect(block.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
  await regenerate.click()
  await expect(regenerate).toBeDisabled()
  await expect(block.getByRole('img', { name: 'Tue: 42', exact: true })).toBeVisible()
  await expect(block.locator('.artifact-caption')).toHaveText('Source: observations-revised.csv')
  await expect(edit).toHaveValue(original)
  await expect(block.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
  await expect(regenerate).toBeEnabled()
  await block.getByText('Versions', { exact: true }).click()
  await expect(block.locator('.artifact-version')).toContainText('VERSION 2 / 2')
  await block.getByRole('button', { name: 'Undo edit', exact: true }).click()
  await expect(block.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
  await expect(edit).toHaveValue(original)
  await expect(block.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
})
