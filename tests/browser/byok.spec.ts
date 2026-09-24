import { test, expect } from './fixtures'

for (const width of [1440, 390, 320]) {
  test(`homepage menu exposes the visitor key field directly at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/api/magic/status', (route) =>
      route.fulfill({
        json: { configured: false, byok: true, maxRequestBytes: 4_000_000 },
      }),
    )
    let paid = 0
    await page.route(/\/api\/(magic|chat|background|fancy)$/, (route) => {
      paid++
      return route.abort()
    })
    await page.goto('/')
    const configure = page.getByRole('button', {
      name: 'Homepage settings',
      exact: true,
    })
    await expect(configure).toBeVisible()
    await configure.click()
    const menu = page.getByRole('region', { name: 'Homepage settings' })
    await expect(menu.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
    await expect(menu.getByRole('button', { name: 'No AI', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await menu.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(menu.getByLabel('OpenAI API key', { exact: true })).toBeVisible()
    const ai = (await menu.getByRole('button', { name: 'AI', exact: true }).boundingBox())!
    const key = (await menu.getByLabel('OpenAI API key', { exact: true }).boundingBox())!
    expect(Math.abs(ai.y + ai.height / 2 - key.y - key.height / 2)).toBeLessThan(2)
    await page.screenshot({ path: `test-results/byok-home-entry-${width}.png`, animations: 'disabled' })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const rect = (await menu.boundingBox())!
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(width)
    await page.getByLabel('OpenAI API key', { exact: true }).fill('sk-offline-browser-test')
    await menu.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(menu.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
    await expect(menu.getByRole('button', { name: 'AI connected', exact: true })).toBeVisible()
    expect(paid).toBe(0)
    const storage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))
    expect(storage).toContain('sk-offline-browser-test')
    await page.screenshot({ path: `test-results/byok-home-${width}.png` })
    await page.reload()
    await expect(configure).toBeVisible()
    await configure.click()
    await expect(menu.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
    await expect(menu.getByRole('button', { name: 'AI', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await menu.getByRole('button', { name: 'AI connected', exact: true }).click()
    await menu.getByRole('button', { name: 'Forget', exact: true }).click()
    expect(await page.evaluate(() => localStorage.getItem('folio.ai.device-key.v1:guest'))).toBeNull()
    expect(paid).toBe(0)
  })
}

for (const width of [1440, 390, 320]) {
  test(`AI is opt-in and its connection dialog fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/api/magic/status', (route) =>
      route.fulfill({
        json: { configured: false, byok: true, maxRequestBytes: 4_000_000 },
      }),
    )
    let paid = 0
    await page.route(/\/api\/(magic|chat|background|fancy)$/, (route) => {
      paid++
      return route.abort()
    })
    await page.goto('/?qa=essay')
    const connect = page.getByRole('button', {
      name: 'AI settings',
      exact: true,
    })
    await connect.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(dialog.locator('details')).toHaveCount(0)
    await expect(dialog.locator('label')).toHaveCount(0)
    const rows = await dialog.locator('form').evaluate((el) =>
      [...el.children]
        .filter((child) => {
          const r = child.getBoundingClientRect()
          return r.width > 1 && r.height > 1
        })
        .map((child) => child.className),
    )
    expect(rows).toEqual(['ai-connection-line'])
    const ai = (await dialog.getByRole('button', { name: 'AI', exact: true }).boundingBox())!
    const key = (await dialog.getByLabel('OpenAI API key', { exact: true }).boundingBox())!
    expect(Math.abs(ai.y + ai.height / 2 - key.y - key.height / 2)).toBeLessThan(2)
    await page.screenshot({ path: `test-results/byok-dialog-entry-${width}.png`, animations: 'disabled' })
    expect((await dialog.boundingBox())!.height).toBeLessThan(150)
    const rect = (await dialog.boundingBox())!
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(width)
    await page.getByLabel('OpenAI API key', { exact: true }).fill('sk-offline-browser-test')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'AI settings', exact: true })).toBeVisible()
    expect(paid).toBe(0)
    await page.getByRole('button', { name: 'AI settings', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'AI connected', exact: true })).toBeVisible()
    await expect(page.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'AI connected', exact: true }).click()
    await expect(page.getByLabel('OpenAI API key', { exact: true })).toHaveValue('')
    await page.screenshot({ path: `test-results/byok-dialog-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'AI settings', exact: true })).toBeFocused()
    const storage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))
    expect(storage).toContain('sk-offline-browser-test')
    await page.reload()
    await expect(connect).toBeVisible()
    await connect.click()
    await dialog.getByRole('button', { name: 'AI connected', exact: true }).click()
    await dialog.getByRole('button', { name: 'Forget', exact: true }).click()
    expect(await page.evaluate(() => localStorage.getItem('folio.ai.device-key.v1:guest'))).toBeNull()
    expect(paid).toBe(0)
  })
}

test('visitor key goes in the request header; errors recover and No AI pauses it', async ({ page }) => {
  await page.route('**/api/magic/status', (route) =>
    route.fulfill({ json: { configured: false, byok: true } }),
  )
  const requests: { key: string | undefined; body: string | null }[] = []
  let fail = true
  await page.route('**/api/chat', (route) => {
    requests.push({
      key: route.request().headers()['x-folio-api-key'],
      body: route.request().postData(),
    })
    return fail
      ? route.fulfill({ status: 401, json: { error: 'Invalid test key.' } })
      : route.fulfill({ json: { reply: 'Offline test reply.' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await page.getByRole('button', { name: 'AI', exact: true }).click()
  await page.getByLabel('OpenAI API key', { exact: true }).fill('sk-offline-browser-test')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Open Listening before translating',
      exact: true,
    })
    .first()
    .click()
  await expect(page.getByRole('button', { name: 'AI settings', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await page.getByLabel('Chat message').fill('Discuss this essay')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.locator('.ai-connect .ai-indicator-error')).toHaveText('!')
  await page.getByRole('button', { name: 'AI settings', exact: true }).click()
  await expect(page.getByRole('button', { name: 'AI connection error', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'AI connection error', exact: true }).click()
  await expect(page.getByLabel('OpenAI API key', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close AI settings', exact: true }).click()
  fail = false
  await page.getByLabel('Chat message').fill('Try again')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('Offline test reply.')
  await expect(page.locator('.ai-connect .ai-indicator-error')).toHaveCount(0)
  expect(requests).toHaveLength(2)
  expect(requests[0].key).toBe('sk-offline-browser-test')
  expect(requests[0].body).not.toContain('sk-offline-browser-test')
  await expect(page.locator('.essay-header')).toContainText('SAVED')
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('folio-artifacts-v2', 1)
      request.onsuccess = () => resolve(request.result)
    })
    return new Promise<string>((resolve) => {
      const request = db.transaction('workspace', 'readonly').objectStore('workspace').get('stories')
      request.onsuccess = () => {
        resolve(JSON.stringify(request.result))
        db.close()
      }
    })
  })
  expect(saved).toContain('Discuss this essay')
  expect(saved).not.toContain('sk-offline-browser-test')
  await page.getByRole('button', { name: 'AI settings', exact: true }).click()
  await page.getByRole('button', { name: 'No AI', exact: true }).click()
  await expect(page.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close AI settings', exact: true }).click()
  await expect(page.getByRole('button', { name: 'AI settings', exact: true })).toBeVisible()
  await page.getByLabel('Chat message').fill('An offline follow-up')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.locator('.chat-working')).toHaveCount(0)
  expect(requests).toHaveLength(2)
})

test('Anthropic can be selected and remembered without enabling image generation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.route('**/api/magic/status', (route) =>
    route.fulfill({ json: { configured: false, images: false, byok: true } }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  const menu = page.getByRole('region', { name: 'Homepage settings' })
  await menu.getByRole('button', { name: 'AI', exact: true }).click()
  await menu.getByLabel('AI provider').selectOption('anthropic')
  await expect(menu.getByLabel('Anthropic API key')).toBeVisible()
  await page.screenshot({ path: 'test-results/byok-anthropic-390.png', animations: 'disabled' })
  const box = (await menu.boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await menu.getByLabel('Anthropic API key').fill('sk-ant-offline-browser-key')
  await menu.getByRole('button', { name: 'Save', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('folio.ai.anthropic-key.v1:guest'))).toBe('sk-ant-offline-browser-key')
  await page.reload()
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await menu.getByRole('button', { name: 'AI connected', exact: true }).click()
  await expect(menu.getByLabel('AI provider')).toHaveValue('anthropic')
  await menu.getByLabel('AI provider').selectOption('openai')
  await expect(menu.getByLabel('OpenAI API key')).toBeVisible()
  await expect(menu.getByRole('button', { name: 'AI connected', exact: true })).toHaveCount(0)
})

test('a static-only installation does not offer a nonfunctional key form', async ({ page }) => {
  await page.route('**/api/magic/status', (route) => route.fulfill({ status: 404, body: 'Not found' }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await expect(page.getByText('AI unavailable on this host.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('OpenAI API key', { exact: true })).toHaveCount(0)
  await page.goto('/?qa=essay')
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'AI settings', exact: true })).toHaveCount(0)
})
