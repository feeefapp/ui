'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from 'lucide-react';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import { IconButton } from '../primitives/button.js';
import { ToolbarGroup } from '../toolbar.js';
import { GlassScope } from '../glass/container.js';
import './presentation.css';
/**
 * The floating header of a presentation surface (Modal, Sheet): a title bubble at the start,
 * optional trailing bubbles and a close bubble at the end, all glass in one `GlassScope` so they
 * merge and share light. Put it in a `PresentationBody` `top` slot; it renders nothing when it has
 * nothing to show.
 */
export function PresentationHeader({ title, leading, titleId, trailing, onClose, closeLabel, closeDisabled = false, className, }) {
    const { t } = useI18n();
    if (title == null && leading == null && trailing == null && !onClose)
        return null;
    const close = closeLabel ?? t('lab.common.close');
    return (_jsxs(GlassScope, { as: "header", className: cn('lab-presentation-header', className), children: [_jsx("div", { className: "lab-presentation-header-start", children: leading ?? (title != null && (_jsx(ToolbarGroup, { label: t('lab.presentation.title'), className: "lab-presentation-header-title", children: _jsx("h2", { id: titleId, className: "lab-presentation-title", children: title }) }))) }), trailing, onClose && _jsx(CloseBubble, { label: close, disabled: closeDisabled, onClose: onClose })] }));
}
/** The close bubble: one glass group holding the close button. Kit-internal (header and a sheet's pane). */
export function CloseBubble({ label, disabled = false, onClose, className, }) {
    return (_jsx(ToolbarGroup, { label: label, className: cn('lab-presentation-close', className), children: _jsx(IconButton, { variant: "text", appearance: "toolbar", controlSize: "regular", "aria-label": label, disabled: disabled, onClick: onClose, children: _jsx(X, { size: 20, "aria-hidden": "true" }) }) }));
}
//# sourceMappingURL=header.js.map