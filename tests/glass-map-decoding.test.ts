import assert from 'node:assert/strict'
import test from 'node:test'
import { DecodedRefractionMap } from '../src/glass/decoded-refraction-map'

type Frame = { href: string; scale: number }
function fixture() {
  const committed: Frame[] = []
  const released: string[] = []
  const loads: { src: string; resolve(): void; reject(): void }[] = []
  const queue = new DecodedRefractionMap<Frame>(frame => committed.push(frame), () => {
    let resolve!: () => void
    let reject!: () => void
    const ready = new Promise<void>((yes, no) => { resolve = yes; reject = no })
    const image = { src: '', resolve, reject, decode: () => ready }
    loads.push(image)
    return image
  }, href => released.push(href))
  return { queue, committed, loads, released }
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve))

test('lens keeps one active decode and latest pending shape while publishing during motion', async () => {
  const { queue, committed, loads } = fixture()
  queue.request({ href: 'first', scale: 1 })
  queue.request({ href: 'intermediate', scale: 2 })
  queue.request({ href: 'latest', scale: 3 })
  assert.equal(loads.length, 1)
  assert.deepEqual(committed, [])
  loads[0].resolve()
  await flush()
  assert.deepEqual(committed, [{ href: 'first', scale: 1 }])
  assert.equal(loads.length, 2)
  assert.equal(loads[1].src, 'latest')
  loads[1].resolve()
  await flush()
  assert.deepEqual(committed.map(frame => frame.href), ['first', 'latest'])
})

test('decoded lens resources are reused and active resource metadata stays current', async () => {
  const { queue, committed, loads } = fixture()
  queue.request({ href: 'same', scale: 1 })
  queue.request({ href: 'same', scale: 2 })
  loads[0].resolve()
  await flush()
  assert.deepEqual(committed, [{ href: 'same', scale: 2 }])
  queue.request({ href: 'same', scale: 4 })
  assert.equal(loads.length, 1)
  assert.deepEqual(committed.at(-1), { href: 'same', scale: 4 })
})

test('failed map decoding retains the existing lens and advances to the newest pending map', async () => {
  const { queue, committed, loads, released } = fixture()
  queue.request({ href: 'good', scale: 1 })
  loads[0].resolve()
  await flush()
  queue.request({ href: 'bad', scale: 2 })
  queue.request({ href: 'recovery', scale: 3 })
  loads[1].reject()
  await flush()
  assert.deepEqual(committed.map(frame => frame.href), ['good'])
  assert.equal(loads[2].src, 'recovery')
  loads[2].resolve()
  await flush()
  assert.deepEqual(committed.map(frame => frame.href), ['good', 'recovery'])
  assert.deepEqual(released, ['bad'])
})

test('disposed scenes ignore late decoded frames and discard pending work', async () => {
  const { queue, committed, loads } = fixture()
  queue.request({ href: 'first', scale: 1 })
  queue.request({ href: 'latest', scale: 2 })
  queue.dispose()
  loads[0].resolve()
  await flush()
  queue.request({ href: 'after-disposal', scale: 3 })
  assert.deepEqual(committed, [])
  assert.equal(loads.length, 1)
})


test('superseded pending resources are released without revoking the active or displayed lens', async () => {
  const { queue, loads, released } = fixture()
  queue.request({ href: 'first', scale: 1 })
  queue.request({ href: 'skipped', scale: 1 })
  queue.request({ href: 'latest', scale: 1 })
  assert.deepEqual(released, ['skipped'])
  queue.request({ href: 'latest', scale: 2 })
  assert.deepEqual(released, ['skipped'])
  loads[0].resolve()
  await flush()
  loads[1].resolve()
  await flush()
  assert.deepEqual(released, ['skipped'])
  queue.dispose()
  assert.deepEqual(new Set(released), new Set(['skipped', 'first', 'latest']))
  assert.equal(released.length, 3)
})

test('decoded map cache releases old resources, retains current lens and disposes each resource once', async () => {
  const { queue, loads, released } = fixture()
  for (const href of ['one', 'two', 'three', 'four']) {
    queue.request({ href, scale: 1 })
    loads.at(-1)!.resolve()
    await flush()
  }
  assert.deepEqual(released, ['one'])
  queue.request({ href: 'two', scale: 1 })
  queue.request({ href: 'five', scale: 1 })
  loads.at(-1)!.resolve()
  await flush()
  assert.deepEqual(released, ['one', 'three'])
  queue.request({ href: 'loading', scale: 1 })
  queue.request({ href: 'pending', scale: 1 })
  queue.dispose()
  queue.dispose()
  loads.at(-1)!.resolve()
  await flush()
  assert.deepEqual(new Set(released), new Set(['one', 'two', 'three', 'four', 'five', 'loading', 'pending']))
  assert.equal(released.length, 7)
})


test('a failed settled final frame retries once while keeping the previous lens', async () => {
  const { queue, committed, loads, released } = fixture()
  queue.request({ href: 'good', scale: 1 })
  loads[0].resolve()
  await flush()
  queue.request({ href: 'final', scale: 2 })
  loads[1].reject()
  await flush()
  assert.deepEqual(committed.map(frame => frame.href), ['good'])
  assert.equal(loads.length, 3)
  assert.equal(loads[2].src, 'final')
  assert.deepEqual(released, [])
  loads[2].resolve()
  await flush()
  assert.deepEqual(committed.map(frame => frame.href), ['good', 'final'])
  assert.equal(loads.length, 3)
  queue.dispose()
  assert.deepEqual(new Set(released), new Set(['good', 'final']))
  assert.equal(released.length, 2)
})

test('repeated failures stop automatic retries but retain the URL for a later same-resource request', async () => {
  const { queue, committed, loads, released } = fixture()
  queue.request({ href: 'recoverable', scale: 1 })
  loads[0].reject()
  await flush()
  loads[1].reject()
  await flush()
  assert.equal(loads.length, 2)
  assert.deepEqual(released, [])
  queue.request({ href: 'recoverable', scale: 3 })
  assert.equal(loads.length, 3)
  assert.equal(loads[2].src, 'recoverable')
  loads[2].resolve()
  await flush()
  assert.deepEqual(committed, [{ href: 'recoverable', scale: 3 }])
  assert.deepEqual(released, [])
  queue.dispose()
  assert.deepEqual(released, ['recoverable'])
})

test('a retained failed resource is released when superseded or disposed', async () => {
  for (const supersede of [false, true]) {
    const { queue, loads, released } = fixture()
    queue.request({ href: 'failed', scale: 1 })
    loads[0].reject()
    await flush()
    loads[1].reject()
    await flush()
    assert.deepEqual(released, [])
    if (supersede) {
      queue.request({ href: 'newer', scale: 2 })
      assert.deepEqual(released, ['failed'])
    }
    queue.dispose()
    queue.dispose()
    if (supersede) loads[2].resolve()
    await flush()
    assert.deepEqual(released, supersede ? ['failed', 'newer'] : ['failed'])
  }
})
