import { test, expect, type Page } from './fixtures'

const result = {
  name: 'Reef field',
  direction: 'Radial marks with a time scrubber and cursor-following tooltips.',
  reply: 'A radial field, with details on focus and a quiet time scrubber.',
  background: '#f1ecd9',
  ink: '#223344',
  css: 'body{background:linear-gradient(#c8dedb,#f1ecd9)}',
  sample:
    '<style>body{margin:0;padding:14px;font:12px sans-serif;color:#223344;background:#f1ecd9}svg{display:block;width:100%;height:100px}</style><svg viewBox="0 0 260 100"><g fill="none" stroke="currentColor"><circle cx="130" cy="50" r="24"/><path d="M130 10v16m0 48v16m-64-40h40m48 0h40m-92-28 10 10m36 36 10 10"/></g></svg><button onclick="this.textContent=\'A: 14\'">Inspect A</button>',
}

test('connecting from a style category never submits its drafted prompt', async ({ page }) => {
  await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: false, byok: true } }))
  let calls = 0
  await page.route('**/api/style', (r) => {
    calls++
    return r.fulfill({ json: result })
  })
  await page.goto('/?qa=essay')
  const panel = await category(page, 'Graphics')
  await panel.getByLabel('Custom style message').fill('An orbital garden')
  await panel.getByRole('button', { name: 'Connect AI', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('OpenAI API key', { exact: true }).fill('sk-offline-style-test')
  await dialog.getByRole('button', { name: 'Use this key' }).click()
  await expect(panel.getByRole('button', { name: 'Make a preview' })).toBeEnabled()
  expect(calls).toBe(0)
  await expect(panel.getByLabel('Custom style message')).toHaveValue('An orbital garden')
  await panel.getByRole('button', { name: 'Make a preview' }).click()
  await expect(panel.getByRole('status')).toContainText(result.reply)
  expect(calls).toBe(1)
})
async function category(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open style', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Style panel', exact: true })
  await panel.getByRole('button', { name, exact: true }).click()
  await expect(panel.getByLabel('Custom style message')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Make your own', exact: true }).click()
  return panel
}

