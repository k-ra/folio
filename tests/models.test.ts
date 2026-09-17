import { describe, expect, it } from 'vitest'
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, imageGenerationTool } from '../src/magic/models'
import { DEF_STYLE } from '../src/model/constants'
import { sameAppearance, sameStyle } from '../src/style/presets'

describe('image model configuration', () => {
  it('preserves server defaults for old stories and explicit default selections', () => {
    expect(imageGenerationTool(undefined)).toEqual({ type: 'image_generation', model: DEFAULT_IMAGE_MODEL })
    expect(imageGenerationTool('default', 'configured-server-model').model).toBe('configured-server-model')
  })
  it('routes each explicit selection into the actual Responses image tool', () => {
    for (const model of IMAGE_MODELS.filter((m) => m.id !== 'default'))
      expect(imageGenerationTool(model.id, 'server-fallback')).toEqual({ type: 'image_generation', model: model.id })
  })
  it('rejects unsupported models rather than silently ignoring the selection', () => {
    for (const value of ['not-supported', '', null, {}, 42])
      expect(() => imageGenerationTool(value)).toThrow('supported image model')
  })
  it('tracks model edits as dirty without changing the visual theme identity', () => {
    const custom = { ...DEF_STYLE, imageModel: 'gpt-image-2.5-flare' as const }
    expect(sameStyle(DEF_STYLE, custom)).toBe(false)
    expect(sameAppearance(DEF_STYLE, custom)).toBe(true)
  })
})
