import { test, expect, type Locator } from './fixtures'

async function expectOutline(surface: Locator, visible: boolean) {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    await expect(surface).toHaveCSS(`border-${side}-width`, '1px')
    if (visible) await expect(surface).not.toHaveCSS(`border-${side}-color`, 'rgba(0, 0, 0, 0)')
    else await expect(surface).toHaveCSS(`border-${side}-color`, 'rgba(0, 0, 0, 0)')
  }
}

for (const width of [1440, 390]) {
  test(`prose, prompts, and finished artifacts have distinct selection states at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?qa=essay')
    await expect(page.getByLabel('Playground paper', { exact: true })).toBeVisible()
    const toolbar = await page.locator('.playground-bar').boundingBox()
    expect(toolbar!.x).toBeGreaterThanOrEqual(0)
    expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(width)
    expect(await page.locator('.playground-bar').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    )

    const prose = page.locator('textarea.prose-input[data-id="whales-listening"]')
    await prose.click()
    await expect(prose).toBeFocused()
    await expect(prose).toHaveCSS('outline-style', 'none')
    await expect(prose).toHaveCSS('border-left-width', '1px')
    await expect(prose).toHaveCSS('border-left-color', 'rgba(0, 0, 0, 0)')
    for (const side of ['top', 'right', 'bottom'])
      await expect(prose).toHaveCSS(`border-${side}-width`, '0px')
    await page.screenshot({
      path: `test-results/prose-selection-${width}.png`,
    })

    const prompt = page.getByTestId('magic-whales-rhythm')
    await expectOutline(prompt.locator('.magic-surface'), true)
    await expect(prompt.locator('.prompt-guidance, .magic-composer-heading')).toHaveCount(0)
    await expect(prompt.getByLabel('Magic prompt', { exact: true })).not.toHaveValue('')
    await expect(prompt.getByText('Prompt', { exact: true })).toHaveCount(0)
    await expect(prompt.getByLabel('Generation provider')).not.toBeVisible()
    await expect(prompt.getByLabel('Prompt settings', { exact: true })).toBeVisible()
    await prompt.getByLabel('Magic prompt', { exact: true }).click()
    await expect(prompt.getByLabel('Magic prompt', { exact: true })).toHaveCSS('outline-style', 'none')
    await expectOutline(prompt.locator('.magic-surface'), true)
    await prompt.getByRole('button', { name: 'Data', exact: true }).click()
    await expect(prompt.getByLabel('Prompt settings', { exact: true })).toBeVisible()
    await expect(prompt.getByLabel('Attach files to data block')).toHaveCount(1)
    await prompt.getByRole('button', { name: 'Graphics', exact: true }).click()
    await expect(prompt.getByLabel('Generation provider')).not.toBeVisible()
    await expect
      .poll(() =>
        prompt
          .getByLabel('Magic prompt', { exact: true })
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      )
      .toBe(true)
    await prompt.screenshot({
      path: `test-results/prompt-selection-${width}.png`,
    })

    const artifact = page.getByTestId('magic-whales-abundance').locator('.magic-surface.has-artifact')
    await expectOutline(artifact, false)
    await artifact.click({ position: { x: 8, y: 8 } })
    await expect(artifact).toHaveClass(/is-selected/)
    await expectOutline(artifact, true)
    await page.screenshot({
      path: `test-results/artifact-selection-${width}.png`,
    })
    await prose.click()
    await expect(artifact).not.toHaveClass(/is-selected/)
    await expectOutline(artifact, false)

    await artifact.focus()
    await expect(artifact).toBeFocused()
    await expect(artifact).toHaveAttribute('tabindex', '0')
    await expectOutline(artifact, true)
    await expect(artifact).toHaveCSS('outline-style', 'none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

for (const initialPaper of ['folio', 'tide']) {
  test(`playground paper changes preserve edits and charts; Reset restores ${initialPaper} without storage writes`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const writes: string[] = []
      Object.defineProperty(window, '__qaStorageWrites', { value: writes })
      const transaction = IDBDatabase.prototype.transaction
      IDBDatabase.prototype.transaction = function (...args) {
        if (args[1] === 'readwrite') writes.push('IndexedDB transaction')
        return transaction.apply(this, args)
      }
      const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        // Supabase uses short-lived localStorage locks even while offline; they are not story writes.
        if (!key.startsWith('lswt-')) writes.push(`Storage set: ${key}`)
        return setItem.call(this, key, value)
      }
      const removeItem = Storage.prototype.removeItem
      Storage.prototype.removeItem = function (key) {
        if (!key.startsWith('lswt-')) writes.push(`Storage remove: ${key}`)
        return removeItem.call(this, key)
      }
      const clear = Storage.prototype.clear
      Storage.prototype.clear = function () {
        writes.push('Storage clear')
        return clear.call(this)
      }
    })
    await page.goto(`/?qa=essay&paper=${initialPaper}`)
    const paper = page.getByLabel('Playground paper', { exact: true })
    const prompt = page.getByTestId('magic-whales-rhythm').getByLabel('Magic prompt', { exact: true })
    const chart = page.getByTestId('magic-whales-abundance')
    await expect(paper).toHaveValue(initialPaper)
    const originalPrompt = await prompt.inputValue()
    await prompt.fill('Keep this unsubmitted prompt while changing paper.')
    const margin = chart.getByLabel('Edit instruction', { exact: true })
    await margin.fill('Keep this margin draft too.')
    for (const nextPaper of ['tide', 'alphabet', 'folio']) {
      await paper.selectOption(nextPaper)
      await expect(paper).toHaveValue(nextPaper)
      await expect(prompt).toHaveValue('Keep this unsubmitted prompt while changing paper.')
      await expect(margin).toHaveValue('Keep this margin draft too.')
      await expect(chart.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
      await expect(chart.locator('.artifact-caption')).toHaveText('Source: right-whale-abundance.csv')
    }
    await page.getByRole('button', { name: 'Reset playground' }).click()
    await expect(paper).toHaveValue(initialPaper)
    await expect(prompt).toHaveValue(originalPrompt)
    await expect(margin).toHaveValue(
      'Plot the Median North Atlantic right whale population estimate as a thin line.',
    )
    await expect(chart.getByRole('img', { name: '2024: 384', exact: true })).toBeVisible()
    expect(
      await page.evaluate(() => (window as Window & { __qaStorageWrites: string[] }).__qaStorageWrites),
    ).toEqual([])
  })
}
