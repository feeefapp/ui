'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
const LabActionsWidthContext = createContext(undefined);
/**
 * Layout boundary supplied by a shrink-wrapping parent such as LabDock.
 * This is the available actions slot width, before fitting, rather than the
 * width of the currently visible actions. Undefined uses the bar's own host.
 */
export function LabActionsWidthProvider({ value, children, }) {
    return _jsx(LabActionsWidthContext.Provider, { value: value, children: children });
}
export function useLabActionsWidth() {
    return useContext(LabActionsWidthContext);
}
//# sourceMappingURL=width-context.js.map