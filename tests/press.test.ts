import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { GLASS_PRESS_SCALE } from '../src/glass/press.ts'
import { CONTENT_PRESS_SCALE } from '../src/primitives/lens-model.ts'
import { SPRINGS, springTiming } from '../src/physics/spring.ts'

const css = readFileSync(new URL('../src/system.css', import.meta.url), 'utf8')
const token = (name: string) => {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`))
  assert.ok(match, `${name} is defined in system.css`)
  return match[1].trim()
}

test('press scales in CSS are the shared constants', () => {
  assert.equal(Number(token('--lab-press-scale-glass')), GLASS_PRESS_SCALE)
  assert.equal(Number(token('--lab-press-scale')), CONTENT_PRESS_SCALE)
})

test('spring transitions are SPRINGS as springTiming draws them', () => {
  for (const name of ['snappy', 'bouncy', 'smooth'] as const) {
    const { duration, easing } = springTiming(SPRINGS[name])
    assert.equal(token(`--lab-spring-${name}`), `${duration}ms ${easing}`, `--lab-spring-${name}`)
  }
  assert.equal(token('--lab-spring-smooth-duration'), `${springTiming(SPRINGS.smooth).duration}ms`)
})

test('touch hit areas never change layout: no coarse-pointer control growth', () => {
  for (const file of ['../src/system.css', '../src/primitives/segmented.css', '../src/primitives/choice.css']) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.doesNotMatch(text, /max\(var\(--lab-control-(size|height)\), var\(--lab-control-touch-target\)\)/, file)
  }
})
