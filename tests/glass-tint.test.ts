import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  GLASS_CLEAR,
  GLASS_HAIRLINE,
  GLASS_MENU,
  GLASS_REGULAR_LIFT,
  GLASS_SHADOW,
  GLASS_SATURATE,
  GLASS_BAR_TINT,
  GLASS_TINT_DEFAULT,
  GLASS_VEIL,
  clampGlassTint,
  glassBlur,
  glassFrostedBlur,
  glassKindBlur,
  glassMaterial,
  glassMenuMaterial,
  liftFilter,
} from '../src/glass/material.ts'

const close = (actual: number, expected: number, label: string, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} vs ${expected}`)

test('tint 1 is the measured regular material (iOS 27), for every scheme and size', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const m = glassMaterial(1, scheme, size)
      close(m.veil, GLASS_VEIL[scheme][size], `${scheme} ${size} veil`)
      close(m.saturate, GLASS_SATURATE[scheme][size], `${scheme} ${size} saturate`)
      close(m.gain, GLASS_REGULAR_LIFT[scheme].gain, 'gain')
      close(m.offset, GLASS_REGULAR_LIFT[scheme].offset, 'offset')
    }
  // Over grey backdrops (surface ≈ 0.99 light / 0.125 dark): iOS 27 is 0.443·x + 0.514 / 0.82·x + 0.094.
  for (const [scheme, surface, slope, intercept] of [['light', 0.99, 0.443, 0.514], ['dark', 0.125, 0.82, 0.094]] as const) {
    const m = glassMaterial(1, scheme, 'small')
    const out = (x: number) => m.veil * surface + (1 - m.veil) * Math.min(1, m.gain * x + m.offset)
    for (const x of [0, 0.5, 1]) close(out(x), slope * x + intercept, `${scheme} grey ${x}`, 0.02)
  }
})

test('tint 0 is measured clear glass: no veil, full colour, the brightness lift', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const m = glassMaterial(0, scheme, size)
      assert.deepEqual(m, { veil: 0, saturate: 1, gain: GLASS_CLEAR.gain, offset: GLASS_CLEAR.offset })
    }
})

test('the default is the midpoint, between clear and regular, on web and Flutter', () => {
  assert.equal(GLASS_TINT_DEFAULT, 0.5)
  // Vectors shared with flutter/test/fixtures/glass.json (tint).
  const vectors: [number, 'light' | 'dark', 'small' | 'large', number, number][] = [
    [0.5, 'light', 'small', 0.26, 1.05741],
    [0.5, 'light', 'large', 0.26, 1.05741],
    [0.5, 'dark', 'small', 0.025, 1.10085],
    [0.25, 'light', 'small', 0.13, 1.02441],
    [0.75, 'dark', 'large', 0.0375, 1.15324],
  ]
  for (const [tint, scheme, size, veil, saturate] of vectors) {
    const m = glassMaterial(tint, scheme, size)
    close(m.veil, veil, `${tint} ${scheme} ${size} veil`, 1e-4)
    close(m.saturate, saturate, `${tint} ${scheme} ${size} saturate`, 1e-4)
  }
  const mid = glassMaterial(0.5, 'light', 'small')
  close(mid.gain, 0.975, 'half way to the regular gain')
  close(mid.offset, 0.038, 'half the lift offset')
})

test('colour kept through the veil, (1 - veil) · saturate, moves linearly with the tint', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const size of ['small', 'large'] as const) {
      const kept = (t: number) => {
        const m = glassMaterial(t, scheme, size)
        return (1 - m.veil) * m.saturate
      }
      close(kept(0.5), (kept(0) + kept(1)) / 2, `${scheme} ${size}`)
      // What reaches the eye, × the regular gain: iOS 27's 0.52 (light) and 0.99 (dark).
      close(kept(1) * GLASS_REGULAR_LIFT[scheme].gain, scheme === 'light' ? 0.52 : 0.99, `${scheme} chroma`, 0.005)
    }
})

test('every parameter moves monotonically from clear to tinted', () => {
  for (const scheme of ['light', 'dark'] as const) {
    let previous = glassMaterial(0, scheme, 'small')
    for (let i = 1; i <= 20; i++) {
      const m = glassMaterial(i / 20, scheme, 'small')
      assert.ok(m.veil > previous.veil && m.saturate > previous.saturate, `${scheme} ${i}`)
      assert.ok(m.gain < previous.gain, `${scheme} gain ${i}`)
      previous = m
    }
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
  // The lift: clear's gain + 2 · offset at tint 0, moving to the regular anchors (no white-point cap).
  const top = liftFilter(GLASS_CLEAR.gain, GLASS_CLEAR.offset).brightness
  const lift = `brightness(calc(${top.toFixed(3)} + (var(--lab-glass-lift-gain) + 2 * var(--lab-glass-lift-offset) - ${top.toFixed(3)}) * var(--lab-glass-tint)))`
  assert.ok(system.includes(lift), 'root lift')
  assert.ok(glass.includes(lift), 'local tint lift')
  assert.ok(!glass.includes('0.924'), 'no capped lift left')
  for (const css of [system, glass])
    for (const scheme of ['light', 'dark'] as const) {
      assert.ok(css.includes(`--lab-glass-lift-gain: ${GLASS_REGULAR_LIFT[scheme].gain};`), `${scheme} lift gain`)
      assert.ok(css.includes(`--lab-glass-lift-offset: ${GLASS_REGULAR_LIFT[scheme].offset};`), `${scheme} lift offset`)
      assert.ok(css.includes(`--lab-glass-shadow-alpha: ${GLASS_SHADOW.alpha[scheme]};`), `${scheme} shadow`)
    }
  assert.ok(!system.includes('shadow-small') && !glass.includes('shadow-small'), 'one shadow token')
  assert.ok(GLASS_HAIRLINE.ring.width === 0.5 && GLASS_HAIRLINE.sliver.shift === 1.25)
  assert.ok(system.includes(`--lab-glass-tint: ${GLASS_TINT_DEFAULT};`))
})

test('glass bars over scrolling content are at least 0.85 tinted on both kits', () => {
  assert.equal(GLASS_BAR_TINT, 0.85)
  const dart = readFileSync('flutter/lib/glass/material.dart', 'utf8')
  assert.match(dart, /const double glassBarTint = 0\.85;/)
})

test('menu glass is regular glass veiled at least 88 % and blurred at least 20px, matching the CSS tokens', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const regular = glassMaterial(1, scheme, 'large')
    const menu = glassMenuMaterial(scheme)
    close(menu.veil, Math.max(regular.veil, GLASS_MENU.veil), `${scheme} veil`)
    close(menu.saturate, regular.saturate, `${scheme} saturate`)
    close(menu.gain, regular.gain, `${scheme} gain`)
  }
  assert.equal(glassKindBlur('menu', 40, 0, false), GLASS_MENU.blur)
  assert.equal(glassKindBlur('regular', 40, 0, false), glassKindBlur('regular', 40, 0, false))
  const css = readFileSync(new URL('../src/glass/glass.css', import.meta.url), 'utf8')
  assert.match(css, new RegExp(`--lab-menu-veil: max\\(var\\(--lab-glass-veil-large\\), ${GLASS_MENU.veil}\\)`))
  assert.match(css, new RegExp(`--lab-menu-blur: max\\(var\\(--lab-glass-blur-large\\), ${GLASS_MENU.blur}px\\)`))
  const { dy, blur, inset, alpha } = GLASS_MENU.shadow
  assert.ok(css.includes(`--lab-menu-shadow: 0 ${dy}px ${blur * 2}px -${inset}px rgb(0 0 0 / ${alpha * 100}%)`))
})

test('glass the browser cannot bend frosts: twice the measured blur, whatever the tint, as the CSS', () => {
  close(glassFrostedBlur(44), glassBlur(44) * 2, 'control')
  close(glassFrostedBlur(44), 5.8, 'control px')
  close(glassFrostedBlur(400), 10.4, 'panel px')
  for (const tint of [0, 0.5, 1]) {
    close(glassKindBlur('regular', 44, tint, false, true), 5.8, `frosted control at tint ${tint}`)
    assert.ok(glassKindBlur('regular', 44, tint, false) < 5.8, `unfrosted control at tint ${tint} stays light`)
  }
  // Frosting never thins glass that already blurs more (menus).
  assert.equal(glassKindBlur('menu', 44, 0.5, false, true), GLASS_MENU.blur)
  const system = readFileSync(new URL('../src/system.css', import.meta.url), 'utf8')
  const rule = system.slice(system.indexOf("[data-lab-glass-bends='off']"))
  assert.ok(rule.includes(`--lab-glass-blur: ${glassFrostedBlur(44)}px;`), 'CSS control blur')
  assert.ok(rule.includes(`--lab-glass-blur-large: ${glassFrostedBlur(400)}px;`), 'CSS panel blur')
})
