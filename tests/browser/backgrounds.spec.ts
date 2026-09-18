import { test, expect, type Page } from './fixtures'

async function openBackgrounds(page: Page) {
  await page.getByRole('button', { name: 'Open style' }).click()
  const panel = page.getByRole('region', { name: 'Style panel', exact: true })
  await panel.getByRole('button', { name: 'Background', exact: true }).click()
  return panel
}

test('gradient controls preview, reset, apply and reopen without losing the chosen colors', async ({
  page,
}) => {
  await page.goto('/?qa=essay')
  const panel = await openBackgrounds(page)
  await panel.getByRole('button', { name: 'Gradient', exact: true }).click()
  await expect(panel.getByLabel('Gradient angle')).toHaveCSS('accent-color', 'rgb(17, 17, 17)')
  await panel.getByLabel('Gradient start color').fill('#345678')
  await expect(page.locator('.page-backdrop')).toHaveCSS('background-image', /rgb\(52, 86, 120\)/)
  await panel.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator('.page-backdrop')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Gradient', exact: true }).click()
  await panel.getByRole('button', { name: 'Sea glass', exact: true }).click()
  await page.screenshot({ path: 'test-results/background-gradient.png' })
  await panel.getByRole('button', { name: 'Apply', exact: true }).click()
  await panel.getByRole('button', { name: 'Close style' }).click()
  await expect(page.locator('.page-backdrop')).toHaveCSS('background-image', /rgb\(219, 232, 225\)/)
  await openBackgrounds(page)
  await expect(panel.getByLabel('Gradient start color')).toHaveValue('#dbe8e1')
  await panel.getByLabel('Gradient end color').fill('#ff0000')
  await panel.getByRole('button', { name: 'Close style' }).click()
  await expect(page.locator('.page-backdrop')).not.toHaveCSS('background-image', /rgb\(255, 0, 0\)/)
})

test('custom CSS is scriptless, network-isolated and static with reduced motion', async ({ page }) => {
  const leaks: string[] = []
  // Chromium can emit a request event even for a CSP-blocked attempt. A route
  // intercept records only requests that would actually reach the network.
  await page.route('https://background-leak.invalid/**', (route) => {
    leaks.push(route.request().url())
    return route.abort()
  })
  await page.goto('/?qa=essay')
  const panel = await openBackgrounds(page)
  await panel.getByRole('button', { name: 'Custom code', exact: true }).click()
  await panel.getByText('Edit the CSS', { exact: true }).click()
  await panel
    .getByLabel('Background CSS', { exact: true })
    .fill(
      'body{background:#abcdef;background-image:url(https://background-leak.invalid/a)} body::before{content:"";animation:pulse 1s infinite}@keyframes pulse{to{opacity:0}}</style><script>parent.backgroundHacked=true</script>',
    )
  await panel.getByRole('button', { name: 'Preview code', exact: true }).click()
  const frame = page.locator('.page-backdrop iframe')
  await expect(frame).toHaveAttribute('sandbox', '')
  await expect(frame.contentFrame().locator('body')).toHaveCSS('background-color', 'rgb(171, 205, 239)')
  expect(await page.evaluate(() => 'backgroundHacked' in window)).toBe(false)
  expect(leaks).toHaveLength(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(frame.contentFrame().locator('body')).toHaveCSS('background-color', 'rgb(253, 251, 246)')
  await expect(frame).toHaveAttribute('srcdoc', /body\{background:#fdfbf6\}<\/style>/)
})

test('only explicit generation requests a background; errors and cancellation preserve the current draft', async ({
  page,
}) => {
  let attempts = 0
  let release: (() => void) | undefined
  await page.route('**/api/magic/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/style', async (route) => {
    attempts++
    expect(route.request().postDataJSON().instruction).toBe('An underwater glow')
    if (attempts === 1)
      return route.fulfill({
        status: 502,
        json: {
          error: 'Test generator unavailable. Current background unchanged.',
        },
      })
    if (attempts === 2)
      await new Promise<void>((resolve) => {
        release = resolve
      })
    await route
      .fulfill({
        json: {
          name: 'Underwater',
          direction: 'An underwater glow',
          reply: 'A gentle glow.',
          background: '#fdfbf6',
          ink: '#111111',
          css: 'body{background:#abcdef}',
          sample: '',
        },
      })
      .catch(() => {})
  })
  await page.goto('/?qa=essay')
  const panel = await openBackgrounds(page)
  await panel.getByRole('button', { name: 'Gradient', exact: true }).click()
  await panel.getByRole('button', { name: 'Custom code', exact: true }).click()
  await panel.getByLabel('Custom style message').fill('An underwater glow')
  expect(attempts).toBe(0)
  await panel.getByRole('button', { name: 'Create custom style', exact: true }).click()
  await expect(panel.getByRole('alert')).toContainText('Test generator unavailable')
  await expect(page.locator('.page-backdrop')).toHaveAttribute('data-backdrop', 'gradient')
  await panel.getByRole('button', { name: 'Create custom style', exact: true }).click()
  await expect.poll(() => attempts).toBe(2)
  await expect(panel.getByLabel('Custom style message')).toBeDisabled()
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(panel.getByLabel('Custom style message')).toBeEnabled()
  release?.()
  await expect(page.locator('.page-backdrop')).toHaveAttribute('data-backdrop', 'gradient')
  await panel.getByRole('button', { name: 'Create custom style', exact: true }).click()
  await expect(page.locator('.page-backdrop')).toHaveAttribute('data-backdrop', 'custom')
  await page.screenshot({ path: 'test-results/background-custom.png' })
  await panel.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator('.page-backdrop')).toHaveCount(0)
})
