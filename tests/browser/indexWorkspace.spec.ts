import { test, expect } from './fixtures'

for (const width of [1920, 1440, 1280, 1101]) {
  test(`chat, index and essay share the grid at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?qa=essay')
    const note = page.locator('.margin-note textarea').first()
    const originalNote = await note.inputValue()
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await page.getByRole('textbox', { name: 'Chat message', exact: true }).fill('Unsent thought')
    await page.getByRole('button', { name: 'Show chat and index side by side' }).click()
    const chat = page.getByRole('region', { name: 'Chat', exact: true })
    const index = page.getByRole('region', { name: 'Index', exact: true })
    const editor = page.getByRole('textbox', { name: 'Index', exact: true })
    await editor.fill('A thought to keep beside the essay.')
    const c = (await chat.boundingBox())!,
      i = (await index.boundingBox())!
    const sheet = (await page.locator('.essay-sheet').boundingBox())!
    const title = (await page.locator('.essay-title').boundingBox())!
    expect(c.x).toBe(0)
    expect(i.x).toBeCloseTo(c.width, 0)
    expect(sheet.x).toBeCloseTo(i.x + i.width, 0)
    expect(sheet.width).toBeGreaterThanOrEqual(480)
    expect(title.width).toBeGreaterThanOrEqual(368)
    expect(title.x - sheet.x).toBeCloseTo(sheet.x + sheet.width - title.x - title.width, 0)
    expect(title.x - sheet.x).toBeGreaterThanOrEqual(56)
    const rail = await page
      .locator('.essay-back, .essay-orbs .rail-control, .essay-history')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left))
    expect(Math.max(...rail) - Math.min(...rail)).toBeLessThan(1)
    await expect(note).toBeHidden()
    await expect(page.getByRole('textbox', { name: 'Chat message', exact: true })).toHaveValue(
      'Unsent thought',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`workspace-${width}.png`) })

    // Widening chat must reserve space for both other views.
    const handle = page.getByRole('separator', { name: 'Chat width' })
    await handle.focus()
    for (let n = 0; n < 25; n++) await handle.press('ArrowRight')
    expect((await page.locator('.essay-sheet').boundingBox())!.width).toBeGreaterThanOrEqual(480)
    await page.getByRole('button', { name: 'Close index', exact: true }).click()
    await expect(note).toBeVisible()
    await expect(note).toHaveValue(originalNote)
    await page.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(editor).toHaveText('A thought to keep beside the essay.')
  })
}

test('split view collapses to tabs on small screens without losing edits, undo or chat draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/?qa=essay')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await page.getByRole('textbox', { name: 'Chat message', exact: true }).fill('Keep this draft')
  await page.getByRole('button', { name: 'Show chat and index side by side' }).click()
  const editor = page.getByRole('textbox', { name: 'Index', exact: true })
  await editor.fill('Still here')
  // Separate typing bursts in ProseMirror's time-grouped undo history.
  await page.waitForTimeout(600)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.writing-page')).not.toHaveClass(/index-workspace/)
  await expect(editor).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show chat and index side by side' })).toBeHidden()
  await page.getByRole('button', { name: 'CHAT', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Chat message', exact: true })).toHaveValue(
    'Keep this draft',
  )
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  await editor.focus()
  await editor.press('End')
  await page.keyboard.type('!')
  expect((await page.locator('.panel-slot').boundingBox())!.y).toBe(0)
  await page.waitForTimeout(600)
  await page.screenshot({ path: test.info().outputPath('workspace-mobile.png') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.locator('.writing-page')).toHaveClass(/index-workspace/)
  await expect(editor).toHaveText('Still here!')
  await editor.press('ControlOrMeta+z')
  await expect(editor).toHaveText('Still here')
  await expect(page.getByRole('textbox', { name: 'Chat message', exact: true })).toHaveValue(
    'Keep this draft',
  )
})

test('long chat and index scroll independently while the essay stays put', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await page.getByRole('button', { name: 'Open offline chat sample', exact: true }).click()
  await page.getByRole('button', { name: 'Show chat and index side by side' }).click()
  const editor = page.getByRole('textbox', { name: 'Index', exact: true })
  await editor.fill(Array(70).fill('Notes beside a long conversation.').join('\n'))
  await page.locator('.index-contents').evaluate((el) => {
    el.scrollTop = 100
  })
  const before = await page.evaluate(() => ({
    y: scrollY,
    index: document.querySelector('.index-contents')!.scrollTop,
  }))
  const messages = page.locator('.conversation-chat .chat-messages')
  await messages.hover()
  await page.mouse.wheel(0, -500)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => scrollY)).toBe(before.y)
  expect(await page.locator('.index-contents').evaluate((el) => el.scrollTop)).toBe(before.index)
  await page.screenshot({ path: test.info().outputPath('workspace-long-chat.png') })
})
