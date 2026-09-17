import { test, expect } from './fixtures'

for (const width of [1440, 390]) {
  test(`chat is just a heading and conversation, with live data edits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const requests: any[] = []
    await page.route('**/api/magic/status', (route) =>
      route.fulfill({ json: { configured: true, images: false, provider: 'Claude' } }),
    )
    await page.route('**/api/magic', (route) => {
      requests.push(route.request().postDataJSON())
      return route.fulfill({
        json: {
          kind: 'html',
          html: '<button title="2024: 384">2024</button>',
          caption: 'Whale populations',
          reply: 'The value now appears in a tooltip.',
        },
      })
    })
    await page.goto('/?qa=essay&story=whales')
    await expect(page.getByLabel('AI connection')).toHaveText('Claude')
    const block = page.getByTestId('magic-whales-abundance')
    const instruction = 'Put the population details in a tooltip instead of the top right.'
    await block.getByLabel('Edit instruction', { exact: true }).fill(instruction)
    await block.getByRole('button', { name: 'Send to chat', exact: true }).click()
    const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
    await expect(chat.getByRole('heading')).toHaveText('CHAT')
    await expect(page.locator('.playground-bar')).not.toBeVisible()
    await expect(chat.getByRole('log')).toContainText(instruction)
    await expect(chat.getByRole('log')).toContainText('The value now appears in a tooltip.')
    await expect(chat.locator('details, summary, blockquote, .chat-artifact-context')).toHaveCount(0)
    await expect(chat).not.toContainText('Let’s work on it')
    await expect(chat).not.toContainText('CONTINUING CONVERSATION')
    await expect(chat.locator('.from-me')).toHaveCSS('border-left-width', '0px')
    await expect(chat.locator('.chat-footer')).toHaveCSS('border-top-width', '0px')
    expect(requests).toHaveLength(1)
    expect(requests[0].mode).toBe('data')
    expect(requests[0].previous.kind).toBe('chart')
    expect(requests[0].previous.points).toHaveLength(35)
    expect(requests[0].attachments[0].content).toContain('"N[35]",2024,375,384,394')
    await expect(block.getByLabel('Edit instruction', { exact: true })).toHaveValue(instruction)
    await page.screenshot({ path: `test-results/quiet-chat-${width}.png` })
    await chat.getByRole('button', { name: 'Close chat panel' }).click()
    await block.getByLabel('Artifact settings', { exact: true }).click()
    await block.getByText('Versions', { exact: true }).click()
    await block.getByRole('button', { name: 'Undo edit', exact: true }).click()
    await expect(block.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
    await block.getByText('Sources & generation', { exact: true }).click()
    await expect(block.getByLabel('Generation provider')).toHaveValue('live')
  })
}

test('ordinary chat sends story and previous turns to the model and preserves a failed draft', async ({
  page,
}) => {
  const requests: any[] = []
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/chat', (route) => {
    requests.push(route.request().postDataJSON())
    return requests.length === 3
      ? route.fulfill({ status: 502, json: { error: 'Temporary connection issue' } })
      : route.fulfill({ json: { reply: 'Structure is not the same as translated meaning.' } })
  })
  await page.goto('/?qa=essay&story=whales')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  const chat = page.getByRole('region', { name: 'Chat', exact: true })
  for (const instruction of ['What does this story explain?', 'What is uncertain?', 'How could I end it?']) {
    await chat.getByLabel('Chat message').fill(instruction)
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(chat.locator('.chat-working')).toHaveCount(0)
    if (requests.length < 3) await expect(chat.getByRole('log')).toContainText('translated meaning')
  }
  await expect(chat.getByRole('alert')).toContainText('Temporary connection issue')
  await expect(chat.getByLabel('Chat message')).toHaveValue('How could I end it?')
  expect(requests[0].story.title).toBe('Listening before translating')
  expect(requests[0].story.blocks.find((b: any) => b.id === 'whales-abundance').attachments[0].name).toBe(
    'right-whale-abundance.csv',
  )
  expect(requests[1].history).toHaveLength(2)
})

test('a deliberate Design sample choice never calls live generation', async ({ page }) => {
  let calls = 0
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', (route) => {
    calls++
    return route.abort()
  })
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByLabel('Prompt settings', { exact: true }).click()
  await expect(block.getByLabel('Generation provider')).toHaveValue('live')
  await block.getByLabel('Generation provider').selectOption('preview')
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(block.locator('.artifact-frame')).toBeVisible()
  expect(calls).toBe(0)
})
