'use client'

import './calendar.css'
import { useState, type ReactNode } from 'react'
import { Keyboard } from 'lucide-react'
import { Button } from '../primitives/button'
import { useI18n } from '../i18n'
import { RawInput } from '../primitives/raw-input'
import { TextField } from '../primitives/text-field'
import { NumberField } from '../primitives/number-field'
import { SegmentedControl } from '../primitives/segmented'
import { CalendarMonth } from './calendar'
import { calendarDate, parseCalendarDate, chooseRangeDate } from './calendar-model'
import {
  isTemporalRange,
  temporalInputType,
  temporalPresets,
  validateTemporal,
  type TemporalConfig,
  type TemporalValue,
} from './temporal'

const two = (n: number) => String(n).padStart(2, '0')

/** Hour : minute (: second) as number fields: drag to scrub, type, or use the arrow keys. */
function TimeInput({
  label,
  value,
  onChange,
  step = 60,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  /** Seconds between allowed values; minutes snap to it, seconds appear below one minute. */
  step?: number
}) {
  const [h = 9, m = 0, s = 0] = (value || '09:00').split(':').map(Number)
  const seconds = step < 60
  const minuteStep = seconds ? 1 : Math.max(1, Math.min(30, Math.round(step / 60)))
  const set = (hour: number, minute: number, second: number) =>
    onChange(`${two(hour)}:${two(minute)}${seconds ? `:${two(second)}` : ''}`)
  return (
    <div className="lab-time-input" role="group" aria-label={label}>
      <span className="lab-time-input-label" aria-hidden="true">
        {label}
      </span>
      <div className="lab-time-input-fields" dir="ltr">
        <NumberField
          label="Hour"
          controlSize="small"
          min={0}
          max={23}
          value={h}
          steppers={false}
          format={two}
          onValueChange={(hour) => set(hour, m, s)}
        />
        <span className="lab-time-input-colon" aria-hidden="true">
          :
        </span>
        <NumberField
          label="Minute"
          controlSize="small"
          min={0}
          max={60 - minuteStep}
          step={minuteStep}
          value={m}
          steppers={false}
          format={two}
          onValueChange={(minute) => set(h, minute, s)}
        />
        {seconds && (
          <>
            <span className="lab-time-input-colon" aria-hidden="true">
              :
            </span>
            <NumberField
              label="Second"
              controlSize="small"
              min={0}
              max={59}
              step={Math.max(1, step)}
              value={s}
              steppers={false}
              format={two}
              onValueChange={(second) => set(h, m, second)}
            />
          </>
        )}
      </div>
    </div>
  )
}


export type TemporalEditorOptions = {
  /** Type, bounds, step and presets. Presets that fail `validateTemporal` are hidden. */
  config: TemporalConfig
  /** Current draft value. */
  value: TemporalValue
  /** Called on every pick, preset or edit. Nothing is validated or committed for you. */
  onChange: (value: TemporalValue) => void
  /**
   * Called when a choice is complete on its own: a day in a date picker, or a preset. Hosts can
   * commit right away instead of waiting for Apply (DateField does).
   */
  onPick?: (value: TemporalValue) => void
  /** BCP 47 locale for month, weekday and endpoint names. Defaults to the kit's i18n locale. */
  locale?: string
  /** Changing it resets the visible month, the active end and typed entry (e.g. on every open). */
  resetKey?: unknown
}
export type TemporalEditorState = ReturnType<typeof useTemporalEditor>

/**
 * The picker's state, for hosts that place its parts apart: a dialog floats `TemporalPresets`
 * and `TemporalEdges` in its top bar and scrolls `TemporalBody`.
 */
