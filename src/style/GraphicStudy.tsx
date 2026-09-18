/** The same starting-point drawing in the gallery and maker. */
export default function GraphicStudy({ name, stroke }: { name: string; stroke: number }) {
  return (
    <svg
      viewBox="0 0 160 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      aria-label={`${name} graphic study`}
    >
      {name === 'Folio' ? (
        <>
          <circle cx="80" cy="54" r="30" />
          <path d="M15 54 H145 M80 10 V98 M28 90 L132 20" />
        </>
      ) : name === 'Living field' ? (
        Array.from({ length: 28 }, (_, i) => (
          <circle
            key={i}
            cx={18 + ((i * 37) % 126)}
            cy={15 + ((i * 23) % 80)}
            r={1 + (i % 4)}
            opacity={0.25 + (i % 3) * 0.25}
          />
        ))
      ) : (
        Array.from({ length: 48 }, (_, i) => (
          <path key={i} transform={`rotate(${i * 7.5} 80 55)`} d={`M80 30 v-${8 + Math.sin(i * 0.7) * 7}`} />
        ))
      )}
    </svg>
  )
}
