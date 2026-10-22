import { FO_CORNER_EXPONENT, foSuperellipsePath } from '../brand/geometry'

/**
 * Glass geometry: the outline that one glass material takes around a set of bubbles. Shapes far
 * apart keep their exact superellipse outline. Shapes closer than the container's `spacing` bend
 * toward each other and join (smooth union of signed distance fields), like Apple's
 * GlassEffectContainer. Pure functions, shared with the Flutter twin through test vectors.
 */
export type GlassRect = { x: number; y: number; width: number; height: number }
export type GlassShape = GlassRect & {
  /** Corner radius before clamping to half the shorter side. */
  radius: number
}

const finite = (value: number) => (Number.isFinite(value) ? value : 0)

/** Corner radius a shape actually draws with: never more than half its shorter side. */
export function clampRadius(shape: GlassShape) {
  return Math.max(0, Math.min(finite(shape.radius), shape.width / 2, shape.height / 2))
}

const NORM_STEPS = 512
const NORM = Float64Array.from({ length: NORM_STEPS + 1 }, (_, i) =>
  (1 + (i / NORM_STEPS) ** FO_CORNER_EXPONENT) ** (1 / FO_CORNER_EXPONENT)
)

/**
 * Signed distance from a point to a rounded box with superellipse corners (exponent 2^1.5, the
 * kit's `corner-shape: superellipse(1.5)`): negative inside, zero on the outline. The zero level
 * is exactly the curve `foSuperellipsePath` draws; away from it the value is a close
 * approximation, which is all a smooth union needs.
 */
export function shapeDistance(px: number, py: number, shape: GlassShape, exponent = FO_CORNER_EXPONENT) {
  const r = clampRadius(shape)
  const hx = shape.width / 2
  const hy = shape.height / 2
  const qx = Math.abs(px - (shape.x + hx)) - hx + r
  const qy = Math.abs(py - (shape.y + hy)) - hy + r
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  let outside: number
  if (ox === 0 || oy === 0) outside = ox + oy
  else if (exponent === FO_CORNER_EXPONENT) {
    // (a^n + b^n)^(1/n) = max · (1 + (min/max)^n)^(1/n), read from a table: this runs per pixel.
    const high = Math.max(ox, oy)
    const t = (Math.min(ox, oy) / high) * NORM_STEPS
    const index = Math.min(NORM_STEPS - 1, Math.floor(t))
    outside = high * (NORM[index] + (NORM[index + 1] - NORM[index]) * (t - index))
  } else outside = (ox ** exponent + oy ** exponent) ** (1 / exponent)
  return outside + Math.min(Math.max(qx, qy), 0) - r
}

/**
 * Smooth minimum (quadratic). Two distances closer than `k` blend: outlines start to bend toward
 * each other when the gap between shapes drops below `k` and join when it drops below `k / 2`.
 * `k <= 0` is the plain union.
 */
export function smoothMin(a: number, b: number, k: number) {
  if (!(k > 0)) return Math.min(a, b)
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - (h * h * k) / 4
}

/** Distance to the union of `shapes`, blended with `spacing`. */
export function unionDistance(px: number, py: number, shapes: readonly GlassShape[], spacing: number) {
  let d = Infinity
  for (const shape of shapes) {
    const s = shapeDistance(px, py, shape)
    d = d === Infinity ? s : smoothMin(d, s, spacing)
  }
  return d
}

/** Gap between two boxes (0 when they touch or overlap). */
export function rectGap(a: GlassRect, b: GlassRect) {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0)
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0)
  return Math.hypot(dx, dy)
}

/** Groups shapes that are close enough to blend (gap below `spacing`), in input order. */
export function glassClusters<T extends GlassShape>(shapes: readonly T[], spacing: number): T[][] {
  const parent = shapes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++)
      if (rectGap(shapes[i], shapes[j]) < spacing) parent[find(j)] = find(i)
  const groups = new Map<number, T[]>()
  shapes.forEach((shape, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(shape)
  })
  return [...groups.values()]
}

