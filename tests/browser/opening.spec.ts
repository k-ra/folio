import { test, expect } from './fixtures'

test('keyboard opening is a single short paper transition and preserves the story surface', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate
    const durations: number[] = []
    Object.assign(window, { openingDurations: durations })
    Element.prototype.animate = function (frames, options) {
      if (this.parentElement?.getAttribute('data-testid') === 'story-opening') {
        durations.push(Number(typeof options === 'object' ? options.duration : options))
      }
      return animate.call(this, frames, options)
    }
  })
  await page.goto('/')
  const cover = page.getByRole('button', { name: 'Open A study in color', exact: true }).first()
  await cover.focus()
  await cover.press('Enter')
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('A study in color')
  await expect(page.getByTestId('story-opening')).toHaveCount(0)
  const durations = await page.evaluate(
    () => (window as Window & { openingDurations: number[] }).openingDurations,
  )
  expect(durations.length).toBeGreaterThan(0)
  expect(durations.every((duration) => duration === 260)).toBe(true)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(152, 173, 154)')
})

test('library entries open through the same transition; rapid new-story clicks create only one story', async ({
  page,
}) => {
  await page.goto('/')
  const libraryStory = page.getByRole('button', {
    name: 'Open A small field guide',
    exact: true,
  })
  await libraryStory.scrollIntoViewIfNeeded()
  await libraryStory.click()
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('A small field guide')
  await expect(page.getByTestId('story-opening')).toHaveCount(0)
  await page.getByRole('button', { name: /All stories/ }).click()
  await page.getByRole('button', { name: 'New Story', exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
    button.click()
  })
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toBeFocused()
  await expect(page.getByPlaceholder('Begin.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /All stories/ }).click()
  // One in the deck and one in the library, rather than three newly created stories.
  await expect(page.getByRole('button', { name: 'Open Untitled', exact: true })).toHaveCount(2)
})

test('reduced motion opens directly without an animated overlay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page
    .getByRole('button', {
      name: 'Open Listening before translating',
      exact: true,
    })
    .first()
    .click()
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Listening before translating')
  await expect(page.getByTestId('story-opening')).toHaveCount(0)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(253, 251, 246)')
})

for (const interruption of ['canceled', 'paused', 'unavailable'] as const) {
  test(`an ${interruption} browser animation cannot strand a new story`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript((mode) => {
      const animate = Element.prototype.animate
      if (mode === 'unavailable') {
        Object.defineProperty(Element.prototype, 'animate', {
          value: undefined,
        })
        return
      }
      Element.prototype.animate = function (frames, options) {
        const animation = animate.call(this, frames, options)
        if (this.parentElement?.getAttribute('data-testid') === 'story-opening') {
          if (mode === 'paused') animation.pause()
          else queueMicrotask(() => animation.cancel())
        }
        return animation
      }
    }, interruption)
    await page.goto('/')
    await page.getByRole('button', { name: 'New Story', exact: true }).click()
    await expect(page.getByPlaceholder('Untitled', { exact: true })).toBeFocused()
    await expect(page.getByTestId('story-opening')).toHaveCount(0)
    await page.getByRole('button', { name: /All stories/ }).click()
    await expect(page.getByRole('button', { name: 'Open Untitled', exact: true })).toHaveCount(2)
    expect(errors).toEqual([])
  })
}
