import * as React from 'react';
import './split-view.css';
export type SplitViewProps = {
    /** The list column: usually a NavigationPage with selectable rows. */
    list: React.ReactElement;
    /**
     * The open item's pages, first page first, each keyed. Empty or null when nothing is selected.
     * Wide: they form the detail column's own stack. Narrow: they are pushed on top of the list.
     */
    detail?: React.ReactNode;
    /** Shown in the detail column while nothing is selected (wide only). */
    placeholder?: React.ReactNode;
    /** The person went back from the top detail page. Remove it (or clear the selection). */
    onBack: () => void;
    /** Controlled list column width in px. */
    listWidth?: number;
    /** Initial list column width when uncontrolled. Default 360. */
    defaultListWidth?: number;
    /** Called when the divider is dragged or moved with the keyboard; persist it if you like. */
    onListWidthChange?: (width: number) => void;
    /** Narrowest list column. Default 280. */
    minListWidth?: number;
    /** Widest list column. Default 520. */
    maxListWidth?: number;
    /** Lets the divider be dragged or moved with the arrow keys. Default true. */
    resizable?: boolean;
    /** Below this width (px) the split collapses into one navigation stack. Default 720. */
    compactBreakpoint?: number;
    /** Accessible name of the split view. */
    label?: string;
    className?: string;
};
/**
 * A list beside its detail, like Mail on iPad: two columns with a resizable divider on wide
 * screens, collapsing into one navigation stack (list → detail, swipe back) on narrow ones. The
 * same pages render in both, so a phone and a desktop share one implementation.
 */
export declare function SplitView({ list, detail, placeholder, onBack, listWidth: controlledWidth, defaultListWidth, onListWidthChange, minListWidth, maxListWidth, resizable, compactBreakpoint, label, className, }: SplitViewProps): React.JSX.Element;
/** Quiet centered message for an empty detail column. */
export declare function SplitPlaceholder({ icon, title, children, }: {
    /** A large, muted icon. */
    icon?: React.ReactNode;
    /** One line: what to do (“Select an order”). */
    title: React.ReactNode;
    /** Optional help under the title. */
    children?: React.ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=split-view.d.ts.map