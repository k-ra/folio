import { test, expect } from '../../../tests/browser/fixtures'
import { example } from '../../../tests/storyFixture'
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

const live = readFileSync(new URL('../live-response.md', import.meta.url), 'utf8')
async function openStory(page: Page) {
  await page.goto('/?qa=essay')
  await page.evaluate(
    async (story) => {
      await new Promise<void>((resolve) => {
        const r = indexedDB.open('folio-artifacts-v2', 1)
        r.onupgradeneeded = () => r.result.createObjectStore('workspace')
        r.onsuccess = () => {
          const tx = r.result.transaction('workspace', 'readwrite')
          tx.objectStore('workspace').put([story], 'stories')
          tx.objectStore('workspace').put(true, 'mock-essay-v1')
          tx.oncomplete = () => {
            r.result.close()
            resolve()
          }
        }
      })
    },
    { ...example(), chats: { chat: [{ me: false, text: live }] } },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
}

for (const width of [1440, 390])
  test(`index lives in the real editor drawer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await openStory(page)
    await expect(page.locator('.essay-sheet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open style', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open data', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    const chat = page.getByRole('region', { name: 'Chat', exact: true })
    await expect(chat.getByRole('button', { name: 'INDEX', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save to index' })).toHaveCount(0)
    const passage = chat.locator('.folio-markdown p').nth(7)
    await passage.scrollIntoViewIfNeeded()
    const excerpt = await passage.evaluate((el) => {
      const r = document.createRange()
      r.selectNodeContents(el)
      getSelection()!.removeAllRanges()
      getSelection()!.addRange(r)
      return el.textContent!
    })
    const save = page.getByRole('button', { name: 'Save to index', exact: true })
    await expect(save).toBeVisible()
    await page.screenshot({ path: test.info().outputPath(`actual-chat-${width}.png`) })
    await save.click()
    const scroll = await chat.locator('.chat-messages').evaluate((el) => el.scrollTop)
    await chat.getByRole('button', { name: 'INDEX', exact: true }).click()
    const index = page.getByRole('region', { name: 'Index', exact: true })
    await expect(index.locator('.index-excerpt')).toHaveText(excerpt)
    expect((await index.boundingBox())!.x).toBe(0)
    expect((await index.boundingBox())!.width).toBeLessThanOrEqual(Math.min(380, width * 0.94) + 1)
    await page.screenshot({ path: test.info().outputPath(`actual-index-${width}.png`) })
    await index.getByRole('button', { name: 'CHAT', exact: true }).click()
    await expect
      .poll(() => chat.locator('.chat-messages').evaluate((el) => el.scrollTop))
      .toBeCloseTo(scroll, 0)
    await page.getByRole('button', { name: 'Close chat panel' }).click()
    const paragraph = page.locator('textarea[data-id="b"]')
    await paragraph.fill('My actual editable paragraph.')
    await paragraph.evaluate((el: HTMLTextAreaElement) => {
      el.focus()
      el.setSelectionRange(3, 18)
    })
    await expect(save).toBeVisible()
    await save.click()
    await expect(paragraph).toHaveValue('My actual editable paragraph.')
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await chat.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(index.locator('.index-clipping')).toHaveCount(2)
    await expect(index).toContainText('actual editable')
    await page.reload()
    await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await chat.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(index.locator('.index-clipping')).toHaveCount(2)
    await expect(page.locator('textarea[data-id="b"]')).toHaveValue('My actual editable paragraph.')
  })

test('essay-wide clipping excludes notes and does not destroy editing or undo', async ({ page }) => {
  await openStory(page)
  const paragraph = page.locator('textarea[data-id="b"]')
  await paragraph.focus()
  await paragraph.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Save to index', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  const clip = page.locator('.index-excerpt')
  await expect(clip).toContainText('A field of light')
  await expect(clip).toContainText('Second paragraph.')
  await expect(clip).not.toContainText('private')
  await page.getByRole('button', { name: 'Close chat panel' }).click()
  await paragraph.fill('Still writing.')
  await expect(paragraph).toHaveValue('Still writing.')
})
