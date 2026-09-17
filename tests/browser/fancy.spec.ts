import { test, expect, type Page } from './fixtures'
import { DEF_STYLE } from '../../src/model/constants'
import { DEFAULT_FANCY } from '../../src/fancy/contract'

async function openTextStory(page: Page) {
  await page.addInitScript(
    (style) =>
      localStorage.setItem(
        'folio.stories.v1',
        JSON.stringify([
          {
            id: 'type-story',
            title: 'Words in motion',
            date: 'TODAY',
            thumb: 'lines',
            style,
            blocks: [
              { id: 'intro', type: 'text', text: 'A small study of rhythm and type.' },
              {
                id: 'type',
                type: 'fancy',
                text: 'heyyyy',
                prompt: '',
                fancy: { size: 42, align: 'left', font: 'body', italic: false, pad: 30, ls: 0 },
              },
            ],
            notes: { type: 'An existing editorial note.' },
            chats: {},
          },
        ]),
      ),
    DEF_STYLE,
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Open Words in motion', exact: true }).first().click()
  await expect(page.getByPlaceholder('Untitled', { exact: true })).toHaveValue('Words in motion')
}

for (const width of [1440, 390]) {
  test(`fancy text has a shared styling conversation, editable motion, and reversible styles at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 })
    const requests: any[] = []
    let generalCalls = 0
    await page.route('**/api/chat', (route) => {
      generalCalls++
      return route.abort()
    })
    await page.route('**/api/fancy', (route) => {
      const request = route.request().postDataJSON()
      requests.push(request)
      return route.fulfill({
        json: {
          fancy: { ...request.previous, motion: 'marquee', duration: requests.length === 1 ? 16 : 32 },
          reply:
            requests.length === 1 ? 'Your words now move as a marquee.' : 'Slower, with the same typography.',
        },
      })
    })
    await openTextStory(page)
    const block = page.getByTestId('fancy-type')
    const source = block.getByLabel('Fancy text', { exact: true })
    const margin = block.getByLabel('Text style instruction', { exact: true })
    await source.focus()
    await expect(block).not.toContainText('FANCY')
    await expect(block.getByLabel('a note in the margin', { exact: true })).toHaveValue(
      'An existing editorial note.',
    )
    await margin.fill('Make it a marquee lol')
    expect(requests).toHaveLength(0)
    await block.getByRole('button', { name: 'Send to chat', exact: true }).click()
    const chat = page.getByRole('region', { name: 'Text styling chat' })
    await expect(chat.getByRole('heading')).toHaveText('CHAT')
    await expect(chat.getByRole('log')).toContainText('Your words now move as a marquee.')
    await expect(chat.getByLabel('Editing artifact')).toContainText('Styling text · heyyyy')
    await expect(page.getByRole('button', { name: 'Open chat', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await chat.getByLabel('Chat message').fill('Make it slower; keep everything else')
    await chat.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(chat.getByRole('log')).toContainText('Slower, with the same typography.')
    await expect(margin).toHaveValue('Make it slower; keep everything else')
    expect(generalCalls).toBe(0)
    expect(requests).toHaveLength(2)
    expect(requests[0].text).toBe('heyyyy')
    expect(requests[1].previous).toMatchObject({ size: 42, font: 'body', motion: 'marquee', duration: 16 })
    expect(requests[1].history.map((m: any) => m.text)).toContain('Make it a marquee lol')
    await chat.getByRole('button', { name: 'Close chat panel' }).click()
    await block.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    const track = block.locator('.fancy-motion-track')
    await expect(track).toHaveCSS('animation-duration', '32s')
    await expect.poll(() => track.evaluate((el) => el.getAnimations()[0]?.playState)).toBe('running')
    const before = await track.evaluate((el) => Number(el.getAnimations()[0]?.currentTime))
    await expect
      .poll(() => track.evaluate((el) => Number(el.getAnimations()[0]?.currentTime)))
      .toBeGreaterThan(before + 30)
    await block.getByRole('button', { name: 'Pause text animation' }).click()
    await expect(track).toHaveCSS('animation-play-state', 'paused')
    await block.getByRole('button', { name: 'Resume text animation' }).click()
    await page.screenshot({ path: `test-results/fancy-marquee-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    // Reduced motion keeps all the words available, once, without animation.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(track).toHaveCSS('animation-name', 'none')
    await expect(block.locator('.fancy-motion-copy[aria-hidden]')).not.toBeVisible()
    await expect(block.getByRole('button', { name: 'Pause text animation' })).not.toBeVisible()
    await block.getByRole('button', { name: 'Edit fancy text', exact: true }).focus()
    await block.getByRole('button', { name: 'Edit fancy text', exact: true }).press('Enter')
    await expect(source).toBeFocused()
    await source.fill('The original words stay editable.')
    await margin.focus()
    await block.getByLabel('Text style versions', { exact: true }).click()
    await block.getByRole('button', { name: 'Undo style', exact: true }).click()
    await expect(block.locator('.fancy-surface')).toHaveCSS('--fancy-duration', '16s')
    await block.getByRole('button', { name: 'Undo style', exact: true }).click()
    await expect(source).toHaveValue('The original words stay editable.')
    await expect(source).toHaveCSS('font-size', '42px')
    await expect(margin).toHaveValue('')
    await block.getByRole('button', { name: 'Redo style', exact: true }).click()
    await expect(block.locator('.fancy-motion-copy').first()).toHaveText('The original words stay editable.')
    await expect(margin).toHaveValue('Make it a marquee lol')
    await expect(page.getByText(/WORDS · SAVED/)).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Open Words in motion', exact: true }).first().click()
    await expect(block.locator('.fancy-motion-copy').first()).toHaveText('The original words stay editable.')
    await expect(margin).toHaveValue('Make it a marquee lol')
    await block.getByRole('button', { name: 'Open in chat', exact: true }).click()
    await expect(chat.getByRole('log')).toContainText('Make it slower; keep everything else')
    expect(requests).toHaveLength(2)
  })
}

