import { test, expect, type Page } from './fixtures'
import { example } from '../storyFixture'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { unzipSync } from 'fflate'
import type { Download } from '@playwright/test'

async function savePublication(file: Download, htmlPath: string) {
  if (!file.suggestedFilename().endsWith('.zip')) return file.saveAs(htmlPath)
  const entries = unzipSync(await readFile((await file.path())!))
  for (const [name, data] of Object.entries(entries)) {
    const target = name === 'index.html' ? htmlPath : join(dirname(htmlPath), name)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, data)
  }
}

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
test('rich writing shortcuts, notes, merge undo, chat Markdown and offline export', async ({
  page,
  context,
}) => {
  const story = example()
  story.chats.chat = [
    {
      me: false,
      text: '### A thought\n\n**Bold** and *italic*.\n\n- One\n- Two',
    },
  ]
  await loadExample(page, story)
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  const chat = page.getByRole('region', { name: 'Chat', exact: true })
  await expect(chat.locator('strong')).toHaveText('Bold')
  await expect(chat.locator('em')).toHaveText('italic')
  await expect(chat.getByRole('heading', { name: 'A thought' })).toBeVisible()
  await expect(chat.locator('li')).toHaveCount(2)
  const composer = chat.getByLabel('Chat message')
  await composer.fill('My words')
  await composer.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 2))
  await composer.press('ControlOrMeta+b')
  await expect(composer).toHaveValue('**My** words')
  await chat.getByRole('button', { name: 'Close chat panel' }).click()
  const a = page.locator('[data-folio-input][data-id="a"]')
  await a.focus()
  await a.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 5))
  await a.press('ControlOrMeta+b')
  await expect(a.locator('strong')).toHaveText('First')
  await a.locator('[contenteditable]').press('ControlOrMeta+z')
  await expect(a.locator('strong')).toHaveCount(0)
  await a.locator('[contenteditable]').press('ControlOrMeta+Shift+z')
  await expect(a.locator('strong')).toHaveText('First')
  await a.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 15))
  await a.locator('[contenteditable]').press('ControlOrMeta+i')
  await expect(a.locator('em')).toHaveText('paragraph')
  const note = page.locator('[data-folio-input][data-id="n-a"]')
  await note.focus()
  await note.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 7))
  await note.press('ControlOrMeta+i')
  await expect(note.locator('em')).toHaveText('PRIVATE')
  const b = page.locator('[data-folio-input][data-id="b"]')
  await b.focus()
  await b.press('Home')
  await b.press('Backspace')
  await expect(a).toContainText('First paragraph.Second paragraph.')
  await expect(a.locator('strong')).toHaveText('First')
  expect(await a.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(16)
  await a.locator('[contenteditable]').press('ControlOrMeta+z')
  await expect(b).toHaveValue('Second paragraph.')
  await expect(note.locator('em')).toHaveText('PRIVATE')
  await page.getByTitle('History', { exact: true }).click()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'HTML', exact: true }).click()
  const path = test.info().outputPath('formatted.html')
  await savePublication(await event, path)
  const reader = await context.newPage()
  await reader.goto('file://' + path)
  await expect(reader.locator('.publication strong')).toHaveText('First')
  await expect(reader.locator('.publication em')).toHaveText('paragraph')
  await expect(reader.locator('.publication-note')).toHaveCount(0)
  await reader.screenshot({
    path: test.info().outputPath('formatted-desktop.png'),
    fullPage: true,
  })
  await reader.setViewportSize({ width: 390, height: 844 })
  await reader.screenshot({
    path: test.info().outputPath('formatted-mobile.png'),
    fullPage: true,
  })
  await context.setOffline(false)
  await page.reload()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  await expect(a.locator('strong')).toHaveText('First')
})
test('rich typing, paragraph split and all author fields preserve formatting', async ({ page }) => {
  await loadExample(page)
  const a = page.locator('[data-folio-input][data-id="a"]')
  await a.focus()
  await a.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 6))
  await a.press('ControlOrMeta+b')
  await page.keyboard.type('bold ')
  await expect(a.locator('strong')).toHaveText('bold ')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type('normal ')
  await expect(a).toHaveText('First bold normal paragraph.')
  await expect(a.locator('strong')).toHaveText('bold ')
  await a.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(8, 8))
  await page.keyboard.press('Enter')
  await expect(a).toHaveText('First bo')
  const next = page.locator('[data-block-id]').nth(1).locator('[data-folio-input]').first()
  await expect(next).toHaveText('ld normal paragraph.')
  await expect(next.locator('strong')).toHaveText('ld ')
  await next.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length))
  await next.locator('[contenteditable]').evaluate((el) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/html', '<p><strong>Pasted</strong> words</p><p><em>Second line</em></p>')
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await expect(next.locator('strong')).toHaveText('Pasted')
  await expect(next.locator('em')).toHaveText('Second line')
  expect(await next.evaluate((el: HTMLTextAreaElement) => el.value)).toBe('Pasted words\nSecond line')
  for (const id of ['title', 'image']) {
    const field = page.locator(`[data-folio-input][data-id="${id}"]`)
    await field.focus()
    await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 1))
    await field.press('ControlOrMeta+i')
    await expect(field.locator('em')).toHaveText('A')
  }
  await page.screenshot({
    path: test.info().outputPath('rich-editor-desktop.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: test.info().outputPath('rich-editor-mobile.png'),
    fullPage: true,
  })
})
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
    await info.getByRole('button', { name: 'Copy text', exact: true }).click()
    expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain(
      'First paragraph.\n\nSecond paragraph, latest unsynced edit.',
    )
    await info.getByRole('button', { name: 'Download', exact: true }).click()
    const htmlEvent = page.waitForEvent('download')
    await info.getByRole('button', { name: 'HTML', exact: true }).click()
    const html = await htmlEvent,
      htmlPath = test.info().outputPath('story.html')
    await savePublication(html, htmlPath)
    const source = await readFile(htmlPath, 'utf8')
    expect(source).not.toContain('PRIVATE FIRST NOTE')
    expect(source).not.toContain('PRIVATE CHAT')
    const backupEvent = page.waitForEvent('download')
    await info.getByRole('button', { name: '.folio', exact: true }).click()
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
    await page.getByRole('button', { name: 'All stories', exact: true }).click()
    await page.getByTitle('Style this page', { exact: true }).click()
    await page.getByLabel('Import .folio backup').setInputFiles(backupPath)
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
    kind: 'chart',
    points: [
      { label: 'Monday', value: 7 },
      { label: 'Tuesday', value: 12 },
    ],
    chartStyle: 'line',
    caption: 'Observations',
    xLabel: 'Day',
    yLabel: 'Count',
  }
  await loadExample(page, story)
  await page.getByTitle('History', { exact: true }).click()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'HTML', exact: true }).click()
  const path = test.info().outputPath('chart.html')
  await savePublication(await downloaded, path)
  const reader = await context.newPage()
  await reader.goto('file://' + path)
  await expect(reader.locator('body')).toHaveAttribute('data-folio-ready', 'true')
  for (const width of [1440, 390]) {
    await reader.setViewportSize({ width, height: 900 })
    const chart = reader.locator('.artifact-chart'),
      svg = chart.locator('svg')
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
