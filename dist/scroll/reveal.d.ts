type Alignment = 'nearest' | 'center' | false;
/** Reveal only inside the supplied viewport; native scrollIntoView also moves ancestors. */
export declare function revealScrollChild(viewport: HTMLElement | null | undefined, child: HTMLElement | null | undefined, { block, inline, behavior, }?: {
    block?: Alignment;
    inline?: Alignment;
    behavior?: ScrollBehavior;
}): void;
export {};
//# sourceMappingURL=reveal.d.ts.map