'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
const ActionsWidthContext = createContext(undefined);
/**
 * Layout boundary supplied by a shrink-wrapping parent such as Dock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export function ActionsWidthProvider({ value, children, }) {
    return _jsx(ActionsWidthContext.Provider, { value: value, children: children });
}
export function useActionsWidth() {
    return useContext(ActionsWidthContext);
}
//# sourceMappingURL=width-context.js.map