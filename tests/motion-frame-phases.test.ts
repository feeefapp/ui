import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { MotionValue, onAnimationFrame, onMeasureFrame, onRenderFrame } from '../src/physics/motion-value.ts'

type Callback = (time: number) => void
function clock(t: TestContext) {
  const original = globalThis.requestAnimationFrame
  let nextId = 0
  const pending = new Map<number, Callback>()
  const disposers: (() => void)[] = []
  globalThis.requestAnimationFrame = callback => {
    const id = ++nextId
    pending.set(id, callback)
    return id
  }
  const tick = (time = performance.now()) => {
    const scheduled = [...pending.values()]
    pending.clear()
    for (const callback of scheduled) callback(time)
  }
  const subscribe = (phase: (callback: Callback) => () => void, callback: Callback) => {
    const dispose = phase(callback)
    disposers.push(dispose)
    return dispose
  }
  t.after(() => {
    for (const dispose of disposers) dispose()
    // Let the shared loop observe its empty subscriptions before restoring the native clock.
    tick()
    globalThis.requestAnimationFrame = original
  })
  return {
    tick,
    pending,
    cleanup: (dispose: () => void) => disposers.push(dispose),
    update: (callback: Callback) => subscribe(onAnimationFrame, callback),
    measure: (callback: Callback) => subscribe(onMeasureFrame, callback),
    render: (callback: Callback) => subscribe(onRenderFrame, callback),
  }
}

test('one shared frame runs every update, then every measure, then every render regardless of registration order', t => {
  const scheduler = clock(t)
  const order: string[] = []
  scheduler.render(() => order.push('paint A'))
  scheduler.measure(() => order.push('read A'))
  scheduler.update(() => order.push('motion A'))
  scheduler.render(() => order.push('paint B'))
  scheduler.update(() => order.push('motion B'))
  scheduler.measure(() => order.push('read B'))
  assert.equal(scheduler.pending.size, 1)
  scheduler.tick()
  assert.deepEqual(order, ['motion A', 'motion B', 'read A', 'read B', 'paint A', 'paint B'])
  assert.equal(scheduler.pending.size, 1)
})

test('a render registered by measurement runs in that same frame', t => {
  const scheduler = clock(t)
  const order: string[] = []
  const stopMeasure = scheduler.measure(() => {
    order.push('read')
    stopMeasure()
    scheduler.render(() => order.push('paint'))
  })
  scheduler.tick()
  assert.deepEqual(order, ['read', 'paint'])
  assert.equal(scheduler.pending.size, 1)
})

test('callbacks canceled by an earlier callback never run from the current frame snapshot', t => {
  const scheduler = clock(t)
  const order: string[] = []
  let stopUpdate = () => {}
  let stopMeasure = () => {}
  let stopRender = () => {}
  scheduler.update(() => {
    order.push('motion')
    stopUpdate()
    stopMeasure()
  })
  stopUpdate = scheduler.update(() => order.push('canceled motion'))
  stopMeasure = scheduler.measure(() => order.push('canceled read'))
  scheduler.measure(() => {
    order.push('read')
    stopRender()
  })
  stopRender = scheduler.render(() => order.push('canceled paint'))
  scheduler.render(() => order.push('paint'))
  scheduler.tick()
  assert.deepEqual(order, ['motion', 'read', 'paint'])
})

test('a render subscribed before a spring sees the updated value and its final settled value', async t => {
  const scheduler = clock(t)
  const value = new MotionValue(0)
  scheduler.cleanup(() => value.stop())
  const painted: number[] = []
  const measured: number[] = []
  scheduler.render(() => painted.push(value.get()))
  scheduler.measure(() => measured.push(value.get()))
  const settled = value.animateTo(100, { spring: 'snappy' })
  const now = performance.now()
  scheduler.tick(now + 40)
  assert.ok(painted[0] > 0 && painted[0] < 100)
  assert.equal(measured[0], painted[0])
  scheduler.tick(now + 5000)
  assert.equal(await settled, true)
  assert.equal(painted.at(-1), 100)
  assert.equal(measured.at(-1), 100)
  assert.equal(value.isAnimating(), false)
})

test('unsubscribing from every phase stops the shared clock after its already scheduled frame', t => {
  const scheduler = clock(t)
  let calls = 0
  const stopUpdate = scheduler.update(() => calls++)
  const stopMeasure = scheduler.measure(() => calls++)
  const stopRender = scheduler.render(() => calls++)
  scheduler.tick()
  assert.equal(calls, 3)
  stopUpdate()
  stopMeasure()
  stopRender()
  scheduler.tick()
  assert.equal(calls, 3)
  assert.equal(scheduler.pending.size, 0)
})
