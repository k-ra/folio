import type { Story } from '../src/model/types'
import { DEF_STYLE } from '../src/model/constants'
export const example = (): Story => ({
  id: 'portable-example',
  title: 'A field of light',
  date: 'TODAY',
  thumb: 'lines',
  style: { ...DEF_STYLE },
  blocks: [
    { id: 'a', type: 'text', text: 'First paragraph.' },
    { id: 'b', type: 'text', text: 'Second paragraph.' },
    {
      id: 'art',
      type: 'magic',
      mode: 'graphics',
      prompt: 'PRIVATE PROMPT',
      status: 'done',
      attachments: [],
      revision: 0,
      revisions: [
        {
          id: 'r',
          instruction: 'PRIVATE INSTRUCTION',
          style: { ...DEF_STYLE },
          output: {
            kind: 'html',
            caption: 'An interactive light.',
            html: '<button id="light" onclick="this.textContent=\'Lit\'">Light</button>',
          },
        },
      ],
    },
    { id: 'c', type: 'text', text: 'Last paragraph.' },
    {
      id: 'image',
      type: 'media',
      text: 'A tiny image.',
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    },
  ],
  notes: { a: 'PRIVATE FIRST NOTE', b: 'PRIVATE SECOND NOTE' },
  chats: { art: [{ me: true, text: 'PRIVATE CHAT' }] },
  history: [],
})
