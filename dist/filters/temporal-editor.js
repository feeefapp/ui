'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import './calendar.css';
import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { LabButton } from '../primitives/button.js';
import { useLabI18n } from '../i18n.js';
import { LabRawInput } from '../primitives/raw-input.js';
import { LabTextField } from '../primitives/text-field.js';
import { LabNumberField } from '../primitives/number-field.js';
import { LabSegmentedControl } from '../primitives/segmented.js';
import { LabCalendarMonth } from './calendar.js';
import { calendarDate, parseCalendarDate, chooseRangeDate } from './calendar-model.js';
import { isTemporalRange, temporalInputType, temporalPresets, validateTemporal, } from './temporal.js';
const two = (n) => String(n).padStart(2, '0');
/** Hour : minute (: second) as number fields: drag to scrub, type, or use the arrow keys. */
function TimeInput({ label, value, onChange, step = 60, }) {
    const [h = 9, m = 0, s = 0] = (value || '09:00').split(':').map(Number);
    const seconds = step < 60;
    const minuteStep = seconds ? 1 : Math.max(1, Math.min(30, Math.round(step / 60)));
    const set = (hour, minute, second) => onChange(`${two(hour)}:${two(minute)}${seconds ? `:${two(second)}` : ''}`);
    return (_jsxs("div", { className: "lab-time-input", role: "group", "aria-label": label, children: [_jsx("span", { className: "lab-time-input-label", "aria-hidden": "true", children: label }), _jsxs("div", { className: "lab-time-input-fields", dir: "ltr", children: [_jsx(LabNumberField, { label: "Hour", controlSize: "compact", min: 0, max: 23, value: h, steppers: false, format: two, onValueChange: (hour) => set(hour, m, s) }), _jsx("span", { className: "lab-time-input-colon", "aria-hidden": "true", children: ":" }), _jsx(LabNumberField, { label: "Minute", controlSize: "compact", min: 0, max: 60 - minuteStep, step: minuteStep, value: m, steppers: false, format: two, onValueChange: (minute) => set(h, minute, s) }), seconds && (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-time-input-colon", "aria-hidden": "true", children: ":" }), _jsx(LabNumberField, { label: "Second", controlSize: "compact", min: 0, max: 59, step: Math.max(1, step), value: s, steppers: false, format: two, onValueChange: (second) => set(h, m, second) })] }))] })] }));
}
/**
 * The picker's state, for hosts that place its parts apart: a dialog floats `LabTemporalPresets`
 * and `LabTemporalEdges` in its top bar and scrolls `LabTemporalBody`.
 */
export function useLabTemporalEditor({ config, value, onChange, onPick, locale: localeProp, resetKey, }) {
    const i18n = useLabI18n();
    const locale = localeProp ?? i18n.locale;
    const type = temporalInputType(config.type), range = isTemporalRange(config.type), hasCalendar = type !== 'time', hasTime = type !== 'date';
    const from = typeof value === 'string' ? value : value?.from || '', to = value && typeof value === 'object' ? value.to : '';
    const initialEdge = () => (range && from && !to ? 'to' : 'from');
    const initialMonth = () => {
        let month = (hasCalendar && from ? from : calendarDate(new Date())).slice(0, 7);
        if (hasCalendar && config.min && month < config.min.slice(0, 7))
            month = config.min.slice(0, 7);
        if (hasCalendar && config.max && month > config.max.slice(0, 7))
            month = config.max.slice(0, 7);
        return month;
    };
    const [edge, setEdge] = useState(initialEdge);
    const [month, setMonth] = useState(initialMonth);
    const [manual, setManual] = useState(false);
    const [seenKey, setSeenKey] = useState(resetKey);
    if (seenKey !== resetKey) {
        setSeenKey(resetKey);
        setEdge(initialEdge());
        setMonth(initialMonth());
        setManual(false);
    }
    const presets = (config.presets ?? temporalPresets(config.type)).filter((p) => !validateTemporal(config, p.value));
    const dayOnly = (text) => text.slice(0, 10);
    const choosePreset = (next) => {
        onChange(next);
        setEdge('from');
        const start = typeof next === 'string' ? next : next?.from;
        if (start && hasCalendar)
            setMonth(start.slice(0, 7));
        onPick?.(next);
    };
    const setPart = (part, next) => onChange(range ? { from: part === 'from' ? next : from, to: part === 'to' ? next : to } : next || null);
    const pickDay = (day) => {
        if (!range) {
            const next = type === 'datetime-local' ? `${day}T${from.split('T')[1] || '09:00'}` : day;
            onChange(next);
            if (type === 'date')
                onPick?.(next);
            return;
        }
        const next = chooseRangeDate({ from: dayOnly(from), to: dayOnly(to) }, day, edge);
        const withTime = (d, existing, fallback) => d && type === 'datetime-local' ? `${d}T${existing.split('T')[1] || fallback}` : d;
        onChange({ from: withTime(next.value.from, from, '00:00'), to: withTime(next.value.to, to, '23:59') });
        setEdge(next.edge);
    };
    const endpointText = (text) => text && hasCalendar
        ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parseCalendarDate(text))
        : text || 'Any';
    const setTime = (part, time) => {
        const original = part === 'from' ? from : to;
        setPart(part, type === 'datetime-local' ? `${dayOnly(original) || calendarDate(new Date())}T${time}` : time);
    };
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
        presetActive: (p) => JSON.stringify(value) === JSON.stringify(p.value),
    };
}
/**
 * Quick choices. `list` is a wrapping block of chips (popovers, menus); `bar` is one scrolling row
 * of toolbar buttons, meant to sit inside a glass group (dialog top bars).
 */
export function LabTemporalPresets({ editor, layout = 'list', }) {
    if (!editor.presets.length)
        return null;
    return (_jsx("div", { className: "lab-temporal-presets", "data-layout": layout, role: "group", "aria-label": "Quick choices", children: editor.presets.map((p) => (_jsx(LabButton, { variant: editor.presetActive(p) ? 'tonal' : 'text', appearance: layout === 'bar' ? 'toolbar' : 'default', controlSize: "compact", "aria-pressed": editor.presetActive(p), onClick: () => editor.choosePreset(p.value), children: p.label }, p.label))) }));
}
/** The start/end switch of a date range; each side shows its chosen day. Nothing for other types. */
export function LabTemporalEdges({ editor, appearance, }) {
    if (!editor.range || !editor.hasCalendar)
        return null;
    return (_jsx(LabSegmentedControl, { label: "Which end you are choosing", className: "lab-temporal-edges", appearance: appearance, value: editor.edge, onChange: editor.setEdge, options: [
            { value: 'from', label: `Start · ${editor.endpointText(editor.dayOnly(editor.from))}` },
            { value: 'to', label: `End · ${editor.endpointText(editor.dayOnly(editor.to))}` },
        ] }));
}
/**
 * Calendars, times and typed entry, plus the hidden `date` or `from`/`to` inputs that
 * `readTemporalForm` reads back.
 */
export function LabTemporalBody({ editor, footer }) {
    const { config, range, hasCalendar, hasTime, type, from, to, month, setMonth, locale, dayOnly } = editor;
    const nextMonth = () => {
        const d = parseCalendarDate(`${month}-01`);
        d.setMonth(d.getMonth() + 1);
        return calendarDate(d).slice(0, 7);
    };
    const shiftFromSecond = (next) => {
        const d = parseCalendarDate(`${next}-01`);
        d.setMonth(d.getMonth() - 1);
        setMonth(calendarDate(d).slice(0, 7));
    };
    return (_jsxs("div", { className: "lab-temporal-main", "data-range": range, children: [range ? (_jsxs(_Fragment, { children: [_jsx(LabRawInput, { type: "hidden", hidden: true, name: "from", value: from }), _jsx(LabRawInput, { type: "hidden", hidden: true, name: "to", value: to })] })) : (_jsx(LabRawInput, { type: "hidden", hidden: true, name: "date", value: from })), hasCalendar && (_jsxs("div", { className: "lab-calendar-pair", "data-pair": range || undefined, children: [_jsx(LabCalendarMonth, { label: range ? 'First month' : 'Calendar', month: month, onMonthChange: setMonth, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: editor.pickDay, locale: locale, navigation: "both" }), range && (_jsx("div", { className: "lab-calendar-second", children: _jsx(LabCalendarMonth, { label: "Second month", month: nextMonth(), onMonthChange: shiftFromSecond, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: editor.pickDay, locale: locale, navigation: "next" }) }))] })), hasTime && (_jsxs("div", { className: "lab-temporal-times", children: [_jsx(TimeInput, { label: range ? 'Start time' : 'Time', value: hasCalendar ? from.split('T')[1] || '' : from, step: config.step, onChange: (time) => editor.setTime('from', time) }), range && (_jsx(TimeInput, { label: "End time", value: hasCalendar ? to.split('T')[1] || '' : to, step: config.step, onChange: (time) => editor.setTime('to', time) })), range && config.allowOvernight && (_jsx("p", { className: "lab-temporal-note", children: "An end time before the start time continues into the next day." }))] })), _jsxs("div", { className: "lab-temporal-footer", children: [_jsxs(LabButton, { variant: "text", controlSize: "compact", className: "lab-temporal-manual-toggle", "aria-expanded": editor.manual, onClick: () => editor.setManual(!editor.manual), children: [_jsx(Keyboard, { size: 16 }), editor.manual
                                ? 'Hide typed entry'
                                : range
                                    ? hasCalendar
                                        ? 'Type the dates'
                                        : 'Type the times'
                                    : hasCalendar
                                        ? 'Type a date'
                                        : 'Type a time'] }), footer] }), editor.manual && (_jsx("div", { className: "lab-temporal-fields", "data-range": range, children: (range ? ['from', 'to'] : ['date']).map((part) => (_jsx(LabTextField, { type: type, controlSize: "compact", hint: part === 'date' ? (hasCalendar ? 'Date' : 'Time') : part === 'from' ? 'Start' : 'End', value: part === 'to' ? to : from, min: config.min, max: config.max, step: config.step, onInput: (event) => editor.setPart(part === 'to' ? 'to' : 'from', event.currentTarget.value) }, part))) }))] }));
}
/**
 * The picker body without a trigger, all parts in one column: presets as chips, a start/end switch
 * for ranges, one or two calendars, number-field times and optional typed entry. Controlled; place
 * it in your own form or popover. In a dialog, use `LabTemporalDialog`, which floats the presets
 * and the switch in its top bar. It writes hidden `date` (single) or `from`/`to` (range) inputs
 * that `readTemporalForm` reads back.
 */
export function LabTemporalFilterEditor({ footer, ...options }) {
    const editor = useLabTemporalEditor(options);
    return (_jsx("div", { className: "lab-temporal-editor", "data-calendar": editor.hasCalendar, "data-range": editor.range, children: _jsxs("div", { className: "lab-temporal-layout", children: [_jsx(LabTemporalPresets, { editor: editor }), _jsx(LabTemporalEdges, { editor: editor }), _jsx(LabTemporalBody, { editor: editor, footer: footer })] }) }));
}
//# sourceMappingURL=temporal-editor.js.map