export function useTemporalEditor({
  config,
  value,
  onChange,
  onPick,
  locale: localeProp,
  resetKey,
}: TemporalEditorOptions) {
  const i18n = useI18n()
  const locale = localeProp ?? i18n.locale
  const type = temporalInputType(config.type),
    range = isTemporalRange(config.type),
    hasCalendar = type !== 'time',
    hasTime = type !== 'date'
  const from = typeof value === 'string' ? value : value?.from || '',
    to = value && typeof value === 'object' ? value.to : ''
  const initialEdge = (): 'from' | 'to' => (range && from && !to ? 'to' : 'from')
  const initialMonth = () => {
    let month = (hasCalendar && from ? from : calendarDate(new Date())).slice(0, 7)
    if (hasCalendar && config.min && month < config.min.slice(0, 7)) month = config.min.slice(0, 7)
    if (hasCalendar && config.max && month > config.max.slice(0, 7)) month = config.max.slice(0, 7)
    return month
  }
  const [edge, setEdge] = useState(initialEdge)
  const [month, setMonth] = useState(initialMonth)
  const [manual, setManual] = useState(false)
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setEdge(initialEdge())
    setMonth(initialMonth())
    setManual(false)
  }
  const presets = (config.presets ?? temporalPresets(config.type)).filter(
    (p) => !validateTemporal(config, p.value)
  )
  const dayOnly = (text: string) => text.slice(0, 10)

  const choosePreset = (next: TemporalValue) => {
    onChange(next)
    setEdge('from')
    const start = typeof next === 'string' ? next : next?.from
    if (start && hasCalendar) setMonth(start.slice(0, 7))
    onPick?.(next)
  }
  const setPart = (part: 'from' | 'to', next: string) =>
    onChange(range ? { from: part === 'from' ? next : from, to: part === 'to' ? next : to } : next || null)
  const pickDay = (day: string) => {
    if (!range) {
      const next = type === 'datetime-local' ? `${day}T${from.split('T')[1] || '09:00'}` : day
      onChange(next)
      if (type === 'date') onPick?.(next)
      return
    }
    const next = chooseRangeDate({ from: dayOnly(from), to: dayOnly(to) }, day, edge)
    const withTime = (d: string, existing: string, fallback: string) =>
      d && type === 'datetime-local' ? `${d}T${existing.split('T')[1] || fallback}` : d
    onChange({ from: withTime(next.value.from, from, '00:00'), to: withTime(next.value.to, to, '23:59') })
    setEdge(next.edge)
  }
  const endpointText = (text: string) =>
    text && hasCalendar
      ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parseCalendarDate(text))
      : text || 'Any'
  const setTime = (part: 'from' | 'to', time: string) => {
    const original = part === 'from' ? from : to
    setPart(
      part,
      type === 'datetime-local' ? `${dayOnly(original) || calendarDate(new Date())}T${time}` : time
    )
  }
  return {
    config,
    value,
    locale,
    type,
    range,
    hasCalendar,
    hasTime,
    from,
    to,
    edge,
    setEdge,
    month,
    setMonth,
    manual,
    setManual,
    presets,
    dayOnly,
    choosePreset,
    setPart,
    pickDay,
    endpointText,
    setTime,
    presetActive: (p: { value: TemporalValue }) => JSON.stringify(value) === JSON.stringify(p.value),
  }
}

/**
 * Quick choices. `list` is a wrapping block of chips (popovers, menus); `bar` is one scrolling row
 * of toolbar buttons, meant to sit inside a glass group (dialog top bars).
 */
