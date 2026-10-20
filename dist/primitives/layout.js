import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
export const LabBox = React.forwardRef(({ as = 'div', ...props }, ref) => React.createElement(as, { ...props, ref }));
LabBox.displayName = 'LabBox';
export function LabText({ as: Component = 'span', ...props }) {
    return _jsx(Component, { ...props });
}
export function LabLink(props) {
    return _jsx("a", { ...props });
}
export function LabForm(props) {
    return _jsx("form", { ...props });
}
export function LabList(props) {
    return _jsx("ul", { ...props });
}
export function LabListItem(props) {
    return _jsx("li", { ...props });
}
export function LabDivider() {
    return _jsx("hr", {});
}
export function LabStyle({ children }) {
    return _jsx("style", { children: children });
}
//# sourceMappingURL=layout.js.map