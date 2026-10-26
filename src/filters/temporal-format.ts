import { parseCalendarDate } from './calendar-model'
import {
  normalizeTemporal,
  temporalInputType,
  temporalPresets,
  validateTemporal,
  type TemporalConfig,
  type TemporalType,
  type TemporalValue,
} from './temporal'
/** Display only; canonical form values remain local ISO strings. */
export function formatTemporalValue(
  type: TemporalType,
  value: TemporalValue,
  locale?: string
): string {
  if (value == null || !normalizeTemporal(value)) return ''
  const input = temporalInputType(type)
  const part = (text: string) => {
    if (!text) return 'Any'
    const singleType = type.replace('Range', '') as TemporalType
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
/**
 * Short text for a chosen value, e.g. on a filter chip: the label of the preset it equals (the
 * config's presets, else `temporalPresets(type, now)`), otherwise `formatTemporalValue`.
 */
export function temporalSummary(
  config: TemporalConfig,
  value: TemporalValue,
  locale?: string,
  now = new Date()
): string {
  if (normalizeTemporal(value) == null) return 'Any'
  const preset = (config.presets ?? temporalPresets(config.type, now)).find(
    (p) =>
      JSON.stringify(normalizeTemporal(p.value)) === JSON.stringify(value) &&
      !validateTemporal(config, p.value)
  )
  return preset?.label ?? formatTemporalValue(config.type, value, locale)
}
