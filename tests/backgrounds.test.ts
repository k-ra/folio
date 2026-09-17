import { describe, expect, it } from 'vitest'
import {
  backgroundDocument,
  gradientCss,
  validBackgroundResult,
  BACKGROUND_CODE_LIMIT,
} from '../src/style/backgrounds'
import { backgroundPayload, validBackgroundRequest } from '../server/backgroundContract'

import { FOLIO_STYLE, sameAppearance } from '../src/style/presets'

describe('backgrounds', () => {
  it('keeps a theme selected when inactive background settings have been retained', () => {
    expect(
      sameAppearance(FOLIO_STYLE, {
        ...FOLIO_STYLE,
        backgroundCode: 'body{background:red}',
        backgroundFrom: '#ff0000',
      }),
    ).toBe(true)
    expect(
      sameAppearance(
        { ...FOLIO_STYLE, backdrop: 'gradient' },
        { ...FOLIO_STYLE, backdrop: 'gradient', backgroundFrom: '#ff0000' },
      ),
    ).toBe(false)
  })
  it('builds configurable gradients with safe fallbacks for older stories', () => {
    expect(gradientCss({})).toBe('linear-gradient(180deg, #e9cdb8, #bec4ad 50%, #98ad9a)')
    expect(gradientCss({ backgroundFrom: '#123456', backgroundAngle: 450 })).toContain('90deg, #123456')
    expect(
      gradientCss({
        backgroundFrom: 'url(https://example.test)',
        backgroundAngle: NaN,
      }),
    ).not.toContain('url(')
  })
  it('isolates pasted CSS and prevents closing the stylesheet to inject HTML', () => {
    const document = backgroundDocument('</style><script>parent.hacked=true</script>', '#fdfbf6')
    expect(document).not.toContain('<script>')
    expect(document).toContain("script-src 'none'")
    expect(document).toContain("connect-src 'none'")
    expect(document).toContain("default-src 'none'")
    expect(document).toContain('\\3c /style>')
    expect(new DOMParser().parseFromString(document, 'text/html').querySelectorAll('script')).toHaveLength(0)
  })
  it('reduced motion omits arbitrary CSS so even animated custom code is static', () => {
    const document = backgroundDocument('body{animation:forever 1s infinite;background:red}', '#abcdef', true)
    expect(document).not.toContain('forever')
    expect(document).toContain('background:#abcdef')
  })
  it('bounds generated code and validates the server request and structured response', () => {
    const request = {
      prompt: 'Warm paper',
      background: '#fdfbf6',
      ink: '#111111',
      previous: '',
    }
    expect(validBackgroundRequest(request)).toBe(true)
    expect(validBackgroundRequest({ ...request, prompt: '' })).toBe(false)
    expect(
      validBackgroundRequest({
        ...request,
        previous: 'x'.repeat(BACKGROUND_CODE_LIMIT + 1),
      }),
    ).toBe(false)
    expect(validBackgroundResult({ css: 'body{background:red}' })).toBe(true)
    expect(validBackgroundResult({ css: '' })).toBe(false)
    const payload = backgroundPayload(request, 'configured-test-model')
    expect(payload.model).toBe('configured-test-model')
    expect(payload.store).toBe(false)
    expect(payload.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
      schema: { required: ['css'], additionalProperties: false },
    })
  })
})
