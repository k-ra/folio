import type { FontName, HomeTheme, HomeThemeKey, Style } from './types.js'

export const FONTS: Record<FontName, string> = {
  'Instrument Sans': "'Instrument Sans', sans-serif",
  'Libre Caslon Text': "'Libre Caslon Text', serif",
  Newsreader: "'Newsreader', serif",
  Archivo: "'Archivo', sans-serif",
  'IBM Plex Mono': "'IBM Plex Mono', monospace",
}

export const FONT_NAMES = Object.keys(FONTS) as FontName[]

export const MONO = FONTS['IBM Plex Mono']
export const SANS = FONTS['Instrument Sans']

export const DEF_STYLE: Style = {
  bodyFont: 'Instrument Sans',
  headerFont: 'Instrument Sans',
  size: 16,
  gap: 28,
  bg: '#fdfbf6',
  ink: '#111111',
  backdrop: 'none',
  backdropSrc: null,
  paper: 'full',
  strokeWidth: 1,
  chartStyle: 'line',
  imageStyle: 'linework',
  imageDirection: '',
  imageModel: 'default',
  graphicDirection: 'Thin black lines, restrained labels, Instrument Sans. Generous negative space.',
  linkStyle: 'underline',
  loading: 'weave',
}

export const BACKDROP_NAMES = {
  none: 'Plain',
  gradient: 'Gradient',
  custom: 'Custom',
  drift: 'Drift',
  shader: 'Shader',
  image: 'Image',
} as const

export const HOME_THEMES: Record<HomeThemeKey, HomeTheme> = {
  blue: { name: 'Moody blue', bg: '#1e2a3b', bgImage: 'none', ink: '#e6e3dc', panel: '#26344a' },
  paper: {
    name: 'Paper',
    bg: '#f4efe4',
    bgImage:
      'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(233,205,184,.4), transparent 70%), radial-gradient(ellipse 80% 40% at 50% 100%, rgba(152,173,154,.35), transparent 70%)',
    ink: '#2a2622',
    panel: '#fbf8f1',
  },
  night: {
    name: 'Night',
    bg: '#161513',
    bgImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(80,70,60,.35), transparent 70%)',
    ink: '#e9e4da',
    panel: '#211f1c',
  },
}

/** Default data files a story draws on until the user drops their own. */
export const DEFAULT_FILES: string[] = []

export const THUMBS: Record<string, { bg: string; ink: string }> = {
  lines: { bg: '#fbf8f1', ink: '#2a2622' },
  bars: { bg: '#f1eee6', ink: '#2a2622' },
  gradient: { bg: 'linear-gradient(#e9cdb8, #98ad9a 70%)', ink: '#2a2622' },
  aa: { bg: '#2a2622', ink: '#f4efe4' },
  mono: { bg: '#fbf8f1', ink: '#2a2622' },
  photo: { bg: '#e6e2d8', ink: '#2a2622' },
}

export const SHEET_BACK = '#ece6d8'

export const EASE = 'cubic-bezier(.2,.7,.2,1)'
export const EASE_PULL = 'cubic-bezier(.2,.8,.2,1)'

export const SHADOW = {
  sheet: '0 24px 50px -24px rgba(0,0,0,.55)',
  expanding: '0 60px 100px -30px rgba(0,0,0,.7)',
  tile: '0 14px 30px -16px rgba(0,0,0,.45)',
  card: '0 40px 90px -30px rgba(0,0,0,.45)',
  popover: '0 20px 40px -20px rgba(0,0,0,.6)',
}

export const STORAGE_STORIES = 'folio.stories.v2'
export const STORAGE_HOME = 'folio.home.v1'
