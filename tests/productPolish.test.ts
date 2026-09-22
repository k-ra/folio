import { it, expect } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { example } from './storyFixture'
import { withHistory } from '../src/model/store'
import { essayHistory } from '../src/model/history'
import { publicationDownload } from '../src/portable/export'

it('chat is saved without an essay revision; paste is its own revision', () => {
  const original = example()
  const chatted = withHistory(original, (s) => ({
    ...s,
    chats: { chat: [{ me: true, text: 'A question' }] },
  }))
  expect(chatted.history).toEqual([])
  const pasted = withHistory(chatted, (s) => ({ ...s, title: 'Pasted title' }), 'Pasted')
  expect(pasted.history?.[0].label).toBe('Pasted')
  expect(JSON.parse(pasted.history![0].snap).chats).toBeUndefined()
  expect(essayHistory(pasted)).toHaveLength(1)
  const legacy = {
    ...original,
    history: [
      {
        t: 1,
        label: 'Edit',
        words: 10,
        snap: JSON.stringify({ ...original, chats: {} }),
      },
    ],
  }
  expect(essayHistory(legacy)).toHaveLength(0)
})
it('automatically chooses HTML for code and ZIP for media or public datasets', async () => {
  const media = example()
  const zipped = await publicationDownload(media)
  expect(zipped.extension).toBe('.zip')
  expect(Object.keys(unzipSync(zipped.data as Uint8Array))).toContain('assets/1.png')
  const code = {
    ...media,
    blocks: media.blocks.filter((b) => b.type !== 'media'),
  }
  expect((await publicationDownload(code)).extension).toBe('.html')
  const artifact = code.blocks.find((b) => b.type === 'magic')!
  if (artifact.type !== 'magic') throw Error('Fixture')
  artifact.attachments = [
    {
      id: 'csv',
      name: 'count.csv',
      kind: 'data',
      content: 'year,count\n2024,4',
    },
  ]
  const files = unzipSync((await publicationDownload(code)).data as Uint8Array)
  expect(strFromU8(files['datasets/art-csv-count.csv'])).toContain('2024,4')
  expect(strFromU8(files['index.html'])).not.toContain('PRIVATE FIRST NOTE')
})
