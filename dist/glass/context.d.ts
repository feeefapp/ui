/**
 * How a bubble's glass follows its layout: `spring` animates every change (default); `follow`
 * tracks the element exactly, for bubbles that animate their own size (dock, search).
 */
export type GlassMotion = 'spring' | 'follow';
export type GlassMemberOptions = {
    /** Bubbles sharing a union name draw as one shape spanning all of them, even when apart. */
    union?: string;
    motion?: GlassMotion;
    /**
     * The control this bubble comes out of (a menu's button): the bubble is born out of it and
     * returns into it when it leaves (`GLASS_ORIGIN_SPRINGS`), whatever else is in the container, and
     * its content is clipped to its glass while it travels. A glass origin (inside a
     * `[data-glass-member]`) gives the rect of the bubble hugging it (else its own), so the bubble
     * leaves and rejoins that glass; any other origin gives a small droplet at its centre
     * (`glassOrigin`).
     */
    origin?: HTMLElement | null;
};
export type GlassRegistry = {
    /** Adds a bubble to the container's material. Returns the function that removes it. */
    register(id: string, element: HTMLElement, options: GlassMemberOptions): () => void;
    /** Re-measures before the next paint (bubbles call it after every render). */
    requestMeasure(): void;
};
/** Inside a GlassBar: the tint it raised its glass to (blur is always on there); null outside one. */
export declare const GlassBarContext: import("react").Context<{
    tint: number;
} | null>;
/** The nearest GlassContainer, or null when a bubble paints its own glass. */
export declare const GlassContext: import("react").Context<GlassRegistry | null>;
//# sourceMappingURL=context.d.ts.map