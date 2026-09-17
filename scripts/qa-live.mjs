import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

// Explicitly opt in: this consumes the configured subscription/API allowance.
// Normal unit/browser QA never imports this script or contacts a live model.
if (!process.argv.includes('--live')) {
  throw new Error('Run with --live to authorize two model requests using only the disposable whale sample.')
}

const origin = 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const connection = await (await page.request.get(`${origin}/api/magic/status`)).json()
  assert.equal(connection.configured, true, 'Configure the local model first.')
  console.log(`Live QA: ${connection.provider}; fresh browser; disposable whale story only.`)
  await mkdir('test-results', { recursive: true })
  await page.goto(`${origin}/?qa=essay`)
  const block = page.getByTestId('magic-whales-abundance')
  const margin = block.getByLabel('Edit instruction', { exact: true })
  const chat = page.getByRole('region', { name: 'Artifact chat', exact: true })

  async function generate(action, step) {
    const pending = page.waitForResponse(
      (response) => response.url() === `${origin}/api/magic` && response.request().method() === 'POST',
      { timeout: 185000 },
    )
    await action()
    const response = await pending
    const result = await response.json()
    assert.equal(response.status(), 200, result.error)
    assert.equal(result.kind, 'html')
    assert.ok(result.html.length > 100)
    assert.ok(result.reply?.length > 0, 'The model should explain its actual edit.')
    const request = response.request().postDataJSON()
    assert.ok(request.attachments[0].content.includes('"N[35]",2024,375,384,394'))
    await expect(block.locator('.artifact-frame')).toBeVisible()
    await expect(chat.getByRole('log')).toContainText(result.reply)
    await writeFile(`test-results/live-${step}.json`, JSON.stringify({ request, result }, null, 2))
    console.log(`${step}: real HTML returned; source CSV retained; reply: ${result.reply}`)
    return result
  }

  const first =
    'Put each year and population in a hover and keyboard-focus tooltip instead of the top right. Preserve all 35 data values, the thin line, and source caption. Do not add a permanent detail readout.'
  await margin.fill(first)
  await generate(
    () => block.getByRole('button', { name: 'Send to chat', exact: true }).click(),
    'margin-edit',
  )
  await expect(margin).toHaveValue(first)

  const followup =
    'Keep the tooltips and all data. Make only the chart line teal (#29666b), leaving the rest unchanged.'
  await chat.getByLabel('Chat message').fill(followup)
  await generate(() => chat.getByRole('button', { name: 'Send', exact: true }).click(), 'chat-edit')
  await expect(margin).toHaveValue(followup)
  await chat.getByRole('button', { name: 'Close chat panel' }).click()
  await block.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/live-whales-desktop.png' })
  await page.setViewportSize({ width: 390, height: 900 })
  await block.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/live-whales-mobile.png' })
  await block.getByLabel('Artifact settings', { exact: true }).click()
  await block.getByText('Versions', { exact: true }).click()
  await block.getByRole('button', { name: 'Undo edit', exact: true }).click()
  await expect(margin).toHaveValue(first)
  console.log('PASS: margin → live edit → live chat follow-up → latest margin context → undo.')
} finally {
  await browser.close()
}
