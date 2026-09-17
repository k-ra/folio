import { test, expect } from './fixtures'

test('connected generation carries prior output and instructions; failure and retry preserve the artifact', async ({
  page,
}) => {
  const requests: { instruction: string; previous?: { caption: string }; history: string[] }[] = []
  let fail = false
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', async (route) => {
    const request = route.request().postDataJSON()
    requests.push(request)
    if (fail) {
      await route.fulfill({ status: 502, json: { error: 'A temporary generation failure' } })
      return
    }
    await route.fulfill({
      json: {
        kind: 'html',
        caption: request.instruction,
        html: '<button onclick="this.textContent=\'It works\'">Try the artifact</button>',
      },
    })
  })
  await page.goto('/?qa=essay')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByLabel('Generation provider').first().selectOption('live')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: false }).click()
  const artifact = page.getByTestId('magic-whales-rhythm')
  await expect(artifact.getByLabel('Edit instruction', { exact: true })).toBeVisible()
  await expect(artifact.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
  // Frame-internal actionability does not account for its outer reveal animation.
  await artifact.locator('.artifact-reveal').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  await page.frameLocator('.artifact-frame').getByRole('button', { name: 'Try the artifact' }).click()
  await expect(page.frameLocator('.artifact-frame').getByRole('button', { name: 'It works' })).toBeVisible()
  for (const side of ['top', 'right', 'bottom', 'left']) {
    await expect(artifact.locator('.magic-surface')).toHaveCSS(`border-${side}-width`, '1px')
    await expect(artifact.locator('.magic-surface')).not.toHaveCSS(`border-${side}-color`, 'rgba(0, 0, 0, 0)')
  }
  await artifact.getByLabel('Edit instruction', { exact: true }).fill('Make it more spacious')
  await artifact.getByRole('button', { name: 'Send to chat', exact: true }).click()
  await artifact.getByLabel('Artifact settings', { exact: true }).click()
  await artifact.getByText('Versions', { exact: true }).click()
  await expect(artifact.locator('.artifact-version')).toContainText('VERSION 2 / 2')
  await expect(artifact.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
  expect(requests[1].previous?.caption).toBe(requests[0].instruction)
  expect(requests[1].history).toEqual([requests[0].instruction])
  fail = true
  await page.getByLabel('Chat message').fill('A softer line')
  await page.locator('.chat-send-row button').click()
  await expect(artifact.getByRole('alert')).toContainText('temporary generation failure')
  await expect(artifact.locator('.artifact-frame')).toHaveAttribute('title', 'Make it more spacious')
  await expect(artifact.getByLabel('Edit instruction', { exact: true })).toHaveValue('A softer line')
  await expect(artifact.getByRole('button', { name: 'Send to chat', exact: true })).toBeVisible()
  fail = false
  await artifact.getByRole('button', { name: 'Retry' }).click()
  await expect(artifact.locator('.artifact-frame')).toHaveAttribute('title', 'A softer line')
  await expect(artifact.locator('.artifact-version')).toContainText('VERSION 3 / 3')
  await expect(artifact.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
})

test('interactive artifacts cannot reach the parent or make network requests', async ({ page }) => {
  let reachedNetwork = false
  await page.route('https://example.com/**', (route) => {
    reachedNetwork = true
    return route.abort()
  })
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/magic', (route) =>
    route.fulfill({
      json: {
        kind: 'html',
        caption: 'Sandbox test',
        html: '<p id="result">Waiting</p><script>try{parent.document.body.innerHTML="escaped"}catch(e){document.querySelector("#result").textContent="Parent blocked"}fetch("https://example.com/should-not-load").catch(()=>{document.querySelector("#result").textContent+="; network blocked"})</script>',
      },
    }),
  )
  await page.goto('/?qa=essay')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByLabel('Generation provider').first().selectOption('live')
  await page.getByLabel('Prompt settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: false }).click()
  await expect(page.frameLocator('.artifact-frame').locator('#result')).toHaveText('Parent blocked; network blocked')
  expect(reachedNetwork).toBe(false)
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
})
