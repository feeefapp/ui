import 'dart:math' as math;
import 'dart:ui' show Rect;

import '../glass/press.dart';
import '../physics/spring.dart';

/// Pure maths of a control's glass lens (the moving part of a segmented control, a switch or a
/// slider that turns into clear glass while pressed or dragged), the switch's drag-to-toggle, a
/// content button's press scale and the invisible touch hit area: the twin of `@feeef.dev/ui/primitives/lens-model` (vectors in
/// `test/fixtures/lens.json`).

/// How much a pressed switch or slider thumb grows into its lens: iOS 26.2's 37 × 24 thumb becomes
/// a 57 × 37 lens (`research/liquid-glass/LENS-MEASURED.md` §1). A segmented pill grows by
/// [lensPillLiftX] and [lensPillLiftY] instead.
const double lensThumbScale = 1.54;

/// How far (px) a liquid pill lens (segmented control, tab bar) reaches past its rest pill on the
/// left and the right: iOS 26.2's 96 × 28 segment pill becomes a 120 × 44 lens (LENS-MEASURED.md
/// §1).
const double lensPillLiftX = 12;

/// How far (px) a liquid pill lens reaches past its rest pill above and below (its corners grow
/// by the same): a 54 px tab pill becomes a ~72 px lens that sticks out of its bar.
const double lensPillLiftY = 8;

/// How much the selected option (a tab's icon and label, a segment's label) grows under the lens,
/// like iOS 26.2's tab item (26.7 → 32 pt wide, LENS-MEASURED.md §4): the selection reads as one
/// switch-thumb lens over every track. The backdrop itself never grows. The web kit's
/// `LENS_LABEL_SCALE`.
const double lensLabelScale = 1.2;

/// The glass a pill [rect] at rest (corner [radius]) turns into at [lens] (0 rest … 1 glass): a
/// lens that bends what is behind it ([lifts]: liquid glass where refraction runs) lifts out by
/// [lensPillLiftX] / [lensPillLiftY] (corners grow with it), its convex rim filling the overhang with
/// what lies inside the rest pill; one that can't bend keeps the pill's own box, so it never shows
/// the track's edge or what is past it. The twin of the web kit's `lensPillShape`.
({Rect rect, double radius}) lensPillShape(
  Rect rect,
  double radius,
  double lens,
  bool lifts,
) {
  final t = lifts && lens.isFinite ? lens.clamp(0.0, 1.0) : 0.0;
  final x = lensPillLiftX * t;
  final y = lensPillLiftY * t;
  final r = math.min(radius, math.min(rect.width, rect.height) / 2);
  return (
    rect: Rect.fromLTRB(
      rect.left - x,
      rect.top - y,
      rect.right + x,
      rect.bottom + y,
    ),
    radius: r + y,
  );
}

/// The scale of an option under the lens, around the option's own centre: [lensLabelScale] eased in
/// with [lens] and by how much of the option it covers ([lensCoverage]; 1 for the option it rests
/// on), so a dragged lens grows the options it passes and never tears their content. The twin of
/// the web kit's `lensInkZoom`.
double lensInkZoom(double lens, [double coverage = 1]) {
  if (!lens.isFinite || !coverage.isFinite) return 1;
  return 1 +
      (lensLabelScale - 1) * lens.clamp(0.0, 1.0) * coverage.clamp(0.0, 1.0);
}

/// How much of an option ([start], [width] along the track) the pill ([pillStart], [pillWidth])
/// covers, 0 … 1: 1 when their centres meet, 0 an option's width apart, eased (smoothstep) between.
/// The twin of the web kit's `lensCoverage`.
double lensCoverage(
  double pillStart,
  double pillWidth,
  double start,
  double width,
) {
  if (!(width > 0) ||
      !pillStart.isFinite ||
      !pillWidth.isFinite ||
      !start.isFinite) {
    return 0;
  }
  final t =
      1 - (pillStart + pillWidth / 2 - (start + width / 2)).abs() / width;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/// The lens stretches by the distance the pointer covers in this many seconds (rubber-banded).
const double lensStretchTime = 0.1;

/// How far (px) a switch thumb can be pulled past either end, with rubber-band resistance.
const double switchOverdrag = 6;

/// Deceleration a released switch thumb is projected with ([projectMomentum]), like a segmented
/// pill.
const double switchDeceleration = 0.97;

/// How much a filled, tonal, elevated, outlined or destructive button in content grows while
/// pressed: a subtle, iOS-like give with no glow. Glass (toolbar) buttons swell by
/// [glassPressScale].
const double contentPressScale = 1.03;

/// Travel (px) before a press on a switch becomes a drag: mouse and pen.
const double switchSlopMouse = 4;

/// Travel (px) before a press on a switch becomes a drag: touch.
const double switchSlopTouch = 10;

/// How far (px, signed) a lens stretches along a drag moving at [velocity] px/s.
double lensStretch(double velocity) =>
    glassStretch(velocity * lensStretchTime, 0).x;

/// Where a dragged switch thumb is, as 0 (off) … 1 (on): where it started plus the pointer's
/// travel [dx] (px, logical: toward on is positive) over the thumb's [travel] (px), with a slight
/// rubber band past either end.
double switchDragPosition(double start, double dx, double travel) {
  if (!(travel > 0)) return start;
  return rubberBandClamp(start * travel + dx, 0, travel, switchOverdrag) /
      travel;
}

/// The state a released switch thumb settles on: where its momentum ([velocity] in positions per
/// second) would carry it, so a flick toggles and a careful drop stays on its side.
double switchSnap(double position, double velocity) =>
    projectMomentum(position, velocity, switchDeceleration) >= 0.5 ? 1 : 0;

/// How far (px) a control [size] px long reaches past each edge to make a [target] px hit area.
double touchOutset(double size, double target) =>
    target > size ? (target - size) / 2 : 0;
