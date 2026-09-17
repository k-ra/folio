import { test, expect } from './fixtures'

test('existing workspaces gain the mock essay once, and deletion stays deleted', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'folio.stories.v1',
      JSON.stringify([
        {
          id: 'kept-story',
          title: 'Keep my placeholder',
          date: 'TODAY',
          thumb: 'lines',
          style: {},
          notes: {},
          chats: {},
          blocks: [{ id: 'kept-text', type: 'text', text: 'This content is mine.' }],
        },
      ]),
    )
  })
  await page.goto('/')
  const essay = page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first()
  await expect(essay).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Open Keep my placeholder', exact: true }).first(),
  ).toBeVisible()
  await page.reload()
  // One cover and one library tile, not a new duplicate on every load.
  await expect(
    page.getByRole('button', { name: 'Open Listening before translating', exact: true }),
  ).toHaveCount(2)
  await essay.click({ button: 'right' })
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete — sure?', exact: true }).click()
  await expect(essay).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open('folio-artifacts-v2', 1)
          request.onsuccess = () => resolve(request.result)
        })
        try {
          return await new Promise<boolean>((resolve) => {
            const request = db.transaction('workspace', 'readonly').objectStore('workspace').get('stories')
            request.onsuccess = () =>
              resolve(!request.result.some((s: { id: string }) => s.id === 's-whales'))
          })
        } finally {
          db.close()
        }
      }),
    )
    .toBe(true)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Open Keep my placeholder', exact: true }).first(),
  ).toBeVisible()
  await expect(essay).toHaveCount(0)
})

test('old playground links open the saved story without a special mode or toolbar', async ({ page }) => {
  await page.goto('/?demo=magic&story=whales')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
  await expect(page.locator('.playground-bar')).toHaveCount(0)
  await page.getByRole('button', { name: 'All stories', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first(),
  ).toBeVisible()
})
