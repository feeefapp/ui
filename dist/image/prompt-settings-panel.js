'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LabButton } from '../ui.js';
import { LabScrollArea } from '../scroll/index.js';
import { scrollContentReserve } from '../scroll/metrics.js';
import { useLabI18n } from '../i18n.js';
import './prompt-composer.css';
const EDGE_GAP = 12;
const CONTENT_PADDING = 12;
/** Settings hug their contents until the available popover height requires scrolling. */
export const PromptSettingsPanel = forwardRef(function PromptSettingsPanel({ children, onClose }, ref) {
    const { t } = useLabI18n();
    const host = useRef(null);
    const content = useRef(null);
    const header = useRef(null);
    useImperativeHandle(ref, () => host.current, []);
    useLayoutEffect(() => {
        const measure = () => {
            if (!host.current || !content.current || !header.current)
                return;
            const style = getComputedStyle(host.current);
            const border = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
            const height = content.current.offsetHeight +
                scrollContentReserve(header.current.offsetHeight, EDGE_GAP, CONTENT_PADDING) +
                CONTENT_PADDING +
                border;
            host.current.style.setProperty('--lab-pc-settings-height', `${height}px`);
        };
        const observer = new ResizeObserver(measure);
        if (content.current)
            observer.observe(content.current);
        if (header.current)
            observer.observe(header.current);
        measure();
        return () => observer.disconnect();
    }, []);
    return (_jsx("div", { ref: host, className: "lab-pc-panel lab-light-edge", "data-lab-corners": true, children: _jsx(LabScrollArea, { label: t('lab.imgcomposer.outputSettings'), edgeGap: EDGE_GAP, contentPadding: CONTENT_PADDING, top: _jsxs("div", { ref: header, className: "lab-pc-panel-head", children: [_jsx("strong", { children: t('lab.imgcomposer.outputSettings') }), _jsx(LabButton, { variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.imgcomposer.closeSettings'), onClick: onClose, children: _jsx(X, { size: 20, "aria-hidden": "true" }) })] }), children: _jsx("div", { ref: content, className: "lab-pc-panel-content", children: children }) }) }));
});
//# sourceMappingURL=prompt-settings-panel.js.map