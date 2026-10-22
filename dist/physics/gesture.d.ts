export type PanAxis = 'x' | 'y';
export type PointerKind = 'mouse' | 'touch' | 'pen';
/** A pan's state: movement since it was recognized, and the pointer's speed. */
export type PanPoint = {
    /** Horizontal movement in px since the pan was recognized (client coordinates, never mirrored). */
    dx: number;
    /** Vertical movement in px since the pan was recognized. */
    dy: number;
    /** Horizontal speed in px per second. */
    vx: number;
    /** Vertical speed in px per second. */
    vy: number;
    /** Client position where the pan was recognized. */
    originX: number;
    originY: number;
    pointerType: PointerKind;
    /** The event's timestamp (ms, same clock as `performance.now()`), for velocity tracking. */
    time: number;
};
/** What `shouldStart` sees: the first decisive movement and the element under the pointer. */
export type PanBegin = PanPoint & {
    /** Element the pointer went down on. */
    target: Element | null;
    /** Sign of the movement along the pan's axis: 1 = right/down, -1 = left/up (physical). */
    direction: 1 | -1;
};
export type PanOptions = {
    /** The axis this pan owns. Movement mostly along the other axis is left to the browser. */
    axis: PanAxis;
    /** Travel in px before the pan decides. Defaults to 10 for touch, 4 for mouse and pen. */
    threshold?: number;
    /** Pointer kinds that may drive the pan. Default: all. */
    pointers?: readonly PointerKind[];
    /** On contact. Return false to ignore this pointer (e.g. it is not near the edge). */
    canBegin?: (info: {
        x: number;
        y: number;
        target: Element | null;
        pointerType: PointerKind;
    }) => boolean;
    /** Once movement passes the threshold along `axis`. Return false to hand it back to the browser. */
    shouldStart?: (info: PanBegin) => boolean;
    onStart?: (point: PanPoint) => void;
    onMove?: (point: PanPoint) => void;
    /** The pan ended; `cancelled` when the browser took the pointer (e.g. a system gesture). */
    onEnd?: (point: PanPoint & {
        cancelled: boolean;
    }) => void;
    /**
     * How touch competes with native scrolling. `pointer` (default) relies on CSS `touch-action` on
     * the element (`pan-y` for an x pan, `pan-x` for a y pan). `claim` decides on the first few
     * pixels and cancels the browser's scroll for touches it takes: for a sheet over its own
     * scrolling content, where both want the same axis.
     */
    touch?: 'pointer' | 'claim';
};
/**
 * Recognizes a one-finger pan on `element` along one axis, with velocity, and hands the movement
 * to callbacks: the gesture layer under sheets, stacks and anything you drag. It never moves
 * anything itself. `options` is read on every event, so callers can pass a live getter.
 */
export declare function attachPan(element: HTMLElement, options: () => PanOptions): () => void;
/**
 * True when `target` (or an ancestor up to `boundary`) can still scroll in `direction` along
 * `axis`, or is a control that drags on that axis itself (sliders, number fields, `data-lab-pan`).
 * Pans use it to leave nested scrollers and draggable controls alone.
 */
export declare function canChildPan(target: Element | null, boundary: Element, axis: PanAxis, direction: 1 | -1): boolean;
//# sourceMappingURL=gesture.d.ts.map