'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton, Button } from '../primitives/button'
import { useI18n } from '../i18n'
import { calendarDate, monthDays, parseCalendarDate } from './calendar-model'

/**
 * One month grid. The heading is a plain row on the host surface: previous, a title that opens a
 * month/year grid, next. Days support arrow, Home/End and Page Up/Down navigation; a range paints one continuous band.
 */
export function CalendarMonth({
  month,
  onMonthChange,
  from,
  to,
  min,
  max,
  onSelect,
  locale = 'en',
  label,
  navigation = 'both',
}: {
  /** Visible month as `YYYY-MM`. */
  month: string
  /** Called when the person pages or picks another month or year. */
  onMonthChange: (month: string) => void
  /** Selected day, or range start, as `YYYY-MM-DD`. */
  from: string
  /** Range end as `YYYY-MM-DD`; days between `from` and `to` are tinted. */
  to?: string
  /** Earliest selectable day; earlier days are disabled. */
  min?: string
  /** Latest selectable day; later days are disabled. */
  max?: string
  /** Called with the chosen day as `YYYY-MM-DD`. */
  onSelect: (date: string) => void
  /** Locale for month, weekday and day names. */
  locale?: string
  /** Accessible name of the month region. */
  label?: string
  /** Which paging arrows this month shows; two side-by-side months show one each. */
  navigation?: 'both' | 'previous' | 'next'
}) {
  const { t } = useI18n()
  const name = label ?? t('lab.temporal.calendar')
  const date = parseCalendarDate(`${month}-01`),
    year = date.getFullYear(),
    monthIndex = date.getMonth()
  const root = useRef<HTMLDivElement>(null)
  const [focusDate, setFocusDate] = useState('')
  const [picking, setPicking] = useState(false)
  const [pickYear, setPickYear] = useState(year)
  useLayoutEffect(() => {
    if (focusDate)
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
        ?.focus({ preventScroll: true })
  }, [month, focusDate])
  const go = (y: number, m: number) => onMonthChange(calendarDate(new Date(y, m, 1, 12)).slice(0, 7))
  const minMonth = min?.slice(0, 7),
    maxMonth = max?.slice(0, 7)
  const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
  const outOfBounds = (y: number, m: number) =>
    (!!minMonth && monthKey(y, m) < minMonth) || (!!maxMonth && monthKey(y, m) > maxMonth)
  const today = calendarDate(new Date()),
    days = monthDays(year, monthIndex)
  const inBounds = (day: string) => (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10))
  const tabDate =
    [focusDate, from, today].find((day) => days.includes(day) && inBounds(day)) ||
    days.find((day) => day && inBounds(day))
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
  const lo = from && to ? (from < to ? from : to) : '',
    hi = from && to ? (from < to ? to : from) : ''

  return (
    <div ref={root} className="lab-calendar-month" role="group" aria-label={name}>
      <div role="group" aria-label={t('lab.calendar.navigation', { label: name })} className="lab-calendar-heading">
        {navigation !== 'next' && (
          <IconButton
            variant="text"
            controlSize="small"
            data-nav="previous"
            aria-label={t('lab.calendar.previous')}
            disabled={
              picking ? !!minMonth && `${pickYear - 1}-12` < minMonth : outOfBounds(year, monthIndex - 1)
            }
            onClick={() => (picking ? setPickYear(pickYear - 1) : go(year, monthIndex - 1))}
          >
            <ChevronLeft className="lab-dir-flip" />
          </IconButton>
        )}
        <Button
          variant="text"
          controlSize="small"
          className="lab-calendar-title"
          aria-expanded={picking}
          aria-label={picking ? t('lab.calendar.chooseMonthIn', { year: pickYear }) : t('lab.calendar.chooseMonth', { title })}
          onClick={() => {
            setPickYear(year)
            setPicking(!picking)
          }}
        >
          {picking ? pickYear : title}
        </Button>
        {navigation !== 'previous' && (
          <IconButton
            variant="text"
            controlSize="small"
            data-nav="next"
            aria-label={t('lab.calendar.next')}
            disabled={
              picking ? !!maxMonth && `${pickYear + 1}-01` > maxMonth : outOfBounds(year, monthIndex + 1)
            }
            onClick={() => (picking ? setPickYear(pickYear + 1) : go(year, monthIndex + 1))}
          >
            <ChevronRight className="lab-dir-flip" />
          </IconButton>
        )}
      </div>

      {picking ? (
        <div className="lab-calendar-months" role="group" aria-label={t('lab.calendar.monthsOf', { year: pickYear })}>
          {Array.from({ length: 12 }, (_, m) => (
            <Button
              key={m}
              variant={m === monthIndex && pickYear === year ? 'tonal' : 'text'}
              controlSize="small"
              aria-pressed={m === monthIndex && pickYear === year}
              disabled={outOfBounds(pickYear, m)}
              onClick={() => {
                go(pickYear, m)
                setPicking(false)
              }}
            >
              {new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(pickYear, m, 1, 12))}
            </Button>
          ))}
        </div>
      ) : (
        <table className="lab-calendar-grid" aria-label={title}>
          <thead>
            <tr>
              {Array.from({ length: 7 }, (_, index) => (
                <th
                  scope="col"
                  key={index}
                  abbr={new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(
                    new Date(2026, 0, 5 + index)
                  )}
                >
                  {new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(
                    new Date(2026, 0, 5 + index)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, week) => (
              <tr key={week}>
                {days.slice(week * 7, week * 7 + 7).map((day, index) => {
                  const start = !!day && day === (lo || from)
                  const end = !!day && !!hi && day === hi
                  return (
                    <td
                      key={index}
                      data-between={!!day && !!lo && day > lo && day < hi}
                      data-range-start={(start && !!hi && lo !== hi) || undefined}
                      data-range-end={(end && lo !== hi) || undefined}
                    >
                      {day && (
                        <button
                          type="button"
                          className="lab-calendar-day"
                          data-date={day}
                          data-selected={day === from || day === to || undefined}
                          disabled={!inBounds(day)}
                          tabIndex={day === tabDate ? 0 : -1}
                          aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
                            parseCalendarDate(day)
                          )}
                          aria-pressed={day === from || day === to}
                          aria-current={day === today ? 'date' : undefined}
                          onClick={() => onSelect(day)}
                          onKeyDown={(event) => {
                            const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
                            const offsets: Record<string, number> = {
                              ArrowLeft: rtl ? 1 : -1,
                              ArrowRight: rtl ? -1 : 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                            }
                            const target = parseCalendarDate(day)
                            if (event.key in offsets) target.setDate(target.getDate() + offsets[event.key])
                            else if (event.key === 'Home')
                              target.setDate(target.getDate() - ((target.getDay() + 6) % 7))
                            else if (event.key === 'End')
                              target.setDate(target.getDate() + 6 - ((target.getDay() + 6) % 7))
                            else if (event.key === 'PageUp' || event.key === 'PageDown') {
                              const wanted = target.getDate()
                              target.setDate(1)
                              target.setMonth(target.getMonth() + (event.key === 'PageUp' ? -1 : 1))
                              target.setDate(
                                Math.min(
                                  wanted,
                                  new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
                                )
                              )
                            } else return
                            event.preventDefault()
                            const next = calendarDate(target)
                            if (!inBounds(next)) return
                            onMonthChange(next.slice(0, 7))
                            setFocusDate(next)
                          }}
                        >
                          {new Intl.NumberFormat(locale).format(Number(day.slice(-2)))}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
