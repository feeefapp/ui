'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState, useId } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, ListFilter, Sparkles, Pin, PinOff, SlidersHorizontal, CalendarDays, ToggleLeft, MoreHorizontal, } from 'lucide-react';
import { ToolbarSearch } from './toolbar-search.js';
import { ToolbarGroup } from './toolbar.js';
import { IconButton, Button } from './primitives/button.js';
import { TextField } from './primitives/text-field.js';
import { PopoverSurface } from './primitives/popover-surface.js';
import { useFloatingBoundary } from './menu/boundary.js';
import { MenuSurface } from './menu/menu-surface.js';
import { computeActionsLayout } from './actions/layout.js';
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
/** A toolbar bubble's padding (2px) and border (1px) on both sides, around its controls. */
const BUBBLE_EDGES = 6;
function summary(option, value, locale) {
    if (value == null)
        return 'Any';
    if (option.type === 'custom' && option.formatValue)
        return option.formatValue(value);
    if (isTemporalType(option.type) && typeof value !== 'boolean')
        return temporalSummary(option, value, locale);
    if (typeof value === 'object')
        return `${value.from || 'Any date'} → ${value.to || 'Any date'}`;
    if (option.type === 'enum')
        return option.choices.find((choice) => choice.value === value)?.label || 'Any';
    if (typeof value === 'boolean')
        return value ? 'On' : 'Off';
    return value;
}
/**
 * Filter toolbar: a searchable catalog button, an optional natural-language button, pinned filter
 * chips and trailing actions. Pinning controls shortcuts, clearing controls query values.
 */
