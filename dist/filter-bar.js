'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useId } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowLeft, ListFilter, Sparkles, Pin, PinOff, Search, SlidersHorizontal, CalendarDays, ToggleLeft, X, } from 'lucide-react';
import { LabToolbarGroup } from './toolbar.js';
import { LabIconButton, LabButton } from './primitives/button.js';
import { LabTextField } from './primitives/text-field.js';
import { LabPopoverSurface } from './primitives/popover-surface.js';
import { LabModal } from './primitives/modal.js';
import { LabScrollArea } from './scroll/index.js';
import { LabDock } from './dock/index.js';
import { LabTemporalFilterEditor } from './filters/temporal-editor.js';
import { isTemporalType, isTemporalRange, validateTemporal, readTemporalForm, } from './filters/temporal.js';
import './filter-bar.css';
function summary(option, value) {
    if (value == null)
        return 'Any';
    if (option.type === 'custom' && option.formatValue)
        return option.formatValue(value);
    if (typeof value === 'object')
        return `${value.from || 'Any date'} → ${value.to || 'Any date'}`;
    if (option.type === 'enum')
        return option.choices.find((choice) => choice.value === value)?.label || 'Any';
    if (typeof value === 'boolean')
        return value ? 'On' : 'Off';
    return value;
}
/** Searchable filter catalog; pinning controls shortcuts, clearing controls query values. */
export function LabFilterBar({ label, options, value, onChange, values: controlledValues, onValuesChange, pinned: controlledPins, onPinnedChange, onNaturalFilter, onBack, trailing, }) {
    const formId = useId();
    const host = useRef(null), search = useRef(null);
    const enumSearch = useRef(null);
    const anchor = useRef({
        getBoundingClientRect: () => new DOMRect(),
    });
    const [choiceQuery, setChoiceQuery] = useState('');
    const returnFocus = useRef(null);
    const [localValues, setLocalValues] = useState({});
    const [localPins, setLocalPins] = useState([]);
    const values = controlledValues ?? localValues, pins = controlledPins ?? localPins;
    const [container, setContainer] = useState();
    const [dir, setDir] = useState('ltr');
    const [catalog, setCatalog] = useState(false), [query, setQuery] = useState('');
    const [editing, setEditing] = useState(null), [draft, setDraft] = useState(null), [editError, setEditError] = useState('');
    const [natural, setNatural] = useState(false), [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const read = (option) => !option.type || option.type === 'boolean'
        ? value.includes(option.id)
            ? true
            : null
        : (values[option.id] ?? null);
    const change = (option, next) => {
        if (!option.type || option.type === 'boolean')
            onChange(next === true ? [...new Set([...value, option.id])] : value.filter((id) => id !== option.id));
        else {
            const normalized = next && typeof next === 'object' && !next.from && !next.to ? null : next;
            const updated = { ...values, [option.id]: normalized };
            setLocalValues(updated);
            onValuesChange?.(updated);
        }
    };
    const setPins = (next) => {
        const activeElement = host.current?.ownerDocument.activeElement;
        if (activeElement instanceof HTMLElement &&
            activeElement.getAttribute('aria-label')?.startsWith('Unpin '))
            host.current
                ?.querySelector('[aria-haspopup="dialog"]')
                ?.focus({ preventScroll: true });
        setLocalPins(next);
        onPinnedChange?.(next);
    };
    const pin = (id) => setPins([...new Set([...pins, id])]);
    const prepare = (open) => {
        if (open) {
            setContainer(host.current?.closest('dialog') || undefined);
            setDir(host.current && getComputedStyle(host.current).direction === 'rtl' ? 'rtl' : 'ltr');
        }
    };
    const edit = (option, target) => {
        prepare(true);
        const chip = target ?? host.current?.querySelector('[aria-haspopup="dialog"]');
        const rect = chip?.getBoundingClientRect() ?? new DOMRect();
        anchor.current = { getBoundingClientRect: () => rect };
        setChoiceQuery('');
        returnFocus.current =
            Array.from(host.current?.querySelectorAll('button') || []).find((button) => button.getAttribute('aria-label') === `Edit ${option.label} filter`) ??
                host.current?.querySelector('[aria-haspopup="dialog"]') ??
                null;
        setDraft(read(option));
        setEditError('');
        setEditing(option.id);
        setCatalog(false);
    };
    const selected = options.find((option) => option.id === editing);
    const dialogSelected = (isTemporalType(selected?.type) &&
        isTemporalRange(selected.type)) ||
        selected?.type === 'custom'
        ? selected
        : undefined;
    const smallSelected = selected && !dialogSelected ? selected : undefined;
    const active = options.filter((option) => read(option) != null).length;
    const clearAll = () => {
        onChange([]);
        const cleared = Object.fromEntries(options
            .filter((option) => option.type && option.type !== 'boolean')
            .map((option) => [option.id, null]));
        setLocalValues(cleared);
        onValuesChange?.(cleared);
    };
    return (_jsxs("div", { ref: host, className: "lab-filter-bar", role: "group", "aria-label": label, children: [onBack && (_jsx(LabToolbarGroup, { label: "Filter navigation", children: _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": "Back from filtered view", onClick: onBack, children: _jsx(ArrowLeft, { className: "lab-dir-flip" }) }) })), _jsxs(LabToolbarGroup, { label: "Filter controls", children: [_jsxs(Popover.Root, { open: catalog, onOpenChange: (open) => {
                            prepare(open);
                            setCatalog(open);
                            if (open)
                                setQuery('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": `Choose filters${active ? ` (${active} active)` : ''}`, children: _jsx(ListFilter, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-catalog", "aria-label": "Available filters", sideOffset: 8, collisionPadding: 12, align: "start", onOpenAutoFocus: (event) => {
                                            event.preventDefault();
                                            search.current?.focus();
                                        }, onCloseAutoFocus: (event) => {
                                            if (editing)
                                                event.preventDefault();
                                        }, children: _jsx(LabScrollArea, { label: "Filter catalog rows", contentPadding: 8, edgeGap: 8, top: _jsx(LabTextField, { ref: search, hint: "Find a filter", leadingIcon: _jsx(Search, {}), value: query, onChange: (event) => setQuery(event.target.value), controlSize: "compact" }), bottom: _jsx(LabDock, { label: "Filter catalog actions", content: _jsxs("span", { children: [active, " active \u00B7 ", pins.length, " pinned"] }), children: _jsx(LabButton, { variant: "text", controlSize: "compact", disabled: !active, onClick: clearAll, children: "Clear values" }) }), children: _jsxs("div", { className: "lab-filter-catalog-list", children: [options
                                                        .filter((option) => `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                                                        .toLowerCase()
                                                        .includes(query.toLowerCase()))
                                                        .map((option) => (_jsxs("div", { className: "lab-filter-row", "data-active": read(option) != null, children: [_jsxs(LabButton, { variant: "text", className: "lab-filter-row-main", onClick: () => {
                                                                    if (!option.type || option.type === 'boolean') {
                                                                        change(option, read(option) == null ? true : null);
                                                                        pin(option.id);
                                                                    }
                                                                    else
                                                                        edit(option);
                                                                }, children: [option.icon ??
                                                                        (option.type === 'enum' ? (_jsx(SlidersHorizontal, {})) : option.type?.startsWith('date') ? (_jsx(CalendarDays, {})) : (_jsx(ToggleLeft, {}))), _jsxs("span", { children: [_jsx("strong", { children: option.label }), _jsx("small", { children: option.description ||
                                                                                    (!option.type || option.type === 'boolean'
                                                                                        ? 'On / off'
                                                                                        : option.type === 'enum'
                                                                                            ? 'Choose a value'
                                                                                            : 'Open editor') })] }), _jsx("span", { className: "lab-filter-row-value", children: summary(option, read(option)) })] }), _jsx(LabIconButton, { variant: "text", controlSize: "compact", "aria-label": `${pins.includes(option.id) ? 'Unpin' : 'Pin'} ${option.label}`, "aria-pressed": pins.includes(option.id), onClick: () => pins.includes(option.id)
                                                                    ? setPins(pins.filter((id) => id !== option.id))
                                                                    : pin(option.id), children: pins.includes(option.id) ? _jsx(PinOff, {}) : _jsx(Pin, {}) })] }, option.id))), !options.some((option) => `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                                                        .toLowerCase()
                                                        .includes(query.toLowerCase())) && _jsx("p", { role: "status", children: "No matching filters." })] }) }) }) }) })] }), onNaturalFilter && (_jsxs(Popover.Root, { open: natural, onOpenChange: (open) => {
                            prepare(open);
                            setNatural(open);
                            setError('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": "Create filter from natural language", children: _jsx(Sparkles, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-natural", "aria-label": "Describe a filter", sideOffset: 8, collisionPadding: 12, align: "start", children: _jsx(LabScrollArea, { label: "Natural filter description", edgeGap: 8, contentPadding: 12, bottom: _jsx(LabDock, { label: "Natural filter actions", children: _jsx(LabButton, { type: "submit", form: `${formId}-natural`, variant: "filled", controlSize: "compact", loading: busy, disabled: busy || !text.trim(), children: "Apply filters" }) }), children: _jsxs("form", { id: `${formId}-natural`, onSubmit: async (event) => {
                                                    event.preventDefault();
                                                    if (busy || !text.trim())
                                                        return;
                                                    setBusy(true);
                                                    setError('');
                                                    try {
                                                        const ids = await onNaturalFilter(text.trim());
                                                        if (ids.some((id) => !options.some((option) => option.id === id && (!option.type || option.type === 'boolean'))))
                                                            throw new Error('Choose a supported on/off filter.');
                                                        if (!ids.length)
                                                            clearAll();
                                                        else
                                                            onChange([...new Set(ids)]);
                                                        setPins([...new Set([...pins, ...ids])]);
                                                        setNatural(false);
                                                    }
                                                    catch (reason) {
                                                        setError(reason instanceof Error
                                                            ? reason.message
                                                            : 'Could not create this filter.');
                                                    }
                                                    finally {
                                                        setBusy(false);
                                                    }
                                                }, children: [_jsx("strong", { children: "Describe what you want" }), _jsx(LabTextField, { hint: "Filter description", leadingIcon: _jsx(Sparkles, {}), value: text, onChange: (event) => setText(event.target.value), error: error, supportingText: `Available: ${options
                                                            .filter((option) => !option.type || option.type === 'boolean')
                                                            .map((option) => option.label)
                                                            .join(', ')}.` })] }) }) }) }) })] }))] }), !!pins.length && (_jsx("div", { className: "lab-filter-pins", role: "group", "aria-label": "Pinned filters", children: options
                    .filter((option) => pins.includes(option.id))
                    .map((option) => (_jsxs(LabToolbarGroup, { label: `${option.label} filter`, children: [_jsxs(LabButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": `Edit ${option.label} filter`, onClick: (event) => edit(option, event.currentTarget), children: [option.label, _jsx("span", { className: "lab-filter-chip-value", children: summary(option, read(option)) })] }), _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": `Clear ${option.label} value`, disabled: read(option) == null, onClick: (event) => {
                                event.currentTarget.parentElement
                                    ?.querySelector('button')
                                    ?.focus({ preventScroll: true });
                                change(option, null);
                            }, children: _jsx(X, { size: 16 }) }), _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": `Unpin ${option.label}`, onClick: () => setPins(pins.filter((id) => id !== option.id)), children: _jsx(PinOff, { size: 16 }) })] }, option.id))) })), trailing && _jsx("div", { className: "lab-filter-trailing", children: trailing }), _jsxs(Popover.Root, { open: !!smallSelected, onOpenChange: (open) => {
                    if (!open)
                        setEditing(null);
                }, children: [_jsx(Popover.Anchor, { virtualRef: anchor }), _jsx(Popover.Portal, { container: container, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-value-menu", "aria-label": smallSelected ? `Edit ${smallSelected.label} filter` : 'Edit filter', align: "start", sideOffset: 8, collisionPadding: 12, onOpenAutoFocus: (event) => {
                                    if (smallSelected?.type === 'enum') {
                                        event.preventDefault();
                                        enumSearch.current?.focus();
                                    }
                                }, onCloseAutoFocus: (event) => {
                                    event.preventDefault();
                                    returnFocus.current?.focus({ preventScroll: true });
                                }, children: smallSelected && (_jsx(LabScrollArea, { label: `${smallSelected.label} options`, edgeGap: 8, contentPadding: 8, top: smallSelected.type === 'enum' ? (_jsx(LabTextField, { ref: enumSearch, hint: `Search ${smallSelected.label.toLowerCase()}`, leadingIcon: _jsx(Search, {}), value: choiceQuery, onChange: (event) => setChoiceQuery(event.target.value), controlSize: "compact" })) : undefined, bottom: _jsxs(LabDock, { label: "Filter value actions", children: [_jsx(LabButton, { variant: "text", controlSize: "compact", onClick: () => {
                                                    change(smallSelected, null);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: "Clear value" }), isTemporalType(smallSelected.type) && (_jsx(LabButton, { variant: "filled", type: "submit", form: `${formId}-date`, controlSize: "compact", children: "Apply" }))] }), children: smallSelected.type === 'enum' ? (_jsxs("div", { className: "lab-filter-options", role: "group", "aria-label": `${smallSelected.label} choices`, children: [smallSelected.choices
                                                .filter((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase()))
                                                .map((choice) => (_jsxs(LabButton, { variant: "text", className: "lab-filter-choice", "aria-pressed": read(smallSelected) === choice.value, onClick: () => {
                                                    change(smallSelected, choice.value);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: [choice.label, read(smallSelected) === choice.value && (_jsx("span", { "aria-hidden": "true", children: "\u2713" }))] }, choice.value))), !smallSelected.choices.some((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase())) && _jsx("p", { role: "status", children: "No matching options." })] })) : !smallSelected.type || smallSelected.type === 'boolean' ? (_jsx("div", { className: "lab-filter-options", children: [true, null].map((next, index) => (_jsx(LabButton, { variant: "text", "aria-pressed": read(smallSelected) === next, onClick: () => {
                                                change(smallSelected, next);
                                                pin(smallSelected.id);
                                                setEditing(null);
                                            }, children: next ? 'On' : 'Any' }, index))) })) : isTemporalType(smallSelected.type) ? (_jsxs("form", { id: `${formId}-date`, onSubmit: (event) => {
                                            event.preventDefault();
                                            const config = smallSelected;
                                            const next = readTemporalForm(config.type, new FormData(event.currentTarget));
                                            const message = validateTemporal(config, next) || smallSelected.validate?.(next);
                                            if (message) {
                                                setEditError(message);
                                                return;
                                            }
                                            change(smallSelected, next);
                                            pin(smallSelected.id);
                                            setEditing(null);
                                        }, children: [_jsx(LabTemporalFilterEditor, { config: smallSelected, value: draft, onChange: (next) => {
                                                    setDraft(next);
                                                    setEditError('');
                                                } }), editError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: editError }))] })) : null })) }) }) })] }), _jsx(LabModal, { returnFocusRef: returnFocus, open: !!dialogSelected, label: dialogSelected ? `Edit ${dialogSelected.label} filter` : 'Edit filter', close: () => setEditing(null), scrollable: true, fitContent: true, className: `lab-filter-editor-dialog ${dialogSelected && isTemporalType(dialogSelected.type) && !dialogSelected.type.startsWith('time') ? 'lab-filter-calendar-dialog' : ''}`, bottom: _jsxs(LabDock, { label: "Filter editor actions", children: [_jsx(LabButton, { variant: "text", onClick: () => {
                                if (selected) {
                                    change(selected, null);
                                    pin(selected.id);
                                }
                                setEditing(null);
                            }, children: "Clear value" }), _jsx(LabButton, { variant: "filled", type: "submit", form: `${formId}-editor`, children: "Apply filter" })] }), children: dialogSelected && selected && (_jsxs("form", { id: `${formId}-editor`, className: "lab-filter-editor-form", onSubmit: (event) => {
                        event.preventDefault();
                        const fields = new FormData(event.currentTarget);
                        const next = isTemporalType(selected.type)
                            ? readTemporalForm(selected.type, fields)
                            : draft;
                        const message = (isTemporalType(selected.type)
                            ? validateTemporal(selected, next)
                            : null) || selected.validate?.(next);
                        if (message) {
                            setDraft(next);
                            setEditError(message);
                            return;
                        }
                        change(selected, next);
                        pin(selected.id);
                        setEditing(null);
                    }, children: [_jsx("p", { children: selected.description || 'Set a value, or clear it while keeping this filter pinned.' }), selected.type === 'custom' ? (selected.renderEditor(draft, setDraft)) : isTemporalType(selected.type) ? (_jsx(LabTemporalFilterEditor, { config: selected, value: draft, onChange: (next) => {
                                setDraft(next);
                                setEditError('');
                            } })) : null, editError && _jsx("p", { role: "alert", children: editError })] })) })] }));
}
//# sourceMappingURL=filter-bar.js.map