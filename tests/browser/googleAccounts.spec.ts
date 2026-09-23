import { test, expect } from './fixtures'
import { example } from '../storyFixture'

test('Google consent returns to the same import flow, recovers failures and preserves originals', async ({
  page,
}) => {
  test.skip(process.env.FOLIO_QA_CLOUD !== '1', 'Requires the offline Google-enabled QA build.')
  const id = '00000000-0000-0000-0000-000000000001'
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'google@example.test',
    app_metadata: { provider: 'google' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
  const rows: Record<string, { id: string; version: number; story: ReturnType<typeof example> }> = {}
  let writes = 0,
    fail = true,
    cancel = false
  await page.route('https://folio-qa.supabase.co/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path.endsWith('/authorize')) {
      expect(url.searchParams.get('provider')).toBe('google')
      const target = new URL(url.searchParams.get('redirect_to')!)
      expect(target.searchParams.get('folio_import')).toBeTruthy()
      target.hash = cancel
        ? 'error=access_denied&error_description=Cancelled'
        : `access_token=${token}&refresh_token=google-refresh&expires_in=3600&token_type=bearer`
      return route.fulfill({
        status: 302,
        headers: { ...headers, location: target.href },
      })
    }
    if (path.endsWith('/user')) return route.fulfill({ json: user, headers })
    if (path.endsWith('/logout')) return route.fulfill({ json: {}, headers })
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    if (path.endsWith('/folio_stories')) return route.fulfill({ json: Object.values(rows), headers })
    if (path.endsWith('/save_folio_story')) {
      if (fail)
        return route.fulfill({
          status: 503,
          json: { message: 'Simulated cloud outage' },
          headers,
        })
      const data = route.request().postDataJSON()
      if ((rows[data.story_id]?.version || 0) !== data.expected_version)
        return route.fulfill({
          status: 409,
          json: { code: '40001', message: 'Conflict' },
          headers,
        })
      const row = {
        id: data.story_id,
        version: data.expected_version + 1,
        story: data.content,
      }
      rows[row.id] = row
      writes++
      return route.fulfill({ json: row, headers })
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
    localStorage.setItem('folio.index-study.v3:browser:portable-example', 'Google import clipping'),
  )
  await page.goto('/')
  const settings = () => page.getByRole('button', { name: 'Homepage settings', exact: true })
  const google = () =>
    page.getByRole('button', {
      name: 'Sign in with Google & import browser stories',
      exact: true,
    })
  await settings().click()
  await expect(google()).toBeVisible()
  expect(writes).toBe(0)
  await google().click()
  await expect(page).toHaveURL(/\/?$/)
  await settings().click()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await expect(page.getByText(/Import incomplete; retry is safe/)).toBeVisible()
  expect(writes).toBe(0)
  // Interrupted uploads survive a reload and can be retried without another import decision.
  await page.reload()
  await settings().click()
  await expect(page.getByText(/Import incomplete; retry is safe/)).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Retry cloud save', exact: true }).click()
  await expect(page.locator('.library-story')).toHaveCount(1)
  expect(writes).toBe(1)
  expect(rows['portable-example'].story).toMatchObject(example())
  expect(JSON.stringify(rows['portable-example'].story.index)).toContain('Google import clipping')
  expect(
    await page.evaluate(() => localStorage.getItem('folio.index-study.v3:browser:portable-example')),
  ).toBe('Google import clipping')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.locator('.library-story')).toHaveCount(1)
  await settings().click()
  await google().click()
  await expect(page).toHaveURL(/\/?$/)
  await expect(page.locator('.library-story')).toHaveCount(1)
  expect(writes).toBe(1)
  await settings().click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  cancel = true
  await settings().click()
  await google().click()
  await expect(page).toHaveURL(/error=access_denied/)
  await settings().click()
  await expect(
    page.getByText('Google sign-in did not finish. Your browser stories are unchanged.'),
  ).toBeVisible()
  expect(writes).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('folio.google-import-intent.v1'))).toBeNull()
  await settings().click()
  await page.getByRole('button', { name: 'Open A field of light', exact: true }).first().click()
  await expect(page.locator('textarea[data-id="b"]')).toHaveValue('Second paragraph.')
})
