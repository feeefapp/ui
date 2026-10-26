import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  temporalPresets,
  validateTemporal,
  readTemporalForm,
  type TemporalType,
} from '../src/filters/temporal.ts'
import { temporalSummary } from '../src/filters/temporal-format.ts'

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
test('temporal summaries name the matching preset, else format the value in the locale', () => {
  const now = new Date(2026, 9, 26, 10, 0)
  const week = { from: '2026-10-20', to: '2026-10-26' }
  assert.equal(temporalSummary({ type: 'dateRange' }, week, 'en-US', now), 'Last 7 days')
  assert.equal(temporalSummary({ type: 'dateRange' }, { ...week }, 'en-US', now), 'Last 7 days')
  assert.equal(
    temporalSummary({ type: 'dateRange' }, { from: '2026-10-09', to: '2026-10-18' }, 'en-US', now),
    'Oct 9, 2026 – Oct 18, 2026'
  )
  assert.equal(
    temporalSummary({ type: 'dateRange' }, { from: '', to: '2026-10-18' }, 'en-US', now),
    'Any – Oct 18, 2026'
  )
  assert.equal(temporalSummary({ type: 'dateRange' }, null, 'en-US', now), 'Any')
  assert.equal(temporalSummary({ type: 'dateRange' }, { from: '', to: '' }, 'en-US', now), 'Any')
  assert.equal(temporalSummary({ type: 'date' }, '2026-10-26', 'fr-FR', now), 'Today')
  assert.equal(temporalSummary({ type: 'date' }, '2026-10-01', 'fr-FR', now), '1 oct. 2026')
})
test('temporal summaries use the config presets over the defaults and skip presets the rules hide', () => {
  const now = new Date(2026, 9, 26, 10, 0)
  const presets = [{ label: 'Business hours', value: { from: '08:00', to: '18:00' } }]
  assert.equal(
    temporalSummary({ type: 'timeRange', presets }, { from: '08:00', to: '18:00' }, 'en-US', now),
    'Business hours'
  )
  assert.equal(
    temporalSummary({ type: 'timeRange', presets }, { from: '09:00', to: '12:00' }, 'en-US', now),
    '09:00 – 12:00'
  )
  assert.equal(
    temporalSummary(
      { type: 'dateRange', min: '2026-10-22' },
      { from: '2026-10-20', to: '2026-10-26' },
      'en-US',
      now
    ),
    'Oct 20, 2026 – Oct 26, 2026'
  )
})
