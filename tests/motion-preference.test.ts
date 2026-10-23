import assert from 'node:assert/strict'
import { test } from 'node:test'
import { motionOf, onMotionChange, prefersReducedMotion, reducedMotionQuery } from '../src/physics/motion-value.ts'

// A minimal <html> and matchMedia: the helper reads `data-lab-motion` and the OS query.
const attributes = new Map<string, string>()
const mediaListeners = new Set<() => void>()
let osReduced = false
const observers = new Set<() => void>()
const root = {
  getAttribute: (name: string) => attributes.get(name) ?? null,
}
const setMotion = (value: string | null) => {
  if (value === null) attributes.delete('data-lab-motion')
  else attributes.set('data-lab-motion', value)
  for (const notify of observers) notify()
}
Object.assign(globalThis, {
  document: { documentElement: root },
  window: {
    matchMedia: () => ({
      get matches() {
        return osReduced
      },
      addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
    }),
  },
  MutationObserver: class {
    constructor(private notify: () => void) {}
    observe() {
      observers.add(this.notify)
    }
    disconnect() {
      observers.delete(this.notify)
    }
  },
})

test('motion is the config made stricter by the OS setting', () => {
  const cases: [config: string | null, os: boolean, motion: string][] = [
    [null, false, 'full'],
    ['full', false, 'full'],
    ['full', true, 'reduced'],
    ['reduced', false, 'reduced'],
    ['reduced', true, 'reduced'],
    ['none', false, 'none'],
    ['none', true, 'none'],
  ]
  for (const [config, os, motion] of cases) {
    setMotion(config)
    osReduced = os
    assert.equal(motionOf(), motion, `${config} + os ${os}`)
    assert.equal(prefersReducedMotion(), motion !== 'full')
  }
})

test('change listeners fire for the config attribute and the OS query', () => {
  let calls = 0
  const stop = onMotionChange(() => calls++)
  setMotion('none')
  for (const notify of mediaListeners) notify()
  assert.equal(calls, 2)
  stop()
  setMotion('full')
  assert.equal(calls, 2)
  assert.equal(mediaListeners.size, 0)
})

test('reducedMotionQuery behaves like a live MediaQueryList', () => {
  osReduced = false
  setMotion('full')
  const query = reducedMotionQuery()
  assert.equal(query.matches, false)
  let changes = 0
  const listener = () => changes++
  query.addEventListener('change', listener)
  setMotion('reduced')
  assert.equal(query.matches, true)
  assert.equal(changes, 1)
  query.removeEventListener('change', listener)
  setMotion('full')
  assert.equal(changes, 1)
})
