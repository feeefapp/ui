import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as Tooltip from '@radix-ui/react-tooltip';
import { LabButton } from '../ui.js';
import './navigation-item.css';
export function LabNavigationItem({ label, icon, href, onSelect, active, compact, }) {
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-navigation-icon", "aria-hidden": "true", children: icon }), _jsx("span", { className: "lab-navigation-label", children: label })] }));
    return (_jsxs(Tooltip.Root, { children: [_jsx(Tooltip.Trigger, { asChild: true, children: href ? (_jsx(LabButton, { asChild: true, variant: "ghost", appearance: "toolbar", className: "lab-navigation-item", "data-compact": compact, children: _jsx("a", { href: href, "aria-current": active ? 'page' : undefined, onClick: onSelect, children: content }) })) : (_jsx(LabButton, { variant: "ghost", appearance: "toolbar", className: "lab-navigation-item", "data-compact": compact, "aria-current": active ? 'page' : undefined, onClick: onSelect, children: content })) }), compact && (_jsx(Tooltip.Portal, { children: _jsx(Tooltip.Content, { className: "lab-navigation-tooltip", side: "right", sideOffset: 8, collisionPadding: 12, children: label }) }))] }));
}
//# sourceMappingURL=navigation-item.js.map