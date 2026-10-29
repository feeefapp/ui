import { englishText, type Translate } from '../i18n-core'

/** What a temporal field or editor picks: a single value or a `from`/`to` range. */
export type TemporalType =
  'date' | 'time' | 'datetime' | 'dateRange' | 'timeRange' | 'datetimeRange'
/** Local ISO string, `{ from, to }` range (either end may be `''`), or `null` for no value. */
export type TemporalValue = string | { from: string; to: string } | null
/** A one-click choice shown beside the calendar. */
export type TemporalPreset = {
  /** Button text, also the preset's identity in the picker. */
  label: string
  /** Value applied when the preset is chosen; `null` means "no filter". */
  value: TemporalValue
}
/** Shared rules for a temporal field or editor. */
export type TemporalConfig = {
  /** Value shape and picker: date, time, datetime, or one of their `Range` forms. */
  type: TemporalType
  /** Earliest allowed value, in the same ISO format as the value. Earlier days are disabled. */
  min?: string
  /** Latest allowed value, in the same ISO format as the value. Later days are disabled. */
  max?: string
  /** Allowed increment: days for dates, seconds for times and datetimes, counted from `min`. */
  step?: number
  /** Time ranges only: lets the end time be earlier than the start (crossing midnight). */
  allowOvernight?: boolean
  /** Quick choices; defaults to `temporalPresets(type)`. Presets that break the rules are hidden. */
  presets?: readonly TemporalPreset[]
}
export const isTemporalType = (type: string | undefined): type is TemporalType =>
  !!type && ['date', 'time', 'datetime', 'dateRange', 'timeRange', 'datetimeRange'].includes(type)
/** True for the `…Range` types. */
export const isTemporalRange = (type: TemporalType) => type.endsWith('Range')
export const temporalInputType = (type: TemporalType) =>
  type.startsWith('datetime') ? 'datetime-local' : type.startsWith('time') ? 'time' : 'date'
/** Turns empty values (`''`, `{ from: '', to: '' }`) into `null`. */
export function normalizeTemporal(value: TemporalValue): TemporalValue {
  return value && typeof value === 'object' && !value.from && !value.to ? null : value || null
}
/**
 * Checks a value against a config: ISO format and real calendar dates, `step`, `min`/`max`, and
 * range order. Returns an error message in `t`'s language (English by default), or `null` when
 * the value (or `null`) is valid.
 */
export function validateTemporal(
  config: TemporalConfig,
  value: TemporalValue,
  t: Translate = englishText
): string | null {
  if (value == null) return null
  const parts = typeof value === 'string' ? [value] : [value.from, value.to].filter(Boolean)
  const input = temporalInputType(config.type)
  const valid = (part: string) => {
    if (input === 'time') return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(part)
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?)?$/.exec(part)
    if (!match || (input === 'datetime-local') !== part.includes('T')) return false
    const [, year, month, day] = match
    const date = new Date(0)
    date.setFullYear(Number(year), Number(month) - 1, Number(day))
    return (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    )
  }
  if (parts.some((part) => !valid(part))) return t('lab.temporal.invalid')
  if (config.step && config.step > 0) {
    const units = (part: string) =>
      input === 'time'
        ? part
            .split(':')
            .reduce((total, piece, index) => total + Number(piece) * [3600, 60, 1][index], 0)
        : input === 'date'
          ? Date.parse(`${part}T00:00:00Z`) / 86400000
          : Date.parse(`${part}Z`) / 1000
    const base = config.min ? units(config.min) : 0
    if (
      parts.some((part) => {
        const steps = (units(part) - base) / config.step!
        return Math.abs(steps - Math.round(steps)) > 1e-7
      })
    )
      return input === 'date'
        ? t('lab.temporal.dayStep', { step: config.step })
        : t('lab.temporal.secondStep', { step: config.step })
  }
  const comparable = (part: string) =>
    input !== 'date' && /^\d{2}:\d{2}$/.test(part.split('T').at(-1) || '') ? `${part}:00` : part
  if (config.min && parts.some((part) => comparable(part) < comparable(config.min!)))
    return t('lab.temporal.min', { min: config.min })
  if (config.max && parts.some((part) => comparable(part) > comparable(config.max!)))
    return t('lab.temporal.max', { max: config.max })
  if (
    typeof value === 'object' &&
    value.from &&
    value.to &&
    comparable(value.from) > comparable(value.to) &&
    !(config.type === 'timeRange' && config.allowOvernight)
  )
    return config.type === 'timeRange'
      ? t('lab.temporal.endTimeBeforeStart')
      : t('lab.temporal.endBeforeStart')
  return null
}
const pad = (n: number) => String(n).padStart(2, '0')
const dateText = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const datetimeText = (d: Date) => `${dateText(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
/**
 * Default presets for a type, computed from `now` in local wall-clock time (Today, Last 7 days,
 * Morning…), labelled in `t`'s language. Feature owners choose timezone and query conversion.
 */
export function temporalPresets(
  type: TemporalType,
  now = new Date(),
  t: Translate = englishText
): TemporalPreset[] {
  const today = dateText(now),
    yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (type === 'date')
    return [
      { label: t('lab.temporal.today'), value: today },
      { label: t('lab.temporal.yesterday'), value: dateText(yesterday) },
    ]
  if (type === 'time')
    return [
      { label: t('lab.temporal.now'), value: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
      { label: '09:00', value: '09:00' },
      { label: '17:00', value: '17:00' },
    ]
  if (type === 'datetime')
    return [
      { label: t('lab.temporal.now'), value: datetimeText(now) },
      {
        label: t('lab.temporal.tomorrowAt', { time: '09:00' }),
        value: `${dateText(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))}T09:00`,
      },
    ]
  if (type === 'timeRange')
    return [
      { label: t('lab.temporal.morning'), value: { from: '09:00', to: '12:00' } },
      { label: t('lab.temporal.afternoon'), value: { from: '13:00', to: '17:00' } },
    ]
  if (type === 'datetimeRange') {
    const past = new Date(now)
    past.setHours(now.getHours() - 24)
    return [
      { label: t('lab.temporal.last24Hours'), value: { from: datetimeText(past), to: datetimeText(now) } },
      { label: t('lab.temporal.today'), value: { from: `${today}T00:00`, to: `${today}T23:59` } },
    ]
  }
  const lastDays = (count: number) => {
    const start = new Date(now)
    start.setDate(now.getDate() - count + 1)
    return { from: dateText(start), to: today }
  }
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  return [
    { label: t('lab.temporal.allTime'), value: null },
    { label: t('lab.temporal.today'), value: { from: today, to: today } },
    { label: t('lab.temporal.yesterday'), value: { from: dateText(yesterday), to: dateText(yesterday) } },
    { label: t('lab.temporal.lastDays', { count: 7 }), value: lastDays(7) },
    { label: t('lab.temporal.lastDays', { count: 14 }), value: lastDays(14) },
    { label: t('lab.temporal.lastDays', { count: 30 }), value: lastDays(30) },
    { label: t('lab.temporal.thisMonth'), value: { from: `${today.slice(0, 7)}-01`, to: today } },
    { label: t('lab.temporal.lastMonth'), value: { from: dateText(lastMonthStart), to: dateText(lastMonthEnd) } },
  ]
}
/** Reads the value of a `TemporalFilterEditor` from its form's data (`date`, or `from`/`to`). */
export function readTemporalForm(type: TemporalType, data: FormData): TemporalValue {
  return normalizeTemporal(
    isTemporalRange(type)
      ? { from: String(data.get('from') || ''), to: String(data.get('to') || '') }
      : String(data.get('date') || '')
  )
}
