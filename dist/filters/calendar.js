'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Button } from '../primitives/button.js';
import { useI18n } from '../i18n.js';
import { calendarDate, monthDays, parseCalendarDate } from './calendar-model.js';
/**
 * One month grid. The heading is a plain row on the host surface: previous, a title that opens a
 * month/year grid, next. Days support arrow, Home/End and Page Up/Down navigation; a range paints one continuous band.
 */
export function CalendarMonth({ month, onMonthChange, from, to, min, max, onSelect, locale = 'en', label, navigation = 'both', }) {
    const { t } = useI18n();
    const name = label ?? t('lab.temporal.calendar');
    const date = parseCalendarDate(`${month}-01`), year = date.getFullYear(), monthIndex = date.getMonth();
    const root = useRef(null);
    const [focusDate, setFocusDate] = useState('');
    const [picking, setPicking] = useState(false);
    const [pickYear, setPickYear] = useState(year);
    useLayoutEffect(() => {
        if (focusDate)
            root.current
                ?.querySelector(`[data-date="${focusDate}"]`)
                ?.focus({ preventScroll: true });
    }, [month, focusDate]);
    const go = (y, m) => onMonthChange(calendarDate(new Date(y, m, 1, 12)).slice(0, 7));
    const minMonth = min?.slice(0, 7), maxMonth = max?.slice(0, 7);
    const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
    const outOfBounds = (y, m) => (!!minMonth && monthKey(y, m) < minMonth) || (!!maxMonth && monthKey(y, m) > maxMonth);
    const today = calendarDate(new Date()), days = monthDays(year, monthIndex);
    const inBounds = (day) => (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10));
    const tabDate = [focusDate, from, today].find((day) => days.includes(day) && inBounds(day)) ||
        days.find((day) => day && inBounds(day));
    const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
    const lo = from && to ? (from < to ? from : to) : '', hi = from && to ? (from < to ? to : from) : '';
    return (_jsxs("div", { ref: root, className: "lab-calendar-month", role: "group", "aria-label": name, children: [_jsxs("div", { role: "group", "aria-label": t('lab.calendar.navigation', { label: name }), className: "lab-calendar-heading", children: [navigation !== 'next' && (_jsx(IconButton, { variant: "text", controlSize: "small", "data-nav": "previous", "aria-label": t('lab.calendar.previous'), disabled: picking ? !!minMonth && `${pickYear - 1}-12` < minMonth : outOfBounds(year, monthIndex - 1), onClick: () => (picking ? setPickYear(pickYear - 1) : go(year, monthIndex - 1)), children: _jsx(ChevronLeft, { className: "lab-dir-flip" }) })), _jsx(Button, { variant: "text", controlSize: "small", className: "lab-calendar-title", "aria-expanded": picking, "aria-label": picking ? t('lab.calendar.chooseMonthIn', { year: pickYear }) : t('lab.calendar.chooseMonth', { title }), onClick: () => {
                            setPickYear(year);
                            setPicking(!picking);
                        }, children: picking ? pickYear : title }), navigation !== 'previous' && (_jsx(IconButton, { variant: "text", controlSize: "small", "data-nav": "next", "aria-label": t('lab.calendar.next'), disabled: picking ? !!maxMonth && `${pickYear + 1}-01` > maxMonth : outOfBounds(year, monthIndex + 1), onClick: () => (picking ? setPickYear(pickYear + 1) : go(year, monthIndex + 1)), children: _jsx(ChevronRight, { className: "lab-dir-flip" }) }))] }), picking ? (_jsx("div", { className: "lab-calendar-months", role: "group", "aria-label": t('lab.calendar.monthsOf', { year: pickYear }), children: Array.from({ length: 12 }, (_, m) => (_jsx(Button, { variant: m === monthIndex && pickYear === year ? 'tonal' : 'text', controlSize: "small", "aria-pressed": m === monthIndex && pickYear === year, disabled: outOfBounds(pickYear, m), onClick: () => {
                        go(pickYear, m);
                        setPicking(false);
                    }, children: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(pickYear, m, 1, 12)) }, m))) })) : (_jsxs("table", { className: "lab-calendar-grid", "aria-label": title, children: [_jsx("thead", { children: _jsx("tr", { children: Array.from({ length: 7 }, (_, index) => (_jsx("th", { scope: "col", abbr: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2026, 0, 5 + index)), children: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 0, 5 + index)) }, index))) }) }), _jsx("tbody", { children: Array.from({ length: 6 }, (_, week) => (_jsx("tr", { children: days.slice(week * 7, week * 7 + 7).map((day, index) => {
                                const start = !!day && day === (lo || from);
                                const end = !!day && !!hi && day === hi;
                                return (_jsx("td", { "data-between": !!day && !!lo && day > lo && day < hi, "data-range-start": (start && !!hi && lo !== hi) || undefined, "data-range-end": (end && lo !== hi) || undefined, children: day && (_jsx("button", { type: "button", className: "lab-calendar-day", "data-date": day, "data-selected": day === from || day === to || undefined, disabled: !inBounds(day), tabIndex: day === tabDate ? 0 : -1, "aria-label": new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(parseCalendarDate(day)), "aria-pressed": day === from || day === to, "aria-current": day === today ? 'date' : undefined, onClick: () => onSelect(day), onKeyDown: (event) => {
                                            const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
                                            const offsets = {
                                                ArrowLeft: rtl ? 1 : -1,
                                                ArrowRight: rtl ? -1 : 1,
                                                ArrowUp: -7,
                                                ArrowDown: 7,
                                            };
                                            const target = parseCalendarDate(day);
                                            if (event.key in offsets)
                                                target.setDate(target.getDate() + offsets[event.key]);
                                            else if (event.key === 'Home')
                                                target.setDate(target.getDate() - ((target.getDay() + 6) % 7));
                                            else if (event.key === 'End')
                                                target.setDate(target.getDate() + 6 - ((target.getDay() + 6) % 7));
                                            else if (event.key === 'PageUp' || event.key === 'PageDown') {
                                                const wanted = target.getDate();
                                                target.setDate(1);
                                                target.setMonth(target.getMonth() + (event.key === 'PageUp' ? -1 : 1));
                                                target.setDate(Math.min(wanted, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
                                            }
                                            else
                                                return;
                                            event.preventDefault();
                                            const next = calendarDate(target);
                                            if (!inBounds(next))
                                                return;
                                            onMonthChange(next.slice(0, 7));
                                            setFocusDate(next);
                                        }, children: new Intl.NumberFormat(locale).format(Number(day.slice(-2))) })) }, index));
                            }) }, week))) })] }))] }));
}
//# sourceMappingURL=calendar.js.map