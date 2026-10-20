export type LabTemporalType =
  'date' | 'time' | 'datetime' | 'dateRange' | 'timeRange' | 'datetimeRange'
export type LabTemporalValue = string | { from: string; to: string } | null
export type LabTemporalPreset = { label: string; value: LabTemporalValue }
export type LabTemporalConfig = {
  type: LabTemporalType
  min?: string
  max?: string
  step?: number
  allowOvernight?: boolean
  presets?: readonly LabTemporalPreset[]
}
export const isTemporalType = (type: string | undefined): type is LabTemporalType =>
  !!type && ['date', 'time', 'datetime', 'dateRange', 'timeRange', 'datetimeRange'].includes(type)
export const isTemporalRange = (type: LabTemporalType) => type.endsWith('Range')
export const temporalInputType = (type: LabTemporalType) =>
  type.startsWith('datetime') ? 'datetime-local' : type.startsWith('time') ? 'time' : 'date'
export function normalizeTemporal(value: LabTemporalValue): LabTemporalValue {
  return value && typeof value === 'object' && !value.from && !value.to ? null : value || null
}
export function validateTemporal(
  config: LabTemporalConfig,
  value: LabTemporalValue
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
  if (parts.some((part) => !valid(part))) return 'Enter a valid date or time.'
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
        ? `Choose a date in ${config.step}-day steps.`
        : `Choose a time in ${config.step}-second steps.`
  }
  const comparable = (part: string) =>
    input !== 'date' && /^\d{2}:\d{2}$/.test(part.split('T').at(-1) || '') ? `${part}:00` : part
  if (config.min && parts.some((part) => comparable(part) < comparable(config.min!)))
    return `Use a value on or after ${config.min}.`
  if (config.max && parts.some((part) => comparable(part) > comparable(config.max!)))
    return `Use a value on or before ${config.max}.`
  if (
    typeof value === 'object' &&
    value.from &&
    value.to &&
    comparable(value.from) > comparable(value.to) &&
    !(config.type === 'timeRange' && config.allowOvernight)
  )
    return config.type === 'timeRange'
      ? 'The end time must be on or after the start time.'
      : 'The end must be on or after the start.'
  return null
}
const pad = (n: number) => String(n).padStart(2, '0')
const dateText = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const datetimeText = (d: Date) => `${dateText(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
/** Local wall-clock presets; feature owners choose timezone/query conversion. */
export function temporalPresets(type: LabTemporalType, now = new Date()): LabTemporalPreset[] {
  const today = dateText(now),
    yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (type === 'date')
    return [
      { label: 'Today', value: today },
      { label: 'Yesterday', value: dateText(yesterday) },
    ]
  if (type === 'time')
    return [
      { label: 'Now', value: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
      { label: '09:00', value: '09:00' },
      { label: '17:00', value: '17:00' },
    ]
  if (type === 'datetime')
    return [
      { label: 'Now', value: datetimeText(now) },
      {
        label: 'Tomorrow at 09:00',
        value: `${dateText(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))}T09:00`,
      },
    ]
  if (type === 'timeRange')
    return [
      { label: 'Morning', value: { from: '09:00', to: '12:00' } },
      { label: 'Afternoon', value: { from: '13:00', to: '17:00' } },
    ]
  if (type === 'datetimeRange') {
    const past = new Date(now)
    past.setHours(now.getHours() - 24)
    return [
      { label: 'Last 24 hours', value: { from: datetimeText(past), to: datetimeText(now) } },
      { label: 'Today', value: { from: `${today}T00:00`, to: `${today}T23:59` } },
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
    { label: 'All time', value: null },
    { label: 'Today', value: { from: today, to: today } },
    { label: 'Yesterday', value: { from: dateText(yesterday), to: dateText(yesterday) } },
    { label: 'Last 7 days', value: lastDays(7) },
    { label: 'Last 14 days', value: lastDays(14) },
    { label: 'Last 30 days', value: lastDays(30) },
    { label: 'This month', value: { from: `${today.slice(0, 7)}-01`, to: today } },
    { label: 'Last month', value: { from: dateText(lastMonthStart), to: dateText(lastMonthEnd) } },
  ]
}
export function readTemporalForm(type: LabTemporalType, data: FormData): LabTemporalValue {
  return normalizeTemporal(
    isTemporalRange(type)
      ? { from: String(data.get('from') || ''), to: String(data.get('to') || '') }
      : String(data.get('date') || '')
  )
}
