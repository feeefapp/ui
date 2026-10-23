import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as Tooltip from '@radix-ui/react-tooltip';
import { Button } from '../ui.js';
import { useFloatingBoundary } from '../menu/boundary.js';
import './navigation-item.css';
/**
 * One row of sidebar navigation: icon and label, a link with `href` or a button without. In
 * `compact` (rail) mode only the icon shows and the label moves into a tooltip. Needs a Radix
 * Tooltip.Provider above it in compact mode.
 */
export function NavigationItem({ label, icon, href, onSelect, active, compact, }) {
    const boundary = useFloatingBoundary();
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-navigation-icon", "aria-hidden": "true", children: icon }), _jsx("span", { className: "lab-navigation-label", children: label })] }));
    const item = href ? (_jsx(Button, { asChild: true, variant: "ghost", appearance: "toolbar", className: "lab-navigation-item", "data-compact": compact, children: _jsx("a", { href: href, "aria-current": active ? 'page' : undefined, onClick: onSelect, children: content }) })) : (_jsx(Button, { variant: "ghost", appearance: "toolbar", className: "lab-navigation-item", "data-compact": compact, "aria-current": active ? 'page' : undefined, onClick: onSelect, children: content }));
    // Only the rail shows a tooltip, so a full-width item works without a Tooltip.Provider.
    if (!compact)
        return item;
    return (_jsxs(Tooltip.Root, { children: [_jsx(Tooltip.Trigger, { asChild: true, children: item }), _jsx(Tooltip.Portal, { container: boundary ?? undefined, children: _jsx(Tooltip.Content, { className: "lab-navigation-tooltip", side: "right", sideOffset: 8, collisionPadding: 12, collisionBoundary: boundary ?? undefined, children: label }) })] }));
}
//# sourceMappingURL=navigation-item.js.map