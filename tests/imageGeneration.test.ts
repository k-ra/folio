import { Readable } from 'node:stream'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMagicHandler } from '../server/magic'
import { IMAGE_INSTRUCTIONS } from '../server/imageInstructions'
import { DEF_STYLE } from '../src/model/constants'
import { IMAGE_STUDIES } from '../src/style/imageStudies'
import type { GenerateRequest } from '../src/magic/contract'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function send(request: GenerateRequest) {
  vi.stubEnv('OPENAI_API_KEY', 'offline-test-only')
  vi.stubEnv('FOLIO_TEXT_PROVIDER', 'openai')
  const handler = createMagicHandler(process.env, '.')
  const req = Object.assign(Readable.from([JSON.stringify(request)]), {
    method: 'POST',
    url: '/',
    headers: { host: 'localhost:5173', origin: 'http://localhost:5173' },
  }) as IncomingMessage
  const res = { destroyed: false, writableEnded: false, on: vi.fn(), writeHead: vi.fn(), end: vi.fn() }
  const fetch = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        output:
          request.mode === 'image'
            ? [{ type: 'image_generation_call', result: 'aW1hZ2U=' }]
            : [
                {
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        html: '<svg></svg>',
                        caption: 'Offline test',
                        reply: 'Updated',
                      }),
                    },
                  ],
                },
              ],
      }),
    })
  vi.stubGlobal('fetch', fetch)
  await handler(req, res as unknown as ServerResponse)
  expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything())
  expect(fetch).toHaveBeenCalledTimes(1)
  return JSON.parse(fetch.mock.calls[0][1].body)
}

describe('image generation direction', () => {
  for (const study of IMAGE_STUDIES.filter((s) => s.preview)) {
    it(`sends ${study.label}'s short direction and actual allowlisted reference pixels`, async () => {
      const payload = await send({
        mode: 'image',
        instruction: 'An octopus',
        originalPrompt: 'An octopus',
        history: [],
        attachments: [],
        style: { ...DEF_STYLE, imageStyle: study.treatment, imageDirection: study.direction },
      })
      expect(payload.instructions).toBe(IMAGE_INSTRUCTIONS)
      const content = payload.input[0].content
      expect(content).toHaveLength(3)
      expect(JSON.parse(content[0].text).style.imageDirection).toBe(study.direction)
      expect(content[1].text).toContain(`Folio style reference: ${study.label}`)
      const bytes = await readFile(`src/assets/image-studies/${study.id}.webp`)
      expect(content[2]).toEqual({
        type: 'input_image',
        image_url: `data:image/webp;base64,${bytes.toString('base64')}`,
      })
      expect(JSON.stringify(payload)).not.toContain(study.preview)
      expect(payload.tool_choice).toEqual({ type: 'image_generation' })
      expect(payload.store).toBe(false)
    })
  }

  it('preserves explicitly requested words and prior image context for the model to honor the exception', async () => {
    const instruction = 'Keep the heron and add the exact title "Early light".'
    const src = 'data:image/png;base64,aW1hZ2U='
    const payload = await send({
      mode: 'image',
      instruction,
      originalPrompt: 'A heron',
      style: DEF_STYLE,
      history: ['A heron'],
      attachments: [],
      previous: { kind: 'image', src, caption: 'A heron' },
    })
    const content = payload.input[0].content
    expect(JSON.parse(content[0].text).instruction).toBe(instruction)
    expect(content[1].text).toContain('Current artifact to edit')
    expect(content[2]).toEqual({ type: 'input_image', image_url: src })
    expect(payload.instructions).toBe(IMAGE_INSTRUCTIONS)
  })

  it('normalizes an old preset without dropping its style reference or current artifact', async () => {
    const study = IMAGE_STUDIES[0]
    const src = 'data:image/png;base64,aW1hZ2U='
    const payload = await send({
      mode: 'image',
      instruction: 'Make the octopus smaller',
      originalPrompt: 'An octopus',
      style: { ...DEF_STYLE, imageStyle: study.treatment, imageDirection: study.legacyDirection! },
      history: [],
      attachments: [],
      previous: { kind: 'image', src, caption: 'An octopus' },
    })
    const content = payload.input[0].content
    expect(JSON.parse(content[0].text).style.imageDirection).toBe(study.direction)
    expect(content[1].text).toContain('Current artifact')
    expect(content[2].image_url).toBe(src)
    expect(content[3].text).toContain('Folio style reference')
    expect(content[4].image_url).toMatch(/^data:image\/webp;base64,/)
  })

  it('does not attach a preset to a custom direction', async () => {
    const payload = await send({
      mode: 'image',
      instruction: 'An octopus',
      originalPrompt: 'An octopus',
      history: [],
      attachments: [],
      style: { ...DEF_STYLE, imageDirection: 'My own style, not a built-in reference' },
    })
    expect(payload.input[0].content).toHaveLength(1)
  })

  for (const mode of ['graphics', 'data'] as const) {
    it(`does not submit the image preset when generating ${mode}`, async () => {
      const study = IMAGE_STUDIES[0]
      const payload = await send({
        mode,
        instruction: 'An illustrative pattern',
        originalPrompt: 'An illustrative pattern',
        history: [],
        attachments: [],
        style: { ...DEF_STYLE, imageStyle: study.treatment, imageDirection: study.direction },
      })
      expect(payload.input[0].content).toHaveLength(1)
      expect(payload.input[0].content[0].type).toBe('input_text')
    })
  }
})
