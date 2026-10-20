import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  monthDays,
  chooseRangeDate,
  parseCalendarDate,
  calendarDate,
} from '../src/filters/calendar-model.ts'
import { validateTemporal } from '../src/filters/temporal.ts'
test('calendar has complete Monday-first six-week grids, including leap days', () => {
  const feb = monthDays(2024, 1)
  assert.equal(feb.length, 42)
  assert.equal(feb[3], '2024-02-01')
  assert.equal(feb.filter(Boolean).length, 29)
  assert.equal(monthDays(2026, 1).filter(Boolean).length, 28)
  assert.equal(calendarDate(parseCalendarDate('2026-10-19')), '2026-10-19')
})
test('two clicks select an inclusive range without typing; earlier end restarts selection', () => {
  const first = chooseRangeDate({ from: '', to: '' }, '2026-10-05', 'from')
  assert.deepEqual(first, { value: { from: '2026-10-05', to: '' }, edge: 'to' })
  const second = chooseRangeDate(first.value, '2026-10-15', first.edge)
  assert.deepEqual(second, { value: { from: '2026-10-05', to: '2026-10-15' }, edge: 'from' })
  assert.deepEqual(chooseRangeDate(first.value, '2026-10-01', 'to'), {
    value: { from: '2026-10-01', to: '' },
    edge: 'to',
  })
  assert.deepEqual(chooseRangeDate(first.value, '2026-10-05', 'to').value, {
    from: '2026-10-05',
    to: '2026-10-05',
  })
})
test('selection controls retain step validation after native inputs become optional', () => {
  assert.equal(validateTemporal({ type: 'time', step: 900 }, '09:15'), null)
  assert.ok(validateTemporal({ type: 'time', step: 900 }, '09:07'))
  assert.equal(validateTemporal({ type: 'date', min: '2026-10-01', step: 2 }, '2026-10-03'), null)
  assert.ok(validateTemporal({ type: 'date', min: '2026-10-01', step: 2 }, '2026-10-02'))
})
