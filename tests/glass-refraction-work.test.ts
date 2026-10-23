import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RefractionWork, RefractionWorkBroker, type RefractionWorkRequest, type RefractionWorkResult } from '../src/glass/refraction-work.ts'
import { buildRefractionBitmap, type RefractionWorkerMessage } from '../src/glass/refraction-work-model.ts'
import { liveDisplacementMap, rgbaBmpBytes } from '../src/glass/refraction.ts'

const request = (key: string): RefractionWorkRequest => ({
  key, width: 84, height: 44, shapes: [{ x: 0, y: 0, width: 84, height: 44, radius: 22, cornerExponent: 2 }],
  spacing: 8, profile: 'measured',
})
const result = (key: string): RefractionWorkResult => ({ key, scale: 94, bytes: new ArrayBuffer(4) })

function fixture() {
  const messages: RefractionWorkerMessage[] = []
  const deferred: (() => void)[] = []
  let workers = 0
  let terminated = 0
  const worker = {
    onmessage: null as ((event: { data: unknown }) => void) | null,
    onerror: null as ((event: { preventDefault(): void }) => void) | null,
    onmessageerror: null as (() => void) | null,
    postMessage(message: RefractionWorkerMessage) { messages.push(message) },
    terminate() { terminated++ },
  }
  const calculated: string[] = []
  const broker = new RefractionWorkBroker(() => {
    workers++
    return worker as unknown as Worker
  }, input => {
    calculated.push(input.key)
    return result(input.key)
  }, callback => deferred.push(callback))
  return {
    broker, worker, messages, deferred, calculated,
    workers: () => workers, terminated: () => terminated,
    reply(index: number) {
      const message = messages[index]
      worker.onmessage?.({ data: { id: message.id, result: result(message.request.key) } })
    },
    flush() { deferred.shift()?.() },
  }
}

test('all clusters share one worker with only the latest queued geometry and FIFO fairness', () => {
  const f = fixture()
  const first: string[] = []
  const second: string[] = []
  const a = new RefractionWork(value => first.push(value.key), f.broker)
  const b = new RefractionWork(value => second.push(value.key), f.broker)
  assert.equal(f.workers(), 0, 'worker startup is lazy')
  a.submit(request('a1'))
  b.submit(request('b1'))
  a.submit(request('a2'))
  a.submit(request('a3'))
  b.submit(request('b2'))
  assert.equal(f.workers(), 1)
  assert.equal(f.messages.length, 1)
  f.reply(0)
  assert.deepEqual(first, ['a1'], 'active results advance the lens during continued motion')
  assert.equal(f.messages[1].request.key, 'b2', 'a waiting cluster gets its turn before newer work')
  a.submit(request('a4'))
  f.reply(1)
  assert.deepEqual(second, ['b2'])
  assert.equal(f.messages[2].request.key, 'a4')
  f.reply(2)
  assert.deepEqual(first, ['a1', 'a4'])
  assert.equal(f.messages.length, 3, 'superseded geometry was never sampled')
  a.dispose()
  assert.equal(f.terminated(), 0)
  b.dispose()
  assert.equal(f.terminated(), 1)
})

test('returning to the active geometry drops obsolete pending work', () => {
  const f = fixture()
  const committed: string[] = []
  const client = new RefractionWork(value => committed.push(value.key), f.broker)
  client.submit(request('original'))
  client.submit(request('obsolete'))
  client.submit(request('original'))
  f.reply(0)
  assert.deepEqual(committed, ['original'])
  assert.equal(f.messages.length, 1)
  client.dispose()
})

test('disposed clusters ignore late results and the final disposal terminates shared resources', () => {
  const f = fixture()
  const committed: string[] = []
  const a = new RefractionWork(value => committed.push(value.key), f.broker)
  const b = new RefractionWork(value => committed.push(value.key), f.broker)
  a.submit(request('departed'))
  b.submit(request('alive'))
  a.dispose()
  f.reply(0)
  assert.deepEqual(committed, [])
  assert.equal(f.messages[1].request.key, 'alive')
  b.dispose()
  b.dispose()
  f.reply(1)
  assert.deepEqual(committed, [])
  assert.equal(f.terminated(), 1)
  const c = new RefractionWork(value => committed.push(value.key), f.broker)
  c.submit(request('new scene'))
  assert.equal(f.workers(), 2)
  f.reply(2)
  assert.deepEqual(committed, ['new scene'])
  c.dispose()
  assert.equal(f.terminated(), 2)
})

