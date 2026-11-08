import assert from 'node:assert/strict'
import { test } from 'node:test'
import { displayName, visibleLabel } from '../src/model-ladder-core.ts'

test('catalog models remain identifiable when their names repeat their ids', () => {
  for (const id of ['google/gemini-flash', 'openai/gpt-mini', 'anthropic/claude']) {
    const stop = { modelId: id, modelName: id, label: '' }
    assert.equal(displayName(stop, 1, 5), id)
    assert.equal(visibleLabel(stop, 1, 5), 'Balanced')
  }
})

test('display names prefer human copy and retain ids before positional tiers', () => {
  assert.equal(displayName({ modelId: 'x', modelName: 'Model X', label: 'Fast' }, 0, 3), 'Model X')
  assert.equal(displayName({ modelId: 'x', modelName: 'x', label: 'Studio' }, 0, 3), 'Studio')
  assert.equal(displayName({ modelId: ' x ', modelName: ' ', label: '' }, 0, 3), 'x')
  assert.equal(displayName({ modelId: '', modelName: '', label: '' }, 0, 3), 'Fast')
})
