import { test, expect } from './fixtures'

for (const width of [1440, 390]) {
  test(`the chat orb edits the selected artifact in the same conversation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const requests: any[] = []
    let storyCalls = 0
    await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
    await page.route('**/api/chat', (route) => {
      storyCalls++
      return route.fulfill({ json: { reply: 'A story-wide answer.' } })
    })
    await page.route('**/api/magic', (route) => {
      requests.push(route.request().postDataJSON())
      return route.fulfill({
        json: {
          kind: 'html',
          html: '<button title="2024: 384">Explore whales</button>',
          caption: 'Right whale population',
          reply: 'The population now has a tooltip.',
        },
      })
    })
    await page.goto('/?qa=essay')
    await expect(page.getByLabel('AI connection')).not.toHaveText('AI not connected')
    const block = page.getByTestId('magic-whales-abundance')
    const orb = page.getByRole('button', { name: 'Open chat', exact: true })
    await block.getByRole('group', { name: 'Data artifact', exact: true }).click({ position: { x: 8, y: 8 } })
    await orb.click()
    const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
    await expect(orb).toHaveAttribute('aria-pressed', 'true')
    await expect(chat.getByLabel('Editing artifact')).toContainText('Editing data visualization')
    expect(requests).toHaveLength(0) // Selection/navigation must never generate.
    const instruction = 'Move the population value into a tooltip.'
    await chat.getByLabel('Chat message').fill(instruction)
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(chat.getByRole('log')).toContainText('The population now has a tooltip.')
    expect(storyCalls).toBe(0)
    expect(requests).toHaveLength(1)
    expect(requests[0].previous.points).toHaveLength(35)
    expect(requests[0].attachments[0].content).toContain('"N[35]",2024,375,384,394')
    await expect(block.getByLabel('Edit instruction', { exact: true })).toHaveValue(instruction)
    await chat.getByLabel('Chat message').fill('An unsent follow-up')
    if (width < 700) await chat.getByRole('button', { name: 'Close chat panel' }).click()
    else await orb.click()
    await expect(chat).toHaveCount(0)
    await expect(orb).toHaveAttribute('aria-pressed', 'false')
    await block.getByRole('button', { name: 'Open in chat', exact: true }).click()
    await expect(chat.getByRole('log')).toContainText(instruction)
    await expect(chat.getByLabel('Chat message')).toHaveValue('An unsent follow-up')
    await chat.getByRole('button', { name: 'Clear chat focus' }).click()
    const storyChat = page.getByRole('region', { name: 'Chat', exact: true })
    await expect(storyChat.getByLabel('Chat message')).toHaveValue('')
    await storyChat.getByLabel('Chat message').fill('What does the essay explain?')
    await storyChat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(storyChat.getByRole('log')).toContainText('A story-wide answer.')
    expect(storyCalls).toBe(1)
    // Clicking inside the sandboxed result selects it without exposing its document.
    if (width < 700) await storyChat.getByRole('button', { name: 'Close chat panel' }).click()
    await block.locator('iframe').contentFrame().getByRole('button', { name: 'Explore whales' }).click()
    if (width < 700) await orb.click()
    await expect(chat).toBeVisible()
    await expect(chat.getByLabel('Chat message')).toHaveValue('An unsent follow-up')
    await expect(chat.getByRole('log')).not.toContainText('A story-wide answer.')
    await page.screenshot({ path: `test-results/connected-artifact-chat-${width}.png` })
    await chat.getByRole('button', { name: 'Close chat panel' }).click()
    await block.getByLabel('Artifact settings', { exact: true }).click()
    await block.getByText('Versions', { exact: true }).click()
    await block.getByRole('button', { name: 'Undo edit', exact: true }).click()
    await expect(block.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
    await expect(block.getByLabel('Edit instruction', { exact: true })).not.toHaveValue(instruction)
  })
}

test('changing selection keeps each artifact conversation and draft separate, including failures', async ({
  page,
}) => {
  const requests: any[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', (route) => {
    const body = route.request().postDataJSON()
    requests.push(body)
    return body.instruction === 'A failed population edit'
      ? route.fulfill({ status: 502, json: { error: 'Try again later' } })
      : route.fulfill({
          json: {
            kind: 'html',
            html: '<button>Play rhythm</button>',
            caption: 'Illustrative click rhythm',
            reply: 'Rhythm created.',
          },
        })
  })
  await page.goto('/?qa=essay')
  const rhythm = page.getByTestId('magic-whales-rhythm')
  const chart = page.getByTestId('magic-whales-abundance')
  const orb = page.getByRole('button', { name: 'Open chat', exact: true })
  // An unfinished prompt is not silently converted to an artifact edit.
  await rhythm.getByLabel('Magic prompt').focus()
  await orb.click()
  const storyChat = page.getByRole('region', { name: 'Chat', exact: true })
  await expect(storyChat).toBeVisible()
  await storyChat.getByLabel('Chat message').fill('Keep this story draft')
  await rhythm.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(rhythm.locator('iframe')).toBeVisible()
  await rhythm.locator('iframe').contentFrame().getByRole('button').click()
  const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })
  await expect(chat.getByLabel('Editing artifact')).toContainText('Illustrative click rhythm')
  await chat.getByLabel('Chat message').fill('Keep this rhythm draft')
  await chart.getByRole('group', { name: 'Data artifact', exact: true }).focus()
  await expect(chat.getByLabel('Chat message')).toHaveValue('')
  await expect(chat.getByRole('log')).not.toContainText('Rhythm created.')
  await chat.getByLabel('Chat message').fill('A failed population edit')
  await chat.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(chat.getByRole('alert')).toContainText('Try again later')
  await expect(chart.getByLabel('Edit instruction', { exact: true })).toHaveValue('A failed population edit')
  await expect(chart.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
  await rhythm.locator('iframe').contentFrame().getByRole('button').click()
  await expect(chat.getByLabel('Chat message')).toHaveValue('Keep this rhythm draft')
  await expect(chat.getByRole('log')).toContainText('Rhythm created.')
  await expect(chat.getByRole('alert')).toHaveCount(0)
  await page.getByPlaceholder('Untitled', { exact: true }).focus()
  await expect(storyChat.getByLabel('Chat message')).toHaveValue('Keep this story draft')
  await expect(storyChat.locator('.chat-focus')).toHaveCount(0)
  expect(requests).toHaveLength(2)
  expect(requests[1].mode).toBe('data')
})
