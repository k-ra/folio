import { test, expect } from './fixtures'

test('chat width is draggable, keyboard adjustable, and resets on reopening', async ({ page }) => {
  await page.goto('/?qa=essay')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Chat', exact: true }),
    handle = page.getByRole('separator', { name: 'Chat width' })
  expect((await panel.boundingBox())!.width).toBeCloseTo(380, 0)
  await handle.focus()
  await handle.press('ArrowRight')
  expect((await panel.boundingBox())!.width).toBeCloseTo(400, 0)
  const r = (await handle.boundingBox())!
  await page.mouse.move(r.x + 5, 300)
  await page.mouse.down()
  await page.mouse.move(530, 300, { steps: 8 })
  await page.mouse.up()
  expect((await panel.boundingBox())!.width).toBeCloseTo(530, 0)
  await page.getByRole('button', { name: 'Close chat panel' }).click()
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  expect((await panel.boundingBox())!.width).toBeCloseTo(380, 0)
})
test('Select All spans the essay, copies only writing, and returns safely to editing', async ({ page }) => {
  await page.goto('/?qa=essay')
  const first = page.locator('[data-block-id] textarea.prose-input').first()
  await first.focus()
  await first.press('ControlOrMeta+a')
  await expect(page.locator('[data-story-text]')).not.toHaveCount(0)
  const copied = await page.evaluate(() => {
    const data = new DataTransfer()
    document.dispatchEvent(
      new ClipboardEvent('copy', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
    return data.getData('text/plain')
  })
  expect(copied).toContain('Listening before translating\n\nBefore a dictionary')
  expect(copied).toContain('not a translation')
  expect(copied).not.toContain('Keep this distinction clear')
  // A changed selection must copy only the new selection, not the prior Select All.
  const partial = await page.evaluate(() => {
    const field = document.querySelector('[data-story-text][data-id="title"]')!
    const range = document.createRange()
    range.selectNodeContents(field)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    const data = new DataTransfer()
    document.dispatchEvent(
      new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }),
    )
    return data.getData('text/plain')
  })
  expect(partial).toBe('Listening before translating')
  await page.keyboard.press('Escape')
  await first.fill('Still editable.')
  await expect(first).toHaveValue('Still editable.')
})
test('drag selection crosses paragraph fields without copying margin notes', async ({ page }) => {
  await page.goto('/?qa=essay')
  const fields = page.locator('[data-block-id] textarea.prose-input')
  await fields.nth(0).fill('First paragraph for selection.')
  await fields.nth(1).fill('Second paragraph for selection.')
  const a = (await fields.nth(0).boundingBox())!,
    b = (await fields.nth(1).boundingBox())!
  await page.mouse.move(a.x + 1, a.y + 10)
  await page.mouse.down()
  await page.mouse.move(b.x + 200, b.y + 10, { steps: 15 })
  await page.mouse.up()
  await expect(page.locator('.essay-selecting')).toBeVisible()
  const selected = await page.evaluate(() => getSelection()?.toString())
  expect(selected).toContain('First paragraph')
  expect(selected).toContain('Second paragraph')
})
test('info offers two quiet actions above history and accounts live on the homepage', async ({ page }) => {
  await page.goto('/?demo=magic')
  await page.getByTitle('History', { exact: true }).click()
  const info = page.getByRole('region', { name: 'Story history' })
  await expect(info.getByRole('button', { name: 'Copy text', exact: true })).toBeVisible()
  await expect(info.getByRole('button', { name: 'HTML', exact: true })).toHaveCount(0)
  await expect(info).not.toContainText('ACCOUNT')
  await info.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(info.getByRole('button', { name: 'HTML', exact: true })).toBeVisible()
  await expect(info.getByRole('button', { name: '.folio', exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('info-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('info-mobile.png') })
  await page.getByRole('button', { name: 'All stories', exact: true }).click()
  await page.getByTitle('Style this page', { exact: true }).click()
  await expect(page.getByRole('region', { name: 'Homepage settings' })).toContainText('ACCOUNT')
})

test('selecting the whole essay retains rich-text undo and paste has its own history label', async ({
  page,
}) => {
  await page.goto('/?qa=essay')
  const first = page.locator('[data-block-id] [data-folio-input]').first()
  await first.focus()
  await first.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 6))
  await first.press('ControlOrMeta+b')
  await expect(first.locator('strong')).toHaveText('Before')
  const editor = first.locator('[contenteditable]')
  await editor.press('ControlOrMeta+a')
  await expect(page.locator('.essay-selecting')).toBeVisible()
  await page.keyboard.press('Escape')
  await editor.focus()
  await editor.press('ControlOrMeta+z')
  await expect(first.locator('strong')).toHaveCount(0)
  await editor.evaluate((el) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', 'Pasted words ')
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await page.getByTitle('History', { exact: true }).click()
  await expect(page.getByRole('region', { name: 'Story history' })).toContainText('Pasted')
})

test('selection and chat resizing remain contained at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?qa=essay')
  const first = page.locator('[data-block-id] textarea.prose-input').first()
  await first.focus()
  await first.press('ControlOrMeta+a')
  expect(await page.evaluate(() => getSelection()?.toString())).toContain('Listening before translating')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  const handle = page.getByRole('separator', { name: 'Chat width' })
  await handle.focus()
  await handle.press('ArrowLeft')
  await expect(page.getByRole('region', { name: 'Chat', exact: true })).toHaveCSS(
    'background-color',
    'rgb(253, 251, 246)',
  )
  await expect(page.getByRole('region', { name: 'Chat', exact: true })).toHaveCSS('opacity', '1')
  expect(
    (await page.getByRole('region', { name: 'Chat', exact: true }).boundingBox())!.width,
  ).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath('chat-mobile.png') })
})
