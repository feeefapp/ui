'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './calendar.css';
import { useState } from 'react';
import { LabButton } from '../primitives/button.js';
import { LabRawInput } from '../primitives/raw-input.js';
import { LabTextField } from '../primitives/text-field.js';
import { LabSelect, LabOption } from '../primitives/select.js';
import { LabCalendarMonth } from './calendar.js';
import { calendarDate, parseCalendarDate, chooseRangeDate } from './calendar-model.js';
import { isTemporalRange, temporalInputType, temporalPresets, validateTemporal, } from './temporal.js';
function TimeChoices({ label, value, onChange, step = 60, }) {
    const [hour = '', minute = '', second = '00'] = value.split(':');
    const seconds = step < 60;
    const update = (h, m, s) => onChange(`${h || '00'}:${m || '00'}${seconds ? `:${s || '00'}` : ''}`);
    return (_jsxs("div", { className: "lab-time-choices", role: "group", "aria-label": label, children: [_jsx(LabSelect, { hint: `${label} hour`, controlSize: "compact", value: hour || null, onValueChange: (h) => update(h, minute, second), children: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (_jsx(LabOption, { value: h, children: h }, h))) }), _jsx(LabSelect, { hint: `${label} minute`, controlSize: "compact", value: minute || null, onValueChange: (m) => update(hour, m, second), children: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (_jsx(LabOption, { value: m, children: m }, m))) }), seconds && (_jsx(LabSelect, { hint: `${label} second`, controlSize: "compact", value: second, onValueChange: (s) => update(hour, minute, s), children: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((s) => (_jsx(LabOption, { value: s, children: s }, s))) }))] }));
}
export function LabTemporalFilterEditor({ config, value, onChange, }) {
    const type = temporalInputType(config.type), range = isTemporalRange(config.type), hasCalendar = type !== 'time', hasTime = type !== 'date';
    const from = typeof value === 'string' ? value : value?.from || '', to = value && typeof value === 'object' ? value.to : '';
    const [edge, setEdge] = useState('from');
    const [month, setMonth] = useState(() => {
        let initial = (hasCalendar && from ? from : calendarDate(new Date())).slice(0, 7);
        if (hasCalendar && config.min && initial < config.min.slice(0, 7))
            initial = config.min.slice(0, 7);
        if (hasCalendar && config.max && initial > config.max.slice(0, 7))
            initial = config.max.slice(0, 7);
        return initial;
    });
    const [manual, setManual] = useState(false);
    const presets = (config.presets ?? temporalPresets(config.type)).filter((p) => !validateTemporal(config, p.value));
    const commit = (next) => {
        onChange(next);
        setEdge('from');
        const start = typeof next === 'string' ? next : next?.from;
        if (start && hasCalendar)
            setMonth(start.slice(0, 7));
    };
    const setPart = (part, next) => onChange(range ? { from: part === 'from' ? next : from, to: part === 'to' ? next : to } : next || null);
    const dayOnly = (text) => text.slice(0, 10);
    const pickDay = (day) => {
        if (!range) {
            onChange(type === 'datetime-local' ? `${day}T${from.split('T')[1] || '09:00'}` : day);
            return;
        }
        const next = chooseRangeDate({ from: dayOnly(from), to: dayOnly(to) }, day, edge);
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
        });
        setEdge(next.edge);
    };
    const nice = (text) => {
        if (!text)
            return 'Choose';
        if (!hasCalendar)
            return text;
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(parseCalendarDate(text));
    };
    const nextMonth = () => {
        const d = parseCalendarDate(`${month}-01`);
        d.setMonth(d.getMonth() + 1);
        return calendarDate(d).slice(0, 7);
    };
    const shiftSecond = (next) => {
        const d = parseCalendarDate(`${next}-01`);
        d.setMonth(d.getMonth() - 1);
        setMonth(calendarDate(d).slice(0, 7));
    };
    const setTime = (part, time) => {
        const original = part === 'from' ? from : to;
        setPart(part, type === 'datetime-local' ? `${dayOnly(original) || calendarDate(new Date())}T${time}` : time);
    };
    const field = (part) => (_jsx(LabTextField, { type: type, hint: part === 'date' ? 'Exact value' : part === 'from' ? 'Exact start' : 'Exact end', value: part === 'to' ? to : from, min: config.min, max: config.max, step: config.step, onInput: (event) => setPart(part === 'to' ? 'to' : 'from', event.currentTarget.value) }, part));
    return (_jsxs("div", { className: "lab-temporal-editor", "data-calendar": hasCalendar, children: [range ? (_jsxs(_Fragment, { children: [_jsx(LabRawInput, { type: "hidden", hidden: true, name: "from", value: from }), _jsx(LabRawInput, { type: "hidden", hidden: true, name: "to", value: to })] })) : (_jsx(LabRawInput, { type: "hidden", hidden: true, name: "date", value: from })), _jsxs("div", { className: "lab-temporal-selection-layout", children: [!!presets.length && (_jsx("div", { className: "lab-temporal-presets-mobile", children: _jsx(LabSelect, { hint: "Quick selection", value: presets.find((p) => JSON.stringify(p.value) === JSON.stringify(value))?.label ||
                                null, placeholder: "Custom selection", onValueChange: (label) => {
                                const preset = presets.find((p) => p.label === label);
                                if (preset)
                                    commit(preset.value);
                            }, children: presets.map((p) => (_jsx(LabOption, { value: p.label, children: p.label }, p.label))) }) })), !!presets.length && (_jsx("div", { className: "lab-temporal-presets", role: "group", "aria-label": "Quick presets", children: presets.map((p) => (_jsx(LabButton, { variant: "text", controlSize: "compact", "aria-pressed": JSON.stringify(value) === JSON.stringify(p.value), onClick: () => commit(p.value), children: p.label }, p.label))) })), _jsxs("div", { className: "lab-temporal-selection-main", children: [range && (_jsxs("div", { className: "lab-temporal-range-summary", role: "group", "aria-label": "Range endpoints", children: [_jsxs(LabButton, { variant: edge === 'from' ? 'tonal' : 'outlined', controlSize: "compact", "aria-pressed": edge === 'from', onClick: () => setEdge('from'), children: ["From \u00B7 ", nice(from)] }), _jsxs(LabButton, { variant: edge === 'to' ? 'tonal' : 'outlined', controlSize: "compact", "aria-pressed": edge === 'to', onClick: () => setEdge('to'), children: ["To \u00B7 ", nice(to)] })] })), hasCalendar && (_jsxs("div", { className: "lab-calendar-pair", children: [_jsx(LabCalendarMonth, { label: "Start calendar", month: month, onMonthChange: setMonth, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: pickDay }), _jsx("div", { className: "lab-calendar-second", children: _jsx(LabCalendarMonth, { label: "Next calendar", month: nextMonth(), onMonthChange: shiftSecond, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: pickDay }) })] })), hasTime && (_jsxs("div", { className: "lab-temporal-time-row", children: [_jsx(TimeChoices, { label: range ? 'Start time' : 'Time', value: hasCalendar ? from.split('T')[1] || '' : from, step: config.step, onChange: (time) => setTime('from', time) }), range && (_jsx(TimeChoices, { label: "End time", value: hasCalendar ? to.split('T')[1] || '' : to, step: config.step, onChange: (time) => setTime('to', time) }))] })), range && (_jsxs("p", { role: "status", className: "lab-temporal-hint", children: [hasCalendar
                                        ? from && to
                                            ? 'Range selected. Choose another start date to change it.'
                                            : edge === 'to'
                                                ? 'Choose an end date.'
                                                : 'Choose a start date.'
                                        : 'Choose the start and end times.', ' ', config.allowOvernight
                                        ? 'Ranges may continue into the next day.'
                                        : 'Either end can be left open.'] })), _jsx(LabButton, { variant: "text", controlSize: "compact", "aria-expanded": manual, onClick: () => setManual(!manual), children: manual ? 'Hide manual entry' : 'Enter exact values' }), manual && (_jsx("div", { className: "lab-temporal-fields", "data-range": range, children: range ? (_jsxs(_Fragment, { children: [field('from'), field('to')] })) : (field('date')) }))] })] })] }));
}
//# sourceMappingURL=temporal-editor.js.map