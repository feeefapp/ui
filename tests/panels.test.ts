import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allocatePanelWidths, pushPanel, replacePanel, closePanel } from '../src/containers/panel-model'

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
