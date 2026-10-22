import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  temporalPresets,
  validateTemporal,
  readTemporalForm,
  type TemporalType,
} from '../src/filters/temporal.ts'

test('temporal editors reject impossible dates and invalid clock times', () => {
  assert.equal(validateTemporal({ type: 'date' }, '2024-02-29'), null)
  for (const value of ['2025-02-29', '2026-04-31', '2026-13-01'])
    assert.ok(validateTemporal({ type: 'date' }, value))
  assert.equal(validateTemporal({ type: 'datetime' }, '2026-10-19T23:59'), null)
  assert.ok(validateTemporal({ type: 'datetime' }, '2026-10-19'))
  assert.ok(validateTemporal({ type: 'time' }, '24:00'))
  assert.equal(validateTemporal({ type: 'time' }, '23:59:59'), null)
})
test('open ranges remain valid, empty ranges clear, reversed ranges require explicit overnight support', () => {
  assert.equal(validateTemporal({ type: 'dateRange' }, { from: '', to: '2026-10-19' }), null)
  assert.ok(validateTemporal({ type: 'dateRange' }, { from: '2026-10-20', to: '2026-10-19' }))
  assert.ok(validateTemporal({ type: 'timeRange' }, { from: '22:00', to: '06:00' }))
  assert.equal(
    validateTemporal({ type: 'timeRange', allowOvernight: true }, { from: '22:00', to: '06:00' }),
    null
  )
  assert.equal(readTemporalForm('dateRange', new FormData()), null)
  const data = new FormData()
  data.set('from', '2026-10-19')
  assert.deepEqual(readTemporalForm('dateRange', data), { from: '2026-10-19', to: '' })
})
test('bounds are inclusive and minute/second representations compare equally', () => {
  assert.equal(validateTemporal({ type: 'time', min: '09:00:00', max: '17:00' }, '09:00'), null)
  assert.equal(validateTemporal({ type: 'time', max: '17:00' }, '17:00:00'), null)
  assert.ok(validateTemporal({ type: 'date', min: '2026-10-19' }, '2026-10-18'))
  assert.ok(
    validateTemporal(
      { type: 'datetimeRange', max: '2026-10-19T12:00' },
      { from: '', to: '2026-10-19T12:01' }
    )
  )
})
test('all six temporal presets generate valid local wall-clock values across month boundaries', () => {
  const now = new Date(2026, 0, 1, 8, 30)
  const types: TemporalType[] = [
    'date',
    'time',
    'datetime',
    'dateRange',
    'timeRange',
    'datetimeRange',
  ]
  for (const type of types)
    for (const preset of temporalPresets(type, now))
      assert.equal(validateTemporal({ type }, preset.value), null, `${type}: ${preset.label}`)
  assert.deepEqual(
    temporalPresets('dateRange', now).find((p) => p.label === 'Last 7 days')?.value,
    { from: '2025-12-26', to: '2026-01-01' }
  )
  assert.equal(
    temporalPresets('date', now).find((p) => p.label === 'Yesterday')?.value,
    '2025-12-31'
  )
})
