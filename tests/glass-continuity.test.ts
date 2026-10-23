import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { GlassScene } from '../src/glass/scene.ts'
import { MotionValue, onMeasureFrame } from '../src/physics/motion-value.ts'

test('moving and adaptive glass keeps its live lens; accessibility still removes it', () => {
  const globals = ['navigator', 'document', 'window'] as const
  const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  let contrast = false
  let tone = 'light'
  let applications = 0
  let removals = 0
  let removedFilters = 0
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
      blur: false, preserveHighlights: true, refractKey: '', pieces: [piece], decodedMaps: [], decodedScales: [], refractionWork: [], refractionRequests: [],
      filters: [{ remove: () => { removedFilters++ } }],
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
    assert.equal(removedFilters, 1, 'disposed lens URLs cannot remain on retained filter inputs')
    assert.deepEqual(scene.filters, [])
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


/** Exercise the real scene/physics scheduling with deterministic frames and no browser paint. */
function sceneClock(t: TestContext) {
  const previousFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const pending = new Map<number, (time: number) => void>()
  let nextId = 0
  const dispose: (() => void)[] = []
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value(callback: (time: number) => void) {
    const id = ++nextId
    pending.set(id, callback)
    return id
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { removeEventListener() {} } })
  const tick = (time = performance.now()) => {
    const callbacks = [...pending.values()]
    pending.clear()
    for (const callback of callbacks) callback(time)
  }
  t.after(() => {
    for (const stop of dispose) stop()
    tick()
    if (previousFrame) Object.defineProperty(globalThis, 'requestAnimationFrame', previousFrame)
    else Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  return { tick, pending, cleanup: (stop: () => void) => dispose.push(stop) }
}

function scheduledScene(clock: ReturnType<typeof sceneClock>, events: string[] = [], name = 'scene') {
  const value = new MotionValue(0)
  const counts = { measures: 0, reads: 0, paints: 0 }
  const painted: number[] = []
  const scene = Object.assign(Object.create(GlassScene.prototype), {
    disposed: false, dirty: false, wasMoving: false, measureQueued: false,
    drawHook: null, drawInput: null, tracking: false, glow: null, onScreen: true,
    host: { removeEventListener() {}, removeAttribute() {} },
    paint: { replaceChildren() {} }, shadow: { replaceChildren() {} },
    shapes: new Map([['spring', { values: () => [value] }]]),
    members: new Map(), pieces: [], decodedMaps: [], refractionWork: [],
    resize: null, mutations: null, filterHost: null, themeObserver: null, visibility: null,
    sampleTimer: null, sampleLater: null, sampleFrame: 0,
    measure() {
      if (this.disposed) return
      counts.measures++
      this.scheduleDraw()
    },
    readDrawInput() {
      counts.reads++
      events.push(`read ${name}`)
      return { value: value.get() }
    },
    draw() {
      assert.ok(this.drawInput, 'render receives the earlier read phase snapshot')
      counts.paints++
      events.push(`paint ${name}`)
      painted.push(this.drawInput.value)
    },
  })
  clock.cleanup(() => scene.dispose())
  return { scene, value, counts, painted }
}

test('glass coalesces repeated paint requests into one read and paint per refresh', t => {
  const clock = sceneClock(t)
  const { scene, counts } = scheduledScene(clock)
  for (let i = 0; i < 20; i++) scene.scheduleDraw()
  assert.equal(clock.pending.size, 1)
  assert.deepEqual(counts, { measures: 0, reads: 0, paints: 0 })
  clock.tick()
  assert.deepEqual(counts, { measures: 0, reads: 1, paints: 1 })
  clock.tick()
  assert.deepEqual(counts, { measures: 0, reads: 1, paints: 1 })
  assert.equal(clock.pending.size, 0)
})

test('glass reads all scene geometry before any scene paints', t => {
  const clock = sceneClock(t)
  const events: string[] = []
  const first = scheduledScene(clock, events, 'first')
  const second = scheduledScene(clock, events, 'second')
  first.scene.scheduleDraw()
  second.scene.scheduleDraw()
  clock.tick()
  assert.deepEqual(events, ['read first', 'read second', 'paint first', 'paint second'])
})

test('glass paints the current spring sample and the final settled sample exactly once', async t => {
  const clock = sceneClock(t)
  const { scene, value, counts, painted } = scheduledScene(clock)
  // Subscribe the scene before the spring, as happens when a still pointer starts a press.
  scene.scheduleDraw()
  const settled = value.animateTo(100, { spring: 'snappy' })
  const now = performance.now()
  clock.tick(now + 40)
  assert.equal(painted[0], value.get())
  assert.ok(painted[0] > 0 && painted[0] < 100)
  assert.equal(counts.paints, 1)
  clock.tick(now + 5000)
  assert.equal(await settled, true)
  assert.equal(painted.at(-1), 100)
  assert.equal(counts.paints, 2, 'the last frame paints even though isAnimating is now false')
  clock.tick(now + 5100)
  assert.equal(counts.paints, 2, 'settled scenes stop painting')
  assert.equal(clock.pending.size, 0)
})

test('glass coalesces repeated remeasurement requests and paints their result once', async t => {
  const clock = sceneClock(t)
  const { scene, counts } = scheduledScene(clock)
  for (let i = 0; i < 20; i++) scene.requestMeasure()
  await Promise.resolve()
  for (let i = 0; i < 20; i++) scene.requestMeasure()
  await Promise.resolve()
  scene.requestMeasure()
  assert.equal(counts.measures, 0, 'requests across separate microtasks wait for the shared read phase')
  assert.equal(counts.paints, 0, 'measurement does not paint outside the render phase')
  clock.tick()
  assert.deepEqual(counts, { measures: 1, reads: 1, paints: 1 })
})

test('disposing glass between its read and render phases cancels pending paint and future work', async t => {
  const clock = sceneClock(t)
  const { scene, counts } = scheduledScene(clock)
  scene.scheduleDraw()
  const stop = onMeasureFrame(() => { scene.dispose(); stop() })
  clock.cleanup(stop)
  clock.tick()
  assert.equal(counts.reads, 1)
  assert.equal(counts.paints, 0)
  assert.equal(scene.drawInput, null)
  scene.scheduleDraw()
  scene.requestMeasure()
  await Promise.resolve()
  clock.tick()
  assert.equal(counts.reads, 1)
  assert.equal(counts.measures, 0)
  assert.equal(counts.paints, 0)
  assert.equal(clock.pending.size, 0)
})
