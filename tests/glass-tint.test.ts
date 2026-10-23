import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  GLASS_CLEAR,
  GLASS_SATURATE,
  GLASS_TINT_DEFAULT,
  GLASS_VEIL,
  clampGlassTint,
  glassMaterial,
  liftFilter,
} from '../src/glass/material.ts'

const close = (actual: number, expected: number, label: string, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} vs ${expected}`)

test('tint 1 is the measured regular material, for every scheme and size', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const m = glassMaterial(1, scheme, size)
      close(m.veil, GLASS_VEIL[scheme][size], `${scheme} ${size} veil`)
      close(m.saturate, GLASS_SATURATE[scheme][size], `${scheme} ${size} saturate`)
      close(m.gain, 1, 'gain')
      close(m.offset, 0, 'offset')
      close(m.shadow, 1, 'shadow')
    }
})

test('tint 0 is measured clear glass: no veil, no shadow, full colour, the brightness lift', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const m = glassMaterial(0, scheme, size)
      assert.deepEqual(m, { veil: 0, saturate: 1, gain: GLASS_CLEAR.gain, offset: GLASS_CLEAR.offset, shadow: 0 })
    }
})

test('the default is the midpoint, a light veil, on web and Flutter', () => {
  assert.equal(GLASS_TINT_DEFAULT, 0.5)
  // Vectors shared with flutter/test/fixtures/glass.json (tint).
  const vectors: [number, 'light' | 'dark', 'small' | 'large', number, number][] = [
    [0.5, 'light', 'small', 0.435, 1.5177],
    [0.5, 'light', 'large', 0.355, 1.2698],
    [0.5, 'dark', 'small', 0.375, 1.38],
    [0.5, 'dark', 'large', 0.36, 1.3063],
    [0.25, 'light', 'small', 0.2175, 1.1869],
    [0.75, 'dark', 'large', 0.54, 1.6391],
  ]
  for (const [tint, scheme, size, veil, saturate] of vectors) {
    const m = glassMaterial(tint, scheme, size)
    close(m.veil, veil, `${tint} ${scheme} ${size} veil`, 1e-4)
    close(m.saturate, saturate, `${tint} ${scheme} ${size} saturate`, 1e-4)
  }
  const mid = glassMaterial(0.5, 'light', 'small')
  close(mid.gain, 1.015, 'half the lift gain')
  close(mid.offset, 0.038, 'half the lift offset')
  close(mid.shadow, 0.5, 'half the shadow')
})

test('colour kept through the veil, (1 - veil) · saturate, falls linearly with the tint', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const kept = (t: number) => {
        const m = glassMaterial(t, scheme, size)
        return (1 - m.veil) * m.saturate
      }
      close(kept(0.5), (kept(0) + kept(1)) / 2, `${scheme} ${size}`)
      assert.ok(kept(1) > 0.6 && kept(1) < 0.75)
    }
})

test('every parameter moves monotonically from clear to tinted', () => {
  let previous = glassMaterial(0, 'light', 'small')
  for (let i = 1; i <= 20; i++) {
    const m = glassMaterial(i / 20, 'light', 'small')
    assert.ok(m.veil > previous.veil && m.saturate > previous.saturate && m.shadow > previous.shadow)
    assert.ok(m.gain < previous.gain && m.offset < previous.offset)
    previous = m
  }
})

test('tints are clamped; non-numbers are the default', () => {
  assert.equal(clampGlassTint(-1), 0)
  assert.equal(clampGlassTint(2), 1)
  assert.equal(clampGlassTint(Number.NaN), GLASS_TINT_DEFAULT)
  assert.equal(clampGlassTint('0.2'), GLASS_TINT_DEFAULT)
  assert.deepEqual(glassMaterial(-5, 'dark', 'small'), glassMaterial(0, 'dark', 'small'))
})

test('the lift as contrast() then brightness() reproduces gain · x + offset', () => {
  for (const [gain, offset] of [[GLASS_CLEAR.gain, GLASS_CLEAR.offset], [1.015, 0.038], [1, 0]]) {
    const { contrast, brightness } = liftFilter(gain, offset)
    for (const x of [0, 0.3, 0.7]) close(brightness * (contrast * x + (1 - contrast) / 2), gain * x + offset, `x ${x}`)
  }
})

test('the CSS tokens carry the same anchors and lift as material.ts', () => {
  const system = readFileSync(new URL('../src/system.css', import.meta.url), 'utf8')
  const glass = readFileSync(new URL('../src/glass/glass.css', import.meta.url), 'utf8')
  const anchors = (css: string, scheme: 'light' | 'dark') => {
    const veil = GLASS_VEIL[scheme]
    const sat = GLASS_SATURATE[scheme]
    const loss = (size: 'small' | 'large') => String(Math.round((1 - (1 - veil[size]) * sat[size]) * 1000) / 1000)
    for (const [name, value] of [
      ['--lab-glass-veil', String(veil.small)],
      ['--lab-glass-veil-large', String(veil.large)],
      ['--lab-glass-colour-loss', loss('small')],
      ['--lab-glass-colour-loss-large', loss('large')],
    ])
      assert.ok(css.includes(`${name}: ${value};`), `${scheme}: ${name}: ${value}`)
  }
  anchors(system, 'light')
  anchors(system, 'dark')
  anchors(glass, 'light')
  anchors(glass, 'dark')
  // The lift: gain + 2 · offset at tint 0, and its slope.
  const top = liftFilter(GLASS_CLEAR.gain, GLASS_CLEAR.offset).brightness
  assert.ok(system.includes(`brightness(calc(${top.toFixed(3)} - ${(top - 1).toFixed(3)} * var(--lab-glass-tint)))`))
  assert.ok(system.includes(`--lab-glass-tint: ${GLASS_TINT_DEFAULT};`))
})
