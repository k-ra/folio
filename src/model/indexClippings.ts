import type { Story } from './types'
import { indexFromMarkdown, readIndexDocument } from '../text/indexDocument'
import { loadIndex } from '../write/indexMarkdown'

/** Read only this workspace's old Index. Never delete it or replace a shared Index. */
export function withBrowserIndex(story: Story, storage: Storage, owner?: string): Story {
  if (story.index !== undefined) return story
  const identity = `${owner || 'browser'}:${story.id}`
  const key = (v: number) => `folio.index-study.v${v}:${identity}`
  const rich = storage.getItem(key(4))
  if (rich !== null) return { ...story, index: readIndexDocument(rich) }
  if (storage.getItem(key(3)) === null && storage.getItem(key(2)) === null) return story
  return { ...story, index: indexFromMarkdown(loadIndex(storage, key(3), key(2))) }
}
