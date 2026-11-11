import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createResizeDrag } from '../src/containers/resize-drag'

function fixture() {
  let serial = 0
  const frames = new Map<number, () => void>()
  const painted: number[] = [], committed: number[] = []
  let restores = 0
  const drag = createResizeDrag({
    paint: (value: number) => painted.push(value), commit: value => committed.push(value),
    restore: () => { restores++ },
    requestFrame: callback => { frames.set(++serial, callback); return serial },
    cancelFrame: id => { frames.delete(id) },
  })
  return { drag, frames, painted, committed, restores: () => restores,
    frame: () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback()) } }
}

test('resize samples coalesce to one paint per frame and never commit React state during a drag', () => {
  const f = fixture()
  for (let value = 0; value < 200; value++) f.drag.move(value)
  assert.equal(f.frames.size, 1)
  assert.deepEqual(f.painted, [])
  assert.deepEqual(f.committed, [])
  f.frame()
  assert.deepEqual(f.painted, [199])
  f.drag.move(240)
  f.drag.finish(false)
  assert.equal(f.frames.size, 0)
  assert.deepEqual(f.committed, [240], 'release commits latest sample even before its frame')
  assert.equal(f.restores(), 1)
  f.drag.move(999)
  f.drag.finish(false)
  assert.deepEqual(f.committed, [240], 'late events cannot double commit')
})

test('pointer cancellation and controlled invalidation restore without notifying an owner', () => {
  for (const beforeFrame of [true, false]) {
    const f = fixture()
    f.drag.move(420)
    if (!beforeFrame) f.frame()
    f.drag.finish(true)
    f.frame()
    assert.deepEqual(f.committed, [])
    assert.equal(f.frames.size, 0)
    assert.equal(f.restores(), 1)
  }
})

test('untouched gestures and unmount cleanup do not commit a width', () => {
  const f = fixture()
  f.drag.finish(false)
  assert.deepEqual(f.committed, [])
  assert.equal(f.restores(), 1)
})

test('both shared containers use transient divider gestures instead of per-move React updates', () => {
  for (const file of ['panel-host.tsx', 'split-view.tsx']) {
    const source = readFileSync(new URL(`../src/containers/${file}`, import.meta.url), 'utf8')
    assert.match(source, /createResizeDrag/)
    assert.match(source, /onDragMove=/)
    assert.match(source, /onDragEnd=/)
  }
})

test('separator restoration reads the latest controlled ARIA baseline, not a stale drag snapshot', () => {
  const divider = readFileSync(new URL('../src/containers/resize-divider.tsx', import.meta.url), 'utf8')
  assert.match(divider, /data-resize-value=\{props.value\}/)
  for (const file of ['panel-host.tsx', 'split-view.tsx']) {
    const source = readFileSync(new URL(`../src/containers/${file}`, import.meta.url), 'utf8')
    assert.match(source, /getAttribute\('data-resize-value'\)/)
  }
})

test('desktop panels are flat and both visible resize grips are centered and capped at 30px', () => {
  const panel = readFileSync(new URL('../src/containers/panel.css', import.meta.url), 'utf8')
  const split = readFileSync(new URL('../src/containers/split-view.css', import.meta.url), 'utf8')
  const column = panel.match(/\.lab-presentation\[data-in-place='column'\]\s*\{([^}]+)\}/)![1]
  assert.match(column, /box-shadow:\s*inset 0 0 0 1px var\(--lab-line\)/)
  for (const [css, selector] of [[panel, 'lab-panel-divider::after'], [split, 'lab-split-divider::before']]) {
    const block = css.slice(css.indexOf(`.${selector} {`)).split('}')[0]
    assert.match(block, /block-size:\s*min\(30px,\s*100%\)/)
    assert.match(block, /inset-block-start:\s*50%/)
    assert.match(block, /translateY\(-50%\)/)
  }
  assert.doesNotMatch(panel, /\.lab-panel-divider:focus-visible\s*\{[^}]*outline:\s*2px/)
})
