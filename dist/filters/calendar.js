'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LabIconButton, LabButton } from '../primitives/button.js';
import { LabSelect, LabOption } from '../primitives/select.js';
import { calendarDate, monthDays, parseCalendarDate } from './calendar-model.js';
export function LabCalendarMonth({ month, onMonthChange, from, to, min, max, onSelect, locale = 'en', label = 'Calendar', }) {
    const date = parseCalendarDate(`${month}-01`), year = date.getFullYear(), monthIndex = date.getMonth();
    const root = useRef(null);
    const [focusDate, setFocusDate] = useState('');
    useLayoutEffect(() => {
        if (focusDate)
            root.current
                ?.querySelector(`[data-date="${focusDate}"]`)
                ?.focus({ preventScroll: true });
    }, [month, focusDate]);
    const move = (amount) => onMonthChange(calendarDate(new Date(year, monthIndex + amount, 1, 12)).slice(0, 7));
    const today = calendarDate(new Date()), days = monthDays(year, monthIndex);
    const firstFocusable = days.find((day) => day && (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10)));
    const tabDate = [focusDate, from, today].find((day) => days.includes(day) && (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10))) || firstFocusable;
    const years = Array.from({ length: Math.max(101, year - (Number(min?.slice(0, 4)) || year - 50) + 1) }, (_, index) => (Number(min?.slice(0, 4)) || year - 50) + index).filter((y) => !max || y <= Number(max.slice(0, 4)));
    return (_jsxs("div", { ref: root, className: "lab-calendar-month", "aria-label": label, children: [_jsxs("div", { className: "lab-calendar-heading", children: [_jsx(LabIconButton, { variant: "text", controlSize: "compact", "aria-label": `Previous month in ${label}`, onClick: () => move(-1), children: _jsx(ChevronLeft, {}) }), _jsx(LabSelect, { hint: "Month", "aria-label": `${label} month`, controlSize: "compact", value: String(monthIndex), onValueChange: (next) => onMonthChange(`${year}-${String(Number(next) + 1).padStart(2, '0')}`), children: Array.from({ length: 12 }, (_, index) => (_jsx(LabOption, { value: String(index), children: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, index, 1)) }, index))) }), _jsx(LabSelect, { hint: "Year", "aria-label": `${label} year`, controlSize: "compact", value: String(year), onValueChange: (next) => onMonthChange(`${next}-${String(monthIndex + 1).padStart(2, '0')}`), children: years.map((y) => (_jsx(LabOption, { value: String(y), children: y }, y))) }), _jsx(LabIconButton, { variant: "text", controlSize: "compact", "aria-label": `Next month in ${label}`, onClick: () => move(1), children: _jsx(ChevronRight, {}) })] }), _jsxs("table", { className: "lab-calendar-grid", "aria-label": new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date), children: [_jsx("thead", { children: _jsx("tr", { children: Array.from({ length: 7 }, (_, index) => (_jsx("th", { scope: "col", children: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 0, 5 + index)) }, index))) }) }), _jsx("tbody", { children: Array.from({ length: 6 }, (_, week) => (_jsx("tr", { children: days.slice(week * 7, week * 7 + 7).map((day, index) => (_jsx("td", { "data-between": !!day && !!from && !!to && day > from && day < to, children: day && (_jsx(LabButton, { variant: "text", controlSize: "compact", className: "lab-calendar-day", "data-date": day, "data-endpoint": day === from || day === to, disabled: !!((min && day < min.slice(0, 10)) || (max && day > max.slice(0, 10))), tabIndex: day === tabDate ? 0 : -1, "aria-label": new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(parseCalendarDate(day)), "aria-pressed": day === from || day === to, "aria-current": day === today ? 'date' : undefined, onClick: () => onSelect(day), onKeyDown: (event) => {
                                        const offsets = {
                                            ArrowLeft: -1,
                                            ArrowRight: 1,
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
                                        if ((min && next < min.slice(0, 10)) || (max && next > max.slice(0, 10)))
                                            return;
                                        onMonthChange(next.slice(0, 7));
                                        setFocusDate(next);
                                    }, children: Number(day.slice(-2)) })) }, index))) }, week))) })] })] }));
}
//# sourceMappingURL=calendar.js.map