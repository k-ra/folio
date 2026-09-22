import { test, expect } from './fixtures'

for (const width of [1440, 390])
  test(`story chat settings and sources stay scoped at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/api/magic/status', (r) => r.fulfill({ json: { configured: true } }))
    const requests: any[] = []
    await page.route('**/api/chat', (r) => {
      requests.push(r.request().postDataJSON())
      return r.fulfill({ json: { reply: 'A finding. [1](<https://example.org/research>)' } })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    const chat = page.getByRole('region', { name: 'Chat', exact: true })
    await chat.getByText('Chat settings', { exact: true }).click()
    await expect(chat.getByLabel('Browse the web')).not.toBeChecked()
    await chat.getByLabel('Chat system prompt').fill('Ask concise questions. Never replace my words.')
    await chat.getByLabel('Browse the web').check()
    await chat.getByLabel('Public search topic').fill('sperm whale communication')
    await expect(page.locator('.essay-header')).toContainText('SAVED')
    await page.screenshot({
      path: test.info().outputPath(`chat-settings-${width}.png`),
      animations: 'disabled',
    })
    await chat.getByText('Chat settings', { exact: true }).click()
    await chat.getByLabel('Chat message').fill('What is known?')
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(chat.getByRole('link', { name: '1', exact: true })).toHaveAttribute(
      'href',
      'https://example.org/research',
    )
    expect(requests[0].settings).toEqual({
      systemPrompt: 'Ask concise questions. Never replace my words.',
      browsing: true,
      searchTopic: 'sperm whale communication',
    })
    await expect(page.locator('.essay-header')).toContainText('SAVED')
    await page.reload()
    await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
    await page.getByRole('button', { name: 'Open chat', exact: true }).click()
    await chat.getByText('Chat settings', { exact: true }).click()
    await expect(chat.getByLabel('Chat system prompt')).toHaveValue(
      'Ask concise questions. Never replace my words.',
    )
    await expect(chat.getByLabel('Browse the web')).toBeChecked()
    await chat.getByRole('button', { name: 'Reset prompt', exact: true }).click()
    await expect(chat.getByLabel('Chat system prompt')).toHaveValue(/You are Folio/)
    await chat.getByLabel('Browse the web').uncheck()
    await chat.getByText('Chat settings', { exact: true }).click()
    await chat.getByLabel('Chat message').fill('No research this time')
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect.poll(() => requests.length).toBe(2)
    expect(requests[1].settings.browsing).toBe(false)
  })
