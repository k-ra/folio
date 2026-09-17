import { parseData } from '../../magic/data'
import { DEF_STYLE, THUMBS } from '../constants'
import type { MagicBlock, Story } from '../types'
// NOAA-EDAB/ecodata, revision 3d313767de4f34de4353af64c3e1706dc94d164b:
// data-raw/Linden_NARW_abundance_2025-10-01 - Daniel Linden - NOAA Federal.csv
// Unchanged published estimates. The corresponding 2025 NOAA report is CC0.
import csv from './right-whale-abundance.csv?raw'
import csvUrl from './right-whale-abundance.csv?url'

const CSV_NAME = 'right-whale-abundance.csv'
const INSTRUCTION = 'Plot the Median North Atlantic right whale population estimate as a thin line.'

/** Real published data in a disposable, editable example. No generation or network request. */
export function whaleStory(): Story {
  const style = { ...DEF_STYLE, ...THUMBS.bars }
  const chart: MagicBlock = {
    id: 'whales-abundance',
    type: 'magic',
    mode: 'data',
    prompt: INSTRUCTION,
    status: 'done',
    attachments: [{ id: 'whales-csv', name: CSV_NAME, kind: 'data', content: csv }],
    revision: 0,
    revisions: [
      {
        id: 'whales-first-chart',
        sourceNames: [CSV_NAME],
        instruction: INSTRUCTION,
        style: { ...style },
        provider: 'preview',
        output: {
          kind: 'chart',
          chartStyle: 'line',
          caption:
            'North Atlantic right whales, 1990–2024. Median population estimates; NOAA / Linden (2025).',
          ...parseData(csv, 'Median'),
        },
      },
    ],
  }

  return {
    id: 's-whales',
    title: 'Listening before translating',
    date: 'SEP 15',
    thumb: 'bars',
    style,
    files: [CSV_NAME],
    notes: {},
    chats: {},
    blocks: [
      {
        id: 'whales-listening',
        type: 'text',
        text: 'Before a dictionary, there is listening. Project CETI, founded by David Gruber, brings machine learning together with field biology to study sperm whale communication off Dominica. The whales exchange short sequences of clicks called codas.',
      },
      {
        id: 'whales-language',
        type: 'text',
        text: 'Phonetics asks how sounds are made and heard. Semantics asks what they mean. In a 2024 study of 8,719 codas, researchers described combinations of rhythm, tempo and small contextual changes. That structure is a discovery, but it is not a translation of whale sentences.',
      },
      {
        id: 'whales-world',
        type: 'text',
        text: 'How many listeners are out there? A 2022 study estimated roughly 845,000 sperm whales worldwide, with substantial uncertainty: its 95% interval ran from about 482,000 to 1.15 million. This is one species and one model’s estimate for 2022, not a count of all the world’s whales.',
      },
      {
        id: 'whales-species',
        type: 'text',
        text: 'A different species gives us a much smaller set of numbers. The chart below follows NOAA’s estimated North Atlantic right whale population from 1990 to 2024. These are right whales, not CETI’s sperm whales. Each point is the median estimate at the start of that year.',
      },
      chart,
      {
        id: 'whales-uncertainty',
        type: 'text',
        text: 'For the start of 2024, the estimate is 384 right whales, with a 95% credible interval of 375–394. The line shows the medians; the original attached CSV keeps the uncertainty bounds too. A count, like a conversation, asks us to notice what we know and what is still unresolved.',
      },
    ],
    sources: [
      {
        label: 'Project CETI: the sperm whale phonetic alphabet (2024)',
        url: 'https://www.projectceti.org/blog-posts/sperm-whale-phonetic-alphabet-proposed-for-the-first-time',
      },
      {
        label: 'Sharma et al. (2024): structure in sperm whale vocalisations',
        url: 'https://www.nature.com/articles/s41467-024-47221-8',
      },
      {
        label: 'Whitehead & Shin (2022): global sperm whale population estimate',
        url: 'https://www.nature.com/articles/s41598-022-24107-7',
      },
      {
        label: 'NOAA / Linden (2025): North Atlantic right whale estimates, 1990–2024 (CC0)',
        url: 'https://repository.library.noaa.gov/view/noaa/72014',
      },
      { label: 'Download original CSV', url: csvUrl },
    ],
  }
}
