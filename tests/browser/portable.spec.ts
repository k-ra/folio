import { test, expect, type Page } from './fixtures'
import { example } from '../storyFixture'
import { readFile } from 'node:fs/promises'

export async function loadExample(page: Page, story = example()) {
  await page.goto('/?qa=essay')
  await page.evaluate(async (story) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('folio-artifacts-v2', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('workspace')
      req.onsuccess = () => {
        const db = req.result,
          tx = db.transaction('workspace', 'readwrite')
        tx.objectStore('workspace').put([story], 'stories')
        tx.objectStore('workspace').put(true, 'mock-essay-v1')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, story)
  await page.goto('/')
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
}
for (const width of [1440, 390])
  test(`merge, undo, offline copy/export and backup roundtrip at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 })
    await loadExample(page)
    const a = page.locator('textarea[data-id="a"]'),
      b = page.locator('textarea[data-id="b"]')
    await b.focus()
    await b.press('Home')
    await b.press('Backspace')
    await expect(a).toHaveValue('First paragraph.Second paragraph.')
    expect(await a.evaluate((e: HTMLTextAreaElement) => e.selectionStart)).toBe('First paragraph.'.length)
    await expect(page.getByPlaceholder('a note in the margin')).toHaveValue(
      'PRIVATE FIRST NOTE\n\nPRIVATE SECOND NOTE',
    )
    await expect(page.getByTestId('magic-art')).toBeVisible()
    await a.press('ControlOrMeta+z')
    await expect(b).toHaveValue('Second paragraph.')
    await expect(page.locator('textarea[data-id="n-a"]')).toHaveValue('PRIVATE FIRST NOTE')
    await expect(page.locator('textarea[data-id="n-b"]')).toHaveValue('PRIVATE SECOND NOTE')
    await b.fill('')
    await b.press('Backspace')
    await expect(a).toBeFocused()
    await expect(a).toHaveValue('First paragraph.')
    expect(await a.evaluate((e: HTMLTextAreaElement) => e.selectionStart)).toBe('First paragraph.'.length)
    await a.press('ControlOrMeta+z')
    await expect(b).toHaveValue('')
    await expect(page.locator('textarea[data-id="n-b"]')).toHaveValue('PRIVATE SECOND NOTE')
    await b.fill('Second paragraph.')
    const c = page.locator('textarea[data-id="c"]')
    await c.focus()
    await c.press('Home')
    await c.press('Backspace')
    await expect(page.getByTestId('magic-art')).toBeVisible()
    await expect(c).toHaveValue('Last paragraph.')
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            ;(window as unknown as { copied: string }).copied = text
          },
        },
      }),
    )
    await b.fill('Second paragraph, latest unsynced edit.')
    await context.setOffline(true)
    await page.getByTitle('History', { exact: true }).click()
    const info = page.getByRole('region', { name: 'Story history' })
    await info.getByRole('button', { name: 'Copy entire story', exact: true }).click()
    expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain(
      'First paragraph.\n\nSecond paragraph, latest unsynced edit.',
    )
    const htmlEvent = page.waitForEvent('download')
    await info.getByRole('button', { name: 'Download HTML', exact: true }).click()
    const html = await htmlEvent,
      htmlPath = test.info().outputPath('story.html')
    await html.saveAs(htmlPath)
    const source = await readFile(htmlPath, 'utf8')
    expect(source).not.toContain('PRIVATE FIRST NOTE')
    expect(source).not.toContain('PRIVATE CHAT')
    const backupEvent = page.waitForEvent('download')
    await info.getByRole('button', { name: 'Download .folio backup', exact: true }).click()
    const file = await backupEvent,
      backupPath = test.info().outputPath('story.folio')
    await file.saveAs(backupPath)
    const saved = JSON.parse(await readFile(backupPath, 'utf8')).story
    expect(saved.notes.b).toBe('PRIVATE SECOND NOTE')
    expect(saved.blocks[1].text).toContain('latest unsynced')
    await info.screenshot({
      path: test.info().outputPath(`info-${width}.png`),
    })
    const reader = await context.newPage()
    const requests: string[] = []
    await reader.setViewportSize({ width, height: 1000 })
    reader.on('request', (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url())
    })
    await reader.goto('file://' + htmlPath)
    await expect(reader.locator('body')).toHaveAttribute('data-folio-ready', 'true')
    await expect(
      reader.getByText('Second paragraph, latest unsynced edit.', {
        exact: true,
      }),
    ).toBeVisible()
    await reader
      .getByTitle('An interactive light.', { exact: true })
      .contentFrame()
      .getByRole('button', { name: 'Light', exact: true })
      .click()
    await expect(
      reader
        .getByTitle('An interactive light.', { exact: true })
        .contentFrame()
        .getByRole('button', { name: 'Lit', exact: true }),
    ).toBeVisible()
    expect(requests).toEqual([])
    await reader.screenshot({
      path: test.info().outputPath(`offline-reader-${width}.png`),
      fullPage: true,
    })
    await context.setOffline(false)
    // Existing ID, changed contents: import as a separate story, never overwrite.
    await page.getByTitle('History', { exact: true }).click()
    await b.fill('A later local edit.')
    await page.getByTitle('History', { exact: true }).click()
    await info.getByLabel('Import .folio backup').setInputFiles(backupPath)
    await expect(page.locator('textarea[data-id="b"]')).toHaveValue('Second paragraph, latest unsynced edit.')
    await expect(page.locator('textarea[data-id="n-b"]')).toHaveValue('PRIVATE SECOND NOTE')
    await page.getByRole('button', { name: 'All stories', exact: true }).click()
    await expect(page.locator('.library-story')).toHaveCount(2)
  })

test('offline charts preserve their responsive width and keyboard interaction', async ({ page, context }) => {
  const story = example()
  const graphic = story.blocks.find((b) => b.type === 'magic')!
  if (graphic.type !== 'magic') throw new Error('Missing fixture graphic')
  graphic.revisions[0].output = {
    kind: 'chart', points: [{ label: 'Monday', value: 7 }, { label: 'Tuesday', value: 12 }],
    chartStyle: 'line', caption: 'Observations', xLabel: 'Day', yLabel: 'Count',
  }
  await loadExample(page, story)
  await page.getByTitle('History', { exact: true }).click()
  await context.setOffline(true)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download HTML', exact: true }).click()
  const path = test.info().outputPath('chart.html')
  await (await downloaded).saveAs(path)
  const reader = await context.newPage()
  await reader.goto('file://' + path)
  await expect(reader.locator('body')).toHaveAttribute('data-folio-ready', 'true')
  for (const width of [1440, 390]) {
    await reader.setViewportSize({ width, height: 900 })
    const chart = reader.locator('.artifact-chart'), svg = chart.locator('svg')
    expect((await svg.boundingBox())!.width).toBeCloseTo((await chart.boundingBox())!.width, 0)
    await reader.getByRole('img', { name: 'Monday: 7', exact: true }).focus()
    await expect(reader.locator('.chart-heading')).toContainText('Monday · 7')
  }
})

test('note affordance follows the mouse, fades when idle, and stays available on focus', async ({ page }) => {
  await loadExample(page)
  // Remove fixture notes to inspect the affordance on two paragraphs.
  for (const id of ['a', 'b']) {
    const note = page.locator(`textarea[data-id="n-${id}"]`)
    await note.fill('')
    await note.blur()
  }
  const a = page.locator('textarea[data-id="a"]'),
    b = page.locator('textarea[data-id="b"]')
  await a.focus()
  await b.hover()
  const add = page.locator('[data-block-id="b"] .note-add')
  await expect(add).toHaveCSS('opacity', '0.3')
  await expect(a).toBeFocused()
  await page.waitForTimeout(2100)
  await expect(add).toHaveCSS('opacity', '0')
  await b.hover({ position: { x: 12, y: 12 } })
  await add.hover()
  await page.waitForTimeout(2100)
  await expect(add).toHaveCSS('opacity', '0.8')
  await add.focus()
  await page.mouse.move(1, 1)
  await expect(add).toHaveCSS('opacity', '0.8')
  await add.press('Enter')
  await expect(page.locator('textarea[data-id="n-b"]')).toBeFocused()
})
