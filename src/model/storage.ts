import type { Story } from './types'
import { introduceMockEssay } from './samples/mockEssay'

const DB = 'folio-artifacts-v2'
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('workspace')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local storage.'))
    request.onblocked = () => reject(new Error('Close other Folio tabs and reload to open storage.'))
  })
}

/** IndexedDB has room for images and keeps a whole workspace commit atomic. */
export async function loadWorkspace(fallback?: Story[], owner?: string): Promise<Story[] | undefined> {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      // The setup marker is separate from stories: deleting the example must not resurrect it.
      // Save the story and marker atomically, also when upgrading a legacy workspace.
      const transaction = db.transaction('workspace', fallback ? 'readwrite' : 'readonly')
      const store = transaction.objectStore('workspace')
      const request = store.get(owner ? `account:${owner}:stories` : 'stories')
      const setup = store.get('mock-essay-v1')
      let stories: Story[] | undefined
      let completed = 0
      const loaded = () => {
        if (++completed !== 2) return
        stories = Array.isArray(request.result) ? request.result : fallback
        if (!owner && fallback && !setup.result && stories) {
          stories = introduceMockEssay(stories)
          store.put(stories, 'stories')
          store.put(true, 'mock-essay-v1')
        }
      }
      request.onsuccess = setup.onsuccess = loaded
      transaction.oncomplete = () => resolve(stories)
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error || new Error('Could not load the workspace.'))
    })
  } finally {
    db.close()
  }
}

export async function saveWorkspace(stories: Story[], owner?: string): Promise<void> {
  const db = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readwrite')
      transaction.objectStore('workspace').put(stories, owner ? `account:${owner}:stories` : 'stories')
      transaction.oncomplete = () => resolve()
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error || new Error('Local storage is full.'))
    })
  } finally {
    db.close()
  }
}

export async function cloudCheckpoint<T>(owner: string, value?: T): Promise<T | undefined> {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', value === undefined ? 'readonly' : 'readwrite')
      const store = tx.objectStore('workspace')
      const key = `account:${owner}:checkpoint`
      const request = value === undefined ? store.get(key) : store.put(value, key)
      tx.oncomplete = () => resolve(value === undefined ? request.result : value)
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not save cloud checkpoint.'))
    })
  } finally {
    db.close()
  }
}
