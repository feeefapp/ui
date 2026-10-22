'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { RawInput } from '../primitives/raw-input.js';
import { useComposerLayout } from './use-composer-layout.js';
import { GlassScope } from '../glass/container.js';
import { useGlassMember } from '../glass/member.js';
import './composer.css';
export { useComposerLayout } from './use-composer-layout.js';
/**
 * Shared Chat/Image card. Domain-specific controls remain in named layout slots. Its glass is
 * painted by a glass container (its own, or the row it sits in), so it shares light, press and tint.
 */
export const ComposerCard = React.forwardRef(function ComposerCard({ expanded, layoutRef, layoutClassName, above, children, className, ...props }, ref) {
    return _jsx(GlassScope, { className: "lab-pc-glass", children: _jsxs(GlassCard, { ...props, ref: ref, className: cn('lab-pc-card lab-light-edge', className), "data-expanded": expanded, children: [above, _jsx("div", { ref: layoutRef, className: cn('lab-pc-layout', layoutClassName), children: children })] }) });
});
/** The card element, registered with the glass container; it animates its own height. */
const GlassCard = React.forwardRef(function GlassCard(props, ref) {
    const element = React.useRef(null);
    const member = useGlassMember(element, undefined, { motion: 'follow' });
    return _jsx("div", { ...props, ref: (node) => {
            element.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        }, "data-glass-member": member ? '' : undefined });
});
/**
 * Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately.
 * Its words are inline blocks, so it takes the direction of its own text (`dir="auto"`): an English
 * hint on an Arabic page keeps its word order, still aligned to the page's start.
 */
export function ComposerHint({ text }) {
    return _jsx("span", { className: "lab-pc-hint", "aria-hidden": "true", dir: "auto", children: text.split(/(\s+)/).map((word, index) => /\s+/.test(word) ? word : _jsx("span", { style: { animationDelay: `${Math.min(index, 40) * 28}ms` }, children: word }, index)) }, text);
}
/** Canonical measured Lab composer with stable caret, growing input and responsive tool slots. */
export function PromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, dropActive, submitDisabled, maxLength, above, tools, submit, footer, contentRevision, className, ...props }) {
    const { card, layout, field, expanded } = useComposerLayout(value, contentRevision);
    const canSubmit = !disabled && !busy && !submitDisabled && !!value.trim();
    return _jsxs("form", { ...props, className: cn('lab-pc lab-prompt-composer', className), "aria-busy": busy || undefined, onSubmit: event => { event.preventDefault(); if (canSubmit)
            onSubmit(); }, children: [above, _jsxs(ComposerCard, { "data-dragging": dropActive || undefined, ref: card, layoutRef: layout, layoutClassName: "lab-prompt-composer-layout", expanded: expanded, children: [_jsxs("div", { className: "lab-pc-field", children: [!value && placeholder && _jsx(ComposerHint, { text: placeholder }), _jsx(RawInput, { multiline: true, autoResize: false, ref: field, className: "lab-textarea", dir: "auto", rows: 1, value: value, maxLength: maxLength, "aria-label": label, disabled: disabled, readOnly: busy, onValueChange: onValueChange, onKeyDown: event => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                        event.preventDefault();
                                        if (canSubmit)
                                            onSubmit();
                                    }
                                } })] }), _jsx("span", { className: "lab-pc-slot lab-prompt-composer-tools", children: tools }), _jsx("span", { className: "lab-pc-slot lab-pc-slot--send", children: submit })] }), footer] });
}
//# sourceMappingURL=composer.js.map