for (const width of [1440, 390]) {
  test(`custom styles refine, survive Apply/reload, and reach real-data generation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true } }))
    const requests: any[] = []
    const generations: any[] = []
    await page.route('**/api/style', (r) => {
      requests.push(r.request().postDataJSON())
      return r.fulfill({ json: result })
    })
    await page.route('**/api/magic', (r) => {
      generations.push(r.request().postDataJSON())
      return r.fulfill({ json: { kind: 'html', html: '<p>Real observations</p>', caption: 'Observations' } })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
    let panel = await category(page, 'Data')
    await panel.getByLabel('Custom style message').fill('A radial field like a reef, with a time scrubber')
    expect(requests).toHaveLength(0)
    await panel.getByRole('button', { name: 'Make a preview' }).click()
    await expect(panel.getByRole('status')).toContainText(result.reply)
    const frame = panel.getByTitle('Style study')
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
    await frame.contentFrame().getByRole('button', { name: 'Inspect A' }).click()
    await expect(frame.contentFrame().getByRole('button', { name: 'A: 14' })).toBeVisible()
    await panel.getByLabel('Custom style message').fill('Make the motion calmer')
    await panel.getByRole('button', { name: 'Refine preview' }).click()
    await expect(panel.getByLabel('Custom style message')).toHaveValue('')
    expect(requests[1].history).toHaveLength(2)
    expect(requests[1].current.direction).toBe(result.direction)
    await panel.getByRole('button', { name: 'Back to Style' }).click()
    await panel.getByRole('button', { name: 'Graphics', exact: true }).click()
    await panel.getByRole('button', { name: 'Make your own' }).click()
    await panel.getByLabel('Custom style message').fill('A living particle world')
    await panel.getByRole('button', { name: 'Make a preview' }).click()
    await expect(panel.getByRole('status')).toContainText(result.reply)
    expect(requests[2].category).toBe('graphics')
    expect(requests[2].history).toHaveLength(0)
    await panel.getByRole('button', { name: 'Back to Style' }).click()
    await panel.getByRole('button', { name: 'Data', exact: true }).click()
    await panel.getByRole('button', { name: 'Make your own' }).click()
    await panel.getByText('Earlier refinements', { exact: true }).click()
    await expect(panel.getByRole('log')).toContainText('Make the motion calmer')
    await expect(panel.getByRole('log')).not.toContainText('A living particle world')
    await panel.getByText('Earlier refinements', { exact: true }).click()
    await page.screenshot({ path: `test-results/custom-style-${width}.png` })
    await panel.getByRole('button', { name: 'Apply', exact: true }).click()
    await panel.getByRole('button', { name: 'Close style' }).click()
    await expect(page.getByText(/WORDS · SAVED/)).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
    panel = await category(page, 'Data')
    await panel.getByText('Earlier refinements', { exact: true }).click()
    await expect(panel.getByRole('log')).toContainText('Make the motion calmer')
    await panel.getByRole('button', { name: 'Close style' }).click()
    const artifact = page.getByTestId('magic-whales-abundance')
    await artifact.getByLabel('Artifact settings', { exact: true }).click()
    await artifact.getByText('Sources & generation', { exact: true }).click()
    await artifact.getByLabel('Generation provider').selectOption('live')
    await artifact.getByRole('button', { name: 'Regenerate', exact: true }).click()
    await expect.poll(() => generations.length).toBe(1)
    expect(generations[0].style.dataDirection).toBe(result.direction)
    expect(generations[0].style.customStyles).toBeUndefined()
    expect(generations[0].attachments[0].content).toContain('2024')
  })
}

test('unified background and ink conversation previews, resets, and closing revokes its changes', async ({ page }) => {
  await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true } }))
  await page.route('**/api/style', (r) => r.fulfill({ json: { ...result, sample: '', css: '' } }))
  await page.goto('/?qa=essay')
  const panel = await category(page, 'Background')
  await panel.getByLabel('Custom style message').fill('Sea ink on warm paper')
  await panel.getByRole('button', { name: 'Make a preview' }).click()
  await expect(page.locator('.writing-page')).toHaveCSS('color', 'rgb(34, 51, 68)')
  await panel.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(panel.getByRole('log')).toHaveCount(0)
  await expect(page.locator('.writing-page')).toHaveCSS('color', 'rgb(17, 17, 17)')
  await panel.getByLabel('Custom style message').fill('Try again')
  await panel.getByRole('button', { name: 'Make a preview' }).click()
  await expect(page.locator('.writing-page')).toHaveCSS('color', 'rgb(34, 51, 68)')
  await panel.getByRole('button', { name: 'Close style' }).click()
  await expect(page.locator('.writing-page')).toHaveCSS('color', 'rgb(17, 17, 17)')
})

test('the maker is reversible, preserves drafts between modes, and never requires code', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true } }))
  const requests: any[] = []
  await page.route('**/api/style', (r) => {
    requests.push(r.request().postDataJSON())
    return r.fulfill({ json: { ...result, name: `Study ${requests.length}` } })
  })
  await page.goto('/?qa=essay')
  const panel = await category(page, 'Graphics')
  await expect(panel.getByRole('group', { name: 'Graphic styles' })).toHaveCount(0)
  await panel.getByLabel('Custom style message').fill('Orbital paths that react to touch')
  await panel.getByRole('button', { name: 'Choose a look' }).click()
  await expect(panel.getByLabel('Custom style message')).toHaveCount(0)
  await panel.screenshot({ path: 'test-results/style-gallery-320.png' })
  await panel.getByRole('button', { name: 'Make your own' }).focus()
  await page.keyboard.press('Enter')
  await expect(panel.getByLabel('Custom style message')).toHaveValue('Orbital paths that react to touch')
  expect(requests).toHaveLength(0)
  await panel.getByRole('button', { name: 'Make a preview', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Study 1' })).toBeVisible()
  await panel.getByRole('button', { name: 'Undo last refinement' }).click()
  await expect(panel.getByRole('heading', { name: 'What do you have in mind?' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled()
  // Begin again; undoing an initial preview must not leave hidden direction/history behind.
  requests.length = 0
  await panel.getByLabel('Custom style message').fill('Orbital paths that react to touch')
  await panel.getByRole('button', { name: 'Make a preview', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Study 1' })).toBeVisible()
  expect(requests[0].history).toHaveLength(0)
  await panel.getByLabel('Custom style message').fill('More breathing room')
  await panel.getByRole('button', { name: 'Refine preview' }).click()
  await expect(panel.getByRole('heading', { name: 'Study 2' })).toBeVisible()
  await expect(panel.getByLabel('Custom style message')).toHaveAttribute(
    'placeholder',
    'What would you change?',
  )
  await panel.getByRole('button', { name: 'Undo last refinement' }).click()
  await expect(panel.getByRole('heading', { name: 'Study 1' })).toBeVisible()
  await panel.getByLabel('Custom style message').fill('One gentler orbit')
  await panel.getByRole('button', { name: 'Refine preview' }).click()
  await expect(panel.getByRole('heading', { name: 'Study 3' })).toBeVisible()
  expect(requests[2].history).toHaveLength(2)
  expect(JSON.stringify(requests[2].history)).not.toContain('More breathing room')
  await expect(panel.getByRole('log')).toHaveCount(0)
  await expect(panel.getByLabel('Background CSS')).toHaveCount(0)
  await panel.getByLabel('Custom style message').scrollIntoViewIfNeeded()
  await panel.screenshot({ path: 'test-results/style-maker-short-320.png' })
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  const apply = await panel.getByRole('button', { name: 'Apply', exact: true }).boundingBox()
  expect(apply!.y + apply!.height).toBeLessThanOrEqual(640)
  await panel.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Undo last refinement' })).toHaveCount(0)
})

test('reset and leaving a category reject late responses and preserve unsent text', async ({ page }) => {
  await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true } }))
  let release: (() => void) | undefined
  let attempts = 0
  await page.route('**/api/style', async (r) => {
    attempts++
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await r.fulfill({ json: result }).catch(() => {})
  })
  await page.goto('/?qa=essay')
  const panel = await category(page, 'Data')
  await panel.getByLabel('Custom style message').fill('Radial, please')
  await panel.getByRole('button', { name: 'Make a preview' }).click()
  await expect.poll(() => attempts).toBe(1)
  await panel.getByRole('button', { name: 'Back to Style' }).click()
  release?.()
  await panel.getByRole('button', { name: 'Data', exact: true }).click()
  await panel.getByRole('button', { name: 'Make your own' }).click()
  await expect(panel.getByLabel('Custom style message')).toHaveValue('Radial, please')
  await expect(panel.getByRole('log')).toHaveCount(0)
  // A real draft change enables Reset while the next request is pending.
  await panel.getByRole('button', { name: 'Choose a look' }).click()
  await panel.getByRole('button', { name: 'Bars', exact: true }).click()
  await panel.getByRole('button', { name: 'Make your own' }).click()
  await panel.getByRole('button', { name: 'Make a preview' }).click()
  await expect.poll(() => attempts).toBe(2)
  await panel.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(panel.getByLabel('Custom style message')).toBeEnabled()
  release?.()
  await expect(panel.getByRole('log')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled()
})
