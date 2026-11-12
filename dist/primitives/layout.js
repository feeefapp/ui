import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
export const Box = React.forwardRef(({ as = 'div', ...props }, ref) => React.createElement(as, { ...props, ref }));
Box.displayName = 'Box';
export function Text({ as: Component = 'span', ...props }) {
    return _jsx(Component, { ...props });
}
export function Link(props) {
    return _jsx("a", { ...props });
}
export function Form(props) {
    return _jsx("form", { ...props });
}
export function List(props) {
    return _jsx("ul", { ...props });
}
export function ListItem(props) {
    return _jsx("li", { ...props });
}
export function Divider() {
    return _jsx("hr", {});
}
export function Style({ children }) {
    return _jsx("style", { children: children });
}
//# sourceMappingURL=layout.js.map