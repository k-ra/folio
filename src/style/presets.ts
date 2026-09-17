import { DEF_STYLE } from '../model/constants'
import type { Style, StylePreset } from '../model/types'
import { GRADIENT_DEFAULTS } from './backgrounds'

export const FOLIO_STYLE: Style = {
  ...DEF_STYLE,
  ink: '#111111',
  bg: '#fdfbf6',
  bodyFont: 'Instrument Sans',
  headerFont: 'Instrument Sans',
  strokeWidth: 1,
  chartStyle: 'line',
  imageStyle: 'linework',
  graphicDirection: 'Thin black lines, restrained labels, Instrument Sans. Generous negative space.',
}
export const PRESETS: StylePreset[] = [
  { id: 'folio', name: 'Folio', style: FOLIO_STYLE },
  {
    id: 'fieldnotes',
    name: 'Field notes',
    style: {
      ...FOLIO_STYLE,
      bodyFont: 'Newsreader',
      headerFont: 'Libre Caslon Text',
      bg: '#f1ecdf',
      ink: '#3e493d',
      imageStyle: 'grain',
      chartStyle: 'area',
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    style: {
      ...FOLIO_STYLE,
      bg: '#e9eff5',
      ink: '#254979',
      headerFont: 'IBM Plex Mono',
      chartStyle: 'bar',
      imageStyle: 'linework',
    },
  },
  {
    id: 'afterhours',
    name: 'After hours',
    style: {
      ...FOLIO_STYLE,
      bg: '#23241f',
      ink: '#edead9',
      headerFont: 'Newsreader',
      imageStyle: 'grain',
      chartStyle: 'line',
    },
  },
]
export const sameStyle = (a: Style, b: Style) =>
  Object.keys(a).every((k) => a[k as keyof Style] === b[k as keyof Style]) &&
  Object.keys(a).length === Object.keys(b).length

/** Dormant background controls and generation directions are configuration, not a visible theme. */
function appearance(style: Style): Style {
  const {
    backgroundFrom,
    backgroundVia,
    backgroundTo,
    backgroundAngle,
    backgroundMotion,
    backgroundCode,
    backgroundPrompt: _prompt,
    ...rest
  } = style
  return {
    ...rest,
    imageModel: 'default',
    ...(style.backdrop === 'gradient'
      ? {
          backgroundFrom: backgroundFrom || GRADIENT_DEFAULTS.backgroundFrom,
          backgroundVia: backgroundVia || GRADIENT_DEFAULTS.backgroundVia,
          backgroundTo: backgroundTo || GRADIENT_DEFAULTS.backgroundTo,
          backgroundAngle: backgroundAngle ?? GRADIENT_DEFAULTS.backgroundAngle,
          backgroundMotion: backgroundMotion ?? false,
        }
      : {}),
    ...(style.backdrop === 'custom' ? { backgroundCode: backgroundCode || '' } : {}),
  }
}

export const sameAppearance = (a: Style, b: Style) => sameStyle(appearance(a), appearance(b))
