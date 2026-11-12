export type FrameView = {
    x: number;
    y: number;
    scale: number;
};
export type FrameRect = {
    left: number;
    right: number;
    width: number;
    height: number;
};
/**
 * Horizontal room a floating panel occupies.
 * A side column (the project rail, the poster inspector) reserves space.
 * A full-width sheet does not, because it covers the canvas on purpose.
 */
export declare function sideInset(open: boolean, rect: FrameRect | null | undefined, viewportW: number, side: 'left' | 'right', gap?: number): number;
/**
 * After the focused card is fitted, pull any card that is already peeking out
 * from under a side panel fully into the free area. The focus stays inside
 * that area; cards that are completely hidden stay put so a long history does
 * not shove the current poster to the opposite edge.
 */
export declare function revealCovered<T extends {
    x: number;
    w: number;
}>(view: FrameView, cards: T[], focus: T, viewport: {
    w: number;
}, insets: {
    left: number;
    right: number;
}, padding?: number): FrameView;
//# sourceMappingURL=freeform-frame.d.ts.map