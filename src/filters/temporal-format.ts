import { parseCalendarDate } from './calendar-model'
import {
  normalizeTemporal,
  temporalInputType,
  validateTemporal,
  type LabTemporalType,
  type LabTemporalValue,
} from './temporal'
/** Display only; canonical form values remain local ISO strings. */
export function formatTemporalValue(
  type: LabTemporalType,
  value: LabTemporalValue,
  locale?: string
): string {
  if (value == null || !normalizeTemporal(value)) return ''
  const input = temporalInputType(type)
  const part = (text: string) => {
    if (!text) return 'Any'
    const singleType = type.replace('Range', '') as LabTemporalType
    if (validateTemporal({ type: singleType }, text)) return text
    if (input === 'time') return text
    const date = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parseCalendarDate(text))
    return input === 'datetime-local' ? `${date}, ${text.split('T')[1]}` : date
  }
  return typeof value === 'string' ? part(value) : `${part(value.from)} – ${part(value.to)}`
}
