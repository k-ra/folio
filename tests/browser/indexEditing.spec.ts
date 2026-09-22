import { test, expect } from './fixtures'

test('old Markdown opens as editable prose, keeps formatting, and leaves the original untouched', async ({
  page,
}) => {
  await page.goto('/')
  const old =
    '## A thought\n\n**Bold** and *quiet* words.\n\n- first\n- second\n\n| A | B |\n| --- | --- |\n| one | two |'
  await page.evaluate(
    (value) => localStorage.setItem('folio.index-study.v3:browser:s-offline-chat', value),
    old,
  )
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await page.getByRole('button', { name: 'Open offline chat sample', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Index', exact: true })
  await expect(editor.locator('h2')).toHaveText('A thought')
  await expect(editor.locator('strong')).toHaveText('Bold')
  await expect(editor.locator('em')).toHaveText('quiet')
  await expect(editor.locator('li')).toHaveCount(2)
  await expect(editor.locator('td')).toHaveCount(2)
  await editor.locator('p').first().click()
  await page.keyboard.type('Hello ')
  await expect(editor).toContainText('Hello')
  await page.getByRole('button', { name: 'CHAT', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  await editor.focus()
  await editor.press('ControlOrMeta+z')
  await expect(editor).not.toContainText('Hello')
  await editor.press('ControlOrMeta+Shift+z')
  await expect(editor).toContainText('Hello')
  expect(await page.evaluate(() => localStorage.getItem('folio.index-study.v3:browser:s-offline-chat'))).toBe(
    old,
  )
  await page.reload()
  await page.getByRole('button', { name: 'Homepage settings', exact: true }).click()
  await page.getByRole('button', { name: 'Open offline chat sample', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  await expect(editor).toContainText('Hello')
  await expect(editor.locator('h2')).toHaveText('A thought')
  await expect(editor.locator('li')).toHaveCount(2)
  await expect(editor.locator('td')).toHaveCount(2)
})
