import { readFile } from 'node:fs/promises'
import { test, expect } from './fixtures'

test('the mock essay opens as a normal story and saves edits without a playground UI', async ({ page }) => {
  let generations = 0
  await page.route(/\/api\/(magic|chat|background)$/, (route) => {
    generations++
    return route.abort()
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Playground', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.playground-bar')).toHaveCount(0)
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
  await expect(page.locator('textarea.prose-input[data-id^="whales-"]')).toHaveCount(5)
  await expect(
    page.locator('[data-block-id="whales-language"]').getByPlaceholder('a note in the margin'),
  ).toHaveValue(/finding a pattern/)
  const draft = page.getByTestId('magic-whales-rhythm')
  await expect(draft.getByLabel('Magic prompt', { exact: true })).toHaveValue(/illustrative pattern/)
  await expect(draft.getByRole('button', { name: 'Create', exact: true })).toBeEnabled()
  await expect(page.getByTestId('magic-whales-abundance').getByRole('img')).toHaveCount(35)
  await expect(page.getByText('Source notes', { exact: true })).toBeVisible()
  expect(generations).toBe(0)
  await page.screenshot({ path: 'test-results/mock-essay-story.png', fullPage: true })
  await page.locator('textarea[data-id="whales-listening"]').fill('A real edit to the mock essay.')
  await expect(page.getByText(/WORDS · SAVED/)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Open Listening before translating', exact: true }).first().click()
  await expect(page.locator('textarea[data-id="whales-listening"]')).toHaveValue(
    'A real edit to the mock essay.',
  )
  await expect(page.getByTestId('magic-whales-abundance').getByRole('img')).toHaveCount(35)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Story history', exact: true })).toContainText('Writing')
})

test('real whale CSV is attached, attributed, downloadable, and editable without changing its series', async ({
  page,
}) => {
  await page.goto('/?qa=essay&story=whales')
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
  const chart = page.getByTestId('magic-whales-abundance')
  await expect(chart.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
  await expect(chart.getByRole('img', { name: '1990: 289', exact: true })).toBeVisible()
  await expect(chart.getByRole('img')).toHaveCount(35)
  await expect(chart.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
  await expect(page.locator('.story-sources')).not.toHaveAttribute('open')
  await chart.getByRole('button', { name: 'Open in chat', exact: true }).click()
  await chart.getByLabel('Artifact settings', { exact: true }).click()
  await page.getByText('Sources & generation', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove right-whale-abundance.csv', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Chat message', { exact: true }).fill('Make this a bar chart')
  await page.getByLabel('Chat message', { exact: true }).press('Enter')
  await expect(chart.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
  await expect(chart.getByLabel('Edit instruction', { exact: true })).toHaveValue('Make this a bar chart')
  await expect(chart.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close chat panel', exact: true }).click()
  await page.getByText('Source notes', { exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download original CSV', exact: true }).click()
  const file = await download
  const content = await readFile((await file.path())!, 'utf8')
  expect(content).toContain('"N[35]",2024,375,384,394,384.268,4.908')
  expect(content.trim().split('\n')).toHaveLength(36)
  await page.screenshot({ path: 'test-results/whales-desktop.png', fullPage: true })
  await page.getByRole('button', { name: /Reset playground/ }).click()
  await expect(chart.getByLabel('Edit instruction', { exact: true })).toHaveValue(/Median/)
  await expect(
    page.getByTestId('magic-whales-rhythm').getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible()
})

test('whale example and review controls fit mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?qa=essay&story=whales')
  const chart = page.getByTestId('magic-whales-abundance')
  await chart.scrollIntoViewIfNeeded()
  await expect(chart.getByRole('button', { name: 'Open in chat', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await expect(page.getByLabel('Playground paper')).toBeVisible()
  await page.screenshot({ path: 'test-results/whales-mobile.png', fullPage: true })
})

test('upload accepts a CSV above 2 MB and explains the new maximum', async ({ page }) => {
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByRole('button', { name: 'Data', exact: true }).click()
  await block.getByLabel('Attach files to data block').setInputFiles({
    name: 'large.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Label,Value\n"' + 'a'.repeat(3 * 1024 * 1024) + '",12'),
  })
  await expect(block.getByRole('button', { name: 'Remove large.csv', exact: true })).toBeVisible()
  await expect(block.getByRole('alert')).toHaveCount(0)
  await block.getByLabel('Attach files to data block').setInputFiles({
    name: 'too-large.csv',
    mimeType: 'text/csv',
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  })
  await expect(block.getByRole('alert')).toContainText('20 MB')
  await expect(block.getByRole('button', { name: 'Remove large.csv', exact: true })).toBeVisible()
})