/** Bounding box of several rects. */
export function boundsOf(rects: readonly GlassRect[]): GlassRect {
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width))
  const bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x, y, width: right - x, height: bottom - y }
}

const round = (value: number) => Math.round(value * 100) / 100

/** Moves every point of an SVG path made of `M`/`L` commands by `dx`, `dy`. */
export function translatePath(d: string, dx: number, dy: number) {
  return d.replace(
    /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    (_, x: string, y: string) => `${round(Number(x) + dx)},${round(Number(y) + dy)}`
  )
}

/** The exact outline of one shape, as the kit draws it elsewhere (SVG path, absolute coordinates). */
export function shapePath(shape: GlassShape) {
  const r = clampRadius(shape)
  const corner = { x: r, y: r }
  return translatePath(foSuperellipsePath(shape.width, shape.height, [corner, corner, corner, corner]), shape.x, shape.y)
}

export type Point = [number, number]

/**
 * Closed outlines of the blended union of `shapes` (marching squares on a `cell`-sized grid with
 * linear interpolation). Every loop keeps the inside on its left, so outer outlines and holes
 * wind opposite ways and fill correctly with the nonzero rule.
 */
export function unionLoops(shapes: readonly GlassShape[], spacing: number, cell = 2): Point[][] {
  if (!shapes.length) return []
  const box = boundsOf(shapes)
  const pad = cell * 2
  const ox = box.x - pad
  const oy = box.y - pad
  const nx = Math.max(1, Math.ceil((box.width + pad * 2) / cell))
  const ny = Math.max(1, Math.ceil((box.height + pad * 2) / cell))
  const field = new Float64Array((nx + 1) * (ny + 1))
  const at = (i: number, j: number) => field[j * (nx + 1) + i]
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const value = unionDistance(ox + i * cell, oy + j * cell, shapes, spacing)
      field[j * (nx + 1) + i] = value === 0 ? 1e-9 : value
    }
  const points = new Map<string, Point>()
  const point = (key: string, ax: number, ay: number, av: number, bx: number, by: number, bv: number) => {
    if (!points.has(key)) {
      const t = av / (av - bv)
      points.set(key, [round(ox + (ax + (bx - ax) * t) * cell), round(oy + (ay + (by - ay) * t) * cell)])
    }
    return key
  }
  const links = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    if (!links.has(a)) links.set(a, [])
    if (!links.has(b)) links.set(b, [])
    links.get(a)!.push(b)
    links.get(b)!.push(a)
  }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const tl = at(i, j)
      const tr = at(i + 1, j)
      const br = at(i + 1, j + 1)
      const bl = at(i, j + 1)
      const top = tl < 0 !== tr < 0 ? point(`h${i},${j}`, i, j, tl, i + 1, j, tr) : null
      const bottom = bl < 0 !== br < 0 ? point(`h${i},${j + 1}`, i, j + 1, bl, i + 1, j + 1, br) : null
      const left = tl < 0 !== bl < 0 ? point(`v${i},${j}`, i, j, tl, i, j + 1, bl) : null
      const right = tr < 0 !== br < 0 ? point(`v${i + 1},${j}`, i + 1, j, tr, i + 1, j + 1, br) : null
      const edges = [top, right, bottom, left].filter((edge): edge is string => edge !== null)
      if (edges.length === 2) link(edges[0], edges[1])
      else if (edges.length === 4) {
        // Saddle: decide by the centre whether the inside corners connect through it.
        const centre = unionDistance(ox + (i + 0.5) * cell, oy + (j + 0.5) * cell, shapes, spacing) < 0
        if (tl < 0 === centre) {
          link(top!, right!)
          link(bottom!, left!)
        } else {
          link(left!, top!)
          link(right!, bottom!)
        }
      }
    }
  const loops: Point[][] = []
  const seen = new Set<string>()
  for (const start of links.keys()) {
    if (seen.has(start)) continue
    const loop: Point[] = []
    let previous = ''
    let current = start
    while (!seen.has(current)) {
      seen.add(current)
      loop.push(points.get(current)!)
      const next = links.get(current)!.find((key) => key !== previous && !seen.has(key))
      if (!next) break
      previous = current
      current = next
    }
    // Crossings that land on a grid vertex appear twice; drop the repeats.
    const unique = loop.filter(([x, y], index) => {
      const [px, py] = loop[(index + loop.length - 1) % loop.length]
      return Math.abs(x - px) > 1e-3 || Math.abs(y - py) > 1e-3
    })
    if (unique.length < 3) continue
    // Keep the inside on the left: sample just left of the longest of the first few segments.
    let best = 0
    let bestLength = 0
    for (let k = 0; k < Math.min(unique.length, 8); k++) {
      const [ax, ay] = unique[k]
      const [bx, by] = unique[(k + 1) % unique.length]
      const length = Math.hypot(bx - ax, by - ay)
      if (length > bestLength) [best, bestLength] = [k, length]
    }
    const [ax, ay] = unique[best]
    const [bx, by] = unique[(best + 1) % unique.length]
    const sx = (ax + bx) / 2 + ((by - ay) / bestLength) * cell * 0.4
    const sy = (ay + by) / 2 - ((bx - ax) / bestLength) * cell * 0.4
    if (unionDistance(sx, sy, shapes, spacing) > 0) unique.reverse()
    loops.push(unique)
  }
  return loops
}

