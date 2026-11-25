'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useId } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowLeft, ListFilter, Sparkles, Pin, PinOff, SlidersHorizontal, CalendarDays, ToggleLeft, } from 'lucide-react';
import { ToolbarSearch } from './toolbar-search.js';
import { ToolbarGroup } from './toolbar.js';
import { IconButton, Button } from './primitives/button.js';
import { TextField } from './primitives/text-field.js';
import { PopoverSurface } from './primitives/popover-surface.js';
import { useFloatingBoundary } from './menu/boundary.js';
import { Modal, PresentationDock } from './presentation/index.js';
import { ScrollArea } from './scroll/index.js';
import { Dock } from './dock/index.js';
import { TemporalFilterEditor } from './filters/temporal-editor.js';
import { TemporalDialog } from './filters/temporal-dialog.js';
import { temporalSummary } from './filters/temporal-format.js';
import { useI18n } from './i18n.js';
import { isTemporalType, isTemporalRange, validateTemporal, readTemporalForm, } from './filters/temporal.js';
import './filter-bar.css';
import { GlassScope } from './glass/container.js';
function summary(option, value, locale, t) {
    if (value == null)
        return t('lab.filter.any');
    if (option.type === 'custom' && option.formatValue)
        return option.formatValue(value);
    if (isTemporalType(option.type) && typeof value !== 'boolean')
        return temporalSummary(option, value, locale, undefined, t);
    if (typeof value === 'object')
        return `${value.from || t('lab.filter.anyDate')} → ${value.to || t('lab.filter.anyDate')}`;
    if (option.type === 'enum')
        return option.choices.find((choice) => choice.value === value)?.label || t('lab.filter.any');
    if (typeof value === 'boolean')
        return value ? t('lab.filter.on') : t('lab.filter.off');
    return value;
}
/**
 * Filter toolbar: a searchable catalog button, an optional natural-language button, pinned filter
 * chips and trailing actions. Pinning controls shortcuts, clearing controls query values.
 */
