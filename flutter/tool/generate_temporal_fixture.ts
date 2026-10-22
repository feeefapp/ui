/**
 * Writes flutter/test/fixtures/temporal.json from the web kit's temporal logic (temporal.ts,
 * calendar-model.ts, temporal-format.ts), so the Dart twin is tested against the same values.
 * Run from ui/: npx tsx flutter/tool/generate_temporal_fixture.ts
 *
 * The time zone is pinned to UTC before the modules load, so wall-clock presets are stable; the
 * Dart test builds its `now` with DateTime.utc.
 */
process.env.TZ = 'UTC'

const { writeFileSync } = await import('node:fs')
const temporal = await import('../../src/filters/temporal.ts')
const model = await import('../../src/filters/calendar-model.ts')
const format = await import('../../src/filters/temporal-format.ts')

type TemporalType = import('../../src/filters/temporal.ts').TemporalType
type TemporalConfig = import('../../src/filters/temporal.ts').TemporalConfig
type TemporalValue = import('../../src/filters/temporal.ts').TemporalValue

const types: TemporalType[] = ['date', 'time', 'datetime', 'dateRange', 'timeRange', 'datetimeRange']

const validate: [TemporalConfig, TemporalValue][] = [
  // Formats and real calendar days.
  [{ type: 'date' }, '2024-02-29'],
  [{ type: 'date' }, '2025-02-29'],
  [{ type: 'date' }, '2026-04-31'],
  [{ type: 'date' }, '2026-13-01'],
  [{ type: 'date' }, '2026-00-10'],
  [{ type: 'date' }, '2026-10-00'],
  [{ type: 'date' }, '1900-02-29'],
  [{ type: 'date' }, '2000-02-29'],
  [{ type: 'date' }, '2026-1-5'],
  [{ type: 'date' }, ''],
  [{ type: 'date' }, '2026-10-19T09:00'],
  [{ type: 'datetime' }, '2026-10-19T23:59'],
  [{ type: 'datetime' }, '2026-10-19T23:59:30'],
  [{ type: 'datetime' }, '2026-10-19'],
  [{ type: 'datetime' }, '2026-10-19T24:00'],
  [{ type: 'time' }, '24:00'],
  [{ type: 'time' }, '23:59:59'],
  [{ type: 'time' }, '9:00'],
  [{ type: 'time' }, '09:60'],
  [{ type: 'time' }, null],
  // Ranges.
  [{ type: 'dateRange' }, { from: '', to: '2026-10-19' }],
  [{ type: 'dateRange' }, { from: '2026-10-20', to: '2026-10-19' }],
  [{ type: 'dateRange' }, { from: '2026-10-19', to: '2026-10-19' }],
  [{ type: 'dateRange' }, { from: '', to: '' }],
  [{ type: 'dateRange' }, { from: '2026-02-30', to: '' }],
  [{ type: 'timeRange' }, { from: '22:00', to: '06:00' }],
  [{ type: 'timeRange', allowOvernight: true }, { from: '22:00', to: '06:00' }],
  [{ type: 'datetimeRange', allowOvernight: true }, { from: '2026-10-20T22:00', to: '2026-10-19T06:00' }],
  [{ type: 'datetimeRange' }, { from: '2026-10-19T09:00', to: '2026-10-19T09:00:00' }],
  // Bounds.
  [{ type: 'time', min: '09:00:00', max: '17:00' }, '09:00'],
  [{ type: 'time', max: '17:00' }, '17:00:00'],
  [{ type: 'time', max: '17:00' }, '17:00:01'],
  [{ type: 'date', min: '2026-10-19' }, '2026-10-18'],
  [{ type: 'date', max: '2026-10-19' }, '2026-10-20'],
  [{ type: 'datetimeRange', max: '2026-10-19T12:00' }, { from: '', to: '2026-10-19T12:01' }],
  [{ type: 'datetimeRange', min: '2026-10-19T12:00' }, { from: '2026-10-19T11:59', to: '' }],
  // Steps.
  [{ type: 'time', step: 900 }, '09:15'],
  [{ type: 'time', step: 900 }, '09:07'],
  [{ type: 'time', step: 1 }, '09:07:13'],
  [{ type: 'time', step: 1.5 }, '00:00:03'],
  [{ type: 'time', step: 1.5 }, '00:00:04'],
  [{ type: 'time', step: 900, min: '08:05' }, '09:05'],
  [{ type: 'time', step: 900, min: '08:05' }, '09:00'],
  [{ type: 'date', min: '2026-10-01', step: 2 }, '2026-10-03'],
  [{ type: 'date', min: '2026-10-01', step: 2 }, '2026-10-02'],
  [{ type: 'date', step: 7 }, '1970-01-08'],
  [{ type: 'date', step: 7 }, '1970-01-09'],
  [{ type: 'datetime', step: 3600 }, '2026-10-19T09:00'],
  [{ type: 'datetime', step: 3600 }, '2026-10-19T09:30'],
  [{ type: 'datetime', step: 1800, min: '2026-10-19T09:10' }, '2026-10-19T09:40'],
  [{ type: 'dateRange', step: 2, min: '2026-10-01' }, { from: '2026-10-03', to: '2026-10-06' }],
  [{ type: 'time', step: 0 }, '09:07'],
]

