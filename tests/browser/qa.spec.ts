import { readFile } from 'node:fs/promises'
import { test, expect } from './fixtures'

test('writing, ordinary margin notes, style history, and reload stay intact without runtime errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'New Story' }).click()
  await page.getByPlaceholder('Untitled', { exact: true }).fill('Writing QA')
  await page.getByPlaceholder('Begin.', { exact: true }).fill('First paragraph.')
  await page.locator('textarea:focus').press('End')
  await page.locator('textarea:focus').press('Enter')
  await page.locator('textarea:focus').fill('Second paragraph.')
  await page.locator('textarea:focus').press('End')
  await page.locator('textarea:focus').press('Enter')
  await page.locator('textarea:focus').press('Backspace')
  await expect(page.locator('textarea:focus')).toHaveValue('Second paragraph.')
  // The note affordance follows the mouse and intentionally fades during keyboard-only writing.
  await page.locator('textarea:focus').hover()
  await page.getByRole('button', { name: '+ NOTE', exact: true }).click()
  await page.getByPlaceholder('a note in the margin').fill('Keep this small thought.')
  await page.getByPlaceholder('Untitled', { exact: true }).click()
  await page.getByRole('button', { name: 'Open style' }).click()
  const style = page.getByRole('region', { name: 'Style panel', exact: true })
  await style.getByRole('button', { name: 'Background', exact: true }).click()
  await style.getByText('Adjust colors', { exact: true }).click()
  await style.getByLabel('Paper color', { exact: true }).fill('#ebe5d9')
  await style.getByRole('button', { name: 'Apply', exact: true }).click()
  await style.getByRole('button', { name: 'Close style' }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(235, 229, 217)')
  await page.getByTitle('History', { exact: true }).click()
  await page.getByRole('button').filter({ hasText: 'Restyled' }).first().click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(253, 251, 246)')
  await expect(page.getByPlaceholder('a note in the margin')).toHaveValue('Keep this small thought.')
  await expect(page.getByText(/WORDS · SAVED/)).toBeVisible()
  await page.reload()
  await page.getByText('Writing QA', { exact: true }).first().click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(253, 251, 246)')
  await expect(page.getByPlaceholder('a note in the margin')).toHaveValue('Keep this small thought.')
  await expect(page.locator('.essay-main textarea')).toHaveCount(4)
  await expect(page.locator('.essay-main textarea').nth(1)).toHaveValue('First paragraph.')
  await expect(page.locator('.essay-main textarea').nth(2)).toHaveValue('Second paragraph.')
  await page.screenshot({ path: 'test-results/writing-qa.png' })
  expect(errors).toEqual([])
})

test('unavailable local storage keeps editing available and exports the current story', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open() {
          throw new DOMException('Storage unavailable', 'SecurityError')
        },
      },
    })
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Export a backup')
  await page.getByRole('button', { name: 'New Story' }).click()
  await page.getByPlaceholder('Untitled', { exact: true }).fill('Unsaved but recoverable')
  await page.getByPlaceholder('Begin.', { exact: true }).fill('This text must be in the backup.')
  await expect(page.getByText(/LOCAL SAVE FAILED/)).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const backup = await downloaded
  expect(backup.suggestedFilename()).toBe('folio-backup.json')
  const stories = JSON.parse(await readFile((await backup.path())!, 'utf8')) as {
    title: string
    blocks: { text?: string }[]
  }[]
  expect(
    stories
      .find((s) => s.title === 'Unsaved but recoverable')
      ?.blocks.some((b) => b.text === 'This text must be in the backup.'),
  ).toBe(true)
})

test('bad CSV shows a recoverable error; replacing it produces the real data', async ({ page }) => {
  await page.goto('/?qa=essay')
  const block = page.getByTestId('magic-whales-rhythm')
  await block.getByRole('button', { name: 'Data', exact: true }).click()
  await block.getByLabel('Attach files to data block').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Day,Value\nMon,not-a-number'),
  })
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(block.getByRole('alert')).toContainText('numeric column')
  await expect(block.getByLabel('Magic prompt', { exact: true })).not.toHaveValue('')
  await block.getByRole('button', { name: 'Remove bad.csv', exact: true }).click()
  await block.getByLabel('Attach files to data block').setInputFiles({
    name: 'good.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Day,Value\nMon,12\nTue,21'),
  })
  await block.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(block.getByRole('img', { name: 'Tue: 21', exact: true })).toBeVisible()
  await expect(block.locator('.artifact-caption')).toHaveText('Source: good.csv')
  await expect(block.getByRole('alert')).toHaveCount(0)
})
