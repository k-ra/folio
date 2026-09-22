import { expect, it } from 'vitest'
import { chatPlayground, offlineChatReply } from '../src/model/samples/chatPlayground'
import { backup, readBackup } from '../src/portable/backup'

it('the offline sample is complete, independent and losslessly portable', () => {
  const a = chatPlayground(),
    b = chatPlayground()
  expect(a.chatSettings?.offlineSample).toBe(true)
  expect(a.chats.chat).toHaveLength(4)
  expect(a.chats.chat.filter((m) => !m.me).every((m) => m.text.split(/\s+/).length > 500)).toBe(true)
  expect(readBackup(backup(a))).toEqual(a)
  a.chats.chat[0].text = 'Changed'
  expect(b.chats.chat[0].text).not.toBe('Changed')
  expect(offlineChatReply(2)).toContain('Offline sample')
})