export function TemporalPresets({
  editor,
  layout = 'list',
}: {
  editor: TemporalEditorState
  layout?: 'list' | 'bar'
}) {
  if (!editor.presets.length) return null
  return (
    <div className="lab-temporal-presets" data-layout={layout} role="group" aria-label="Quick choices">
      {editor.presets.map((p) => (
        <Button
          key={p.label}
          variant={editor.presetActive(p) ? 'tonal' : 'text'}
          appearance={layout === 'bar' ? 'toolbar' : 'default'}
          controlSize="small"
          aria-pressed={editor.presetActive(p)}
          onClick={() => editor.choosePreset(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}

/**
 * The start/end switch of a date range; each side shows its chosen day. Nothing for other types.
 * It paints no surface: the editor sets it on a box, the dialog in its top bar's glass.
 */
export function TemporalEdges({ editor }: { editor: TemporalEditorState }) {
  if (!editor.range || !editor.hasCalendar) return null
  return (
    <SegmentedControl<'from' | 'to'>
      label="Which end you are choosing"
      className="lab-temporal-edges"
      equalWidth
      value={editor.edge}
      onChange={editor.setEdge}
      options={[
        { value: 'from', label: `Start · ${editor.endpointText(editor.dayOnly(editor.from))}` },
        { value: 'to', label: `End · ${editor.endpointText(editor.dayOnly(editor.to))}` },
      ]}
    />
  )
}

/**
 * Calendars, times and typed entry, plus the hidden `date` or `from`/`to` inputs that
 * `readTemporalForm` reads back.
 */
export function TemporalBody({ editor, footer }: { editor: TemporalEditorState; footer?: ReactNode }) {
  const { config, range, hasCalendar, hasTime, type, from, to, month, setMonth, locale, dayOnly } = editor
  const nextMonth = () => {
    const d = parseCalendarDate(`${month}-01`)
    d.setMonth(d.getMonth() + 1)
    return calendarDate(d).slice(0, 7)
  }
  const shiftFromSecond = (next: string) => {
    const d = parseCalendarDate(`${next}-01`)
    d.setMonth(d.getMonth() - 1)
    setMonth(calendarDate(d).slice(0, 7))
  }
  return (
    <div className="lab-temporal-main" data-range={range}>
      {range ? (
        <>
          <RawInput type="hidden" hidden name="from" value={from} />
          <RawInput type="hidden" hidden name="to" value={to} />
        </>
      ) : (
        <RawInput type="hidden" hidden name="date" value={from} />
      )}

      {hasCalendar && (
        <div className="lab-calendar-pair" data-pair={range || undefined}>
          <CalendarMonth
            label={range ? 'First month' : 'Calendar'}
            month={month}
            onMonthChange={setMonth}
            from={dayOnly(from)}
            to={dayOnly(to)}
            min={config.min}
            max={config.max}
            onSelect={editor.pickDay}
            locale={locale}
            navigation="both"
          />
          {range && (
            <div className="lab-calendar-second">
              <CalendarMonth
                label="Second month"
                month={nextMonth()}
                onMonthChange={shiftFromSecond}
                from={dayOnly(from)}
                to={dayOnly(to)}
                min={config.min}
                max={config.max}
                onSelect={editor.pickDay}
                locale={locale}
                navigation="next"
              />
            </div>
          )}
        </div>
      )}

      {hasTime && (
        <div className="lab-temporal-times">
          <TimeInput
            label={range ? 'Start time' : 'Time'}
            value={hasCalendar ? from.split('T')[1] || '' : from}
            step={config.step}
            onChange={(time) => editor.setTime('from', time)}
          />
          {range && (
            <TimeInput
              label="End time"
              value={hasCalendar ? to.split('T')[1] || '' : to}
              step={config.step}
              onChange={(time) => editor.setTime('to', time)}
            />
          )}
          {range && config.allowOvernight && (
            <p className="lab-temporal-note">An end time before the start time continues into the next day.</p>
          )}
        </div>
      )}

      <div className="lab-temporal-footer">
        <Button
          variant="text"
          controlSize="small"
          className="lab-temporal-manual-toggle"
          aria-expanded={editor.manual}
          onClick={() => editor.setManual(!editor.manual)}
        >
          <Keyboard size={16} />
          {editor.manual
            ? 'Hide typed entry'
            : range
              ? hasCalendar
                ? 'Type the dates'
                : 'Type the times'
              : hasCalendar
                ? 'Type a date'
                : 'Type a time'}
        </Button>
        {footer}
      </div>
      {editor.manual && (
        <div className="lab-temporal-fields" data-range={range}>
          {(range ? (['from', 'to'] as const) : (['date'] as const)).map((part) => (
            <TextField
              key={part}
              type={type}
              controlSize="small"
              hint={part === 'date' ? (hasCalendar ? 'Date' : 'Time') : part === 'from' ? 'Start' : 'End'}
              value={part === 'to' ? to : from}
              min={config.min}
              max={config.max}
              step={config.step}
              onInput={(event) => editor.setPart(part === 'to' ? 'to' : 'from', event.currentTarget.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The picker body without a trigger, all parts in one column: presets as chips, a start/end switch
 * for ranges, one or two calendars, number-field times and optional typed entry. Controlled; place
 * it in your own form or popover. In a dialog, use `TemporalDialog`, which floats the presets
 * and the switch in its top bar. It writes hidden `date` (single) or `from`/`to` (range) inputs
 * that `readTemporalForm` reads back.
 */
export function TemporalFilterEditor({
  footer,
  ...options
}: TemporalEditorOptions & {
  /** Shown at the end of the typed-entry row, e.g. a popover's own actions. */
  footer?: ReactNode
}) {
  const editor = useTemporalEditor(options)
  return (
    <div className="lab-temporal-editor" data-calendar={editor.hasCalendar} data-range={editor.range}>
      <div className="lab-temporal-layout">
        <TemporalPresets editor={editor} />
        <TemporalEdges editor={editor} />
        <TemporalBody editor={editor} footer={footer} />
      </div>
    </div>
  )
}
