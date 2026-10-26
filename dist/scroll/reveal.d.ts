type Alignment = 'nearest' | 'center' | false;
/**
 * Scrolls `viewport` the minimum needed to show `child`, honoring the viewport's scroll padding
 * (the floats' reservations). Unlike native scrollIntoView it never moves ancestors or the page.
 * Reduced motion forces an instant scroll.
 */
export declare function revealScrollChild(viewport: HTMLElement | null | undefined, child: HTMLElement | null | undefined, { block, inline, behavior, }?: {
    block?: Alignment;
    inline?: Alignment;
    behavior?: ScrollBehavior;
}): void;
export {};
//# sourceMappingURL=reveal.d.ts.map