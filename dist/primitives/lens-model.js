import { glassStretch } from '../glass/press.js';
import { projectMomentum, rubberBandClamp } from '../physics/spring.js';
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
export const LENS_THUMB_SCALE = 1.54;
/** How far (px) a liquid pill lens (segmented control, tab bar) reaches past its pill: iOS 26.2's
 * 96 × 28 segment pill becomes a 120 × 44 lens and a 54 px tab pill a ~72 px one, sticking out of
 * its bar (LENS-MEASURED.md §1). Flutter's `lensPillLift` matches. */
export const LENS_PILL_LIFT = { x: 12, y: 8 };
/** How much a tab bar's selected item (icon and label) grows under the lens: iOS 26.2's goes from
 * 26.7 to 32 pt wide (LENS-MEASURED.md §4). Segmented labels and the backdrop never grow: iOS
 * lenses don't magnify. Flutter's `lensTabScale` matches. */
export const LENS_TAB_SCALE = 1.2;
/**
 * The glass a pill turns into at `lens` (0 rest … 1 glass): liquid glass lifts it out by
 * `LENS_PILL_LIFT` (corners grow with it), transparent glass keeps the pill's own box. `radius` is
 * the pill's corner radius.
 */
export function lensPillShape(pill, radius, lens, liquid) {
    const t = liquid ? clampLens(lens) : 0;
    const x = LENS_PILL_LIFT.x * t;
    const y = LENS_PILL_LIFT.y * t;
    return {
        x: pill.x - x,
        y: pill.y - y,
        width: pill.width + 2 * x,
        height: pill.height + 2 * y,
        radius: Math.min(radius, pill.width / 2, pill.height / 2) + y,
    };
}
/** The scale of a tab bar's selected item under the lens (`LENS_TAB_SCALE` eased in); 1 for a
 * segmented control and wherever no lens shows. */
export function lensInkZoom(lens, tab) {
    return tab ? 1 + (LENS_TAB_SCALE - 1) * clampLens(lens) : 1;
}
function clampLens(lens) {
    return Number.isFinite(lens) ? Math.max(0, Math.min(1, lens)) : 0;
}
/** The lens stretches by the distance the pointer covers in this many seconds (rubber-banded). */
export const LENS_STRETCH_TIME = 0.1;
/** How far (px) a switch thumb can be pulled past either end, with rubber-band resistance. */
export const SWITCH_OVERDRAG = 6;
/** Deceleration a released switch thumb is projected with (`projectMomentum`), like a segmented pill. */
export const SWITCH_DECELERATION = 0.97;
/** How much a filled, tonal, elevated, outlined or destructive button in content grows while pressed:
 * a subtle, iOS-like give with no glow. Glass (toolbar) buttons swell by `GLASS_PRESS_SCALE`. */
export const CONTENT_PRESS_SCALE = 1.03;
/** Travel (px) before a press on a switch becomes a drag: mouse and pen, then touch. */
export const SWITCH_SLOP = { mouse: 4, touch: 10 };
/** How far (px, signed) a lens stretches along a drag moving at `velocity` px/s. */
export function lensStretch(velocity) {
    return glassStretch(velocity * LENS_STRETCH_TIME, 0).x;
}
/**
 * Where a dragged switch thumb is, as 0 (off) … 1 (on): where it started plus the pointer's travel
 * `dx` (px, logical: toward on is positive) over the thumb's `travel` (px), with a slight rubber
 * band past either end.
 */
export function switchDragPosition(start, dx, travel) {
    if (!(travel > 0))
        return start;
    return rubberBandClamp(start * travel + dx, 0, travel, SWITCH_OVERDRAG) / travel;
}
/** The state a released switch thumb settles on: where its momentum (`velocity` in positions per
 * second) would carry it, so a flick toggles and a careful drop stays on its side. */
export function switchSnap(position, velocity) {
    return projectMomentum(position, velocity, SWITCH_DECELERATION) >= 0.5 ? 1 : 0;
}
/** How far (px) a control `size` px long reaches past each edge to make a `target` px hit area. */
export function touchOutset(size, target) {
    return Math.max(0, (target - size) / 2);
}
//# sourceMappingURL=lens-model.js.map