const values: TemporalValue[] = [
  null,
  '',
  '2026-10-19',
  { from: '', to: '' },
  { from: '2026-10-19', to: '' },
  { from: '', to: '2026-10-19' },
]

const nows = [
  new Date(Date.UTC(2026, 0, 1, 8, 30)),
  new Date(Date.UTC(2024, 2, 1, 0, 5)),
  new Date(Date.UTC(2024, 1, 29, 23, 59)),
  new Date(Date.UTC(2026, 9, 22, 14, 7)),
  new Date(Date.UTC(2025, 11, 31, 12, 0)),
]

const forms: [TemporalType, Record<string, string>][] = [
  ['dateRange', {}],
  ['dateRange', { from: '2026-10-19' }],
  ['dateRange', { from: '2026-10-19', to: '2026-10-21' }],
  ['date', {}],
  ['date', { date: '2026-10-19' }],
  ['time', { date: '09:30' }],
]

const months: [number, number][] = [
  [2024, 1],
  [2026, 1],
  [2026, 9],
  [2026, 0],
  [2025, 5],
  [2023, 11],
  [2027, 2],
]

const choices: [{ from: string; to: string }, string, 'from' | 'to'][] = [
  [{ from: '', to: '' }, '2026-10-05', 'from'],
  [{ from: '', to: '' }, '2026-10-05', 'to'],
  [{ from: '2026-10-05', to: '' }, '2026-10-15', 'to'],
  [{ from: '2026-10-05', to: '' }, '2026-10-01', 'to'],
  [{ from: '2026-10-05', to: '' }, '2026-10-05', 'to'],
  [{ from: '2026-10-05', to: '2026-10-15' }, '2026-10-20', 'from'],
  [{ from: '2026-10-05', to: '2026-10-15' }, '2026-10-20', 'to'],
]

const formats: [TemporalType, TemporalValue][] = [
  ['date', null],
  ['dateRange', { from: '', to: '' }],
  ['date', 'invalid'],
  ['time', '09:30:15'],
  ['time', '25:00'],
  ['date', '2026-10-19'],
  ['date', '2026-01-01'],
  ['datetime', '2026-10-19T00:30'],
  ['datetime', '2026-10-19T00:30:45'],
  ['dateRange', { from: '', to: '2026-10-19' }],
  ['dateRange', { from: '2026-05-03', to: '2026-12-31' }],
  ['datetimeRange', { from: '2026-10-19T09:00', to: '' }],
  ['timeRange', { from: '22:00', to: '06:00' }],
]
const locales = ['en', 'en-US', 'fr', 'ar']

const named = (locale: string) => ({
  monthsLong: Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2026, m, 1, 12))
  ),
  monthsShort: Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2026, m, 1, 12))
  ),
  weekdaysLong: Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2026, 0, 5 + i, 12))
  ),
  weekdaysNarrow: Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 0, 5 + i, 12))
  ),
  dates: ['2026-10-19', '2026-01-01', '2024-02-29', '2027-07-04'].map((day) => {
    const date = model.parseCalendarDate(day)
    return {
      day,
      monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date),
      medium: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date),
      monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date),
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date),
      number: new Intl.NumberFormat(locale).format(Number(day.slice(-2))),
    }
  }),
})

const fixture = {
  isType: ['date', 'time', 'datetimeRange', 'month', '', 'Date'].map((t) => [t, temporal.isTemporalType(t)]),
  types: types.map((type) => ({
    type,
    range: temporal.isTemporalRange(type),
    input: temporal.temporalInputType(type),
  })),
  normalize: values.map((value) => [value, temporal.normalizeTemporal(value)]),
  validate: validate.map(([config, value]) => ({
    config,
    value,
    error: temporal.validateTemporal(config, value),
  })),
  presets: nows.flatMap((now) =>
    types.map((type) => ({
      now: now.toISOString(),
      type,
      presets: temporal.temporalPresets(type, now),
    }))
  ),
  forms: forms.map(([type, entries]) => {
    const data = new FormData()
    for (const [k, v] of Object.entries(entries)) data.set(k, v)
    return { type, data: entries, value: temporal.readTemporalForm(type, data) }
  }),
  calendarDate: ['2026-10-19', '2024-02-29', '0099-03-04', '2026-02-31', '2026-12-31T23:59'].map((v) => [
    v,
    model.calendarDate(model.parseCalendarDate(v)),
  ]),
  monthDays: months.map(([year, month]) => ({ year, month, days: model.monthDays(year, month) })),
  chooseRange: choices.map(([current, day, edge]) => ({
    current,
    day,
    edge,
    result: model.chooseRangeDate(current, day, edge),
  })),
  format: locales.flatMap((locale) =>
    formats.map(([type, value]) => ({
      locale,
      type,
      value,
      text: format.formatTemporalValue(type, value, locale),
    }))
  ),
  names: Object.fromEntries(['en', 'fr', 'ar'].map((l) => [l, named(l)])),
}

writeFileSync(
  new URL('../test/fixtures/temporal.json', import.meta.url),
  JSON.stringify(fixture, null, 1) + '\n'
)
console.log('wrote flutter/test/fixtures/temporal.json')
