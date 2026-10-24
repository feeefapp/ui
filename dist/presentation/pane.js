'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useI18n } from '../i18n.js';
import { cn } from '../utils.js';
import { useLatched } from '../motion.js';
import { GlassScope } from '../glass/container.js';
import { Sheet } from '../containers/sheet.js';
import { PresentationHost, usePresented } from './host.js';
import { CloseBubble, PresentationHeader } from './header.js';
import { PresentationBody } from './body.js';
import { slidePlan, useSurfaceMotion } from './motion.js';
import './presentation.css';
/** Width of the area the pane presents over: the container, or the window. */
function useHostWidth(container) {
    const [width, setWidth] = React.useState(() => typeof window === 'undefined' ? 1024 : container ? container.clientWidth : window.innerWidth);
    React.useLayoutEffect(() => {
        if (container === null)
            return;
        const measure = () => setWidth(container ? container.clientWidth : window.innerWidth);
        measure();
        if (container) {
            const observer = new ResizeObserver(measure);
            observer.observe(container);
            return () => observer.disconnect();
        }
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [container]);
    return width;
}
/**
 * An inspector beside the page: a full-height opaque panel the shell gap G from the screen edges
 * that slides in from the end side (mirrored in RTL), with the close bubble floating beside it,
 * a floating glass header and a dock. Below the compact breakpoint the same content is a bottom
 * `Sheet`, so you write it once. Use it for the details of the thing the page is about.
 */
export function Pane(props) {
    const width = useHostWidth(props.container);
    const compact = width < (props.compactBreakpoint ?? 720);
    if (compact) {
        const { width: _width, side: _side, compactBreakpoint: _breakpoint, edgeGap: _gap, fill, contentPadding, ...rest } = props;
        return _jsx(Sheet, { ...rest, detents: [fill ? 'large' : 'fit'], regular: "sheet", contentPadding: contentPadding ?? 16 });
    }
    return _jsx(DesktopPane, { ...props });
}
function DesktopPane(props) {
    const { mounted, exited } = usePresented(props.open);
    const shown = useLatched(props, props.open);
    if (!mounted)
        return null;
    return _jsx(PanePresentation, { ...shown, open: props.open, onOpenChange: props.onOpenChange, onExited: exited });
}
function PanePresentation({ open, onOpenChange, label, title, trailing, showClose = true, header, dock, children, width = 420, side = 'end', modal = true, dismissible = true, edgeGap, contentPadding = 16, initialFocusRef, returnFocusRef, container, className, onExited, }) {
    const { t } = useI18n();
    const frame = React.useRef(null);
    const scrim = React.useRef(null);
    const titleId = React.useId();
    useSurfaceMotion(open, frame, scrim, onExited, (opening, motion, now, element) => {
        // The end side is the right in LTR: off screen means a positive x there, negative in RTL.
        const rtl = getComputedStyle(element).direction === 'rtl';
        const outward = (side === 'end' ? 1 : -1) * (rtl ? -1 : 1);
        return slidePlan(opening, motion, now, `translate3d(${element.offsetWidth * outward}px, 0, 0)`);
    });
    const close = () => {
        if (open)
            onOpenChange(false);
    };
    const dismiss = () => {
        if (dismissible)
            close();
    };
    const closeLabel = t('lab.composer.closeLabel', { label });
    const top = header !== undefined ? (header) : (_jsx(PresentationHeader, { title: title, titleId: titleId, trailing: trailing }));
    const labelledBy = header === undefined && title != null ? titleId : undefined;
    return (_jsxs(PresentationHost, { kind: "pane", label: label, labelledBy: labelledBy, modal: modal, container: container, initialFocusRef: initialFocusRef, returnFocusRef: returnFocusRef, onEscape: dismiss, children: [modal && _jsx("div", { ref: scrim, className: "lab-presentation-scrim", "aria-hidden": "true", onClick: dismiss }), _jsxs("div", { ref: frame, className: "lab-pane-frame", "data-side": side, style: { '--lab-pane-width': `${width}px` }, onKeyDown: (event) => {
                    // A non-modal pane is not a modal dialog: Escape reaches it only through this frame.
                    if (!modal && event.key === 'Escape') {
                        event.stopPropagation();
                        dismiss();
                    }
                }, children: [showClose && (_jsx(GlassScope, { className: "lab-pane-close", children: _jsx(CloseBubble, { label: closeLabel, onClose: close }) })), _jsx("div", { className: cn('lab-pane', className), children: _jsx(PresentationBody, { label: label, top: top, bottom: dock, fill: true, edgeGap: edgeGap, contentPadding: contentPadding, children: children }) })] })] }));
}
//# sourceMappingURL=pane.js.map