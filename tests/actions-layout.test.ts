import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeActionsLayout, computeFitRow, menuHasLeading } from '../src/actions/layout.ts'

const actions = [
  { id: 'back', width: 70, priority: 2 },
  { id: 'export', width: 90, priority: 0 },
  { id: 'settings', width: 80, priority: 0 },
  { id: 'save', width: 100, priority: 10 },
]
const fit = (maxWidth: number) =>
  computeActionsLayout({
    actions,
    maxWidth,
    gap: 8,
    overflowWidth: 40,
    measure: (action) => action.width,
  })
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id)

test('all actions fit without reserving a redundant overflow trigger', () => {
  const result = fit(364)
  assert.deepEqual(ids(result.visible), ['back', 'export', 'settings', 'save'])
  assert.deepEqual(result.overflow, [])
  assert.equal(result.requiredWidth, 364)
})

test('low priority spills first; ties spill the later action', () => {
  const result = fit(332)
  assert.deepEqual(ids(result.visible), ['back', 'export', 'save'])
  assert.deepEqual(ids(result.overflow), ['settings'])
  assert.equal(result.requiredWidth, 324)
})

test('both result lists retain source order after several priority-based removals', () => {
  const result = fit(226)
  assert.deepEqual(ids(result.visible), ['back', 'save'])
  assert.deepEqual(ids(result.overflow), ['export', 'settings'])
  assert.equal(result.requiredWidth, 226)
})

test('the overflow trigger and each gap participate in fitting', () => {
  const result = fit(225.9)
  assert.deepEqual(ids(result.visible), ['save'])
  assert.deepEqual(ids(result.overflow), ['back', 'export', 'settings'])
  assert.equal(result.requiredWidth, 148)
})

test('a narrower-than-trigger host keeps every action reachable in the menu', () => {
  const result = fit(20)
  assert.deepEqual(result.visible, [])
  assert.deepEqual(ids(result.overflow), ids(actions))
  assert.equal(result.requiredWidth, 40)
})

test('a single fitting action needs no overflow, but a non-fitting action spills', () => {
  const options = {
    actions: [actions[3]],
    gap: 8,
    overflowWidth: 40,
    measure: (action: (typeof actions)[number]) => action.width,
  }
  assert.deepEqual(ids(computeActionsLayout({ ...options, maxWidth: 100 }).visible), ['save'])
  assert.deepEqual(ids(computeActionsLayout({ ...options, maxWidth: 99 }).overflow), ['save'])
})

test('an empty or unbounded bar handles its natural width', () => {
  assert.deepEqual(computeActionsLayout({ actions: [], maxWidth: 0, measure: () => 0 }), {
    visible: [],
    overflow: [],
    requiredWidth: 0,
  })
  assert.deepEqual(ids(fit(Infinity).visible), ids(actions))
})

test('groups spill atomically and input arrays remain unchanged', () => {
  const group = Object.freeze({
    id: 'group',
    width: 140,
    priority: -1,
    children: Object.freeze(['download', 'copy']),
  })
  const items = Object.freeze([group, Object.freeze({ id: 'submit', width: 100, priority: 1 })])
  const result = computeActionsLayout({
    actions: items,
    maxWidth: 145,
    measure: (action) => action.width,
  })
  assert.deepEqual(ids(result.visible), ['submit'])
  assert.equal(result.overflow[0], group)
  assert.deepEqual(group.children, ['download', 'copy'])
  assert.equal(items.length, 2)
})

test('each measured width is read once per fitting pass', () => {
  const reads = new Map<string, number>()
  computeActionsLayout({
    actions,
    maxWidth: 100,
    measure: (action) => {
      reads.set(action.id, (reads.get(action.id) ?? 0) + 1)
      return action.width
    },
  })
  assert.deepEqual([...reads.values()], [1, 1, 1, 1])
})

