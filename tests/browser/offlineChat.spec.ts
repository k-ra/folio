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
    const passage = chat.locator('.folio-markdown p').nth(3)
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
    await expect(page.locator('.index-excerpt')).toHaveText(excerpt)
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
