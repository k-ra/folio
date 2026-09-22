import { test, expect } from '../../../tests/browser/fixtures'

test('clippings retain selected words and conversation, deduplicate and survive reload without AI', async ({
  page,
}) => {
  await page.goto('/prototypes/tracing/')
  const reply = page.getByRole('region', { name: 'Folio message' }),
    text = reply.locator('p')
  // Select only the first sentence, not the whole response.
  await text.evaluate((el) => {
    const node = el.firstChild!,
      end = node.textContent!.indexOf('.') + 1
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, end)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
  })
  await reply.getByRole('button', { name: 'Keep', exact: true }).click()
  await reply.getByRole('button', { name: 'Keep', exact: true }).click()
  await reply.getByRole('button', { name: 'In index', exact: true }).click()
  const index = page.getByRole('region', { name: 'Tracing index' })
  await expect(index.locator('.clipping')).toHaveCount(1)
  await expect(index.locator('.excerpt')).toHaveText(
    'Perhaps the interval matters as much as the observation.',
  )
  await index.locator('.excerpt').click()
  await expect(index.getByRole('region', { name: 'Saved conversation' })).toContainText(
    'Keep interpretation separate from the record',
  )
  await page.screenshot({ path: test.info().outputPath('index-desktop.png') })
  await index.getByRole('button', { name: 'Open research chat' }).click()
  await expect(reply).toHaveClass(/highlight/)
  await page.getByLabel('Research note').fill('My own observation, without a model.')
  await page.getByRole('button', { name: 'Add note', exact: true }).click()
  const own = page.getByRole('region', { name: 'You message' }).last()
  await own.getByRole('button', { name: 'Keep', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Open index', exact: true }).click()
  await expect(index.locator('.clipping')).toHaveCount(2)
  await expect(index).toContainText('My own observation, without a model.')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('index-mobile.png') })
  expect((await index.boundingBox())!.width).toBeLessThan(390)
})

test('artifact rail exists only on selection and does not pollute research or the index', async ({
  page,
}) => {
  await page.goto('/prototypes/tracing/')
  const right = page.getByRole('complementary', { name: 'Graphic conversation' })
  await expect(right).toHaveCount(0)
  await page.getByRole('button', { name: 'Open graphic editing' }).click()
  await expect(right).toBeVisible()
  await right.getByLabel('Graphic instruction').fill('Use small dots instead of a line.')
  await right.getByRole('button', { name: 'Note instruction' }).click()
  await expect(right).toContainText('Use small dots instead of a line.')
  await expect(page.getByRole('complementary', { name: 'Research chat' })).not.toContainText('Use small dots')
  await page.screenshot({ path: test.info().outputPath('two-conversations.png') })
  await right.getByRole('button', { name: 'Close graphic conversation' }).click()
  await expect(right).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Graphic conversation' })).toHaveCount(0)
})
