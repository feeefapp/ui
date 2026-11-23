'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ArrowUp, X } from 'lucide-react';
import { cn } from '../utils.js';
import { RawInput } from '../primitives/raw-input.js';
import { IconButton } from '../primitives/button.js';
import { PixelLoader } from '../pixel-art.js';
import { GlassGroup } from '../scaffold.js';
import { GlassBar, GlassScope } from '../glass/container.js';
import { LayoutGroup } from '../physics/layout-group.js';
import { scrollEdgeOpacities } from '../scroll/metrics.js';
import { useI18n } from '../i18n.js';
import { composerExpanded, composerSendState } from './composer-model.js';
import { useComposerMotion } from './use-composer-motion.js';
import './composer.css';
export { composerExpanded, composerSendState } from './composer-model.js';
/** Controls whose menu, popover or panel is open keep the second row in place (`pinned`). */
const PINNED = '[data-state="open"], [aria-expanded="true"], [aria-pressed="true"]';
const coarsePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
/**
 * Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately.
 * Its words are inline blocks, so it takes the direction of its own text (`dir="auto"`): an English
 * hint on an Arabic page keeps its word order, still aligned to the page's start.
 */
export function ComposerHint({ text }) {
    return (_jsx("span", { className: "lab-composer-hint", "aria-hidden": "true", dir: "auto", children: text.split(/(\s+)/).map((word, index) => /\s+/.test(word) ? word : _jsx("span", { style: { animationDelay: `${Math.min(index, 40) * 28}ms` }, children: word }, index)) }, text));
}
/**
 * The composer's text field: an unpainted multiline input in the control font that grows from one
 * line to `maxLines`, then scrolls, with the animated `ComposerHint` while empty. Enter calls
 * `onSubmit`; Shift+Enter breaks the line (on touch keyboards Return always breaks it). Place it in `ComposerBar`'s `field` slot.
 */
export const ComposerField = React.forwardRef(function ComposerField({ value, onValueChange, label, placeholder, onSubmit, maxLines = 6, onKeyDown, className, ...props }, ref) {
    return (_jsxs("div", { className: "lab-composer-field", children: [!value && placeholder && _jsx(ComposerHint, { text: placeholder }), _jsx(RawInput, { ...props, ref: ref, multiline: true, minLines: 1, maxLines: maxLines, className: cn('lab-composer-input', className), dir: "auto", rows: 1, value: value, "aria-label": label, onValueChange: onValueChange, onKeyDown: (event) => {
                    onKeyDown?.(event);
                    if (event.defaultPrevented)
                        return;
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        // Touch keyboards have no Shift+Enter: Return adds a line there and send sends.
                        if (coarsePointer())
                            return;
                        event.preventDefault();
                        onSubmit?.();
                    }
                } })] }));
});
/**
 * The send button inside the capsule, at its trailing end: a quiet neutral circle while there is
 * nothing to send, the primary circle with an up arrow when there is, the kit's loader while
 * sending. With `onStop` the sending button stays enabled and stops the request.
 */
export function ComposerSend({ label, ready, submitting = false, onSend, onStop, stopLabel, type = 'button' }) {
    const { t } = useI18n();
    const state = composerSendState({ ready, submitting, stoppable: !!onStop });
    return (_jsx("span", { className: "lab-composer-send", "data-state": state, children: state === 'stop' ? (_jsx(IconButton, { variant: "filled", controlSize: "small", "aria-label": stopLabel ?? t('lab.composer.stop'), "aria-busy": true, onClick: onStop, children: _jsx(PixelLoader, { size: 16, decorative: true }) })) : (_jsx(IconButton, { type: state === 'ready' ? type : 'button', variant: state === 'idle' ? 'ghost' : 'filled', controlSize: "small", "aria-label": label, title: label, disabled: state === 'idle', loading: state === 'sending', onClick: state === 'ready' && type === 'button' ? onSend : undefined, children: _jsx(ArrowUp, { "aria-hidden": "true" }) })) }));
}
/**
 * Attachments inside the capsule, above the text (like iOS Messages): one row of
 * `ComposerAttachment` tiles that scrolls sideways with edge fades when it overflows, and, with
 * `max`, a quiet count of how many more fit.
 */
