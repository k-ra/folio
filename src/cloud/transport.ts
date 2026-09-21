import { cloudClient } from './client'
import type { Story } from '../model/types'
import { cleanStory } from '../portable/schema'

export interface CloudRow {
  id: string
  version: number
  story: Story | null
}
export interface CloudTransport {
  list(): Promise<CloudRow[]>
  save(id: string, expected: number, story: Story | null): Promise<CloudRow>
}
export const transportFor = (owner: string): CloudTransport => {
  const authorization = async () => {
    if (!cloudClient) throw new Error('Cloud storage is not configured.')
    const {
      data: { session },
    } = await cloudClient.auth.getSession()
    if (!session || session.user.id !== owner)
      throw new Error('Account changed. Sign in again to sync this library.')
    return `Bearer ${session.access_token}`
  }
  return {
    async list() {
      if (!cloudClient) throw new Error('Cloud storage is not configured.')
      const rows: CloudRow[] = []
      for (let start = 0; ; start += 100) {
        const { data, error } = await cloudClient
          .from('folio_stories')
          .select('id,version,story')
          .order('id')
          .range(start, start + 99)
          .setHeader('Authorization', await authorization())
        if (error) throw new Error(error.message)
        rows.push(
          ...data.map((r) => ({
            ...r,
            story: r.story ? cleanStory(r.story) : null,
          })),
        )
        if (data.length < 100) return rows
      }
    },
    async save(id, expected, story) {
      if (!cloudClient) throw new Error('Cloud storage is not configured.')
      const { data, error } = await cloudClient
        .rpc('save_folio_story', {
          story_id: id,
          expected_version: expected,
          content: story ? cleanStory(story) : null,
        })
        .setHeader('Authorization', await authorization())
      if (error)
        throw new Error(
          error.code === '40001' ? 'Conflict: this story changed on another device.' : error.message,
        )
      return data as CloudRow
    },
  }
}
export const fingerprint = async (value: unknown) => {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
          )
        : v
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('')
}
