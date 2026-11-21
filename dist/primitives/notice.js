import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import './notice.css';
const icons = { info: Info, success: Check, warning: TriangleAlert, danger: CircleAlert };
/** Inline feedback with an inset accent stripe. Set role="status" or "alert" for live updates. */
export function Notice({ tone = 'info', title, icon, children, className, ...props }) {
    const Icon = icons[tone];
    const glyph = icon === null ? null : _jsx("span", { className: "lab-notice-icon", "aria-hidden": "true", children: icon ?? _jsx(Icon, { size: 16 }) });
    return (_jsxs("div", { ...props, className: ['lab-notice', className].filter(Boolean).join(' '), "data-tone": tone, children: [title != null ? _jsxs("div", { className: "lab-notice-heading", children: [glyph, _jsx("strong", { children: title })] }) : glyph, _jsx("div", { className: "lab-notice-body", children: children })] }));
}
//# sourceMappingURL=notice.js.map