import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DEF_STYLE } from '../src/model/constants'
import { IMAGE_STUDIES, imageStudy, imageStyleLabel } from '../src/style/imageStudies'
import ImageChoices from '../src/style/ImageChoices'
import StyleSample from '../src/style/StyleSample'
import { normalizeImageDirection } from '../src/model/imageStudies'
import { imageStyleReference } from '../server/imageReference'

describe('image reference styles', () => {
  it('has eight distinct visual recipes with concise directions', () => {
    const references = IMAGE_STUDIES.filter((p) => p.reference)
    expect(references).toHaveLength(8)
    expect(new Set(references.map((p) => p.id)).size).toBe(8)
    expect(new Set(references.map((p) => p.direction)).size).toBe(8)
    for (const p of references) {
      expect(p.preview).toBeTruthy()
      expect(p.direction.length).toBeLessThan(110)
    }
  })
  it('keeps legacy styles identifiable and custom directions editable', () => {
    expect(imageStudy(DEF_STYLE)?.id).toBe('folio')
    expect(imageStyleLabel({ ...DEF_STYLE, imageDirection: 'My own drawing style' })).toBe('Custom linework')
  })

  for (const study of IMAGE_STUDIES.filter((p) => p.preview)) {
    if (study.legacyDirection)
      it(`${study.label} shortens only its exact legacy wording`, () => {
        const old = { ...DEF_STYLE, imageStyle: study.treatment, imageDirection: study.legacyDirection! }
        expect(imageStyleLabel(old)).toBe(study.label)
        expect(normalizeImageDirection(old).imageDirection).toBe(study.direction)
        expect(study.direction.length).toBeLessThan(110)
        const custom = { ...old, imageDirection: old.imageDirection + ' With pink ink.' }
        expect(normalizeImageDirection(custom)).toBe(custom)
        expect(imageStudy(custom)).toBeUndefined()
      })
    it(`${study.label} selects its real recipe and survives serialization without a color filter`, () => {
      const change = vi.fn()
      render(<ImageChoices style={DEF_STYLE} change={change} />)
      const pill = screen.getByRole('button', {
        name: study.label,
        exact: true,
      })
      expect(pill.querySelector('img')?.getAttribute('src')).toBe(study.preview)
      fireEvent.click(pill)
      expect(change).toHaveBeenCalledExactlyOnceWith({
        imageStyle: study.treatment,
        imageDirection: study.direction,
      })
      const selected = JSON.parse(JSON.stringify({ ...DEF_STYLE, ...change.mock.calls[0][0] }))
      expect(imageStyleLabel(selected)).toBe(study.label)
      expect(selected.imageStyle).toBe('natural')
      expect(selected.imageModel).toBe(DEF_STYLE.imageModel)
      render(<StyleSample style={selected} />)
      expect(screen.getByAltText(`${study.label} style reference`).getAttribute('src')).toBe(study.preview)
    })
  }

  it('preserves retired directions as custom styles without requesting a removed reference', async () => {
    const saved = {
      ...DEF_STYLE,
      imageStyle: 'natural' as const,
      imageDirection: 'Vivid cyan and indigo illustration, crisp ink contours, warm accents and sparkling white marks.',
    }
    expect(normalizeImageDirection(saved)).toBe(saved)
    expect(imageStudy(saved)).toBeUndefined()
    expect(imageStyleLabel(saved)).toBe('Custom natural')
    expect(await imageStyleReference(saved, '/missing-folio-root')).toEqual([])
  })

  it('fails clearly when an expected reference asset is missing', async () => {
    const study = IMAGE_STUDIES[0]
    await expect(
      imageStyleReference(
        { ...DEF_STYLE, imageStyle: study.treatment, imageDirection: study.direction },
        '/missing-folio-root',
      ),
    ).rejects.toThrow('The selected image style reference is unavailable')
  })
})
