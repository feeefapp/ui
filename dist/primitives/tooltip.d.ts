import * as React from 'react';
import './tooltip.css';
/**
 * Groups tooltips so moving from one control to the next skips the hover delay. Put one around a
 * toolbar or a screen; `ActionsBar` brings its own.
 */
export declare function TooltipProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export type TooltipProps = {
    /** The text. Nothing is wrapped when it is empty. */
    text?: string;
    /** Keyboard shortcut shown after the text, e.g. `B` or `⌘Z`. */
    shortcut?: string;
    /** Side of the control it opens on. Default `bottom`. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** One control that forwards its ref (a kit `Button`/`IconButton`). */
    children: React.ReactElement;
};
/**
 * The kit tooltip: a small opaque label shown on hover and keyboard focus, never on touch taps.
 * Needs a `TooltipProvider` above it. The control keeps its own `aria-label`; the tooltip is a
 * visual echo of it, so don't put information only here.
 */
export declare function Tooltip({ text, shortcut, side, children }: TooltipProps): React.JSX.Element;
//# sourceMappingURL=tooltip.d.ts.map