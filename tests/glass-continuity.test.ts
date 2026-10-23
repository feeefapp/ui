import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GlassScene } from '../src/glass/scene.ts'

test('moving and adaptive glass keeps its live lens; accessibility still removes it', () => {
  const globals = ['navigator', 'document', 'window'] as const
  const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  let contrast = false
  let tone = 'light'
  let applications = 0
  let removals = 0
  const source = { remove: () => { removals++ } }
  const piece = {
    style: { backdropFilter: 'url(#lens)', removeProperty: () => {} },
    querySelector: () => source,
    removeAttribute: () => { removals++ },
  }
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgentData: { brands: [{ brand: 'Chromium' }] } } })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { getAttribute: () => 'liquid' } } })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: contrast }) } })
    // Exercise the scene's scheduling boundary without a browser canvas. The actual rendering
    // is covered by map tests and browser checks; this catches the old motion/fallback switch.
    const scene = Object.assign(Object.create(GlassScene.prototype), {
      refraction: true, refractionStrength: 1, refractionProfile: 'measured', tint: 0,
      blur: false, preserveHighlights: true, refractKey: '', pieces: [piece], decodedMaps: [], decodedScales: [],
      shapes: new Map([['moving', { values: () => [{ isAnimating: () => true }] }]]),
      scheme: () => tone,
      applyRefraction(key: string) { applications++; this.refractKey = key },
    })
    scene.updateRefraction('outline-a')
    scene.updateRefraction('outline-b')
    tone = 'dark'
    scene.updateRefraction('outline-b')
    assert.equal(applications, 3, 'every changed outline or tone updates without waiting for rest')
    assert.equal(removals, 0, 'the live source stays attached throughout motion')
    assert.equal(piece.style.backdropFilter, 'url(#lens)')
    scene.updateRefraction('outline-b')
    assert.equal(applications, 3, 'pointer-only frames do not rebuild optics')
    contrast = true
    scene.updateRefraction('outline-b')
    assert.equal(piece.style.backdropFilter, '')
    assert.equal(removals, 2)
    contrast = false
    scene.updateRefraction('outline-b')
    assert.equal(applications, 4, 'restoring transparency restores the same renderer')
  } finally {
    globals.forEach((key, i) => {
      if (previous[i]) Object.defineProperty(globalThis, key, previous[i]!)
      else Reflect.deleteProperty(globalThis, key)
    })
  }
})

test('a hidden pressed member releases its content transform before it can reappear', () => {
  const style = { translate: '3px 2px', scale: '1.06' }
  const scene = Object.assign(Object.create(GlassScene.prototype), {
    members: new Map([['member', { element: { style } }]]),
  })
  const shape = { offset: { x: 3, y: 2 }, contentScale: 1.06 }
  scene.release(shape, 'member')
  assert.deepEqual(style, { translate: '', scale: '' })
  assert.deepEqual(shape, { offset: { x: 0, y: 0 }, contentScale: 1 })
})
