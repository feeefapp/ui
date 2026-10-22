import * as React from 'react';
import './adaptive.css';
/** `compact` below the breakpoint, `regular` from it: the element's own width, not the window's. */
export type LabSizeClass = 'compact' | 'regular';
/** Width of `ref`'s element, kept current with a ResizeObserver; null before the first layout. */
export declare function useLabElementWidth(ref: React.RefObject<HTMLElement | null>): number | null;
/**
 * The size class of an element, like SwiftUI's horizontal size class but measured on the element,
 * so a component in a narrow pane is compact even on a wide screen.
 */
export declare function useLabSizeClass(ref: React.RefObject<HTMLElement | null>, breakpoint?: number): LabSizeClass;
export type LabAdaptiveStackProps = {
    /** The items. Each direct child moves as one piece when the stack changes axis. */
    children: React.ReactNode;
    /**
     * When to stack vertically: below a width in px, or `fit` (default) whenever the items would
     * not fit side by side at their natural width.
     */
    breakpoint?: number | 'fit';
    /** Space between items in px. Default 12. */
    gap?: number;
    /** Cross-axis alignment while horizontal. Default `center`. */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Main-axis distribution while horizontal. Default `start`. */
    justify?: 'start' | 'center' | 'end' | 'between';
    /** Called when the axis changes. */
    onAxisChange?: (axis: 'horizontal' | 'vertical') => void;
    className?: string;
    style?: React.CSSProperties;
};
/**
 * A row that becomes a column when there is no room, like SwiftUI's AnyLayout switching an HStack
 * for a VStack: the same children, re-laid out, each flying to its new place on a spring. Use it
 * for a summary card's stats, a form's actions, or a toolbar's groups.
 */
export declare function LabAdaptiveStack({ children, breakpoint, gap, align, justify, onAxisChange, className, style, }: LabAdaptiveStackProps): React.JSX.Element;
export type LabViewThatFitsProps = {
    /** Options from most to least preferred, e.g. a full toolbar, then icons only, then a menu. */
    children: React.ReactNode;
    /** Accessible names are each option's own; this labels nothing. */
    className?: string;
};
/**
 * Shows the first child that fits the available width, like SwiftUI's ViewThatFits: “Call
 * customer · Send SMS · Copy number”, else icons only, else one menu button. Every option is
 * measured off-screen at its natural width; the shown one swaps with a short fade.
 */
export declare function LabViewThatFits({ children, className }: LabViewThatFitsProps): React.JSX.Element;
//# sourceMappingURL=adaptive.d.ts.map