test('asynchronous worker loading/CSP errors finish active and latest pending work with the exact fallback', () => {
  for (const failure of ['error', 'messageerror', 'reply'] as const) {
    const f = fixture()
    const committed: string[] = []
    const client = new RefractionWork(value => committed.push(value.key), f.broker)
    client.submit(request('first'))
    client.submit(request('skipped'))
    client.submit(request('latest'))
    if (failure === 'error') f.worker.onerror?.({ preventDefault() {} })
    else if (failure === 'messageerror') f.worker.onmessageerror?.()
    else f.worker.onmessage?.({ data: { id: f.messages[0].id, error: 'worker initialization failed' } })
    assert.equal(f.terminated(), 1)
    assert.deepEqual(committed, [], 'fallback remains asynchronous')
    f.flush()
    f.flush()
    assert.deepEqual(committed, ['first', 'latest'])
    assert.deepEqual(f.calculated, ['first', 'latest'])
    assert.equal(f.workers(), 1, 'failed worker is not restarted each frame')
    client.dispose()
  }
})

test('unsupported workers fall back asynchronously and canceled fallback work does not run', () => {
  const deferred: (() => void)[] = []
  let calculations = 0
  const broker = new RefractionWorkBroker(() => { throw new Error('worker-src blocked') }, input => {
    calculations++
    return result(input.key)
  }, callback => deferred.push(callback))
  const committed: string[] = []
  const client = new RefractionWork(value => committed.push(value.key), broker)
  client.submit(request('fallback'))
  assert.deepEqual(committed, [])
  deferred.shift()!()
  assert.deepEqual(committed, ['fallback'])
  client.submit(request('canceled'))
  client.dispose()
  deferred.shift()!()
  assert.equal(calculations, 1)
  assert.deepEqual(committed, ['fallback'])
})

test('a failed worker postMessage cannot strand the active request', () => {
  const f = fixture()
  f.worker.postMessage = () => { throw new Error('DataCloneError') }
  const committed: string[] = []
  const client = new RefractionWork(value => committed.push(value.key), f.broker)
  client.submit(request('fallback'))
  assert.equal(f.terminated(), 1)
  assert.deepEqual(committed, [])
  f.flush()
  assert.deepEqual(committed, ['fallback'])
  client.dispose()
})

test('a failed fallback calculation leaves the existing lens intact and cannot block another cluster', () => {
  const deferred: (() => void)[] = []
  const broker = new RefractionWorkBroker(() => { throw new Error('unsupported') }, input => {
    if (input.key === 'bad') throw new Error('invalid geometry')
    return result(input.key)
  }, callback => deferred.push(callback))
  const committed: string[] = []
  const a = new RefractionWork(value => committed.push(value.key), broker)
  const b = new RefractionWork(value => committed.push(value.key), broker)
  a.submit(request('bad'))
  b.submit(request('valid'))
  deferred.shift()!()
  deferred.shift()!()
  assert.deepEqual(committed, ['valid'])
  a.dispose()
  b.dispose()
})

test('worker and main-thread fallback retain every existing displacement pixel and BMP byte', () => {
  for (const profile of ['gentle', 'measured'] as const) {
    const input: RefractionWorkRequest = {
      key: profile, width: 200.25, height: 72.75, spacing: 20, profile,
      shapes: [
        { x: 0, y: 0, width: 96, height: 72, radius: 36, cornerExponent: 2 },
        { x: 102.25, y: 0.75, width: 96, height: 72, radius: 36, cornerExponent: 2 },
      ],
    }
    const baseline = liveDisplacementMap(input.width, input.height, [input.shapes], input.spacing, profile)
    for (let pixel = 3; pixel < baseline.data.length; pixel += 4) baseline.data[pixel] = 255
    const actual = buildRefractionBitmap(input)
    assert.equal(actual.key, input.key)
    assert.equal(actual.scale, baseline.scale)
    assert.deepEqual(new Uint8Array(actual.bytes), rgbaBmpBytes(baseline.width, baseline.height, baseline.data))
  }
})