test('the orb targets fancy text; failures and cancellation preserve the text and its current style', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: any[] = []
  let release!: () => void
  await page.route('**/api/fancy', async (route) => {
    requests.push(route.request().postDataJSON())
    if (requests.length === 1) return route.fulfill({ status: 502, json: { error: 'Model unavailable' } })
    await new Promise<void>((r) => {
      release = r
    })
    await route
      .fulfill({ json: { fancy: { ...DEFAULT_FANCY, size: 96, motion: 'marquee' }, reply: 'Late result' } })
      .catch(() => {})
  })
  await openTextStory(page)
  const block = page.getByTestId('fancy-type')
  await block.getByLabel('Fancy text', { exact: true }).focus()
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  const chat = page.getByRole('region', { name: 'Text styling chat' })
  await expect(chat).toBeVisible()
  expect(requests).toHaveLength(0)
  await chat.getByLabel('Chat message').fill('Make it a marquee')
  await chat.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(chat.getByRole('alert')).toContainText('Model unavailable')
  await expect(block.getByLabel('Fancy text', { exact: true })).toHaveValue('heyyyy')
  await expect(block.getByLabel('Fancy text', { exact: true })).toHaveCSS('font-size', '42px')
  await expect(block.getByLabel('Text style instruction', { exact: true })).toHaveValue('Make it a marquee')
  await chat.getByLabel('Chat message').fill('Try again')
  await chat.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(chat.getByRole('status')).toContainText('Styling your text')
  await chat.getByRole('button', { name: 'Cancel', exact: true }).click()
  release()
  await expect(chat.getByRole('status')).toHaveCount(0)
  await expect(block.getByLabel('Fancy text', { exact: true })).toHaveCSS('font-size', '42px')
  await expect(chat.getByRole('log')).not.toContainText('Late result')
  await chat.getByLabel('Chat message').fill('Keep this styling draft')
  await page.locator('textarea[data-id="intro"]').focus()
  const storyChat = page.getByRole('region', { name: 'Chat', exact: true })
  await expect(storyChat.getByLabel('Chat message')).toHaveValue('')
  await block.getByLabel('Fancy text', { exact: true }).focus()
  await expect(chat.getByLabel('Chat message')).toHaveValue('Keep this styling draft')
})
