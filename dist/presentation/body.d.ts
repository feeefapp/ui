import * as React from 'react';
import './presentation.css';
export type PresentationBodyProps = {
    /** Accessible name of the scroll region. */
    label: string;
    /** Chrome floating over the top, usually a `PresentationHeader`. Its height is reserved. */
    top?: React.ReactNode;
    /** Chrome floating over the bottom, usually a `PresentationDock`. Its height is reserved. */
    bottom?: React.ReactNode;
    /**
     * False (default): as tall as the content plus its floating chrome, up to the height the surface
     * allows, then it scrolls. True: takes all of that height (lists, full-height panes).
     */
    fill?: boolean;
    /** Space in px between the floats and the edges. Default: the shell gap G. */
    edgeGap?: number;
    /** Content padding in px. Default: the shell gap G; dialogs pass 16 (a card's inside). */
    contentPadding?: number;
    /** Called with the natural height (content + reserved chrome) whenever it changes. */
    onNaturalHeight?: (height: number) => void;
    /** Class name of the body (the flex item holding the scroll area). */
    className?: string;
    /** The content. Don't nest another vertical scroll area in it. */
    children: React.ReactNode;
};
/**
 * The scrolling body of a presentation surface: a `ScrollArea` whose header and dock float over
 * the content. It is a flex item of its surface: it hugs the content plus the floating chrome,
 * shrinks to the height the surface allows (and then scrolls), or fills that height with `fill`.
 * The forwarded ref is the scrolling viewport.
 */
export declare const PresentationBody: React.ForwardRefExoticComponent<PresentationBodyProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=body.d.ts.map