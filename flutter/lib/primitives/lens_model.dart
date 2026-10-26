import '../glass/press.dart';
import '../physics/spring.dart';

/// Pure maths of a control's glass lens (the moving part of a segmented control, a switch or a
/// slider that turns into clear glass while pressed or dragged), the switch's drag-to-toggle, a
/// content button's press scale and the invisible touch hit area: the twin of `@feeef.dev/ui/primitives/lens-model` (vectors in
/// `test/fixtures/lens.json`).

/// How much a pressed switch or slider thumb grows into its lens (iOS: about 1.3–1.5×). A
/// segmented pill swells by [glassPressScale].
const double lensThumbScale = 1.4;

/// How far a liquid pill lens (segmented control, tab bar) lifts out past its pill on every side,
/// as a share of the pill's height: a 54 pt tab pill becomes a ~70 pt drop that sticks out of its
/// 62 pt bar and reaches into the neighbouring tabs, as iOS 27's (Figma tab bar notes).
const double lensPillLift = 0.15;

/// How much a liquid lens enlarges what it covers (the web kit's `LENS_MAGNIFY`): iOS 27 magnifies
/// about 1.15–1.25×.
const double lensMagnify = 0.18;

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
