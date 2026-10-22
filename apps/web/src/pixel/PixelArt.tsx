/** A pixel grid: one string per row, one char per pixel; `.` (or any unmapped char) is transparent. */
export interface PixelArt {
  rows: string[]
  palette: Record<string, string>
}

export interface PixelRun {
  x: number
  y: number
  w: number
  fill: string
}

/** Collapse each row into same-colour runs so a sprite is a handful of rects, not hundreds. */
export function pixelRuns({ rows, palette }: PixelArt): PixelRun[] {
  const runs: PixelRun[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const fill = palette[row[x]]
      let w = 1
      while (x + w < row.length && row[x + w] === row[x]) w++
      if (fill) runs.push({ x, y, w, fill })
      x += w
    }
  })
  return runs
}

/** Rects for embedding inside an existing <svg>, offset by (x, y) in pixel units. */
export function PixelRects({ art, x = 0, y = 0 }: { art: PixelArt; x?: number; y?: number }) {
  return (
    <g transform={x || y ? `translate(${x} ${y})` : undefined}>
      {pixelRuns(art).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </g>
  )
}

export function PixelIcon({ art, className }: { art: PixelArt; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${art.rows[0].length} ${art.rows.length}`}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      <PixelRects art={art} />
    </svg>
  )
}
