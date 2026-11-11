import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('independent desktop panels retain their own boundary even on the same surface color', () => {
  const css = readFileSync(new URL('../src/containers/panel.css', import.meta.url), 'utf8')
  const column = css.match(/\.lab-presentation\[data-in-place='column'\] \{([^}]+)\}/)?.[1] ?? ''
  assert.match(column, /box-shadow:\s*inset[^;]*var\(--lab-line\)/)
})
import { dividerKeyValue } from '../src/containers/resize-model'
import { allocatePanelWidths, pushPanel, replacePanel, closePanel, panelResizeBounds, resizePanelPair } from '../src/containers/panel-model'

test('divider keys mirror physical arrows in RTL and clamp Home/End to pair bounds', () => {
  assert.equal(dividerKeyValue('ArrowRight', 300, 240, 432, false), 324)
  assert.equal(dividerKeyValue('ArrowRight', 300, 240, 432, true), 276)
  assert.equal(dividerKeyValue('ArrowLeft', 300, 240, 432, true), 324)
  assert.equal(dividerKeyValue('ArrowLeft', 250, 240, 432, false), 240)
  assert.equal(dividerKeyValue('Home', 300, 240, 432, true), 240)
  assert.equal(dividerKeyValue('End', 300, 240, 432, false), 432)
  assert.equal(dividerKeyValue('Enter', 300, 240, 432, false), null)
})

test('pair resize intersects both bounds and preserves the exact total without hiding siblings', () => {
  const a = { id: 'a', minWidth: 240, maxWidth: 480 }
  const b = { id: 'b', minWidth: 280, maxWidth: 480 }
  assert.deepEqual(panelResizeBounds(a, b, 712), { min: 240, max: 432 })
  assert.deepEqual(resizePanelPair(a, b, 712, 999), [{ id: 'a', width: 432 }, { id: 'b', width: 280 }])
  assert.deepEqual(resizePanelPair(a, b, 712, -100), [{ id: 'a', width: 240 }, { id: 'b', width: 472 }])
  assert.deepEqual(panelResizeBounds(a, b, 960), { min: 480, max: 480 })
  assert.deepEqual(resizePanelPair(a, b, 960, 300), [{ id: 'a', width: 480 }, { id: 'b', width: 480 }])
})

test('width overrides survive allocation and container changes with bounded flexible siblings', () => {
  const panels = [{ id: 'a', minWidth: 200, maxWidth: 480 }, { id: 'b', minWidth: 200, maxWidth: 480 }, { id: 'c', minWidth: 200, maxWidth: 480 }]
  const overrides = { a: 250, b: 350, c: 300 }
  assert.deepEqual(allocatePanelWidths(panels, 916, 8, overrides), [
    { id: 'a', width: 250 }, { id: 'b', width: 350 }, { id: 'c', width: 300 },
  ])
  assert.deepEqual(allocatePanelWidths(panels.slice(0, 2), 800, 0, { a: 320 }), [
    { id: 'a', width: 320 }, { id: 'b', width: 480 },
  ])
  for (const container of [700, 800, 916, 1100, 1456]) {
    const layout = allocatePanelWidths(panels, container, 8, overrides)
    assert.deepEqual(layout.map(p => p.id), ['a', 'b', 'c'])
    assert.ok(layout.every(p => p.width >= 200 && p.width <= 480))
    assert.ok(Math.abs(layout.reduce((sum, p) => sum + p.width, 16) - container) < 0.000001)
  }
  assert.deepEqual(allocatePanelWidths(panels, 916, 8, { a: NaN, b: Infinity }), allocatePanelWidths(panels, 916, 8))
  assert.throws(() => panelResizeBounds(panels[0], panels[1], 300), RangeError)
})

test('every resized allocation remains feasible at exact minima, maxima and fractional container widths', () => {
  const panels = [{ id: 'root', minWidth: 233, maxWidth: 480 }, { id: 'detail', minWidth: 271, maxWidth: 480 }, { id: 'deep', minWidth: 203, maxWidth: 480 }]
  for (let container = 504; container <= 1500; container += 7.25) {
    const layout = allocatePanelWidths(panels, container, 8, { root: 280, deep: 410 })
    for (let i = 0; i < layout.length - 1; i++) {
      const a = panels.find(p => p.id === layout[i].id)!, b = panels.find(p => p.id === layout[i + 1].id)!
      const total = layout[i].width + layout[i + 1].width
      for (const requested of [0, 312.125, 10000]) {
        const pair = resizePanelPair(a, b, total, requested)
        assert.ok(pair[0].width >= a.minWidth && pair[0].width <= a.maxWidth)
        assert.ok(pair[1].width >= b.minWidth - 1e-9 && pair[1].width <= b.maxWidth + 1e-9)
        assert.equal(pair[0].width + pair[1].width, total)
        const preferences = Object.fromEntries(layout.map(p => [p.id, pair.find(n => n.id === p.id)?.width ?? p.width]))
        const resized = allocatePanelWidths(panels, container, 8, preferences)
        assert.deepEqual(resized, layout.map(p => pair.find(n => n.id === p.id) ?? p))
      }
    }
  }
})

test('panel navigation retains ancestors and truncates descendants without mutating entries', () => {
  const root = { id: 'root' }, detail = { id: 'detail' }, deep = { id: 'deep' }
  const panels = [root, detail, deep]
  assert.deepEqual(pushPanel(panels, { id: 'next' }, 'detail'), [root, detail, { id: 'next' }])
  assert.deepEqual(replacePanel(panels, { id: 'replacement' }, 'detail'), [root, { id: 'replacement' }])
  assert.deepEqual(closePanel(panels, 'detail'), [root])
  assert.equal(closePanel(panels, 'missing'), panels)
  assert.equal(panels[2], deep)
  assert.throws(() => pushPanel(panels, { id: 'root' }), /Duplicate/)
  assert.throws(() => pushPanel(panels, { id: 'new' }, 'missing'), /Unknown/)
})

test('width allocation keeps the newest fitting suffix, never discards panel records', () => {
  const panels = Array.from({ length: 5 }, (_, i) => ({ id: String(i), minWidth: 240, preferredWidth: 320, maxWidth: 400 }))
  const layout = allocatePanelWidths(panels, 800, 8)
  assert.deepEqual(layout.map(p => p.id), ['2', '3', '4'])
  assert.equal(layout.reduce((sum, p) => sum + p.width, 16), 800)
  assert.ok(layout.every(p => p.width >= 240 && p.width <= 400))
  assert.deepEqual(allocatePanelWidths(panels, 120, 8), [{ id: '4', width: 120 }])
  assert.deepEqual(allocatePanelWidths([], 800), [])
})

test('width allocation honors asymmetric bounds, grows to maxima and handles invalid widths', () => {
  const panels = [{ id: 'root', minWidth: 300, preferredWidth: 500, maxWidth: 700 }, { id: 'detail', minWidth: 200, preferredWidth: 300, maxWidth: 350 }]
  assert.deepEqual(allocatePanelWidths(panels, 900, 0), [{ id: 'root', width: 550 }, { id: 'detail', width: 350 }])
  assert.deepEqual(allocatePanelWidths(panels, 1500, 0), [{ id: 'root', width: 700 }, { id: 'detail', width: 350 }])
  assert.deepEqual(allocatePanelWidths(panels, Number.NaN), [{ id: 'detail', width: 0 }])
  assert.throws(() => allocatePanelWidths([{ id: 'a' }, { id: 'a' }], 800), /Duplicate/)
})
