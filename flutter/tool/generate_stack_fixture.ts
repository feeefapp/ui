/**
 * Writes flutter/test/fixtures/stack.json from the web kit's navigation stack model, so the Dart
 * twin is tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_stack_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { diffStack, slideFrame, mixRect, zoomFrame, dragDismissRect, STACK_PARALLAX, type Rect } from '../../src/containers/stack-model'

const lists: [string[], string[]][] = [
  [[], []],
  [['a'], ['a']],
  [[], ['a']],
  [['a'], ['a', 'b']],
  [['a'], ['a', 'b', 'c']],
  [['a', 'b'], ['a']],
  [['a', 'b', 'c'], ['a']],
  [['a', 'b'], []],
  [['a', 'b'], ['a', 'c']],
  [['a', 'b', 'c'], ['x']],
  [['a'], ['b', 'c']],
  [['a', 'b', 'c'], ['a', 'd', 'c']],
  [['a', 'b'], ['a', 'b']],
]

const numbers = (text: string) => (text.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)

const rects: Rect[] = [
  { x: 0, y: 0, width: 390, height: 844 },
  { x: 24, y: 120, width: 160, height: 120 },
  { x: 117, y: 303.84, width: 156, height: 236.32 },
]
const pages = [
  { width: 390, height: 844 },
  { width: 1024, height: 700 },
]

const fixture = {
  parallax: STACK_PARALLAX,
  diff: lists.map(([previous, next]) => ({ previous, next, change: diffStack(previous, next) })),
  slide: [-0.2, 0, 0.25, 0.5, 0.8, 1, 1.1].flatMap((shown) =>
    [390, 1024].flatMap((width) =>
      [false, true].map((rtl) => ({ shown, width, rtl, frame: slideFrame(shown, width, rtl) }))
    )
  ),
  mix: [-0.1, 0, 0.3, 1, 1.08].map((progress) => ({
    from: rects[1],
    to: rects[0],
    progress,
    rect: mixRect(rects[1], rects[0], progress),
  })),
  zoom: rects.flatMap((rect) =>
    pages.flatMap((page) =>
      [0, 12, 28].map((radius) => {
        const frame = zoomFrame(rect, radius, page)
        const translate = numbers(frame.transform)
        const clip = numbers(frame.clip)
        return {
          rect,
          radius,
          page,
          scale: frame.scale,
          translate: [translate[1], translate[2]],
          clipBottom: clip[2],
          clipRadius: clip[4],
        }
      })
    )
  ),
  drag: pages.flatMap((page) =>
    [
      [0, 0],
      [40, 120],
      [-30, -80],
      [200, 10],
      [0, 400],
    ].flatMap(([dx, dy]) =>
      [undefined, 90].map((pull) => {
        const anchor = { x: page.width * 0.4, y: page.height * 0.3 }
        return { page, anchor, dx, dy, pull: pull ?? null, rect: dragDismissRect(page, anchor, dx, dy, pull) }
      })
    )
  ),
}

writeFileSync(new URL('../test/fixtures/stack.json', import.meta.url), JSON.stringify(fixture, null, 1) + '\n')
console.log('wrote flutter/test/fixtures/stack.json')
