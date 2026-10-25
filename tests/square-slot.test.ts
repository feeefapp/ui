import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')
const slot = read('../src/primitives/square-slot.css')
const nav = read('../src/navigation/navigation-item.css')
const list = read('../src/primitives/list.css')
const system = read('../src/system.css')

test('a square slot is square, centred and as tall as its row', () => {
  const rule = slot.match(/\.lab-square-slot \{([^}]+)\}/)?.[1] ?? ''
  assert.match(rule, /aspect-ratio:\s*1;/)
  assert.match(rule, /block-size:\s*var\(--lab-square-slot-size, 100%\);/)
  assert.match(rule, /align-items:\s*center;/)
  assert.match(rule, /justify-content:\s*center;/)
  assert.match(rule, /flex:\s*none;/)
})

test('in a button the slot is the button height and replaces the padding at its ends', () => {
  assert.match(slot, /> \.lab-square-slot \{\s*--lab-square-slot-size: var\(--lab-control-size\);\s*margin-block: -1px;/)
  assert.match(slot, /:nth-child\(1 of [^)]+\)\) \{\s*margin-inline-start: calc\(-1px - var\(--lab-control-inline\)\);/)
  assert.match(slot, /:nth-last-child\(1 of [^)]+\)\) \{\s*margin-inline-end: calc\(-1px - var\(--lab-control-inline\)\);/)
})

test('a navigation item is a regular button: no height, radius or icon box of its own', () => {
  assert.doesNotMatch(nav, /--lab-row-height/)
  assert.doesNotMatch(nav, /(^|[^-])height:/m)
  assert.doesNotMatch(nav, /lab-navigation-(icon|label)/)
  // The tooltip is the only surface it paints itself.
  assert.equal(nav.match(/border-radius:/g)?.length, 1)
})

test('the current page is the button selected state, also in forced colors', () => {
  const selected = system.match(/\.lab-control\[data-variant\]:is\(\[aria-pressed='true'\], \[data-state='on'\], \[aria-current='page'\]\)/g)
  assert.equal(selected?.length, 2)
})

test('list rows reuse the slot for their leading media', () => {
  const rule = list.match(/\.lab-list-row-leading \{([^}]+)\}/)?.[1] ?? ''
  assert.match(rule, /--lab-square-slot-size: var\(--lab-list-leading-size\);/)
  assert.doesNotMatch(rule, /(width|height|place-items|display):/)
})
