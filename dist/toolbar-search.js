'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { LabToolbarGroup } from './toolbar.js';
import { LabIconButton } from './primitives/button.js';
import { LabRawInput } from './primitives/raw-input.js';
import { useLabI18n } from './i18n.js';
import { cn } from './utils.js';
import './toolbar-search.css';
/** One persistent glass surface morphs from a search action into an unpainted native editor.
 * Content reflows at its final width; only the surrounding material changes geometry.
 */
export function LabToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, onExpandedChange }) {
    const { t } = useLabI18n();
    const id = useId();
    const [expanded, setExpanded] = useState(false);
    const surface = useRef(null);
    const trigger = useRef(null);
    const field = useRef(null);
    const animation = useRef(null);
    const from = useRef(null);
    const change = (next) => {
        if (next === expanded)
            return;
        from.current = surface.current?.getBoundingClientRect().width ?? null;
        animation.current?.cancel();
        setExpanded(next);
        onExpandedChange?.(next);
        if (!next) {
            if (value)
                onValueChange('');
            trigger.current?.focus({ preventScroll: true });
        }
    };
    useLayoutEffect(() => {
        const node = surface.current;
        if (!node)
            return;
        const target = node.getBoundingClientRect().width;
        if (from.current !== null && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            animation.current = node.animate([{ width: `${from.current}px` }, { width: `${target}px` }], {
                duration: 420,
                easing: 'linear(0, 0.12 6%, 0.48 18%, 0.8 34%, 0.96 52%, 1.015 70%, 1 100%)',
            });
        }
        from.current = null;
        if (expanded)
            field.current?.focus({ preventScroll: true });
        return () => { animation.current?.cancel(); };
    }, [expanded]);
    useLayoutEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const finish = () => { if (media.matches)
            animation.current?.finish(); };
        media.addEventListener('change', finish);
        // Only host-width changes finish the morph; the animated material is never observed.
        const host = surface.current?.parentElement;
        let width = host?.getBoundingClientRect().width;
        const observer = new ResizeObserver(() => {
            const next = host?.getBoundingClientRect().width;
            if (width !== next) {
                animation.current?.finish();
                width = next;
            }
        });
        if (host)
            observer.observe(host);
        return () => { observer.disconnect(); media.removeEventListener('change', finish); };
    }, []);
    return _jsxs("div", { className: cn('lab-toolbar-search', className), role: "group", "aria-label": label, "data-expanded": expanded, children: [_jsxs("div", { className: "lab-toolbar-search-main", children: [_jsxs(LabToolbarGroup, { ref: surface, label: label, className: "lab-toolbar-search-surface", children: [_jsx(LabIconButton, { ref: trigger, variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": expanded ? t('lab.search.collapse') : label, "aria-expanded": expanded, "aria-controls": id, disabled: disabled, onClick: () => change(!expanded), children: _jsxs("span", { className: "lab-toolbar-search-glyph", "data-expanded": expanded, children: [_jsx(Search, {}), _jsx(ArrowLeft, { className: "lab-dir-flip" })] }) }), _jsxs("div", { className: "lab-toolbar-search-editor", inert: !expanded, "aria-hidden": !expanded, children: [_jsx(LabRawInput, { ref: field, id: id, type: "search", "aria-label": label, placeholder: placeholder ?? label, value: value, disabled: disabled, tabIndex: expanded ? 0 : -1, className: "lab-toolbar-search-input", onValueChange: onValueChange, onKeyDown: event => {
                                            if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                change(false);
                                            }
                                        } }), _jsx(LabIconButton, { variant: "text", appearance: "toolbar", controlSize: "compact", "aria-label": t('lab.search.clear'), disabled: !value || disabled, onClick: () => { onValueChange(''); field.current?.focus({ preventScroll: true }); }, children: _jsx(X, {}) })] })] }), _jsx("div", { className: "lab-toolbar-search-controls", inert: expanded, "aria-hidden": expanded, children: children })] }), trailing && _jsx("div", { className: "lab-toolbar-search-trailing", children: trailing })] });
}
//# sourceMappingURL=toolbar-search.js.map