export function ComposerAttachments({ label, count, max, children }) {
    const { t } = useI18n();
    const scroller = React.useRef(null);
    const ids = React.Children.toArray(children)
        .map((child) => (React.isValidElement(child) ? String(child.key) : ''))
        .join('|');
    React.useLayoutEffect(() => {
        const el = scroller.current;
        if (!el)
            return;
        const fade = () => {
            const max = el.scrollWidth - el.clientWidth;
            const rtl = getComputedStyle(el).direction === 'rtl';
            // Right-to-left scrollers run from -max (far left) to 0.
            const left = rtl ? max + el.scrollLeft : el.scrollLeft;
            const edges = scrollEdgeOpacities(left, max, 24);
            el.style.setProperty('--lab-composer-fade-left', String(max > 1 ? edges.top : 0));
            el.style.setProperty('--lab-composer-fade-right', String(max > 1 ? edges.bottom : 0));
        };
        fade();
        el.addEventListener('scroll', fade, { passive: true });
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fade);
        observer?.observe(el);
        return () => {
            el.removeEventListener('scroll', fade);
            observer?.disconnect();
        };
    }, [ids]);
    return (_jsxs("div", { className: "lab-composer-attachments", children: [_jsx(LayoutGroup, { layoutKey: ids, children: _jsx("div", { ref: scroller, className: "lab-composer-attachments-scroll", role: "list", "aria-label": label, children: children }) }), max != null && count != null && count > 0 && (_jsx("span", { className: "lab-composer-attachments-count", children: t('lab.composer.attachmentCount', { count, max }) }))] }));
}
/**
 * One attachment tile: a rounded-square thumbnail (or, with `title`, a wider tile with an icon and
 * a name), a small × badge at its top-trailing corner, and an optional label such as "Main" at its
 * bottom-leading corner.
 */
export function ComposerAttachment({ id, src, preview, icon, title, label, badge, onRemove, removeLabel }) {
    const { t } = useI18n();
    return (_jsxs("div", { role: "listitem", className: "lab-composer-attachment", "data-lab-layout-id": id, "data-wide": title ? '' : undefined, "aria-label": badge ? `${badge}: ${label}` : label, children: [_jsxs("span", { className: "lab-composer-attachment-media", children: [title ? (_jsxs("span", { className: "lab-composer-attachment-title", children: [icon, _jsx("span", { children: title })] })) : (preview ?? (src ? _jsx("img", { src: src, alt: "", draggable: false }) : null)), badge && (_jsx("span", { className: "lab-composer-attachment-badge", "aria-hidden": "true", children: badge }))] }), onRemove && (_jsx(IconButton, { variant: "ghost", controlSize: "small", className: "lab-composer-attachment-remove", "aria-label": removeLabel ?? t('lab.composer.removeItem', { name: label }), onClick: (event) => {
                    // Focus stays in the composer: on the next tile's ×, else the field.
                    const tile = event.currentTarget.closest('.lab-composer-attachment');
                    const next = tile?.nextElementSibling?.querySelector('.lab-composer-attachment-remove') ??
                        tile?.previousElementSibling?.querySelector('.lab-composer-attachment-remove') ??
                        tile?.closest('.lab-composer-capsule')?.querySelector('.lab-composer-input');
                    next?.focus();
                    onRemove();
                }, children: _jsx(X, { "aria-hidden": "true" }) }))] }));
}
/** Text width of a draft's longest line in the field's own font (canvas, so no reflow). */
let measureCanvas = null;
function draftWidth(field) {
    measureCanvas ??= document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (!ctx)
        return 0;
    const style = getComputedStyle(field);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return Math.max(0, ...field.value.split('\n').map((line) => ctx.measureText(line).width));
}
/**
 * The composer's floating row, in iOS 26 Liquid Glass: a round `leading` bubble and one capsule
 * holding the attachments, the growing field and, at its trailing end, the actions and send. While
 * it is empty and idle it is one calm line; with text, focus inside or one of its menus open, a
 * second row shows the `tools` (ladder, settings) and the actions and send move under the text.
 * Every layout change (rows, lines, attachments) springs on one `SPRINGS.snappy`. Both bubbles
 * share one glass container inside a `GlassBar`, so text stays readable over moving content.
 */
