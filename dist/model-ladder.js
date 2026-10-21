'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LabToolbarSearch } from './toolbar-search.js';
import { LabPopoverSurface, LabSlider } from './ui.js';
import { LabButton } from './ui.js';
import { LabScrollArea, revealScrollChild } from './scroll/index.js';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowLeft, Brain, Check, ChevronDown, RotateCcw, Zap } from 'lucide-react';
import { useLabI18n } from './i18n.js';
import './model-ladder.css';
import { clamp, displayName, fireCell, FIRE_CELL as CELL, FIRE_PALETTE as PALETTE, formatUsd, heatAt, reducedMotion, visibleLabel, } from './model-ladder-core.js';
export * from './model-ladder-core.js';
// ---------------------------------------------------------------------------------- trigger
/** Localized ladder copy; an explicit `copy` prop still wins (docs fixtures, tests). */
function useLabLadderCopy(copy) {
    const { t } = useLabI18n();
    if (copy)
        return copy;
    return {
        quality: t('lab.ladder.quality'),
        reset: t('lab.ladder.reset'),
        fast: t('lab.ladder.fast'),
        balanced: t('lab.ladder.balanced'),
        best: t('lab.ladder.best'),
        pickModel: t('lab.ladder.pickModel'),
        searchModels: t('lab.ladder.searchModels'),
        noMatches: t('lab.ladder.noMatches'),
        back: t('lab.ladder.back'),
        typical: (price) => t('lab.ladder.typical', { price }),
    };
}
export function ModelLadder({ stops, index, defaultIndex = 0, onChange, enabled = true, canvas, belowModel, catalog, onPickModel, onBrowseModels, onOpenChange, selectedModel, copy, variant = 'chip', align = 'start', side = 'top', className, }) {
    copy = useLabLadderCopy(copy);
    const [open, setOpen] = useState(false);
    const [container, setContainer] = useState(null);
    const trigger = useRef(null);
    const popover = useRef(null);
    if (!stops.length)
        return null;
    const safe = clamp(index, 0, stops.length - 1);
    const current = selectedModel ?? stops[safe];
    const tier = selectedModel
        ? displayName(current, safe, stops.length, copy)
        : visibleLabel(current, safe, stops.length, copy);
    const name = displayName(current, safe, stops.length, copy);
    const top = safe === stops.length - 1 && stops.length > 1;
    return (_jsxs(Popover.Root, { open: open, onOpenChange: (next) => {
            // Inside a top-layer <dialog> the popover must portal into it, or it renders underneath.
            if (next)
                setContainer(trigger.current?.closest('dialog') ?? null);
            setOpen(next);
            onOpenChange?.(next);
        }, children: [_jsx(Popover.Trigger, { asChild: true, disabled: !enabled, children: _jsxs(LabButton, { ref: trigger, type: "button", variant: "ghost", appearance: "toolbar", controlSize: variant === 'icon' ? 'icon' : 'regular', className: `lab-ladder-trigger lab-ladder-trigger--${variant} ${className ?? ''}`, "data-top": top, "aria-label": `${copy.quality}: ${tier}${tier === name ? '' : `, ${name}`}`, title: `${tier}${tier === name ? '' : ` · ${name}`}`, children: [_jsx("span", { className: "lab-ladder-trigger-icon", "aria-hidden": "true", children: _jsx(Brain, { size: variant === 'icon' ? 18 : 16, strokeWidth: 1.6 }) }), variant === 'chip' && (_jsxs("span", { className: "lab-ladder-trigger-text", children: [_jsx("b", { className: "lab-ladder-swap", children: tier }, tier), _jsx("small", { children: name })] })), variant === 'chip' && _jsx(ChevronDown, { size: 14, "aria-hidden": "true" })] }) }), _jsx(Popover.Portal, { container: container ?? undefined, children: _jsx(LabPopoverSurface, { asChild: true, children: _jsx(Popover.Content, { ref: popover, className: "lab-ladder-popover", side: side, align: align, sideOffset: 8, collisionPadding: 12, onEscapeKeyDown: (event) => {
                            const target = event.target;
                            // Radix handles Escape during document capture. Let the focused
                            // model list return to quality before the popover itself closes.
                            if (target instanceof Element &&
                                popover.current?.contains(target) &&
                                target.closest('[data-lab-model-list]'))
                                event.preventDefault();
                        }, onOpenAutoFocus: (event) => {
                            // Focus the slider, not the first button, so arrows move the ladder right away.
                            event.preventDefault();
                            requestAnimationFrame(() => {
                                const surface = popover.current;
                                const initial = surface?.querySelector('[role="slider"]') ??
                                    surface?.querySelector('button:not(:disabled)');
                                initial?.focus();
                            });
                        }, children: _jsx(ModelLadderCard, { stops: stops, index: safe, defaultIndex: defaultIndex, onChange: onChange, canvas: canvas, belowModel: belowModel, catalog: catalog, onPickModel: onPickModel, onBrowseModels: onBrowseModels ? () => { setOpen(false); onBrowseModels(); } : undefined, selectedModel: selectedModel, copy: copy }) }) }) })] }));
}
// ------------------------------------------------------------------------------------ card
/** The ladder card: tier title, model switch, canvas readout, extra controls and the track. */
export function ModelLadderCard({ stops, index, defaultIndex = 0, onChange, canvas, belowModel, catalog, onPickModel, onBrowseModels, selectedModel, copy, pickable = true, }) {
    const { t } = useLabI18n();
    copy = useLabLadderCopy(copy);
    const [view, setView] = useState('ladder');
    const titleButton = useRef(null);
    const restoreTitleFocus = useRef(false);
    useLayoutEffect(() => {
        if (view === 'ladder' && restoreTitleFocus.current) {
            restoreTitleFocus.current = false;
            titleButton.current?.focus({ preventScroll: true });
        }
    }, [view]);
    const returnToLadder = () => {
        restoreTitleFocus.current = true;
        setView('ladder');
    };
    const count = stops.length;
    const safe = clamp(index, 0, count - 1);
    const stop = selectedModel ?? stops[safe];
    const last = safe >= count - 1 && count > 1;
    const title = selectedModel
        ? displayName(stop, safe, count, copy)
        : visibleLabel(stop, safe, count, copy);
    const name = displayName(stop, safe, count, copy);
    const showName = name !== title;
    const safeDefault = clamp(defaultIndex, 0, count - 1);
    if (view === 'pick')
        return (_jsx(ModelList, { items: catalog?.length ? catalog : stops, tiers: stops, selectedId: stop.modelId, copy: copy, onBack: returnToLadder, onPick: (modelId) => {
                const rung = stops.findIndex((row) => row.modelId === modelId);
                if (rung >= 0)
                    onChange(rung);
                else
                    onPickModel?.(modelId);
                returnToLadder();
            } }));
    return (_jsxs("div", { className: "lab-ladder-card lab-light-edge", children: [_jsxs("div", { className: "lab-ladder-head", children: [_jsx(Zap, { className: "lab-ladder-bolt", size: 18, strokeWidth: 1.5, "aria-hidden": "true" }), _jsxs(LabButton, { ref: titleButton, type: "button", variant: "ghost", appearance: "toolbar", controlSize: "regular", className: "lab-ladder-title", onClick: pickable && (count > 1 || !!catalog?.length || !!onBrowseModels) ? () => onBrowseModels ? onBrowseModels() : setView('pick') : undefined, disabled: !pickable || (count <= 1 && !catalog?.length && !onBrowseModels), "aria-label": `${copy.pickModel}. ${title}${title === name ? '' : `, ${name}`}`, children: [_jsxs("span", { className: "lab-ladder-title-text", children: [_jsxs("span", { className: "lab-ladder-tier-row", children: [_jsx("span", { className: "lab-ladder-tier", "data-top": last, "aria-live": "polite", children: title }, title), stop.access && (_jsx("span", { className: "lab-model-access", "data-access": stop.access, children: stop.access === 'free' ? t('lab.common.free') : t('lab.common.pro') }))] }), showName && _jsx("span", { className: "lab-ladder-name", children: name })] }), pickable && (count > 1 || !!catalog?.length || !!onBrowseModels) && (_jsx(ChevronDown, { size: 14, "aria-hidden": "true" }))] }), _jsx(LabButton, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", className: "lab-ladder-reset", title: copy.reset, "aria-label": copy.reset, disabled: !selectedModel && safe === safeDefault, onClick: () => onChange(safeDefault), children: _jsx(RotateCcw, { size: 16, strokeWidth: 1.6 }) })] }), stop.priceUsd && stop.access !== 'free' ? (_jsx("p", { className: "lab-ladder-price", children: copy.typical(formatUsd(stop.priceUsd)) })) : null, canvas && (_jsxs("div", { className: "lab-ladder-canvas", children: [_jsx(AspectBox, { widthOverHeight: canvas.widthOverHeight }), _jsx("span", { className: "lab-ladder-size", children: canvas.size }), _jsx("span", { className: "lab-ladder-aspect", children: canvas.aspect })] })), belowModel && _jsx("div", { className: "lab-ladder-below", children: belowModel }), !selectedModel && (_jsx(LadderTrack, { count: count, index: safe, onChange: onChange, label: copy.quality, valueText: (i) => `${visibleLabel(stops[i], i, count, copy)}, ${displayName(stops[i], i, count, copy)}` }))] }));
}
/** A rectangle at the true proportions, fitted inside a square so every ratio lines up. */
export function AspectBox({ widthOverHeight, box = 20, }) {
    const ratio = widthOverHeight > 0 ? widthOverHeight : 1;
    const w = ratio >= 1 ? box : box * ratio;
    const h = ratio >= 1 ? box / ratio : box;
    return (_jsx("span", { className: "lab-ladder-aspect-box", style: { width: box, height: box }, "aria-hidden": "true", children: _jsx("i", { style: { width: Math.max(4, w), height: Math.max(4, h) } }) }));
}
// ----------------------------------------------------------------------------------- track
/** Domain decoration on the shared slider; the interaction engine lives in primitives. */
function LadderTrack({ count, index, onChange, label, valueText, }) {
    return (_jsx(LabSlider, { className: "lab-ladder-track", label: label, min: 0, max: Math.max(0, count - 1), step: 1, value: index, disabled: count <= 1, onValueChange: onChange, getValueText: valueText, showStops: true, renderFill: ({ position }) => {
            const heat = heatAt(position, count);
            return (_jsx("span", { className: "lab-ladder-fire", style: { opacity: heat }, children: heat > 0 && _jsx(PixelFire, {}) }));
        } }));
}
// ------------------------------------------------------------------------------------ fire
/** Square cells flicker and rise through fire colours, about 12 steps a second. */
function PixelFire() {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let raf = 0;
        let frame = -1;
        const draw = (step) => {
            const { width, height } = canvas.getBoundingClientRect();
            if (canvas.width !== Math.ceil(width) || canvas.height !== Math.ceil(height)) {
                canvas.width = Math.ceil(width);
                canvas.height = Math.ceil(height);
            }
            ctx.fillStyle = PALETTE[0];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const cols = Math.ceil(canvas.width / CELL);
            const rows = Math.ceil(canvas.height / CELL);
            for (let row = 0; row < rows; row++)
                for (let col = 0; col < cols; col++) {
                    const idx = fireCell(col, row, rows, step);
                    if (idx < 0)
                        continue;
                    ctx.fillStyle = PALETTE[idx];
                    ctx.fillRect(col * CELL, row * CELL, CELL - 1, CELL - 1);
                }
        };
        if (reducedMotion()) {
            draw(0);
            return;
        }
        const tick = (now) => {
            const step = Math.floor(now / 83);
            if (step !== frame) {
                frame = step;
                draw(step % 12);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);
    return _jsx("canvas", { ref: ref, className: "lab-ladder-fire-canvas", "aria-hidden": "true" });
}
// ------------------------------------------------------------------------------------ list
function ModelList({ items, tiers, selectedId, copy, onBack, onPick, }) {
    const { t } = useLabI18n();
    const [query, setQuery] = useState('');
    const [activeId, setActiveId] = useState(selectedId);
    const listId = useId();
    const titleId = useId();
    const input = useRef(null);
    const viewport = useRef(null);
    const optionButtons = useRef(new Map());
    const count = items.length;
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items
            .map((stop, i) => {
            const rung = tiers.findIndex((row) => row.modelId === stop.modelId);
            const tier = rung >= 0 ? visibleLabel(tiers[rung], rung, tiers.length, copy) : '';
            return {
                stop,
                name: displayName(stop, i, count, copy),
                tier: tier.toLowerCase() === stop.access ? '' : tier,
            };
        })
            .filter((row) => !q ||
            row.name.toLowerCase().includes(q) ||
            row.tier.toLowerCase().includes(q) ||
            row.stop.modelId.toLowerCase().includes(q) ||
            (row.stop.description ?? '').toLowerCase().includes(q));
    }, [items, tiers, query, count, copy]);
    const tabStop = rows.some((row) => row.stop.modelId === activeId)
        ? activeId
        : (rows.find((row) => row.stop.modelId === selectedId)?.stop.modelId ?? rows[0]?.stop.modelId);
    useEffect(() => {
        if (count > 6)
            input.current?.focus();
        else {
            const initial = optionButtons.current.get(selectedId) ?? optionButtons.current.values().next().value;
            initial?.focus({ preventScroll: true });
            revealScrollChild(viewport.current, initial, { inline: false });
        }
    }, [count, selectedId]);
    const focusOption = (index) => {
        const next = rows[index]?.stop.modelId;
        if (!next)
            return;
        setActiveId(next);
        const option = optionButtons.current.get(next);
        option?.focus({ preventScroll: true });
        revealScrollChild(viewport.current, option, { inline: false });
    };
    const navigateOptions = (event) => {
        if (!rows.length)
            return;
        const index = Math.max(0, rows.findIndex((row) => row.stop.modelId === tabStop));
        if (event.key === 'ArrowDown')
            focusOption((index + 1) % rows.length);
        else if (event.key === 'ArrowUp')
            focusOption((index - 1 + rows.length) % rows.length);
        else if (event.key === 'Home')
            focusOption(0);
        else if (event.key === 'End')
            focusOption(rows.length - 1);
        else
            return;
        event.preventDefault();
    };
    return (_jsx("div", { className: "lab-ladder-card lab-ladder-list lab-light-edge", "data-lab-model-list": true, onKeyDown: (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            event.stopPropagation();
            onBack();
        }, children: _jsx(LabScrollArea, { ref: viewport, className: "lab-ladder-list-scroll", label: copy.pickModel, edgeGap: 12, contentPadding: 12, viewportProps: { tabIndex: -1 }, top: _jsxs("div", { className: "lab-ladder-list-tools", children: [_jsxs("div", { className: "lab-ladder-list-head", children: [_jsx(LabButton, { type: "button", variant: "secondary", controlSize: "icon", "aria-label": copy.back, title: copy.back, onClick: onBack, children: _jsx(ArrowLeft, { size: 20, strokeWidth: 1.75, className: "lab-dir-flip" }) }), _jsx("b", { id: titleId, children: copy.pickModel })] }), count > 6 && (_jsx("div", { className: "lab-ladder-search", children: _jsx(LabToolbarSearch, { label: copy.searchModels, value: query, onValueChange: setQuery, inputRef: input, onInputKeyDown: (event) => {
                                if (!rows.length || !['ArrowDown', 'ArrowUp'].includes(event.key))
                                    return;
                                event.preventDefault();
                                focusOption(event.key === 'ArrowDown' ? 0 : rows.length - 1);
                            } }) }))] }), children: _jsxs("div", { className: "lab-ladder-options", id: listId, role: "listbox", "aria-labelledby": titleId, onKeyDown: navigateOptions, children: [rows.length === 0 && _jsx("p", { className: "lab-ladder-empty", children: copy.noMatches }), rows.map(({ stop, name, tier }) => (_jsxs(LabButton, { ref: (button) => {
                            if (button)
                                optionButtons.current.set(stop.modelId, button);
                            else
                                optionButtons.current.delete(stop.modelId);
                        }, type: "button", variant: "ghost", appearance: "toolbar", controlSize: "regular", role: "option", "aria-selected": stop.modelId === selectedId, tabIndex: stop.modelId === tabStop ? 0 : -1, className: "lab-ladder-option", onFocus: () => setActiveId(stop.modelId), onClick: () => onPick(stop.modelId), children: [_jsxs("span", { className: "lab-ladder-option-copy", children: [_jsx("b", { children: name }), _jsxs("small", { children: [tier && tier !== name ? tier : null, tier && tier !== name && stop.description ? ' · ' : null, stop.description] })] }), stop.access && (_jsx("span", { className: "lab-model-access", "data-access": stop.access, children: stop.access === 'free' ? t('lab.common.free') : t('lab.common.pro') })), stop.priceUsd && stop.access !== 'free' ? (_jsx("em", { className: "lab-ladder-option-price", children: formatUsd(stop.priceUsd) })) : null, stop.modelId === selectedId && _jsx(Check, { size: 15, "aria-hidden": "true" })] }, stop.modelId)))] }) }) }));
}
//# sourceMappingURL=model-ladder.js.map