import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { GlassScene } from '../src/glass/scene.ts'
import {
  GLASS_FOLLOW_ATTRIBUTE,
  GLASS_INSTANT_ATTRIBUTE,
  GLASS_SETTLE_MS,
  glassChangesAtOnce,
  glassSeed,
} from '../src/glass/transitions.ts'
import { POP_MOTION, popPlan, slidePlan } from '../src/presentation/motion.ts'

test('glass changes at once with reduced motion, on a moving surface, before and just after it is first shown', () => {
  const base = { reduceMotion: false, instant: false, shownAt: 1000, now: 5000 }
  assert.equal(glassChangesAtOnce(base), false, 'settled glass springs')
  assert.equal(glassChangesAtOnce({ ...base, instant: true }), true, 'a presentation entering or leaving')
  assert.equal(glassChangesAtOnce({ ...base, reduceMotion: true }), true)
  assert.equal(glassChangesAtOnce({ ...base, shownAt: null }), true, 'never rendered (a closed dialog)')
  assert.equal(glassChangesAtOnce({ ...base, now: 1000 + GLASS_SETTLE_MS - 1 }), true)
})

test('the pop opens from 1.1 on a spring and fades in; the scrim shares the fade', () => {
  const plan = popPlan(true, 'full', null)
  assert.deepEqual(plan.surface.map((track) => track.property), ['transform', 'opacity'])
  assert.equal(plan.surface[0].from, `scale(${POP_MOTION.fromScale})`)
  assert.equal(plan.surface[0].to, 'none')
  const fade = plan.surface[1]
  assert.deepEqual([fade.from, fade.to], ['0', '1'])
  assert.deepEqual({ ...plan.scrim, from: '', to: '' }, { ...fade, from: '', to: '' }, 'dim and surface on one timing')
})

test('the pop closes with one fade that ends exactly at its length, from where it is', () => {
  const plan = popPlan(false, 'full', { opacity: 1, transform: 'none', scrim: 1 })
  assert.deepEqual(plan.surface.map((track) => [track.property, track.from, track.to]), [['opacity', '1', '0']])
  assert.equal(plan.surface[0].duration, POP_MOTION.fadeOut * 1000)
  assert.ok(plan.surface[0].easing.startsWith('cubic-bezier'), 'a fixed curve, not a spring with a tail')
  assert.deepEqual([plan.scrim!.from, plan.scrim!.to, plan.scrim!.duration], ['1', '0', POP_MOTION.fadeOut * 1000])
  // Closed halfway through opening: the scale finishes as it fades, over the remaining fade.
  const early = popPlan(false, 'full', { opacity: 0.5, transform: 'matrix(1.05, 0, 0, 1.05, 0, 0)', scrim: 0.5 })
  assert.deepEqual(early.surface.map((track) => track.property), ['transform', 'opacity'])
  assert.equal(early.surface[1].duration, POP_MOTION.fadeOut * 500)
  // Opened again while fading out: no second pop, it fades back.
  const back = popPlan(true, 'full', { opacity: 0.4, transform: 'none', scrim: 0.4 })
  assert.deepEqual(back.surface.map((track) => [track.property, track.from]), [['opacity', '0.4']])
})

test('reduced motion crossfades, no motion is instant', () => {
  assert.deepEqual(popPlan(true, 'reduced', null).surface.map((track) => track.property), ['opacity'])
  assert.deepEqual(popPlan(true, 'none', null), { surface: [], scrim: null })
  assert.deepEqual(slidePlan(false, 'none', null, 'translate3d(400px, 0, 0)'), { surface: [], scrim: null })
  assert.deepEqual(slidePlan(true, 'reduced', null, 'translate3d(400px, 0, 0)').surface.map((track) => track.property), ['opacity'])
})

test('the pane slides on one spring with the scrim on the same timing, from where it is', () => {
  const open = slidePlan(true, 'full', null, 'translate3d(436px, 0, 0)')
  assert.deepEqual(open.surface.map((track) => [track.property, track.from, track.to]), [['transform', 'translate3d(436px, 0, 0)', 'none']])
  assert.equal(open.scrim!.duration, open.surface[0].duration)
  assert.equal(open.scrim!.easing, open.surface[0].easing)
  const close = slidePlan(false, 'full', { opacity: 1, transform: 'matrix(1, 0, 0, 1, 120, 0)', scrim: 0.7 }, 'translate3d(436px, 0, 0)')
  assert.deepEqual(close.surface.map((track) => [track.from, track.to]), [['matrix(1, 0, 0, 1, 120, 0)', 'translate3d(436px, 0, 0)']])
  assert.deepEqual([close.scrim!.from, close.scrim!.to], ['0.7', '0'])
})

