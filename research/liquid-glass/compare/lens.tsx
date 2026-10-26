/**
 * The web twin of CtlLab's `scene=lens&pattern=cycle` (app/controls/CtlLab.swift): the same backdrop
 * images (?bg=<LENS_CYCLE index>) under the kit's control lenses, held at full lens where iOS 26.2
 * draws them: the segmented pill (96 × 28 at 53, 184 → lensPillShape) and the slider thumb
 * (37 × 24 centred at 201, 276.5 → LENS_THUMB_SCALE) and the switch thumb (centred at 92, 354). ?theme=light|dark, ?glass=liquid|transparent.
 * tools/lens_kit.mjs screenshots every image at 3x for tools/measure_lens.py.
 */
import { GlassLensLayer } from '../../../src/glass/lens-layer'
import { LENS_THUMB_SCALE, lensPillShape } from '../../../src/primitives/lens-model'
import '../../../src/primitives/lens.css'

const LENS_CYCLE = ['flat:ffffff', 'flat:000000', 'flat:808080',
  'x:96:0', 'x:96:1', 'x:96:2', 'x:24:0', 'x:24:1', 'x:24:2',
  'y:96:0', 'y:96:1', 'y:96:2', 'y:24:0', 'y:24:1', 'y:24:2', 'stripes']

const query = new URLSearchParams(location.search)
document.documentElement.setAttribute('data-lab-theme', query.get('theme') === 'dark' ? 'dark' : 'light')
document.documentElement.setAttribute('data-lab-glass', query.get('glass') ?? 'liquid')

function paint(canvas: HTMLCanvasElement, image: string) {
  const [kind, a, b] = image.split(':')
  canvas.width = 1206
  canvas.height = 2622
  const g = canvas.getContext('2d')!
  if (kind === 'flat') {
    g.fillStyle = `#${a}`
    g.fillRect(0, 0, 1206, 2622)
  } else if (kind === 'x' || kind === 'y') {
    const period = Number(a), k = Number(b)
    const n = kind === 'x' ? 1206 : 2622
    for (let i = 0; i < n; i++) {
      const v = Math.round(255 * (0.5 + 0.4 * Math.cos((2 * Math.PI * (i + 0.5)) / period + (2 * Math.PI * k) / 3)))
      g.fillStyle = `rgb(${v},${v},${v})`
      if (kind === 'x') g.fillRect(i, 0, 1, 2622)
      else g.fillRect(0, i, 1206, 1)
    }
  } else {
    g.fillStyle = '#fff'
    g.fillRect(0, 0, 1206, 2622)
    g.fillStyle = '#000'
    for (let x = 0; x < 1206; x += 18) g.fillRect(x, 0, 3, 2622)
  }
}

// Painted on a canvas, shown as an image: Chromium's backdrop filters don't sample a canvas.
const canvas = document.createElement('canvas')
paint(canvas, LENS_CYCLE[Number(query.get('bg') ?? 15)])
const backdrop = new Image()
backdrop.id = 'bg'
backdrop.src = canvas.toDataURL('image/png')
await backdrop.decode()
document.body.append(backdrop)

function lens(kind: 'pill' | 'thumb' | 'switch', shape: { x: number; y: number; width: number; height: number; radius: number }) {
  const el = document.createElement('span')
  el.className = 'lab-lens'
  // inset first: the shorthand would reset left and top.
  el.style.inset = 'auto'
  Object.assign(el.style, {
    left: `${shape.x}px`, top: `${shape.y}px`, width: `${shape.width}px`, height: `${shape.height}px`,
    borderRadius: `${shape.radius}px`,
  })
  el.style.setProperty('--lab-lens', '1')
  document.body.append(el)
  new GlassLensLayer(el, kind).update(1, shape)
}

const pill = lensPillShape({ x: 53, y: 184, width: 96, height: 28 }, 14, 1, query.get('glass') !== 'transparent')
lens('pill', pill)
const tw = 37 * LENS_THUMB_SCALE, th = 24 * LENS_THUMB_SCALE
lens('thumb', { x: 201 - tw / 2, y: 276.5 - th / 2, width: tw, height: th, radius: th / 2 })
// The switch thumb (on): 37 × 24 centred at (92, 354), the Toggle's held lens.
lens('switch', { x: 92 - tw / 2, y: 354 - th / 2, width: tw, height: th, radius: th / 2 })
document.documentElement.setAttribute('data-ready', '')