export function FilterBar({ label, options, value, onChange, values: controlledValues, onValuesChange, pinned: controlledPins, onPinnedChange, onNaturalFilter, onBack, trailing, }) {
    const formId = useId();
    const i18n = useI18n();
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
            Array.from(host.current?.querySelectorAll('button') || []).find((button) => button.getAttribute('aria-label') === `Edit ${option.label} filter` &&
                !button.closest('.lab-filter-pins-measure')) ??
                host.current?.querySelector('[aria-haspopup="dialog"]') ??
                null;
        setDraft(read(option));
        setEditError('');
        setEditing(option.id);
        setCatalog(false);
    };
    // Chips that fit the row stay; the rest fold into "…" (the actions bar's split, measured).
    const pinnedOptions = options.filter((option) => pins.includes(option.id));
    const pinsRow = useRef(null);
    const measureRow = useRef(null);
    const moreTrigger = useRef(null);
    const pendingEdit = useRef(null);
    const [foldedKey, setFoldedKey] = useState('');
    const folded = new Set(foldedKey ? foldedKey.split('\n') : []);
    useLayoutEffect(() => {
        const row = pinsRow.current;
        const measure = measureRow.current;
        if (!row || !measure) {
            setFoldedKey('');
            return;
        }
        const fit = () => {
            // Plain controls are measured (no glass); a bubble adds its padding and border around them.
            const bubble = (node) => (node ? node.getBoundingClientRect().width + BUBBLE_EDGES : 0);
            const widths = new Map([...measure.querySelectorAll('[data-filter-chip]')].map((node) => [
                node.dataset.filterChip,
                bubble(node),
            ]));
            const more = bubble(measure.querySelector('[data-filter-more]'));
            const layout = computeActionsLayout({
                actions: pinnedOptions,
                maxWidth: row.clientWidth,
                measure: (option) => widths.get(option.id) ?? 0,
                overflowWidth: more,
                gap: Number.parseFloat(getComputedStyle(row).columnGap) || 0,
            });
            const next = layout.overflow.map((option) => option.id).join('\n');
            setFoldedKey((current) => (current === next ? current : next));
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(row);
        observer.observe(measure);
        return () => observer.disconnect();
    });
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
    const unpinButton = (option, appearance) => option && pins.includes(option.id) ? (_jsxs(Button, { variant: "text", appearance: appearance, controlSize: "regular", "aria-label": `Unpin ${option.label}`, onClick: () => unpin(option), children: [_jsx(PinOff, {}), "Unpin"] })) : null;
    const chip = (option) => (_jsxs(Button, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": `Edit ${option.label} filter`, onClick: (event) => edit(option, event.currentTarget), children: [option.label, _jsx("span", { className: "lab-filter-chip-value", children: summary(option, read(option), i18n.locale) })] }));
    return (_jsxs(GlassScope, { ref: host, className: "lab-filter-bar", role: "group", "aria-label": label, children: [onBack && (_jsx(ToolbarGroup, { label: "Filter navigation", children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": "Back from filtered view", onClick: onBack, children: _jsx(ArrowLeft, { className: "lab-dir-flip" }) }) })), _jsxs(ToolbarGroup, { label: "Filter controls", children: [_jsxs(Popover.Root, { open: catalog, onOpenChange: (open) => {
                            prepare(open);
                            setCatalog(open);
                            if (open)
                                setQuery('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": `Choose filters${active ? ` (${active} active)` : ''}`, children: _jsx(ListFilter, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-catalog", "aria-label": "Available filters", sideOffset: 8, collisionPadding: 12, collisionBoundary: container, align: "start", onOpenAutoFocus: (event) => {
                                            event.preventDefault();
                                            search.current?.focus();
                                        }, onCloseAutoFocus: (event) => {
                                            if (editing)
                                                event.preventDefault();
                                        }, children: _jsx(ScrollArea, { label: "Filter catalog rows", top: _jsx(ToolbarSearch, { label: "Find a filter", value: query, onValueChange: setQuery, inputRef: search, defaultExpanded: true }), bottom: _jsx(Dock, { label: "Filter catalog actions", content: _jsxs("span", { children: [active, " active \u00B7 ", pins.length, " pinned"] }), children: _jsx(Button, { variant: "text", controlSize: "regular", disabled: !active, onClick: clearAll, children: "Clear values" }) }), children: _jsxs("div", { className: "lab-filter-catalog-list", children: [options
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
                                                                                        ? 'On / off'
                                                                                        : option.type === 'enum'
                                                                                            ? 'Choose a value'
                                                                                            : 'Open editor') })] }), _jsx("span", { className: "lab-filter-row-value", children: summary(option, read(option), i18n.locale) })] }), _jsx(IconButton, { variant: "text", controlSize: "regular", "aria-label": `${pins.includes(option.id) ? 'Unpin' : 'Pin'} ${option.label}`, "aria-pressed": pins.includes(option.id), onClick: () => pins.includes(option.id)
                                                                    ? setPins(pins.filter((id) => id !== option.id))
                                                                    : pin(option.id), children: pins.includes(option.id) ? _jsx(PinOff, {}) : _jsx(Pin, {}) })] }, option.id))), !options.some((option) => `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                                                        .toLowerCase()
                                                        .includes(query.toLowerCase())) && _jsx("p", { role: "status", children: "No matching filters." })] }) }) }) }) })] }), onNaturalFilter && (_jsxs(Popover.Root, { open: natural, onOpenChange: (open) => {
                            prepare(open);
                            setNatural(open);
                            setError('');
                        }, children: [_jsx(Popover.Trigger, { asChild: true, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": "Create filter from natural language", children: _jsx(Sparkles, {}) }) }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-natural", "aria-label": "Describe a filter", sideOffset: 8, collisionPadding: 12, collisionBoundary: container, align: "start", onOpenAutoFocus: (event) => {
                                            // Start in the description field, not on the scroll region.
                                            event.preventDefault();
                                            naturalInput.current?.focus();
                                        }, children: _jsx(ScrollArea, { label: "Natural filter description", contentPadding: 12, bottom: _jsx(Dock, { label: "Natural filter actions", children: _jsx(Button, { type: "submit", form: `${formId}-natural`, variant: "filled", controlSize: "regular", loading: busy, disabled: busy || !text.trim(), children: "Apply filters" }) }), children: _jsxs("form", { id: `${formId}-natural`, onSubmit: async (event) => {
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
                                                }, children: [_jsx("strong", { children: "Describe what you want" }), _jsx(TextField, { ref: naturalInput, hint: "Filter description", leadingIcon: _jsx(Sparkles, {}), value: text, onChange: (event) => setText(event.target.value), error: error, supportingText: `Available: ${options
                                                            .filter((option) => !option.type || option.type === 'boolean')
                                                            .map((option) => option.label)
                                                            .join(', ')}.` })] }) }) }) }) })] }))] }), !!pinnedOptions.length && (
            // One bubble per chip: name and value. Clearing and unpinning live in the chip's editor.
            // Chips that don't fit fold into a "…" bubble whose menu opens their editors.
            _jsxs("div", { ref: pinsRow, className: "lab-filter-pins", role: "group", "aria-label": "Pinned filters", children: [pinnedOptions
                        .filter((option) => !folded.has(option.id))
                        .map((option) => (_jsx(ToolbarGroup, { label: `${option.label} filter`, children: chip(option) }, option.id))), folded.size > 0 && (_jsx(ToolbarGroup, { label: "More filters", children: _jsxs(DropdownMenu.Root, { modal: false, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx(IconButton, { ref: moreTrigger, variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": folded.size === 1 ? '1 more filter' : `${folded.size} more filters`, children: _jsx(MoreHorizontal, {}) }) }), _jsx(DropdownMenu.Portal, { container: boundary || undefined, children: _jsx(MenuSurface, { asChild: true, children: _jsx(DropdownMenu.Content, { className: "lab-actions-menu", "aria-label": "More filters", align: "end", sideOffset: 8, collisionPadding: 12, onCloseAutoFocus: (event) => {
                                                // A picked filter's editor is already open: focus stays in it.
                                                if (!pendingEdit.current)
                                                    return;
                                                pendingEdit.current = null;
                                                event.preventDefault();
                                            }, children: pinnedOptions
                                                .filter((option) => folded.has(option.id))
                                                .map((option) => (_jsx(DropdownMenu.Item, { className: "lab-actions-menu__item", "data-lab-corners": true, textValue: option.label, onSelect: () => {
                                                    pendingEdit.current = option;
                                                    edit(option, moreTrigger.current ?? undefined);
                                                }, children: _jsxs("span", { className: "lab-actions-menu__label", children: [option.label, _jsx("span", { className: "lab-filter-menu-value", children: summary(option, read(option), i18n.locale) })] }) }, option.id))) }) }) })] }) })), _jsxs("div", { ref: measureRow, className: "lab-filter-pins-measure", "aria-hidden": "true", inert: true, children: [pinnedOptions.map((option) => (_jsx("span", { "data-filter-chip": option.id, children: chip(option) }, option.id))), _jsx("span", { "data-filter-more": "", children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": "More filters", tabIndex: -1, children: _jsx(MoreHorizontal, {}) }) })] })] })), trailing && _jsx("div", { className: "lab-filter-trailing", children: trailing }), _jsxs(Popover.Root, { open: !!smallSelected, onOpenChange: (open) => {
                    if (!open)
                        setEditing(null);
                }, children: [_jsx(Popover.Anchor, { virtualRef: anchor }), _jsx(Popover.Portal, { container: container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { dir: dir, className: "lab-filter-panel lab-filter-value-menu", "aria-label": smallSelected ? `Edit ${smallSelected.label} filter` : 'Edit filter', align: "start", sideOffset: 8, collisionPadding: 12, collisionBoundary: container, 
                                // Opened from the "…" menu: the closing menu hands focus back to "…" a moment later.
                                onFocusOutside: (event) => {
                                    if (moreTrigger.current?.contains(event.target))
                                        event.preventDefault();
                                }, onOpenAutoFocus: (event) => {
                                    if (smallSelected?.type === 'enum') {
                                        event.preventDefault();
                                        enumSearch.current?.focus();
                                    }
                                }, onCloseAutoFocus: (event) => {
                                    event.preventDefault();
                                    returnFocus.current?.focus({ preventScroll: true });
                                }, children: smallSelected && (_jsx(ScrollArea, { label: `${smallSelected.label} options`, top: smallSelected.type === 'enum' ? (_jsx(ToolbarSearch, { label: `Search ${smallSelected.label.toLowerCase()}`, value: choiceQuery, onValueChange: setChoiceQuery, inputRef: enumSearch, defaultExpanded: true })) : undefined, bottom: _jsxs(Dock, { label: "Filter value actions", children: [unpinButton(smallSelected), _jsx(Button, { variant: "text", controlSize: "regular", onClick: () => {
                                                    change(smallSelected, null);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: "Clear value" }), isTemporalType(smallSelected.type) && (_jsx(Button, { variant: "filled", type: "submit", form: `${formId}-date`, controlSize: "regular", children: "Apply" }))] }), children: smallSelected.type === 'enum' ? (_jsxs("div", { className: "lab-filter-options", role: "group", "aria-label": `${smallSelected.label} choices`, children: [smallSelected.choices
                                                .filter((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase()))
                                                .map((choice) => (_jsxs(Button, { variant: "text", className: "lab-filter-choice", "aria-pressed": read(smallSelected) === choice.value, onClick: () => {
                                                    change(smallSelected, choice.value);
                                                    pin(smallSelected.id);
                                                    setEditing(null);
                                                }, children: [choice.label, read(smallSelected) === choice.value && (_jsx("span", { "aria-hidden": "true", children: "\u2713" }))] }, choice.value))), !smallSelected.choices.some((choice) => choice.label.toLowerCase().includes(choiceQuery.toLowerCase())) && _jsx("p", { role: "status", children: "No matching options." })] })) : !smallSelected.type || smallSelected.type === 'boolean' ? (_jsx("div", { className: "lab-filter-options", children: [true, null].map((next, index) => (_jsx(Button, { variant: "text", "aria-pressed": read(smallSelected) === next, onClick: () => {
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
                                        }, children: [_jsx(TemporalFilterEditor, { config: smallSelected, value: draft, onChange: (next) => {
                                                    setDraft(next);
                                                    setEditError('');
                                                } }), editError && (_jsx("p", { role: "alert", className: "lab-filter-error", children: editError }))] })) : null })) }) }) })] }), dialogSelected && selected && isTemporalType(selected.type) && (_jsx(TemporalDialog, { open: true, label: `Edit ${dialogSelected.label} filter`, close: () => setEditing(null), returnFocusRef: returnFocus, formId: `${formId}-editor`, config: selected, value: draft, onChange: (next) => {
                    setDraft(next);
                    setEditError('');
                }, intro: selected.description, error: editError || undefined, clearLabel: "Clear value", actions: unpinButton(selected, 'toolbar'), onClear: () => {
                    change(selected, null);
                    pin(selected.id);
                    setEditing(null);
                }, applyLabel: "Apply filter", onSubmit: (event) => {
                    event.preventDefault();
                    const config = selected;
                    const next = readTemporalForm(config.type, new FormData(event.currentTarget));
                    const message = validateTemporal(config, next) || selected.validate?.(next);
                    if (message) {
                        setDraft(next);
                        setEditError(message);
                        return;
                    }
                    change(selected, next);
                    pin(selected.id);
                    setEditing(null);
                } })), _jsx(Modal, { returnFocusRef: returnFocus, open: !!dialogSelected && !(selected && isTemporalType(selected.type)), label: dialogSelected ? `Edit ${dialogSelected.label} filter` : 'Edit filter', title: dialogSelected ? `Edit ${dialogSelected.label} filter` : 'Edit filter', onOpenChange: () => setEditing(null), className: "lab-filter-editor-dialog", dock: _jsxs(PresentationDock, { label: "Filter editor actions", children: [unpinButton(dialogSelected), _jsx(Button, { variant: "text", onClick: () => {
                                if (selected) {
                                    change(selected, null);
                                    pin(selected.id);
                                }
                                setEditing(null);
                            }, children: "Clear value" }), _jsx(Button, { variant: "filled", type: "submit", form: `${formId}-editor`, children: "Apply filter" })] }), children: dialogSelected && selected && (_jsxs("form", { id: `${formId}-editor`, className: "lab-filter-editor-form", onSubmit: (event) => {
                        event.preventDefault();
                        const message = selected.validate?.(draft);
                        if (message) {
                            setEditError(message);
                            return;
                        }
                        change(selected, draft);
                        pin(selected.id);
                        setEditing(null);
                    }, children: [_jsx("p", { children: selected.description || 'Set a value, or clear it while keeping this filter pinned.' }), selected.type === 'custom' ? selected.renderEditor(draft, setDraft) : null, editError && _jsx("p", { role: "alert", children: editError })] })) })] }));
}
//# sourceMappingURL=filter-bar.js.map