import * as React from 'react';
import './navigation-stack.css';
/** What a page inside a LabNavigationStack knows about its place in it. */
export type LabNavigationStackPage = {
    /** Distance from the root page; 0 for the root. */
    depth: number;
    /** True for the page on top, the one people see and use. */
    isTop: boolean;
    /** True when there is a page to go back to. */
    canGoBack: boolean;
    /** Goes back: the stack calls its `onBack`, which removes this page. */
    back: () => void;
    /** Title of the page underneath, shown by the back button. */
    previousTitle?: string;
};
/** The nearest stack page's position and `back()`. Outside a stack: a root page that cannot go back. */
export declare function useLabNavigationStack(): LabNavigationStackPage;
/**
 * Path state for a stack: an array of route values, root page not included. Map it to pages
 * (`path.map((route) => <LabNavigationPage key=… />)`) and pass `pop` as the stack's `onBack`.
 */
export declare function useLabNavigationPath<T>(initial?: T[]): {
    path: T[];
    setPath: React.Dispatch<React.SetStateAction<T[]>>;
    push: (route: T) => void;
    pop: (count?: number) => void;
    popToRoot: () => void;
    replace: (route: T) => void;
};
export type LabNavigationStackProps = {
    /**
     * The pages, root first, each a keyed element (usually a LabNavigationPage). Append a page to
     * push it; remove the top one to pop. The stack animates whatever changed.
     */
    children: React.ReactNode;
    /** The person went back (back button or swipe). Remove the top page in response. */
    onBack?: () => void;
    /**
     * Swipe back with a finger or pen: from anywhere on the page (`content`, default, like iOS 26),
     * only from the leading edge (`edge`), or `off`. A mouse can always drag from the leading edge.
     */
    swipeBack?: 'content' | 'edge' | 'off';
    /** Accessible name of the stack region. */
    label?: string;
    className?: string;
    style?: React.CSSProperties;
};
/**
 * Push-and-pop page navigation, like iOS: a pushed page slides in over the current one, which
 * moves back with a parallax and dims; going back reverses it. Swiping toward the trailing edge
 * drags the page back with the finger and finishes or cancels from the release velocity. A page
 * pushed with `zoomSource` grows out of that element instead and can be dragged down to shrink
 * back into it. Every page stays mounted, so scroll positions and drafts survive.
 */
export declare function LabNavigationStack({ children, onBack, swipeBack, label, className, style, }: LabNavigationStackProps): React.JSX.Element;
export type LabNavigationPageProps = {
    /** Page title: the large title, the bar title once it scrolls away, and the next page's back label. */
    title: string;
    /** `large` shows a big title in the content that collapses into the bar; `inline` shows it in the bar. Default: large on the root page, inline when pushed. */
    titleDisplay?: 'large' | 'inline';
    /** Shown under the large title. */
    subtitle?: React.ReactNode;
    /** Extra controls after the back button, in the same glass group. */
    leading?: React.ReactNode;
    /** Controls at the end of the bar; wrap them in a LabToolbarGroup. */
    trailing?: React.ReactNode;
    /** Floats over the bottom, usually a LabDock with the page's actions. */
    bottom?: React.ReactNode;
    /** What the back button of the next page says for this one. Defaults to `title`. */
    backTitle?: string;
    /** Hides the bar (for full-bleed media pages); the stack's swipe still goes back. */
    hideBar?: boolean;
    /** When pushed, grow out of the element with `data-lab-zoom-source` equal to this id on the page below. */
    zoomSource?: string;
    /** Inline content padding in px. */
    contentPadding?: number;
    /** Accessible name of the scrolling content. Defaults to the title. */
    contentLabel?: string;
    children?: React.ReactNode;
    className?: string;
};
/**
 * One page of a LabNavigationStack: its own scroll area with a floating glass bar (back button
 * with the previous title, the page title, trailing actions) and an optional bottom dock. A large
 * title scrolls under the bar and reappears in it, like iOS.
 */
export declare function LabNavigationPage({ title, titleDisplay, subtitle, leading, trailing, bottom, hideBar, contentPadding, contentLabel, children, className, }: LabNavigationPageProps): React.JSX.Element;
//# sourceMappingURL=navigation-stack.d.ts.map