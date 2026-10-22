/** Pure model of a navigation stack: what changed between two page lists, and frame geometry. */
export type LabStackChange = {
    kind: 'none';
}
/** `enter` arrives on top of `exit` (the previous top, which stays below). */
 | {
    kind: 'push';
    enter: string;
    exit: string | null;
}
/** `exit` (the old top) leaves; `enter` is uncovered. `removed` lists every page that left. */
 | {
    kind: 'pop';
    enter: string | null;
    exit: string;
    removed: string[];
}
/** The top changed without a push or pop (a different detail, a reset). */
 | {
    kind: 'replace';
    enter: string;
    exit: string | null;
    removed: string[];
};
/** Classifies how a stack went from `previous` page keys to `next`, root first. */
export declare function diffStack(previous: readonly string[], next: readonly string[]): LabStackChange;
/** How far (fraction of the width) the page underneath slides while a page covers it, like iOS. */
export declare const LAB_STACK_PARALLAX = 0.3;
/**
 * Horizontal offsets in px for a slide transition. `shown` is how much the front page covers the
 * back one: 0 = front fully off its trailing edge, 1 = front in place. Mirrored for RTL.
 */
export declare function slideFrame(shown: number, width: number, rtl: boolean): {
    front: number;
    back: number;
    dim: number;
};
export type LabRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Interpolates two rects; `progress` is not clamped, so springs can overshoot through it. */
export declare function mixRect(from: LabRect, to: LabRect, progress: number): LabRect;
/**
 * Paint for a page of `page` size shown inside `rect` (stack coordinates): a uniform scale that
 * matches the rect's width, a translation to its corner, and a clip that crops the page's bottom
 * to the rect's height with `radius` corners (in screen px). Content is never stretched.
 */
export declare function zoomFrame(rect: LabRect, radius: number, page: {
    width: number;
    height: number;
}): {
    scale: number;
    transform: string;
    clip: string;
};
/**
 * Where a zoomed page sits while it is dragged to dismiss: it shrinks as it is pulled and the point
 * first grabbed stays under the finger. `anchor` is that point in page coordinates; `pull` is how
 * far it has been pulled toward dismissal (defaults to the downward movement).
 */
export declare function dragDismissRect(page: {
    width: number;
    height: number;
}, anchor: {
    x: number;
    y: number;
}, dx: number, dy: number, pull?: number): LabRect;
//# sourceMappingURL=stack-model.d.ts.map