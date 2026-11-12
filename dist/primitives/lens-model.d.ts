import type { GlassShape } from '../glass/geometry.js';
/**
 * Pure maths of a control's glass lens: the moving part of a segmented control, a switch or a
 * slider that turns into clear glass while pressed or dragged (iOS 26: "control thumbs … have a new
 * liquid glass appearance for interactions"). It swells, stretches along the drag with its speed,
 * shows the touch glow (`glass/press`) and springs back. Also the switch's drag-to-toggle, a
 * content button's press scale and the invisible touch hit area. Shared with the Flutter twin
 * (`lens_model.dart`, vectors in `flutter/test/fixtures/lens.json`).
 */
/** How much a pressed switch or slider thumb grows into its lens: iOS 26.2's 37 × 24 thumb becomes
 * a 57 × 37 lens (research/liquid-glass/LENS-MEASURED.md §1). A segmented pill grows by
 * `LENS_PILL_LIFT` instead. */
export declare const LENS_THUMB_SCALE = 1.54;
/** How far (px) a liquid pill lens (segmented control, tab bar) reaches past its pill: iOS 26.2's
 * 96 × 28 segment pill becomes a 120 × 44 lens and a 54 px tab pill a ~72 px one, sticking out of
 * its bar (LENS-MEASURED.md §1). Flutter's `lensPillLift` matches. */
export declare const LENS_PILL_LIFT: {
    readonly x: 12;
    readonly y: 8;
};
/** How much the selected option (a tab's icon and label, a segment's label) grows under the lens,
 * like iOS 26.2's tab item (26.7 → 32 pt wide, LENS-MEASURED.md §4): the selection reads as one
 * switch-thumb lens over every track. The backdrop itself never grows. Flutter's
 * `lensLabelScale` matches. */
export declare const LENS_LABEL_SCALE = 1.2;
/**
 * The glass a pill turns into at `lens` (0 rest … 1 glass): a lens that bends what is behind it
 * (`lifts`: liquid glass where refraction runs) lifts out by `LENS_PILL_LIFT` (corners grow with
 * it), its convex rim filling the overhang with what lies inside the rest pill; a lens that can't
 * bend keeps the pill's own box, so it never shows the track's edge or what is past it. `radius` is
 * the pill's corner radius.
 */
export declare function lensPillShape(pill: {
    x: number;
    y: number;
    width: number;
    height: number;
}, radius: number, lens: number, lifts: boolean): GlassShape;
/**
 * The scale of an option under the lens, around the option's own centre: `LENS_LABEL_SCALE` eased in
 * with the lens and by how much of the option it covers (`lensCoverage`; 1 for the option it rests
 * on), so a dragged lens grows the options it passes and never tears their content.
 */
export declare function lensInkZoom(lens: number, coverage?: number): number;
/**
 * How strongly an option shows the selected ink, 0 … 1. At rest the ink is cut to the pill as it
 * passes (a label turns over where the opaque pill covers it, 1 inside it); under the lens the cut
 * opens to the whole option (`lens` of the way) and the ink fades with how much of the option the
 * lens covers, so a label changes colour as one piece, never split down a word.
 */
export declare function lensInkAlpha(lens: number, coverage: number): number;
/**
 * How much of an option's plain (unselected) content shows under its ink: all of it at rest (the
 * ink is cut to the pill and the plain content shows around it); under the lens it fades out as the
 * ink fades in, so the two copies crossfade and never show both at full strength (a scaled copy is
 * rasterized on its own pixel grid, which would leave a ghost edge).
 */
export declare function lensPlainAlpha(lens: number, coverage: number): number;
/**
 * How much of an option (`start`, `width` along the track) the pill (`pillStart`, `pillWidth`)
 * covers, 0 … 1: 1 when their centres meet, 0 an option's width apart, eased (smoothstep) between.
 */
export declare function lensCoverage(pillStart: number, pillWidth: number, start: number, width: number): number;
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