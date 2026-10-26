'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import { useLatched } from '../motion.js';
import { PresentationHost, usePresented } from './host.js';
import { PresentationHeader } from './header.js';
import { PresentationBody } from './body.js';
import { usePopMotion } from './motion.js';
import './presentation.css';
/**
 * A centred dialog for a short task with a form: content on an opaque card that hugs it (or
 * fills the height), a floating glass header with the title and a close bubble, and the actions
 * in a floating dock. It opens with a small spring and fades out; focus is trapped inside and
 * returns to the opener. Use `Alert` for a plain decision, `Pane` for details beside the page.
 */
export function Modal(props) {
    const { mounted, exited } = usePresented(props.open);
    // The exit fades out the last open content, not whatever the parent renders while closing.
    const shown = useLatched(props, props.open);
    if (!mounted)
        return null;
    return _jsx(ModalPresentation, { ...shown, open: props.open, onOpenChange: props.onOpenChange, onExited: exited });
}
function ModalPresentation({ open, onOpenChange, label, title, leading, trailing, showClose = true, header, dock, children, fill = false, wide = false, dismissible = true, edgeGap, contentPadding = 16, initialFocusRef, returnFocusRef, container, className, onExited, }) {
    const { t } = useI18n();
    const surface = React.useRef(null);
    const scrim = React.useRef(null);
    const titleId = React.useId();
    usePopMotion(open, surface, scrim, onExited);
    const close = () => {
        if (open)
            onOpenChange(false);
    };
    const dismiss = () => {
        if (dismissible)
            close();
    };
    const top = header !== undefined ? (header) : (_jsx(PresentationHeader, { title: title, leading: leading, titleId: titleId, trailing: trailing, onClose: showClose ? close : undefined, closeLabel: t('lab.composer.closeLabel', { label }) }));
    const labelledBy = header === undefined && leading == null && title != null ? titleId : undefined;
    return (_jsxs(PresentationHost, { kind: "modal", label: label, labelledBy: labelledBy, container: container, initialFocusRef: initialFocusRef, returnFocusRef: returnFocusRef, onEscape: dismiss, children: [_jsx("div", { ref: scrim, className: "lab-presentation-scrim", "aria-hidden": "true", onClick: dismiss }), _jsx("div", { ref: surface, className: cn('lab-modal', wide && 'lab-modal--wide', className), "data-fill": fill || undefined, children: _jsx(PresentationBody, { label: label, top: top, bottom: dock, fill: fill, edgeGap: edgeGap, contentPadding: contentPadding, children: children }) })] }));
}
//# sourceMappingURL=modal.js.map