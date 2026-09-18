import type { CustomStyleCategory, Style } from '../model/types'
import { FONTS } from '../model/constants'
import ArtifactView from '../magic/ArtifactView'
import Backdrop from '../write/Backdrop'
import GraphicStudy from './GraphicStudy'
import { GRAPHIC_STYLES } from './presets'

/** The thing being designed stays above its instructions; never show source code as the result. */
export default function StyleStudy({ style, category }: { style: Style; category: CustomStyleCategory }) {
  const sample = style.customStyles?.[category]?.sample
  const visual = category === 'data' || category === 'graphics'
  return (
    <figure className="style-study" aria-label="Style preview">
      {visual ? (
        sample ? (
          <ArtifactView
            compact
            style={style}
            output={{ kind: 'html', html: sample, caption: 'Style study' }}
          />
        ) : category === 'data' ? (
          <ArtifactView
            compact
            style={style}
            output={{
              kind: 'chart',
              chartStyle: style.chartStyle,
              caption: 'Style study',
              xLabel: '',
              yLabel: '',
              points: [14, 30, 24, 48, 40, 62].map((value, i) => ({
                label: String.fromCharCode(65 + i),
                value,
              })),
            }}
          />
        ) : (
          <GraphicStudy
            name={GRAPHIC_STYLES.find((p) => p.direction === style.graphicDirection)?.name || 'Folio'}
            stroke={style.strokeWidth}
          />
        )
      ) : (
        <div
          className="style-page-study"
          style={{
            color: style.ink,
            fontFamily: FONTS[style.bodyFont],
            background: style.bg,
          }}
        >
          <Backdrop view={style} base={style} contained />
          <div
            className="style-page-study-copy"
            style={style.paper === 'card' ? { background: style.bg } : undefined}
          >
            <span className="eyebrow">A SMALL STUDY</span>
            <p style={{ fontFamily: FONTS[style.headerFont] }}>Room for a thought.</p>
            <small>Light, space, and a little possibility.</small>
          </div>
        </div>
      )}
      <figcaption>
        {category === 'data'
          ? 'Preview · fictional sample data'
          : visual
            ? 'Preview · style study'
            : 'Preview · your page'}
      </figcaption>
    </figure>
  )
}