/** Signed area of a loop (screen coordinates, y down): positive for clockwise. */
export function loopArea(loop: readonly Point[]) {
  let area = 0
  for (let i = 0; i < loop.length; i++) {
    const [ax, ay] = loop[i]
    const [bx, by] = loop[(i + 1) % loop.length]
    area += ax * by - bx * ay
  }
  return area / 2
}

const loopPath = (loop: readonly Point[]) => `M${loop.map(([x, y]) => `${x},${y}`).join('L')}Z`

/** One cluster's outline: the exact shape when alone, the blended union when several. */
export function clusterPath(shapes: readonly GlassShape[], spacing: number, cell = 2) {
  if (shapes.length === 1) return shapePath(shapes[0])
  return unionLoops(shapes, spacing, cell).map(loopPath).join('')
}

/** Outline of every cluster, one SVG path per cluster. */
export function glassPaths(shapes: readonly GlassShape[], spacing: number, cell = 2) {
  return glassClusters(shapes.filter((s) => s.width > 0.5 && s.height > 0.5), spacing).map((cluster) => ({
    shapes: cluster,
    bounds: boundsOf(cluster),
    d: clusterPath(cluster, spacing, cell),
  }))
}

/**
 * Where a container sits on screen and how much its ancestors scale it (a zoomed demo frame, a
 * sheet scaling back, `zoom`-like transforms). Glass is drawn in the container's own pixels, so
 * every screen measurement goes through this.
 */
export type HostFrame = { left: number; top: number; scaleX: number; scaleY: number }

/** The frame of a container from its screen box and its own layout size (`offsetWidth/Height`). */
export function hostFrame(
  box: { left: number; top: number; width: number; height: number },
  layoutWidth: number,
  layoutHeight: number
): HostFrame {
  const scaleX = layoutWidth > 0 && box.width > 0 ? box.width / layoutWidth : 1
  const scaleY = layoutHeight > 0 && box.height > 0 ? box.height / layoutHeight : 1
  return { left: box.left, top: box.top, scaleX, scaleY }
}

/** A screen point in the container's own pixels. */
export function toLocalPoint(frame: HostFrame, x: number, y: number) {
  return { x: (x - frame.left) / frame.scaleX, y: (y - frame.top) / frame.scaleY }
}

/** A container-local point on screen. */
export function toScreenPoint(frame: HostFrame, x: number, y: number) {
  return { x: frame.left + x * frame.scaleX, y: frame.top + y * frame.scaleY }
}

/** A screen box (getBoundingClientRect) in the container's own pixels. */
export function toLocalRect(frame: HostFrame, box: { left: number; top: number; width: number; height: number }): GlassRect {
  const { x, y } = toLocalPoint(frame, box.left, box.top)
  return { x, y, width: box.width / frame.scaleX, height: box.height / frame.scaleY }
}
