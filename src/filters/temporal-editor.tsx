'use client'

import './calendar.css'
import { useState } from 'react'
import { LabButton } from '../primitives/button'
import { LabRawInput } from '../primitives/raw-input'
import { LabTextField } from '../primitives/text-field'
import { LabSelect, LabOption } from '../primitives/select'
import { LabCalendarMonth } from './calendar'
import { calendarDate, parseCalendarDate, chooseRangeDate } from './calendar-model'
import {
  isTemporalRange,
  temporalInputType,
  temporalPresets,
  validateTemporal,
  type LabTemporalConfig,
  type LabTemporalValue,
} from './temporal'
function TimeChoices({
  label,
  value,
  onChange,
  step = 60,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  step?: number
}) {
  const [hour = '', minute = '', second = '00'] = value.split(':')
  const seconds = step < 60
  const update = (h: string, m: string, s: string) =>
    onChange(`${h || '00'}:${m || '00'}${seconds ? `:${s || '00'}` : ''}`)
  return (
    <div className="lab-time-choices" role="group" aria-label={label}>
      <LabSelect
        hint={`${label} hour`}
        controlSize="compact"
        value={hour || null}
        onValueChange={(h) => update(h, minute, second)}
      >
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
          <LabOption key={h} value={h}>
            {h}
          </LabOption>
        ))}
      </LabSelect>
      <LabSelect
        hint={`${label} minute`}
        controlSize="compact"
        value={minute || null}
        onValueChange={(m) => update(hour, m, second)}
      >
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
          <LabOption key={m} value={m}>
            {m}
          </LabOption>
        ))}
      </LabSelect>
      {seconds && (
        <LabSelect
          hint={`${label} second`}
          controlSize="compact"
          value={second}
          onValueChange={(s) => update(hour, minute, s)}
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((s) => (
            <LabOption key={s} value={s}>
              {s}
            </LabOption>
          ))}
        </LabSelect>
      )}
    </div>
  )
}
export function LabTemporalFilterEditor({
  config,
  value,
  onChange,
}: {
  config: LabTemporalConfig
  value: LabTemporalValue
  onChange: (value: LabTemporalValue) => void
}) {
  const type = temporalInputType(config.type),
    range = isTemporalRange(config.type),
    hasCalendar = type !== 'time',
    hasTime = type !== 'date'
  const from = typeof value === 'string' ? value : value?.from || '',
    to = value && typeof value === 'object' ? value.to : ''
  const [edge, setEdge] = useState<'from' | 'to'>('from')
  const [month, setMonth] = useState(() => {
    let initial = (hasCalendar && from ? from : calendarDate(new Date())).slice(0, 7)
    if (hasCalendar && config.min && initial < config.min.slice(0, 7))
      initial = config.min.slice(0, 7)
    if (hasCalendar && config.max && initial > config.max.slice(0, 7))
      initial = config.max.slice(0, 7)
    return initial
  })
  const [manual, setManual] = useState(false)
  const presets = (config.presets ?? temporalPresets(config.type)).filter(
    (p) => !validateTemporal(config, p.value)
  )
  const commit = (next: LabTemporalValue) => {
    onChange(next)
    setEdge('from')
    const start = typeof next === 'string' ? next : next?.from
    if (start && hasCalendar) setMonth(start.slice(0, 7))
  }
  const setPart = (part: 'from' | 'to', next: string) =>
    onChange(
      range ? { from: part === 'from' ? next : from, to: part === 'to' ? next : to } : next || null
    )
  const dayOnly = (text: string) => text.slice(0, 10)
  const pickDay = (day: string) => {
    if (!range) {
      onChange(type === 'datetime-local' ? `${day}T${from.split('T')[1] || '09:00'}` : day)
      return
    }
    const next = chooseRangeDate({ from: dayOnly(from), to: dayOnly(to) }, day, edge)
    onChange({
      from: next.value.from
        ? type === 'datetime-local'
          ? `${next.value.from}T${from.split('T')[1] || '00:00'}`
          : next.value.from
        : '',
      to: next.value.to
        ? type === 'datetime-local'
          ? `${next.value.to}T${to.split('T')[1] || '23:59'}`
          : next.value.to
        : '',
    })
    setEdge(next.edge)
  }
  const nice = (text: string) => {
    if (!text) return 'Choose'
    if (!hasCalendar) return text
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parseCalendarDate(text))
  }
  const nextMonth = () => {
    const d = parseCalendarDate(`${month}-01`)
    d.setMonth(d.getMonth() + 1)
    return calendarDate(d).slice(0, 7)
  }
  const shiftSecond = (next: string) => {
    const d = parseCalendarDate(`${next}-01`)
    d.setMonth(d.getMonth() - 1)
    setMonth(calendarDate(d).slice(0, 7))
  }
  const setTime = (part: 'from' | 'to', time: string) => {
    const original = part === 'from' ? from : to
    setPart(
      part,
      type === 'datetime-local' ? `${dayOnly(original) || calendarDate(new Date())}T${time}` : time
    )
  }
  const field = (part: 'from' | 'to' | 'date') => (
    <LabTextField
      key={part}
      type={type}
      hint={part === 'date' ? 'Exact value' : part === 'from' ? 'Exact start' : 'Exact end'}
      value={part === 'to' ? to : from}
      min={config.min}
      max={config.max}
      step={config.step}
      onInput={(event) => setPart(part === 'to' ? 'to' : 'from', event.currentTarget.value)}
    />
  )
  return (
    <div className="lab-temporal-editor" data-calendar={hasCalendar}>
      {range ? (
        <>
          <LabRawInput type="hidden" hidden name="from" value={from} />
          <LabRawInput type="hidden" hidden name="to" value={to} />
        </>
      ) : (
        <LabRawInput type="hidden" hidden name="date" value={from} />
      )}
      <div className="lab-temporal-selection-layout">
        {!!presets.length && (
          <div className="lab-temporal-presets-mobile">
            <LabSelect
              hint="Quick selection"
              value={
                presets.find((p) => JSON.stringify(p.value) === JSON.stringify(value))?.label ||
                null
              }
              placeholder="Custom selection"
              onValueChange={(label) => {
                const preset = presets.find((p) => p.label === label)
                if (preset) commit(preset.value)
              }}
            >
              {presets.map((p) => (
                <LabOption key={p.label} value={p.label}>
                  {p.label}
                </LabOption>
              ))}
            </LabSelect>
          </div>
        )}
        {!!presets.length && (
          <div className="lab-temporal-presets" role="group" aria-label="Quick presets">
            {presets.map((p) => (
              <LabButton
                key={p.label}
                variant="text"
                controlSize="compact"
                aria-pressed={JSON.stringify(value) === JSON.stringify(p.value)}
                onClick={() => commit(p.value)}
              >
                {p.label}
              </LabButton>
            ))}
          </div>
        )}
        <div className="lab-temporal-selection-main">
          {range && (
            <div className="lab-temporal-range-summary" role="group" aria-label="Range endpoints">
              <LabButton
                variant={edge === 'from' ? 'tonal' : 'outlined'}
                controlSize="compact"
                aria-pressed={edge === 'from'}
                onClick={() => setEdge('from')}
              >
                From · {nice(from)}
              </LabButton>
              <LabButton
                variant={edge === 'to' ? 'tonal' : 'outlined'}
                controlSize="compact"
                aria-pressed={edge === 'to'}
                onClick={() => setEdge('to')}
              >
                To · {nice(to)}
              </LabButton>
            </div>
          )}
          {hasCalendar && (
            <div className="lab-calendar-pair">
              <LabCalendarMonth
                label="Start calendar"
                month={month}
                onMonthChange={setMonth}
                from={dayOnly(from)}
                to={dayOnly(to)}
                min={config.min}
                max={config.max}
                onSelect={pickDay}
              />
              <div className="lab-calendar-second">
                <LabCalendarMonth
                  label="Next calendar"
                  month={nextMonth()}
                  onMonthChange={shiftSecond}
                  from={dayOnly(from)}
                  to={dayOnly(to)}
                  min={config.min}
                  max={config.max}
                  onSelect={pickDay}
                />
              </div>
            </div>
          )}
          {hasTime && (
            <div className="lab-temporal-time-row">
              <TimeChoices
                label={range ? 'Start time' : 'Time'}
                value={hasCalendar ? from.split('T')[1] || '' : from}
                step={config.step}
                onChange={(time) => setTime('from', time)}
              />
              {range && (
                <TimeChoices
                  label="End time"
                  value={hasCalendar ? to.split('T')[1] || '' : to}
                  step={config.step}
                  onChange={(time) => setTime('to', time)}
                />
              )}
            </div>
          )}
          {range && (
            <p role="status" className="lab-temporal-hint">
              {hasCalendar
                ? from && to
                  ? 'Range selected. Choose another start date to change it.'
                  : edge === 'to'
                    ? 'Choose an end date.'
                    : 'Choose a start date.'
                : 'Choose the start and end times.'}{' '}
              {config.allowOvernight
                ? 'Ranges may continue into the next day.'
                : 'Either end can be left open.'}
            </p>
          )}
          <LabButton
            variant="text"
            controlSize="compact"
            aria-expanded={manual}
            onClick={() => setManual(!manual)}
          >
            {manual ? 'Hide manual entry' : 'Enter exact values'}
          </LabButton>
          {manual && (
            <div className="lab-temporal-fields" data-range={range}>
              {range ? (
                <>
                  {field('from')}
                  {field('to')}
                </>
              ) : (
                field('date')
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
