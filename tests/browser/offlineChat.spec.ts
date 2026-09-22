import { test, expect } from './fixtures'

for (const width of [1440, 390])
  test(`offline chat sample is reusable and never spends at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    // Even a connected provider must not be used by this sample.
    await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true, byok: true } }))
    let paid = 0
    await page.route(/\/api\/(magic|chat|background|fancy|style)$/, (r) => {
      paid++
      return r.abort()
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
    await page.getByRole('button', { name: 'Open offline chat sample', exact: true }).click()
    const chat = page.getByRole('region', { name: 'Chat', exact: true })
    await expect(chat).toBeVisible()
    await expect(chat.locator('.chat-message')).toHaveCount(4)
    await expect(chat).toContainText('Offline sample · canned replies · no API calls')
    expect((await chat.getByRole('log').innerText()).split(/\s+/).length).toBeGreaterThan(1100)
    await chat.getByLabel('Chat message').fill('Help me test another long response')
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(chat.locator('.chat-message')).toHaveCount(6)
    const passage = chat.locator('.chat-message .folio-markdown p').nth(3)
    await passage.scrollIntoViewIfNeeded()
    const excerpt = await passage.evaluate((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      getSelection()!.removeAllRanges()
      getSelection()!.addRange(range)
      return el.textContent!
    })
    await page.getByRole('button', { name: 'Save to index', exact: true }).click()
    await chat.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(page.locator('.index-excerpt')).toHaveText(excerpt)
    await expect(page.locator('.index-excerpt strong')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Open source' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    const index = page.getByRole('textbox', { name: 'Index', exact: true })
    const fontBefore = await index.evaluate((el) => getComputedStyle(el).fontSize)
    await index.click()
    expect(await index.evaluate((el) => getComputedStyle(el).fontSize)).toBe(fontBefore)
    await index.evaluate((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      getSelection()!.removeAllRanges()
      getSelection()!.addRange(range)
    })
    await index.press('Enter')
    await index.press('ControlOrMeta+i')
    await page.keyboard.type('Still editable.')
    await index.press('ControlOrMeta+i')
    await expect(page.locator('.index-excerpt em')).toHaveText('Still editable.')
    await index.press('ControlOrMeta+z')
    await expect(index).not.toContainText('Still editable.')
    await index.press('ControlOrMeta+Shift+z')
    await expect(index).toContainText('Still editable.')
    await page.getByRole('button', { name: 'CHAT', exact: true }).click()
    await page.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(index).toContainText('Still editable.')
    await page.screenshot({
      path: test.info().outputPath(`offline-index-${width}.png`),
      animations: 'disabled',
    })
    await expect(page.locator('.essay-header')).toContainText('SAVED')
    await page.reload()
    await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
    await page.getByRole('button', { name: 'Open offline chat sample', exact: true }).click()
    await expect(chat.locator('.chat-message')).toHaveCount(6)
    await chat.getByRole('button', { name: 'INDEX', exact: true }).click()
    await expect(page.locator('.index-excerpt')).toContainText(excerpt)
    await expect(page.locator('.index-excerpt em')).toHaveText('Still editable.')
    const ids = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open('folio-artifacts-v2', 1)
        r.onsuccess = () => resolve(r.result)
      })
      return new Promise<string[]>((resolve) => {
        const r = db.transaction('workspace').objectStore('workspace').get('stories')
        r.onsuccess = () => {
          resolve(r.result.map((s: { id: string }) => s.id))
          db.close()
        }
      })
    })
    expect(ids.filter((id) => id === 's-offline-chat')).toHaveLength(1)
    expect(ids).toContain('s-whales')
    expect(paid).toBe(0)
  })