export function ComposerBar({ leading, attachments, field, tools, actions, send, hasText, dropActive, inlineTools = false, pinned: pinnedProp = false, className, onFocus, onBlur, onMouseDown, ...props }) {
    const root = React.useRef(null);
    const capsule = React.useRef(null);
    const [focusWithin, setFocusWithin] = React.useState(false);
    const [pinned, setPinned] = React.useState(false);
    const [overflow, setOverflow] = React.useState(false);
    const frame = React.useRef(0);
    const hasTools = tools != null && tools !== false;
    const expanded = hasTools &&
        (inlineTools ? pinnedProp || overflow : composerExpanded({ hasText, focusWithin, pinned: pinned || pinnedProp }));
    useComposerMotion(capsule);
    // Inline tools: wrap to two rows once the draft no longer fits beside them. Measured against the
    // one-row field width (capsule less tools, actions and send), whatever the current layout, so the
    // decision is stable and never flips back and forth (Flutter `ComposerCapsuleLayout`).
    React.useLayoutEffect(() => {
        if (!inlineTools || !hasTools)
            return;
        const el = capsule.current;
        const field = el?.querySelector('textarea.lab-composer-input');
        if (!el || !field)
            return;
        const check = () => {
            if (!field.value)
                return setOverflow(false);
            if (field.value.includes('\n'))
                return setOverflow(true);
            const width = (selector) => el.querySelector(selector)?.offsetWidth ?? 0;
            // The tools' own content: expanded, their slot spans the row's free column.
            const toolsSlot = el.querySelector('.lab-composer-tools');
            const tools = toolsSlot
                ? Array.from(toolsSlot.children).reduce((sum, child) => sum + child.offsetWidth, 0)
                : 0;
            const style = getComputedStyle(el);
            const inner = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const fieldStyle = getComputedStyle(field);
            const room = inner -
                tools -
                width('.lab-composer-actions') -
                width('.lab-composer-slot-send') -
                parseFloat(fieldStyle.paddingLeft) -
                parseFloat(fieldStyle.paddingRight);
            setOverflow(draftWidth(field) > room);
        };
        check();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
        observer?.observe(el);
        return () => observer?.disconnect();
    });
    React.useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const read = () => setPinned(!!el.querySelector(PINNED));
        read();
        const observer = new MutationObserver(read);
        observer.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-expanded', 'aria-pressed'] });
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame.current);
        };
    }, []);
    return (_jsx("div", { ...props, ref: root, className: cn('lab-composer-bar', className), onFocus: (event) => {
            cancelAnimationFrame(frame.current);
            setFocusWithin(true);
            onFocus?.(event);
        }, onBlur: (event) => {
            onBlur?.(event);
            // Focus moving between controls of the bar (or into one of its menus) keeps it open.
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(() => {
                const el = root.current;
                setFocusWithin(!!el && el.contains(document.activeElement));
            });
        }, onMouseDown: (event) => {
            onMouseDown?.(event);
            // A click on a control keeps the caret in the field, so the second row stays put under the pointer.
            const active = document.activeElement;
            if (active instanceof HTMLTextAreaElement && event.currentTarget.contains(active) && event.target.closest('button'))
                event.preventDefault();
        }, children: _jsx(GlassBar, { children: _jsxs(GlassScope, { className: "lab-composer-row", children: [leading != null && leading !== false && (_jsx(GlassGroup, { className: "lab-toolbar-group lab-composer-leading", children: leading })), _jsx(GlassGroup, { ref: capsule, className: "lab-composer-capsule", glassMotion: "follow", "data-expanded": expanded, "data-inline-tools": (inlineTools && hasTools) || undefined, "data-dragging": dropActive || undefined, children: _jsxs("div", { className: "lab-composer-grid", children: [_jsx("div", { "data-composer-slot": "attachments", className: "lab-composer-slot-attachments", hidden: !attachments, children: attachments }), _jsx("div", { "data-composer-slot": "field", className: "lab-composer-slot-field", children: field }), hasTools && (_jsx("div", { "data-composer-slot": "tools", className: "lab-composer-tools", inert: !expanded && !inlineTools, children: tools })), _jsx("div", { "data-composer-slot": "actions", className: "lab-composer-actions", hidden: actions == null || actions === false, children: actions }), _jsx("div", { "data-composer-slot": "send", className: "lab-composer-slot-send", children: send })] }) })] }) }) }));
}
/**
 * The AI prompt composer: a round leading bubble and a glass capsule whose field grows from one
 * line, with send inside at its trailing end. Tools appear on a second row while it has text or
 * focus. Enter sends; Shift+Enter adds a line.
 */
export function PromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, onStop, submitLabel, stopLabel, dropActive, submitDisabled, maxLength, maxLines, leading, attachments, tools, actions, above, footer, className, ...props }) {
    const canSubmit = !disabled && !busy && !submitDisabled && !!value.trim();
    const submit = () => {
        if (canSubmit)
            onSubmit();
    };
    return (_jsxs("form", { ...props, className: cn('lab-composer', className), "aria-busy": busy || undefined, onSubmit: (event) => {
            event.preventDefault();
            submit();
        }, children: [above, _jsx(ComposerBar, { leading: leading, attachments: attachments, tools: tools, actions: actions, hasText: !!value, dropActive: dropActive, field: _jsx(ComposerField, { value: value, onValueChange: onValueChange, label: label, placeholder: placeholder, maxLength: maxLength, maxLines: maxLines, disabled: disabled, readOnly: busy, onSubmit: submit }), send: _jsx(ComposerSend, { type: "submit", label: submitLabel, ready: canSubmit, submitting: !!busy, onStop: onStop, stopLabel: stopLabel }) }), footer] }));
}
//# sourceMappingURL=composer.js.map