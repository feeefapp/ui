import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatTemporalValue } from '../src/filters/temporal-format.ts'

test('temporal field display handles empty and invalid values without changing canonical data', () => {
  assert.equal(formatTemporalValue('date', null, 'en-US'), '')
  assert.equal(formatTemporalValue('dateRange', { from: '', to: '' }, 'en-US'), '')
  assert.equal(formatTemporalValue('date', 'invalid', 'en-US'), 'invalid')
  assert.equal(formatTemporalValue('time', '09:30:15', 'en-US'), '09:30:15')
})

test('temporal field dates retain the local calendar day and ranges retain open endpoints', () => {
  assert.equal(formatTemporalValue('datetime', '2026-10-19T00:30', 'en-US'), 'Oct 19, 2026, 00:30')
  const value = { from: '', to: '2026-10-19' }
  assert.equal(formatTemporalValue('dateRange', value, 'en-US'), 'Any – Oct 19, 2026')
  assert.deepEqual(value, { from: '', to: '2026-10-19' })
})