export function FilterBar({ label, options, value, onChange, values: controlledValues, onValuesChange, pinned: controlledPins, onPinnedChange, onNaturalFilter, naturalSuggestions, onBack, trailing, }) {
    const formId = useId();
    const i18n = useI18n();
    const t = i18n.t;
    const host = useRef(null), search = useRef(null);
    const enumSearch = useRef(null);
    const naturalInput = useRef(null);
    const anchor = useRef({
        getBoundingClientRect: () => new DOMRect(),
    });
    const [choiceQuery, setChoiceQuery] = useState('');
    const returnFocus = useRef(null);
    const [localValues, setLocalValues] = useState({});
    const [localPins, setLocalPins] = useState([]);
    const values = controlledValues ?? localValues, pins = controlledPins ?? localPins;
    const [container, setContainer] = useState();
    const boundary = useFloatingBoundary();
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
            activeElement.hasAttribute('data-filter-unpin'))
            host.current
                ?.querySelector('[aria-haspopup="dialog"]')
                ?.focus({ preventScroll: true });
        setLocalPins(next);
        onPinnedChange?.(next);
    };
    const pin = (id) => setPins([...new Set([...pins, id])]);
    const prepare = (open) => {
        if (open) {
            setContainer(host.current?.closest('dialog') || boundary || undefined);
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
            Array.from(host.current?.querySelectorAll('button') || []).find((button) => button.getAttribute('data-filter-edit') === option.id &&
                !button.closest('.lab-filter-pins-measure')) ??
                host.current?.querySelector('[aria-haspopup="dialog"]') ??
                null;
        setDraft(read(option));
        setEditError('');
        setEditing(option.id);
        setCatalog(false);
    };
    // Pinned chips sit in one row that scrolls sideways when they don't fit.
    const pinnedOptions = options.filter((option) => pins.includes(option.id));
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
    const unpin = (option) => {
        // Its chip goes away: the editor hands focus to the catalog button instead.
        returnFocus.current = host.current?.querySelector('[aria-haspopup="dialog"]') ?? null;
        setPins(pins.filter((id) => id !== option.id));
        setEditing(null);
    };
    const unpinButton = (option, appearance) => option && pins.includes(option.id) ? (_jsxs(Button, { variant: "text", appearance: appearance, controlSize: "regular", "aria-label": t('lab.filter.unpinNamed', { name: option.label }), "data-filter-unpin": "", onClick: () => unpin(option), children: [_jsx(PinOff, {}), t('lab.filter.unpin')] })) : null;
    // One short text per chip: the value when set ("Last 7 days"), the filter's name when not
    // ("Status"). On/off filters always show their name; set chips are tinted. The full
    // "name: value" stays in the accessible name and the tooltip.
    const chip = (option) => {
        const current = read(option);
        const set = current != null;
        const text = set && option.type && option.type !== 'boolean' ? summary(option, current, i18n.locale, t) : option.label;
        const full = set ? `${option.label}: ${summary(option, current, i18n.locale, t)}` : option.label;
        return (_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": t('lab.filter.edit', { name: option.label }), "aria-description": set ? full : undefined, title: full, "data-filter-edit": option.id, "data-filter-set": set || undefined, onClick: (event) => edit(option, event.currentTarget), children: _jsx("span", { className: "lab-filter-chip-value", dir: "auto", children: text }) }));
    };
    return (_jsxs(GlassScope, { ref: host, className: "lab-filter-bar", role: "group", "aria-label": label, children: [onBack && (_jsx(ToolbarGroup, { label: t('lab.filter.navigation'), children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": t('lab.filter.back'), onClick: onBack, children: _jsx(ArrowLeft, { className: "lab-dir-flip" }) }) })), _jsxs(ToolbarGroup, { label: t('lab.filter.controls'), children: [_jsxs(Popover.Root, { open: catalog, onOpenChange: (open) => {
                            prepare(open);
                            setCatalog(open);
                            if (open)
                                setQuery('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": active ? t('lab.filter.chooseActive', { count: active }) : t('lab.filter.choose'), children: _jsx(ListFilter, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-catalog", "aria-label": t('lab.filter.available'), sideOffset: 8, collisionPadding: 12, collisionBoundary: container, align: "start", onOpenAutoFocus: (event) => {
                                            event.preventDefault();
                                            search.current?.focus();
                                        }, onCloseAutoFocus: (event) => {
                                            if (editing)
                                                event.preventDefault();
                                        }, children: _jsx(ScrollArea, { label: t('lab.filter.catalogRows'), top: _jsx(ToolbarSearch, { label: t('lab.filter.find'), value: query, onValueChange: setQuery, inputRef: search, defaultExpanded: true }), bottom: _jsx(Dock, { label: t('lab.filter.catalogActions'), content: _jsx("span", { children: t('lab.filter.catalogStatus', { active, pinned: pins.length }) }), children: _jsx(Button, { variant: "text", controlSize: "regular", disabled: !active, onClick: clearAll, children: t('lab.filter.clearValues') }) }), children: _jsxs("div", { className: "lab-filter-catalog-list", children: [options
                                                        .filter((option) => `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                                                        .toLowerCase()
                                                        .includes(query.toLowerCase()))
                                                        .map((option) => (_jsxs("div", { className: "lab-filter-row", "data-active": read(option) != null, children: [_jsxs(Button, { variant: "text", className: "lab-filter-row-main", onClick: () => {
                                                                    if (!option.type || option.type === 'boolean') {
                                                                        change(option, read(option) == null ? true : null);
                                                                        pin(option.id);
                                                                    }
                                                                    else
                                                                        edit(option);
                                                                }, children: [option.icon ??
                                                                        (option.type === 'enum' ? (_jsx(SlidersHorizontal, {})) : option.type?.startsWith('date') ? (_jsx(CalendarDays, {})) : (_jsx(ToggleLeft, {}))), _jsxs("span", { children: [_jsx("strong", { children: option.label }), _jsx("small", { children: option.description ||
                                                                                    (!option.type || option.type === 'boolean'
                                                                                        ? t('lab.filter.kindBoolean')
                                                                                        : option.type === 'enum'
                                                                                            ? t('lab.filter.kindEnum')
                                                                                            : t('lab.filter.kindEditor')) })] }), _jsx("span", { className: "lab-filter-row-value", children: summary(option, read(option), i18n.locale, t) })] }), _jsx(IconButton, { variant: "text", controlSize: "regular", "aria-label": t(pins.includes(option.id) ? 'lab.filter.unpinNamed' : 'lab.filter.pinNamed', { name: option.label }), "aria-pressed": pins.includes(option.id), onClick: () => pins.includes(option.id)
                                                                    ? setPins(pins.filter((id) => id !== option.id))
                                                                    : pin(option.id), children: pins.includes(option.id) ? _jsx(PinOff, {}) : _jsx(Pin, {}) })] }, option.id))), !options.some((option) => `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                                                        .toLowerCase()
                                                        .includes(query.toLowerCase())) && _jsx("p", { role: "status", children: t('lab.filter.noFilters') })] }) }) }) }) })] }), onNaturalFilter && (_jsxs(Popover.Root, { open: natural, onOpenChange: (open) => {
                            prepare(open);
                            setNatural(open);
                            setError('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": t('lab.filter.naturalOpen'), children: _jsx(Sparkles, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-natural", "aria-label": t('lab.filter.naturalTitle'), sideOffset: 8, collisionPadding: 12, collisionBoundary: container, align: "start", onOpenAutoFocus: (event) => {
                                            // Start in the description field, not on the scroll region.
                                            event.preventDefault();
                                            naturalInput.current?.focus();
                                        }, children: _jsx(ScrollArea, { label: t('lab.filter.naturalBody'), contentPadding: 12, bottom: _jsx(Dock, { label: t('lab.filter.naturalActions'), children: _jsx(Button, { type: "submit", form: `${formId}-natural`, variant: "filled", controlSize: "regular", loading: busy, disabled: busy || !text.trim(), children: t('lab.filter.applyFilters') }) }), children: _jsxs("form", { id: `${formId}-natural`, onSubmit: async (event) => {
                                                    event.preventDefault();
                                                    if (busy || !text.trim())
                                                        return;
                                                    setBusy(true);
                                                    setError('');
                                                    try {
                                                        const ids = await onNaturalFilter(text.trim());
                                                        if (ids.some((id) => !options.some((option) => option.id === id && (!option.type || option.type === 'boolean'))))
                                                            throw new Error(t('lab.filter.naturalUnsupported'));
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
                                                            : t('lab.filter.naturalFailed'));
                                                    }
                                                    finally {
                                                        setBusy(false);
                                                    }
                                                }, children: [_jsx("strong", { children: t('lab.filter.naturalPrompt') }), _jsx(TextField, { ref: naturalInput, hint: t('lab.filter.naturalHint'), leadingIcon: _jsx(Sparkles, {}), value: text, onChange: (event) => setText(event.target.value), error: error, 
                                                        // Examples say more than the list of switches, so they replace it.
                                                        supportingText: naturalSuggestions?.length
                                                            ? undefined
                                                            : t('lab.filter.naturalAvailable', {
                                                                names: options
                                                                    .filter((option) => !option.type || option.type === 'boolean')
                                                                    .map((option) => option.label)
                                                                    .join(', '),
                                                            }) }), naturalSuggestions?.length ? (_jsx("div", { className: "lab-filter-suggestions", role: "group", "aria-label": t('lab.filter.naturalSuggestions'), children: naturalSuggestions.map((suggestion) => (_jsx(Button, { type: "button", variant: "tonal", controlSize: "small", onClick: () => {
                                                                setText(suggestion);
                                                                setError('');
                                                                naturalInput.current?.focus();
                                                            }, children: suggestion }, suggestion))) })) : null] }) }) }) }) })] }))] }), !!pinnedOptions.length && (
            // One bubble per chip: its value, or its name while unset. Clearing and unpinning live
            // in the chip's editor. Chips that don't fit scroll sideways (no wrapping, no folding).
            _jsx("div", { className: "lab-filter-pins", role: "group", "aria-label": t('lab.filter.pinned'), children: pinnedOptions.map((option) => (_jsx(ToolbarGroup, { label: t('lab.filter.named', { name: option.label }), children: chip(option) }, option.id))) })), trailing && _jsx("div", { className: "lab-filter-trailing", children: trailing }), _jsxs(Popover.Root, { open: !!smallSelected, onOpenChange: (open) => {
                    if (!open)
                        setEditing(null);
                }, children: [_jsx(Popover.Anchor, { virtualRef: anchor }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-value-menu", "aria-label": smallSelected ? t('lab.filter.edit', { name: smallSelected.label }) : t('lab.filter.editAny'), align: "start", sideOffset: 8, collisionPadding: 12, collisionBoundary: container, onOpenAutoFocus: (event) => {
                                    if (smallSelected?.type === 'enum') {
                                        event.preventDefault();
                                        enumSearch.current?.focus();
                                    }
                                }, onCloseAutoFocus: (event) => {
                                    event.preventDefault();
                                    returnFocus.current?.focus({ preventScroll: true });
                                }, children: smallSelected && (_jsx(ScrollArea, { label: t('lab.filter.options', { name: smallSelected.label }), top: smallSelected.type === 'enum' ? (_jsx(ToolbarSearch, { label: t('lab.filter.search', { name: smallSelected.label }), value: choiceQuery, onValueChange: setChoiceQuery, inputRef: enumSearch, defaultExpanded: true })) : undefined, bottom: _jsxs(Dock, { label: t('lab.filter.valueActions'), children: [unpinButton(smallSelected), _jsx(Button, { variant: "text", controlSize: "regular", onClick: () => {
                                                    change(smallSelected, null);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: t('lab.filter.clearValue') }), isTemporalType(smallSelected.type) && (_jsx(Button, { variant: "filled", type: "submit", form: `${formId}-date`, controlSize: "regular", children: t('lab.filter.apply') }))] }), children: smallSelected.type === 'enum' ? (_jsxs("div", { className: "lab-filter-options", role: "group", "aria-label": t('lab.filter.choices', { name: smallSelected.label }), children: [smallSelected.choices
                                                .filter((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase()))
                                                .map((choice) => (_jsxs(Button, { variant: "text", className: "lab-filter-choice", "aria-pressed": read(smallSelected) === choice.value, onClick: () => {
                                                    change(smallSelected, choice.value);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: [choice.label, read(smallSelected) === choice.value && (_jsx("span", { "aria-hidden": "true", children: "\u2713" }))] }, choice.value))), !smallSelected.choices.some((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase())) && _jsx("p", { role: "status", children: t('lab.filter.noOptions') })] })) : !smallSelected.type || smallSelected.type === 'boolean' ? (_jsx("div", { className: "lab-filter-options", children: [true, null].map((next, index) => (_jsx(Button, { variant: "text", "aria-pressed": read(smallSelected) === next, onClick: () => {
                                                change(smallSelected, next);
                                                pin(smallSelected.id);
                                                setEditing(null);
                                            }, children: next ? t('lab.filter.on') : t('lab.filter.any') }, index))) })) : isTemporalType(smallSelected.type) ? (_jsxs("form", { id: `${formId}-date`, onSubmit: (event) => {
                                            event.preventDefault();
                                            const config = smallSelected;
                                            const next = readTemporalForm(config.type, new FormData(event.currentTarget));
                                            const message = validateTemporal(config, next, t) || smallSelected.validate?.(next);
                                            if (message) {
                                                setEditError(message);
                                                return;
                                            }
                                            change(smallSelected, next);
                                            pin(smallSelected.id);
                                            setEditing(null);
                                        }, children: [_jsx(TemporalFilterEditor, { config: smallSelected, value: draft, onChange: (next) => {
                                                    setDraft(next);
                                                    setEditError('');
                                                } }), editError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: editError }))] })) : null })) }) }) })] }), dialogSelected && selected && isTemporalType(selected.type) && (_jsx(TemporalDialog, { open: true, label: t('lab.filter.edit', { name: dialogSelected.label }), close: () => setEditing(null), returnFocusRef: returnFocus, formId: `${formId}-editor`, config: selected, value: draft, onChange: (next) => {
                    setDraft(next);
                    setEditError('');
                }, intro: selected.description, error: editError || undefined, clearLabel: t('lab.filter.clearValue'), actions: unpinButton(selected, 'toolbar'), onClear: () => {
                    change(selected, null);
                    pin(selected.id);
                    setEditing(null);
                }, applyLabel: t('lab.filter.applyFilter'), onSubmit: (event) => {
                    event.preventDefault();
                    const config = selected;
                    const next = readTemporalForm(config.type, new FormData(event.currentTarget));
                    const message = validateTemporal(config, next, t) || selected.validate?.(next);
                    if (message) {
                        setDraft(next);
                        setEditError(message);
                        return;
                    }
                    change(selected, next);
                    pin(selected.id);
                    setEditing(null);
                } })), _jsx(Modal, { returnFocusRef: returnFocus, open: !!dialogSelected && !(selected && isTemporalType(selected.type)), label: dialogSelected ? t('lab.filter.edit', { name: dialogSelected.label }) : t('lab.filter.editAny'), title: dialogSelected ? t('lab.filter.edit', { name: dialogSelected.label }) : t('lab.filter.editAny'), onOpenChange: () => setEditing(null), className: "lab-filter-editor-dialog", dock: _jsxs(PresentationDock, { label: t('lab.filter.editorActions'), children: [unpinButton(dialogSelected), _jsx(Button, { variant: "text", onClick: () => {
                                if (selected) {
                                    change(selected, null);
                                    pin(selected.id);
                                }
                                setEditing(null);
                            }, children: t('lab.filter.clearValue') }), _jsx(Button, { variant: "filled", type: "submit", form: `${formId}-editor`, children: t('lab.filter.applyFilter') })] }), children: dialogSelected && selected && (_jsxs("form", { id: `${formId}-editor`, className: "lab-filter-editor-form", onSubmit: (event) => {
                        event.preventDefault();
                        const message = selected.validate?.(draft);
                        if (message) {
                            setEditError(message);
                            return;
                        }
                        change(selected, draft);
                        pin(selected.id);
                        setEditing(null);
                    }, children: [_jsx("p", { children: selected.description || t('lab.filter.editorHint') }), selected.type === 'custom' ? selected.renderEditor(draft, setDraft) : null, editError && _jsx("p", { role: "alert", children: editError })] })) })] }));
}
//# sourceMappingURL=filter-bar.js.map