/**
 * Pure maths of a control's glass lens: the moving part of a segmented control, a switch or a
 * slider that turns into clear glass while pressed or dragged (iOS 26: "control thumbs … have a new
 * liquid glass appearance for interactions"). It swells, stretches along the drag with its speed,
 * shows the touch glow (`glass/press`) and springs back. Also the switch's drag-to-toggle, a
 * content button's press scale and the invisible touch hit area. Shared with the Flutter twin
 * (`lens_model.dart`, vectors in `flutter/test/fixtures/lens.json`).
 */
/** How much a pressed switch or slider thumb grows into its lens (iOS: about 1.3–1.5×,
 * research/liquid-glass/IOS27-CONTROLS.md §7). A segmented pill swells by `GLASS_PRESS_SCALE`. */
export declare const LENS_THUMB_SCALE = 1.4;
/** The lens stretches by the distance the pointer covers in this many seconds (rubber-banded). */
export declare const LENS_STRETCH_TIME = 0.1;
/** How far (px) a switch thumb can be pulled past either end, with rubber-band resistance. */
export declare const SWITCH_OVERDRAG = 6;
/** Deceleration a released switch thumb is projected with (`projectMomentum`), like a segmented pill. */
export declare const SWITCH_DECELERATION = 0.97;
/** How much a filled, tonal, elevated, outlined or destructive button in content grows while pressed:
 * a subtle, iOS-like give with no glow. Glass (toolbar) buttons swell by `GLASS_PRESS_SCALE`. */
export declare const CONTENT_PRESS_SCALE = 1.03;
/** Travel (px) before a press on a switch becomes a drag: mouse and pen, then touch. */
export declare const SWITCH_SLOP: {
    readonly mouse: 4;
    readonly touch: 10;
};
/** How far (px, signed) a lens stretches along a drag moving at `velocity` px/s. */
export declare function lensStretch(velocity: number): number;
/**
 * Where a dragged switch thumb is, as 0 (off) … 1 (on): where it started plus the pointer's travel
 * `dx` (px, logical: toward on is positive) over the thumb's `travel` (px), with a slight rubber
 * band past either end.
 */
export declare function switchDragPosition(start: number, dx: number, travel: number): number;
/** The state a released switch thumb settles on: where its momentum (`velocity` in positions per
 * second) would carry it, so a flick toggles and a careful drop stays on its side. */
export declare function switchSnap(position: number, velocity: number): 0 | 1;
/** How far (px) a control `size` px long reaches past each edge to make a `target` px hit area. */
export declare function touchOutset(size: number, target: number): number;
//# sourceMappingURL=lens-model.d.ts.map