/** A scene over fake elements: measure() runs for real, frames and paint are stubbed. */
function fakeScene(
  t: TestContext,
  options: { instant: boolean; shownAt: number | null; rendered?: boolean; animated?: boolean; followAll?: boolean }
) {
  const globals = ['window', 'getComputedStyle'] as const
  const previous = globals.map((key) => Object.getOwnPropertyDescriptor(globalThis, key))
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1280, innerHeight: 800 } })
  Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: () => ({ borderTopLeftRadius: '22px' }) })
  t.after(() =>
    globals.forEach((key, i) => {
      if (previous[i]) Object.defineProperty(globalThis, key, previous[i]!)
      else Reflect.deleteProperty(globalThis, key)
    })
  )
  const host = {
    offsetWidth: 600,
    offsetHeight: 60,
    rendered: options.rendered ?? true,
    getClientRects() {
      return this.rendered ? [{}] : []
    },
    closest: (selector: string) => (options.instant && selector === `[${GLASS_INSTANT_ATTRIBUTE}]` ? {} : null),
    querySelector: (selector: string) => (options.followAll && selector === `[${GLASS_FOLLOW_ATTRIBUTE}]` ? {} : null),
  }
  const scene = Object.assign(Object.create(GlassScene.prototype), {
    disposed: false, cornerShape: 'round', spacing: 8, reduceMotion: false, shownAt: options.shownAt,
    members: new Map(), shapes: new Map(), scrolled: new Set(), host,
    frame: () => ({ left: 0, top: 0, scaleX: 1, scaleY: 1 }),
    clipOf: () => ({ scrolled: false }),
    animatedBetween: () => !!options.animated,
    scheduleDraw() {},
    requestSampleWhileScrolling() {},
  })
  const member = (rect: { x: number; y: number; width: number; height: number }) => ({
    element: {
      isConnected: true,
      style: {} as Record<string, string>,
      closest: () => null,
      parentElement: { closest: () => null },
      getBoundingClientRect: () => ({ left: rect.x, top: rect.y, width: rect.width, height: rect.height }),
    },
    options: {},
  })
  return { scene, host, member }
}

test('glass on an entering surface appears at its final shape: no birth animation', (t) => {
  const { scene, member } = fakeScene(t, { instant: true, shownAt: 0 })
  scene.members.set('title', member({ x: 8, y: 8, width: 173, height: 44 }))
  scene.measure()
  const shape = scene.shapes.get('title')
  assert.deepEqual(shape.rect(), { x: 8, y: 8, width: 173, height: 44 })
  assert.equal(shape.scale.get(), 1)
  assert.equal(shape.values().some((value: { isAnimating(): boolean }) => value.isAnimating()), false)
})

test('settled glass still materializes a new bubble (the contrast)', (t) => {
  const { scene, member } = fakeScene(t, { instant: false, shownAt: -10_000 })
  scene.measure()
  scene.members.set('late', member({ x: 8, y: 8, width: 44, height: 44 }))
  scene.measure()
  const shape = scene.shapes.get('late')
  assert.equal(shape.scale.getTarget(), 1)
  assert.ok(shape.scale.isAnimating(), 'it grows in')
  for (const value of shape.values()) value.stop()
})

test('a bubble that fades in with a transition is still born out of its neighbour', (t) => {
  // The docs title bubble: its element animates (opacity and translate) as it appears, which would
  // otherwise make the glass follow it and pop in at full size.
  for (const options of [{ animated: true }, { followAll: true }]) {
    const { scene, member } = fakeScene(t, { instant: false, shownAt: -10_000, ...options })
    const brand = { x: 8, y: 8, width: 150, height: 44 }
    const title = { x: 166, y: 8, width: 120, height: 44 }
    scene.members.set('brand', member(brand))
    scene.measure()
    scene.members.set('title', member(title))
    scene.measure()
    const shape = scene.shapes.get('title')
    assert.deepEqual(shape.rect(), glassSeed(brand, title), 'starts as a drop inside the brand bubble')
    assert.ok(shape.x.isAnimating() || shape.width.isAnimating(), 'and springs out to its place')
    assert.equal(shape.growing, true)
    for (const s of scene.shapes.values()) for (const value of s.values()) value.stop()
  }
})

test('glass measured inside a closed dialog does not grow in once the dialog shows', (t) => {
  const { scene, host, member } = fakeScene(t, { instant: false, shownAt: null, rendered: false })
  scene.members.set('dock', member({ x: 0, y: 0, width: 0, height: 0 }))
  scene.measure()
  assert.equal(scene.shapes.size, 0)
  assert.equal(scene.shownAt, null, 'a container that was never rendered is not shown yet')
  host.rendered = true
  scene.members.set('dock', member({ x: 190, y: 6, width: 220, height: 48 }))
  scene.measure()
  const shape = scene.shapes.get('dock')
  assert.equal(shape.scale.get(), 1)
  assert.deepEqual(shape.rect(), { x: 190, y: 6, width: 220, height: 48 })
})

test('on close the glass leaves with its surface: removed at once, no leaving spring', (t) => {
  const { scene, member } = fakeScene(t, { instant: true, shownAt: 0 })
  scene.members.set('close', member({ x: 540, y: 8, width: 44, height: 44 }))
  scene.measure()
  scene.members.delete('close')
  scene.measure()
  assert.equal(scene.shapes.size, 0)
})
