'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import './calendar.css';
import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '../primitives/button.js';
import { useI18n } from '../i18n.js';
import { RawInput } from '../primitives/raw-input.js';
import { TextField } from '../primitives/text-field.js';
import { NumberField } from '../primitives/number-field.js';
import { SegmentedControl } from '../primitives/segmented.js';
import { CalendarMonth } from './calendar.js';
import { calendarDate, parseCalendarDate, chooseRangeDate } from './calendar-model.js';
import { isTemporalRange, temporalInputType, temporalPresets, validateTemporal, } from './temporal.js';
const two = (n) => String(n).padStart(2, '0');
/** Hour : minute (: second) as number fields: drag to scrub, type, or use the arrow keys. */
function TimeInput({ label, value, onChange, step = 60, }) {
    const { t } = useI18n();
    const [h = 9, m = 0, s = 0] = (value || '09:00').split(':').map(Number);
    const seconds = step < 60;
    const minuteStep = seconds ? 1 : Math.max(1, Math.min(30, Math.round(step / 60)));
    const set = (hour, minute, second) => onChange(`${two(hour)}:${two(minute)}${seconds ? `:${two(second)}` : ''}`);
    return (_jsxs("div", { className: "lab-time-input", role: "group", "aria-label": label, children: [_jsx("span", { className: "lab-time-input-label", "aria-hidden": "true", children: label }), _jsxs("div", { className: "lab-time-input-fields", dir: "ltr", children: [_jsx(NumberField, { label: t('lab.temporal.hour'), controlSize: "small", min: 0, max: 23, value: h, steppers: false, format: two, onValueChange: (hour) => set(hour, m, s) }), _jsx("span", { className: "lab-time-input-colon", "aria-hidden": "true", children: ":" }), _jsx(NumberField, { label: t('lab.temporal.minute'), controlSize: "small", min: 0, max: 60 - minuteStep, step: minuteStep, value: m, steppers: false, format: two, onValueChange: (minute) => set(h, minute, s) }), seconds && (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-time-input-colon", "aria-hidden": "true", children: ":" }), _jsx(NumberField, { label: t('lab.temporal.second'), controlSize: "small", min: 0, max: 59, step: Math.max(1, step), value: s, steppers: false, format: two, onValueChange: (second) => set(h, m, second) })] }))] })] }));
}
/**
 * The picker's state, for hosts that place its parts apart: a dialog floats `TemporalPresets`
 * and `TemporalEdges` in its top bar and scrolls `TemporalBody`.
 */
export function useTemporalEditor({ config, value, onChange, onPick, locale: localeProp, resetKey, }) {
    const i18n = useI18n();
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
    const t = i18n.t;
    const presets = (config.presets ?? temporalPresets(config.type, undefined, t)).filter((p) => !validateTemporal(config, p.value, t));
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
        : text || t('lab.filter.any');
    const setTime = (part, time) => {
        const original = part === 'from' ? from : to;
        setPart(part, type === 'datetime-local' ? `${dayOnly(original) || calendarDate(new Date())}T${time}` : time);
    };
    return {
        config,
        value,
        locale,
        t,
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
export function TemporalPresets({ editor, layout = 'list', }) {
    if (!editor.presets.length)
        return null;
    return (_jsx("div", { className: "lab-temporal-presets", "data-layout": layout, role: "group", "aria-label": editor.t('lab.temporal.presets'), children: editor.presets.map((p) => (_jsx(Button, { variant: editor.presetActive(p) ? 'tonal' : 'text', appearance: layout === 'bar' ? 'toolbar' : 'default', controlSize: "small", "aria-pressed": editor.presetActive(p), onClick: () => editor.choosePreset(p.value), children: p.label }, p.label))) }));
}
/**
 * The start/end switch of a date range; each side shows its chosen day. Nothing for other types.
 * It paints no surface: the editor sets it on a box, the dialog in its top bar's glass.
 */
export function TemporalEdges({ editor }) {
    if (!editor.range || !editor.hasCalendar)
        return null;
    return (_jsx(SegmentedControl, { label: editor.t('lab.temporal.whichEnd'), className: "lab-temporal-edges", equalWidth: true, value: editor.edge, onChange: editor.setEdge, options: [
            { value: 'from', label: editor.t('lab.temporal.startAt', { value: editor.endpointText(editor.dayOnly(editor.from)) }) },
            { value: 'to', label: editor.t('lab.temporal.endAt', { value: editor.endpointText(editor.dayOnly(editor.to)) }) },
        ] }));
}
/**
 * Calendars, times and typed entry, plus the hidden `date` or `from`/`to` inputs that
 * `readTemporalForm` reads back.
 */
export function TemporalBody({ editor, footer }) {
    const { config, range, hasCalendar, hasTime, type, from, to, month, setMonth, locale, dayOnly, t } = editor;
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
    return (_jsxs("div", { className: "lab-temporal-main", "data-range": range, children: [range ? (_jsxs(_Fragment, { children: [_jsx(RawInput, { type: "hidden", hidden: true, name: "from", value: from }), _jsx(RawInput, { type: "hidden", hidden: true, name: "to", value: to })] })) : (_jsx(RawInput, { type: "hidden", hidden: true, name: "date", value: from })), hasCalendar && (_jsxs("div", { className: "lab-calendar-pair", "data-pair": range || undefined, children: [_jsx(CalendarMonth, { label: range ? t('lab.temporal.firstMonth') : t('lab.temporal.calendar'), month: month, onMonthChange: setMonth, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: editor.pickDay, locale: locale, navigation: "both" }), range && (_jsx("div", { className: "lab-calendar-second", children: _jsx(CalendarMonth, { label: t('lab.temporal.secondMonth'), month: nextMonth(), onMonthChange: shiftFromSecond, from: dayOnly(from), to: dayOnly(to), min: config.min, max: config.max, onSelect: editor.pickDay, locale: locale, navigation: "next" }) }))] })), hasTime && (_jsxs("div", { className: "lab-temporal-times", children: [_jsx(TimeInput, { label: range ? t('lab.temporal.startTime') : t('lab.temporal.time'), value: hasCalendar ? from.split('T')[1] || '' : from, step: config.step, onChange: (time) => editor.setTime('from', time) }), range && (_jsx(TimeInput, { label: t('lab.temporal.endTime'), value: hasCalendar ? to.split('T')[1] || '' : to, step: config.step, onChange: (time) => editor.setTime('to', time) })), range && config.allowOvernight && (_jsx("p", { className: "lab-temporal-note", children: t('lab.temporal.overnight') }))] })), _jsxs("div", { className: "lab-temporal-footer", children: [_jsxs(Button, { variant: "text", controlSize: "small", className: "lab-temporal-manual-toggle", "aria-expanded": editor.manual, onClick: () => editor.setManual(!editor.manual), children: [_jsx(Keyboard, { size: 16 }), editor.manual
                                ? t('lab.temporal.hideTyped')
                                : range
                                    ? hasCalendar
                                        ? t('lab.temporal.typeDates')
                                        : t('lab.temporal.typeTimes')
                                    : hasCalendar
                                        ? t('lab.temporal.typeDate')
                                        : t('lab.temporal.typeTime')] }), footer] }), editor.manual && (_jsx("div", { className: "lab-temporal-fields", "data-range": range, children: (range ? ['from', 'to'] : ['date']).map((part) => (_jsx(TextField, { type: type, controlSize: "small", hint: part === 'date'
                        ? t(hasCalendar ? 'lab.temporal.date' : 'lab.temporal.time')
                        : t(part === 'from' ? 'lab.temporal.start' : 'lab.temporal.end'), value: part === 'to' ? to : from, min: config.min, max: config.max, step: config.step, onInput: (event) => editor.setPart(part === 'to' ? 'to' : 'from', event.currentTarget.value) }, part))) }))] }));
}
/**
 * The picker body without a trigger, all parts in one column: presets as chips, a start/end switch
 * for ranges, one or two calendars, number-field times and optional typed entry. Controlled; place
 * it in your own form or popover. In a dialog, use `TemporalDialog`, which floats the presets
 * and the switch in its top bar. It writes hidden `date` (single) or `from`/`to` (range) inputs
 * that `readTemporalForm` reads back.
 */
export function TemporalFilterEditor({ footer, ...options }) {
    const editor = useTemporalEditor(options);
    return (_jsx("div", { className: "lab-temporal-editor", "data-calendar": editor.hasCalendar, "data-range": editor.range, children: _jsxs("div", { className: "lab-temporal-layout", children: [_jsx(TemporalPresets, { editor: editor }), _jsx(TemporalEdges, { editor: editor }), _jsx(TemporalBody, { editor: editor, footer: footer })] }) }));
}
//# sourceMappingURL=temporal-editor.js.map