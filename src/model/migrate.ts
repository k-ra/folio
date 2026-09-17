import { DEF_STYLE } from './constants'
import type { Story } from './types'
import { newMagicBlock } from '../magic/state'
import { migrateSampleAppearance } from './sampleStyles'
import { normalizeImageDirection } from './imageStudies'

/** Non-destructive v1 → v2 migration; v1 localStorage is retained as a backup. */
export function migrateStory(s: Story): Story {
  const appearance = migrateSampleAppearance(s, normalizeImageDirection({ ...DEF_STYLE, ...s.style }))
  const { style } = appearance
  return {
    ...s,
    ...appearance,
    presets: s.presets?.map((p) => ({ ...p, style: normalizeImageDirection({ ...DEF_STYLE, ...p.style }) })),
    blocks: s.blocks.map((b) => {
      if (b.type === 'fancy')
        return {
          ...b,
          requestId: undefined,
          status: b.status === 'rendering' ? ('idle' as const) : b.status,
        }
      if (b.type === 'magic')
        return {
          ...b,
          requestId: undefined,
          status: b.status === 'rendering' ? (b.revision >= 0 ? 'done' : 'prompt') : b.status,
        }
      if (b.type !== 'graphic') return b
      const base = { ...newMagicBlock(b.id), mode: 'data' as const, prompt: b.prompt }
      if (b.status !== 'done') return base
      return {
        ...base,
        status: 'done' as const,
        revision: 0,
        revisions: [
          {
            id: b.id + '-original',
            instruction: b.prompt,
            style: { ...style, chartStyle: 'bar' as const },
            output: {
              kind: 'chart' as const,
              caption: b.caption,
              chartStyle: 'bar' as const,
              xLabel: 'Month',
              yLabel: 'Intensity',
              demo: true,
              points: [22, 30, 58, 85, 70, 40, 34, 18, 26, 12, 16, 8].map((value, i) => ({
                label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
                  i
                ],
                value,
              })),
            },
          },
        ],
      }
    }),
  }
}
