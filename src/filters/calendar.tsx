'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LabIconButton, LabButton } from '../primitives/button'
import { LabSelect, LabOption } from '../primitives/select'
import { calendarDate, monthDays, parseCalendarDate } from './calendar-model'
export function LabCalendarMonth({
  month,
  onMonthChange,
  from,
  to,
  min,
  max,
  onSelect,
  locale = 'en',
  label = 'Calendar',
}: {
  month: string
  onMonthChange: (month: string) => void
  from: string
  to?: string
  min?: string
  max?: string
  onSelect: (date: string) => void
  locale?: string
  label?: string
}) {
  const date = parseCalendarDate(`${month}-01`),
    year = date.getFullYear(),
    monthIndex = date.getMonth()
  const root = useRef<HTMLDivElement>(null)
  const [focusDate, setFocusDate] = useState('')
  useLayoutEffect(() => {
    if (focusDate)
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
        ?.focus({ preventScroll: true })
  }, [month, focusDate])
  const move = (amount: number) =>
    onMonthChange(calendarDate(new Date(year, monthIndex + amount, 1, 12)).slice(0, 7))
  const today = calendarDate(new Date()),
    days = monthDays(year, monthIndex)
  const firstFocusable = days.find(
    (day) => day && (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10))
  )
  const tabDate =
    [focusDate, from, today].find(
      (day) =>
        days.includes(day) && (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10))
    ) || firstFocusable
  const years = Array.from(
    { length: Math.max(101, year - (Number(min?.slice(0, 4)) || year - 50) + 1) },
    (_, index) => (Number(min?.slice(0, 4)) || year - 50) + index
  ).filter((y) => !max || y <= Number(max.slice(0, 4)))
  return (
    <div ref={root} className="lab-calendar-month" aria-label={label}>
      <div className="lab-calendar-heading">
        <LabIconButton
          variant="text"
          controlSize="compact"
          aria-label={`Previous month in ${label}`}
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </LabIconButton>
        <LabSelect
          hint="Month"
          aria-label={`${label} month`}
          controlSize="compact"
          value={String(monthIndex)}
          onValueChange={(next) =>
            onMonthChange(`${year}-${String(Number(next) + 1).padStart(2, '0')}`)
          }
        >
          {Array.from({ length: 12 }, (_, index) => (
            <LabOption key={index} value={String(index)}>
              {new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, index, 1))}
            </LabOption>
          ))}
        </LabSelect>
        <LabSelect
          hint="Year"
          aria-label={`${label} year`}
          controlSize="compact"
          value={String(year)}
          onValueChange={(next) =>
            onMonthChange(`${next}-${String(monthIndex + 1).padStart(2, '0')}`)
          }
        >
          {years.map((y) => (
            <LabOption key={y} value={String(y)}>
              {y}
            </LabOption>
          ))}
        </LabSelect>
        <LabIconButton
          variant="text"
          controlSize="compact"
          aria-label={`Next month in ${label}`}
          onClick={() => move(1)}
        >
          <ChevronRight />
        </LabIconButton>
      </div>
      <table
        className="lab-calendar-grid"
        aria-label={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
          date
        )}
      >
        <thead>
          <tr>
            {Array.from({ length: 7 }, (_, index) => (
              <th scope="col" key={index}>
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
              {days.slice(week * 7, week * 7 + 7).map((day, index) => (
                <td key={index} data-between={!!day && !!from && !!to && day > from && day < to}>
                  {day && (
                    <LabButton
                      variant="text"
                      controlSize="compact"
                      className="lab-calendar-day"
                      data-date={day}
                      data-endpoint={day === from || day === to}
                      disabled={
                        !!((min && day < min.slice(0, 10)) || (max && day > max.slice(0, 10)))
                      }
                      tabIndex={day === tabDate ? 0 : -1}
                      aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
                        parseCalendarDate(day)
                      )}
                      aria-pressed={day === from || day === to}
                      aria-current={day === today ? 'date' : undefined}
                      onClick={() => onSelect(day)}
                      onKeyDown={(event) => {
                        const offsets: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        }
                        const target = parseCalendarDate(day)
                        if (event.key in offsets)
                          target.setDate(target.getDate() + offsets[event.key])
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
                        if ((min && next < min.slice(0, 10)) || (max && next > max.slice(0, 10)))
                          return
                        onMonthChange(next.slice(0, 7))
                        setFocusDate(next)
                      }}
                    >
                      {Number(day.slice(-2))}
                    </LabButton>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
