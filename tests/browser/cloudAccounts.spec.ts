import { test, expect } from './fixtures'
import { example } from '../storyFixture'

test('accounts require explicit browser import, deduplicate, isolate libraries, and recover failed saves', async ({
  page,
}) => {
  test.skip(process.env.FOLIO_QA_CLOUD !== '1', 'Run with the documented offline cloud QA build.')
  let active = 'a',
    fail = false,
    writes = 0
  const rows: Record<
    string,
    Record<string, { id: string; version: number; story: ReturnType<typeof example> | null }>
  > = { a: {}, b: {} }
  const uid = (owner: string) =>
    owner === 'a' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002'
  const user = () => ({
    id: uid(active),
    aud: 'authenticated',
    role: 'authenticated',
    email: `${active}@example.test`,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  })
  const token = () =>
    `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: uid(active), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
  await page.route('https://folio-qa.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path.endsWith('/otp')) return route.fulfill({ json: {}, headers })
    if (path.endsWith('/verify'))
      return route.fulfill({
        headers,
        json: {
          access_token: token(),
          refresh_token: 'refresh-' + active,
          expires_in: 3600,
          token_type: 'bearer',
          user: user(),
        },
      })
    if (path.endsWith('/logout')) return route.fulfill({ json: {}, headers })
    const auth = route.request().headers().authorization || ''
    let owner = ''
    try {
      owner = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString()).sub === uid('a') ? 'a' : 'b'
    } catch {}
    if (!owner)
      return route.fulfill({
        status: 401,
        json: { message: 'Unauthorized' },
        headers,
      })
    if (path.endsWith('/folio_stories')) return route.fulfill({ json: Object.values(rows[owner]), headers })
    if (path.endsWith('/save_folio_story')) {
      if (fail)
        return route.fulfill({
          status: 503,
          json: { message: 'Simulated cloud outage' },
          headers,
        })
      const data = route.request().postDataJSON(),
        prior = rows[owner][data.story_id]
      if ((prior?.version || 0) !== data.expected_version)
        return route.fulfill({
          status: 409,
          json: { code: '40001', message: 'Conflict' },
          headers,
        })
      const saved = {
        id: data.story_id,
        version: data.expected_version + 1,
        story: data.content,
      }
      rows[owner][data.story_id] = saved
      writes++
      return route.fulfill({ json: saved, headers })
    }
    return route.fulfill({ status: 404, json: {}, headers })
  })
  await page.goto('/?qa=essay')
  await page.evaluate(async (story) => {
    await new Promise<void>((resolve) => {
      const r = indexedDB.open('folio-artifacts-v2', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('workspace')
      r.onsuccess = () => {
        const tx = r.result.transaction('workspace', 'readwrite')
        tx.objectStore('workspace').put([story], 'stories')
        tx.objectStore('workspace').put(true, 'mock-essay-v1')
        tx.oncomplete = () => {
          r.result.close()
          resolve()
        }
      }
    })
  }, example())
  await page.evaluate(() =>
    localStorage.setItem('folio.index-study.v3:browser:portable-example', '**Browser clipping**'),
  )
  await page.goto('/')
  const settings = () => page.getByRole('button', { name: 'Homepage settings', exact: true })
  const signIn = async () => {
    await settings().click()
    await page.getByRole('button', { name: 'Email sign-in', exact: true }).click()
    await page.getByLabel('Email', { exact: true }).fill(`${active}@example.test`)
    await page.getByRole('button', { name: 'Email me a sign-in code', exact: true }).click()
    await page.getByLabel('Sign-in code', { exact: true }).fill('123456')
    await page.getByRole('button', { name: 'Confirm sign-in', exact: true }).click()
    await settings().click()
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  }
  await signIn()
  expect(writes).toBe(0)
  await expect(page.locator('.library-story')).toHaveCount(0)
  await page.getByRole('button', { name: 'Import browser stories to my account' }).click()
  await expect(page.locator('.library-story')).toHaveCount(1)
  await page.getByRole('button', { name: 'Import browser stories to my account' }).click()
  expect(writes).toBe(1)
  expect(JSON.stringify(rows.a['portable-example'].story!.index)).toContain('Browser clipping')
  expect(
    await page.evaluate(() => localStorage.getItem('folio.index-study.v3:browser:portable-example')),
  ).toBe('**Browser clipping**')
  await settings().click()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  fail = true
  await page.locator('textarea[data-id="b"]').fill('Saved locally during outage')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  const index = page.getByRole('textbox', { name: 'Index', exact: true })
  await expect(index.locator('strong')).toHaveText('Browser clipping')
  await index.fill('Index saved locally during outage')
  await expect(page.locator('.essay-status')).toContainText('CLOUD ERROR')
  await expect(page.locator('.essay-status')).toContainText('SAVED LOCALLY')
  await page.reload()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  await expect(page.locator('textarea[data-id="b"]')).toHaveValue('Saved locally during outage')
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await page.getByRole('button', { name: 'INDEX', exact: true }).click()
  await expect(index).toHaveText('Index saved locally during outage')
  await expect(page.locator('.essay-status')).toContainText('CLOUD ERROR')
  fail = false
  await page.getByRole('button', { name: 'All stories', exact: true }).click()
  await settings().click()
  await page.getByRole('button', { name: 'Retry cloud save', exact: true }).click()
  await expect
    .poll(() => rows.a['portable-example'].story!.blocks[1])
    .toMatchObject({ text: 'Saved locally during outage' })
  await settings().click()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  await expect(page.locator('.essay-status')).toContainText('CLOUD SAVED')
  expect(JSON.stringify(rows.a['portable-example'].story!.index)).toContain(
    'Index saved locally during outage',
  )
  expect(rows.a['portable-example'].story!.blocks[1]).toMatchObject({
    text: 'Saved locally during outage',
  })
  rows.a['portable-example'] = {
    id: 'portable-example',
    version: rows.a['portable-example'].version + 1,
    story: { ...rows.a['portable-example'].story!, title: 'Another device' },
  }
  await page.locator('textarea[data-id="b"]').fill('Conflicting local writing')
  await expect(page.locator('.essay-status')).toContainText('CLOUD CONFLICT')
  await page.getByRole('button', { name: 'All stories', exact: true }).click()
  await settings().click()
  await page.getByRole('button', { name: 'Keep both copies', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open Another device', exact: true }).first()).toBeVisible()
  await expect
    .poll(() => Object.values(rows.a).filter((r) => r.story?.title.endsWith('(device copy)')).length)
    .toBe(1)
  expect(
    Object.values(rows.a).find((r) => r.story?.title.endsWith('(device copy)'))?.story?.blocks[1],
  ).toMatchObject({ text: 'Conflicting local writing' })
  expect(
    JSON.stringify(Object.values(rows.a).find((r) => r.story?.title.endsWith('(device copy)'))?.story?.index),
  ).toContain('Index saved locally during outage')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  active = 'b'
  await signIn()
  await expect(page.locator('.library-story')).toHaveCount(0)
  expect(rows.b).toEqual({})
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  await expect(page.locator('textarea[data-id="b"]')).toHaveValue('Second paragraph.')
})
