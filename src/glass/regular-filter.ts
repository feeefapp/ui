// Regular material adapted from liquid_glass_renderer 1.0.0-dev.2.
// Copyright 2025 Tim Lehmann for whynotmake.it. See licenses/liquid_glass_renderer.txt.
import { liquidFace, liquidFaceMatrix } from './material'
import type { GlassLight } from './light'

export function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value))
  return element
}

const matrix = (input: string, result: string) => svgNode('feColorMatrix', { in: input, type: 'matrix', result })
const composite = (input: string, input2: string, result: string, k1: number, k2: number, k3: number, k4: number) =>
  svgNode('feComposite', { in: input, in2: input2, result, operator: 'arithmetic', k1, k2, k3, k4 })

/** sRGB equivalent of the regular fragment shader. The two feImages read the same
 * decoded bitmap. Only the projection matrix changes when the pointer turns the light. */
export class RegularGlassFilter {
  readonly normals = svgNode('feImage', { result: 'normals', preserveAspectRatio: 'none', x: 0 })
  private readonly face = matrix('bent', 'packed')
  private readonly curve = svgNode('feComponentTransfer', { in: 'luma', result: 'lift' })
  private readonly projection = matrix('normals', 'projected')
  private readonly weight = matrix('angular', 'glint')
  private readonly delta = matrix('face', 'delta')
  private materialKey = ''
  private direction = ''

  constructor(filter: SVGFilterElement, readonly lit: boolean) {
    for (const channel of ['feFuncR', 'feFuncG', 'feFuncB'] as const) this.curve.append(svgNode(channel, { type: 'table' }))
    filter.append(this.face, svgNode('feColorMatrix', { in: 'bent', type: 'saturate', values: 0, result: 'luma' }),
      this.curve, composite('packed', 'lift', lit ? 'face' : 'edged', 0, 2, 1, -0.5))
    if (!lit) return
    const angular = svgNode('feComponentTransfer', { in: 'projected', result: 'angular' })
    angular.append(svgNode('feFuncR', { type: 'table', tableValues: '1 0 1' }))
    filter.append(this.normals, this.projection, angular, this.weight, this.delta,
      composite('delta', 'glint', 'adjustment', 2, 0, -0.25, 0.25),
      composite('face', 'adjustment', 'edged', 0, 1, 4, -1))
  }

  material(tint: number, dark: boolean, strength: number) {
    const key = `${tint}|${dark}|${strength}`
    if (this.materialKey === key) return
    this.materialKey = key
    const face = liquidFace(tint, dark)
    // Bias and scale signed intermediate colours into SVG's clamped range.
    this.face.setAttribute('values', liquidFaceMatrix(face).map((v, i) =>
      i < 15 ? v / 2 + (i % 5 === 4 ? 0.25 : 0) : v).join(' '))
    const table = Array.from({ length: 17 }, (_, i) => face.transmission * face.lift * i * (16 - i) / 256).join(' ')
    for (const channel of Array.from(this.curve.children)) channel.setAttribute('tableValues', table)
    if (!this.lit) return
    const scale = 0.1512 * 1.21 * strength
    const row = `${-scale} ${scale} 0 0 0`
    this.weight.setAttribute('values', `${row} ${row} ${row} 0 0 0 1 0`)
    const clear = Math.max(0, 1 - 2 * tint)
    const luminance = 1.6 + 0.74 * clear
    const gain = 3.58 * clear
    const vibrancy = 2.85 - 2.07 * clear
    // (target - face + 1) / 8. The composites above unpack it and add
    // glint * (target - face) after the face has been clamped.
    this.delta.setAttribute('values', [0, 1, 2].flatMap(row => [
      ...[0.2126, 0.7152, 0.0722].map((y, col) => ((row === col ? vibrancy + gain - 1 : 0) - vibrancy * y) / 8),
      0, (1 + luminance) / 8,
    ]).concat(0, 0, 0, 1, 0).join(' '))
  }

  light(light: GlassLight) {
    if (!this.lit) return
    const x = -light.y * 255 / 254, y = light.x * 255 / 254
    const key = `${x.toFixed(3)} ${y.toFixed(3)} 0 0 ${(0.5 - (x + y) * 128 / 255).toFixed(5)}`
    if (key === this.direction) return
    this.direction = key
    this.projection.setAttribute('values', `${key} 0 0 1 0 0 0 0 0 0 0 0 0 0 1 0`)
  }
}
