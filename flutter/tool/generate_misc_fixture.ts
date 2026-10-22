/**
 * Writes flutter/test/fixtures/misc.json from the web kit's pure ladder and speech-order modules,
 * so the Dart twins are tested against the same numbers. Run from ui/:
 * npx tsx flutter/tool/generate_misc_fixture.ts
 *
 * `reorder.ts` is a React hook; its two formulas (edge auto-scroll speed and the dragged card's
 * lane clamp) are inline there, so they are copied verbatim below.
 */
import { writeFileSync } from 'node:fs'
import {
  displayName,
  fireCell,
  fireNoise,
  formatUsd,
  heatAt,
  middleIndex,
  visibleLabel,
  type LadderStop,
} from '../../src/model-ladder-core'
import {
  moveSpeechBlock,
  remapSpeechIndex,
  speechDragIndex,
  speechPreviewOffsets,
} from '../../src/speech/block-order'

// From reorder.ts `sample()`.
function autoScrollSpeed(y: number, top: number, bottom: number) {
  const edge = Math.min(64, Math.max(12, (bottom - top) / 4))
  return y < top + edge
    ? -Math.min(12, (top + edge - y) / 4)
    : y > bottom - edge
      ? Math.min(12, (y - bottom + edge) / 4)
      : 0
}
function dragOffset(items: { top: number; height: number }[], index: number, delta: number) {
  const own = items[index]
  const last = items[items.length - 1]
  return Math.max(items[0].top - own.top, Math.min(last.top + last.height - own.height - own.top, delta))
}

const stops: LadderStop[] = [
  { modelId: 'flash', label: 'Fast', modelName: 'Gemini Flash' },
  { modelId: 'gpt-image', label: 'gpt-image', modelName: 'GPT Image' },
  { modelId: 'pro-x', label: 'Pro X', modelName: 'Pro X' },
  { modelId: 'id-only', label: 'id-only', modelName: 'id-only' },
  { modelId: 'blank', label: '  ', modelName: '' },
  { modelId: '', label: '', modelName: '' },
  { modelId: 'name-copy', label: 'Studio', modelName: 'name-copy' },
  { modelId: 'x', label: ' Best ', modelName: ' Model X ' },
]

const ladder = stops.flatMap((stop) =>
  [1, 2, 3, 5].flatMap((count) =>
    [0, 1, 2, count - 1].map((index) => ({
      stop,
      index,
      count,
      visible: visibleLabel(stop, index, count),
      display: displayName(stop, index, count),
    }))
  )
)

const layouts = [
  [
    { top: 0, height: 100 },
    { top: 112, height: 40 },
    { top: 164, height: 220 },
    { top: 396, height: 60 },
  ],
  [
    { top: 20, height: 80 },
    { top: 120, height: 80 },
    { top: 210, height: 30 },
  ],
  [{ top: 5, height: 50 }],
  [
    { top: -40, height: 64.5 },
    { top: 36.5, height: 120.25 },
    { top: 168.75, height: 12 },
    { top: 200, height: 300 },
    { top: 512, height: 48 },
  ],
]

const fixture = {
  ladder,
  middle: [0, 1, 2, 3, 4, 5, 6, 9].map((count) => [count, middleIndex(count)]),
  heat: [0, 1, 2, 3, 5].flatMap((count) =>
    [-1, 0, 0.5, 1, 1.25, 2.5, 3, 3.6, 4, 5].map((position) => [position, count, heatAt(position, count)])
  ),
  usd: [-1, 0, 0.001, 0.004, 0.0099, 0.01, 0.0125, 0.0995, 0.1, 0.105, 0.125, 1, 1.005, 2.675, 12.3456].map(
    (value) => [value, formatUsd(value)]
  ),
  noise: [
    [0, 0, 0],
    [1, 2, 3],
    [17, 4, 11],
    [63, 9, 7],
    [5, 0, 1],
  ].map(([x, y, frame]) => [x, y, frame, fireNoise(x, y, frame)]),
  fire: [1, 2, 4, 9].flatMap((rows) =>
    Array.from({ length: 12 }, (_, frame) =>
      Array.from({ length: 30 }, (_, col) =>
        Array.from({ length: rows }, (_, row) => [col, row, rows, frame, fireCell(col, row, rows, frame)])
      ).flat()
    ).flat()
  ),
  move: [
    [['a', 'b', 'c', 'd'], 0, 2],
    [['a', 'b', 'c', 'd'], 3, 0],
    [['a', 'b', 'c', 'd'], 1, 1],
    [['a', 'b', 'c', 'd'], -1, 2],
    [['a', 'b', 'c', 'd'], 0, 4],
    [['a'], 0, 0],
    [[], 0, 0],
  ].map(([list, from, to]) => ({
    list,
    from,
    to,
    result: moveSpeechBlock(list as string[], from as number, to as number),
  })),
  remap: [
    [0, ['a', 'b', 'c'], ['b', 'c', 'a']],
    [2, ['a', 'b', 'c'], ['c', 'a', 'b']],
    [1, ['a', 'b', 'c'], ['a', 'c']],
    [5, ['a', 'b'], ['a', 'b']],
    [-1, ['a', 'b'], ['b', 'a']],
    [0, [], ['a']],
  ].map(([index, previous, next]) => ({
    index,
    previous,
    next,
    result: remapSpeechIndex(index as number, previous as string[], next as string[]),
  })),
  offsets: layouts.flatMap((items) =>
    items.flatMap((_, from) => items.map((__, to) => ({ items, from, to, result: speechPreviewOffsets(items, from, to) })))
  ),
  drag: layouts.flatMap((items) =>
    items.flatMap((_, from) =>
      [-500, -120, -60, -10.5, 0, 6, 55, 61.25, 140, 333, 900].map((delta) => ({
        items,
        from,
        delta,
        index: speechDragIndex(items, from, delta),
        offset: dragOffset(items, from, delta),
      }))
    )
  ),
  scroll: [
    [0, 0, 800],
    [10, 0, 800],
    [63, 0, 800],
    [64, 0, 800],
    [400, 0, 800],
    [740, 0, 800],
    [790, 0, 800],
    [900, 0, 800],
    [-200, 0, 800],
    [30, 20, 60],
    [5, 20, 60],
    [58, 20, 60],
    [130, 100, 300],
    [290.5, 100, 300],
  ].map(([y, top, bottom]) => [y, top, bottom, autoScrollSpeed(y, top, bottom)]),
}

writeFileSync(new URL('../test/fixtures/misc.json', import.meta.url), JSON.stringify(fixture))
console.log('wrote flutter/test/fixtures/misc.json')
