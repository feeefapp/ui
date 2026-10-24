import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  composerExpanded,
  composerFrame,
  composerFrameSnapshot,
  composerSameLayout,
  composerSendState,
  type ComposerLayoutSnapshot,
} from '../src/composer/composer-model.ts'

// The Dart twin of these cases is the "composer model" group in flutter/test/composer_test.dart.

test('the second row opens with text, focus or a pinned menu', () => {
  assert.equal(composerExpanded({ hasText: false, focusWithin: false, pinned: false }), false)
  assert.equal(composerExpanded({ hasText: true, focusWithin: false, pinned: false }), true)
  assert.equal(composerExpanded({ hasText: false, focusWithin: true, pinned: false }), true)
  assert.equal(composerExpanded({ hasText: false, focusWithin: false, pinned: true }), true)
})

test('send states', () => {
  assert.equal(composerSendState({ ready: false, submitting: false, stoppable: true }), 'idle')
  assert.equal(composerSendState({ ready: true, submitting: false, stoppable: false }), 'ready')
  assert.equal(composerSendState({ ready: true, submitting: true, stoppable: false }), 'sending')
  assert.equal(composerSendState({ ready: false, submitting: true, stoppable: true }), 'stop')
})

test('frames mix in capsule pixels; new slots fade in where they land', () => {
  const from: ComposerLayoutSnapshot = {
    height: 44,
    slots: {
      field: { x: 0, y: 0, height: 38, opacity: 1 },
      send: { x: 300, y: 0, height: 38, opacity: 1 },
    },
  }
  const to: ComposerLayoutSnapshot = {
    height: 82,
    slots: {
      field: { x: 0, y: 0, height: 38, opacity: 1 },
      send: { x: 300, y: 38, height: 38, opacity: 1 },
      tools: { x: 0, y: 38, height: 38, opacity: 1 },
    },
  }
  const start = composerFrame(from, to, 0)
  assert.equal(start.height, 44)
  assert.equal(start.slots.send!.dy, -38)
  assert.equal(start.slots.tools!.opacity, 0)
  const half = composerFrame(from, to, 0.5)
  assert.equal(half.height, 63)
  assert.equal(half.slots.send!.dy, -19)
  assert.equal(half.slots.tools!.opacity, 0.5)
  assert.equal(composerFrame(from, to, 1).slots.send!.dy, 0)
  assert.equal(composerSameLayout(from, to), false)
  assert.equal(composerSameLayout(to, to), true)
  const mid = composerFrameSnapshot(from, to, 0.5)
  assert.equal(mid.height, 63)
  assert.equal(mid.slots.send!.y, 19)
})

test('an overshooting spring never draws a negative height or opacity', () => {
  const from: ComposerLayoutSnapshot = { height: 82, slots: { tools: { x: 0, y: 38, height: 38, opacity: 1 } } }
  const to: ComposerLayoutSnapshot = { height: 44, slots: { tools: { x: 0, y: 6, height: 38, opacity: 0 } } }
  const frame = composerFrame(from, to, 1.2)
  assert.ok(frame.height >= 0)
  assert.equal(frame.slots.tools!.opacity, 0)
})