test('fractional browser measurements do not silently exceed the available width', () => {
  const result = computeActionsLayout({
    actions: [{ id: 'first' }, { id: 'second' }],
    maxWidth: 100,
    gap: 0.25,
    overflowWidth: 20.5,
    measure: () => 50,
  })
  assert.deepEqual(ids(result.visible), ['first'])
  assert.equal(result.requiredWidth, 70.75)
})

test('invalid geometry is rejected before it can silently hide controls', () => {
  assert.throws(() => fit(Number.NaN), RangeError)
  assert.throws(() => fit(-1), RangeError)
  assert.throws(
    () => computeActionsLayout({ actions, maxWidth: 100, gap: -1, measure: () => 20 }),
    RangeError
  )
  assert.throws(
    () =>
      computeActionsLayout({
        actions,
        maxWidth: 100,
        overflowWidth: Infinity,
        measure: () => 20,
      }),
    RangeError
  )
  assert.throws(
    () => computeActionsLayout({ actions, maxWidth: 100, measure: () => Number.NaN }),
    RangeError
  )
})

import { diffVisibleActions } from '../src/actions/overflow-motion.ts'

test('overflow motion knows which actions enter, leave and stay in the row', () => {
  assert.deepEqual(diffVisibleActions(['a', 'b', 'c'], ['a', 'c']), { entering: [], leaving: ['b'], staying: ['a', 'c'] })
  assert.deepEqual(diffVisibleActions(['a'], ['a', 'b']), { entering: ['b'], leaving: [], staying: ['a'] })
  assert.deepEqual(diffVisibleActions([], []), { entering: [], leaving: [], staying: [] })
})

test('menus reserve the leading slot only when a row has an icon, check or loader', () => {
  const plain = [
    { id: 'a', type: 'action' },
    { id: 'b', type: 'group' },
  ]
  assert.equal(menuHasLeading(plain, new Set()), false)
  assert.equal(menuHasLeading(plain, new Set(['b'])), true)
  assert.equal(menuHasLeading([...plain, { id: 'c', type: 'action', icon: 'x' }], new Set()), true)
  assert.equal(menuHasLeading([{ id: 't', type: 'toggle' }], new Set()), true)
})

test('fit row: foldable controls fold from the end until the row fits', () => {
  const views = { id: 'views', full: 240, compact: 120, current: 240 }
  const platform = { id: 'platform', full: 170, compact: 100, current: 170 }
  // 50px short: folding the last one (saves 70) is enough.
  assert.deepEqual([...computeFitRow([views, platform], -50)], ['views'])
  // 100px short: both fold.
  assert.deepEqual([...computeFitRow([views, platform], -100)], [])
  // Room to spare: both unfold.
  assert.deepEqual([...computeFitRow([views, platform], 10)].sort(), ['platform', 'views'])
})

test('fit row: the answer does not depend on which controls are folded now', () => {
  const unfolded = [
    { id: 'a', full: 240, compact: 120, current: 240 },
    { id: 'b', full: 170, compact: 100, current: 170 },
  ]
  // Folding b frees 70px, so the free space grows by exactly that: same answer, no flip back.
  const folded = [unfolded[0], { ...unfolded[1], current: 100 }]
  assert.deepEqual([...computeFitRow(unfolded, -50)], ['a'])
  assert.deepEqual([...computeFitRow(folded, 20)], ['a'])
  // Mid-spring (b at 130px) too.
  assert.deepEqual([...computeFitRow([unfolded[0], { ...unfolded[1], current: 130 }], -10)], ['a'])
})

test('fit row: priority decides which folds first; no room folds everything', () => {
  const items = [
    { id: 'a', full: 200, compact: 100, current: 100, priority: 0 },
    { id: 'b', full: 200, compact: 100, current: 100, priority: 5 },
  ]
  assert.deepEqual([...computeFitRow(items, 150)], ['b'])
  assert.deepEqual([...computeFitRow(items, -20)], [])
  assert.deepEqual([...computeFitRow([], 100)], [])
})
