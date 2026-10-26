import 'dart:math' as math;

import '../physics/spring.dart' show rubberBand;

/// Pull-to-refresh geometry (pure): the twin of `pull-refresh-model.ts` in
/// `@feeef.dev/ui/scroll`. A pull starts at the top of a scroll area after [pullRefreshSlop] px of
/// downward travel, follows the finger with rubber-band resistance, refreshes when released past
/// [pullRefreshThreshold], and holds the content [pullRefreshHold] px open (the loader with 16px
/// above and below) until the refresh completes.
const double pullRefreshThreshold = 64;

/// Gap (px) the content holds open while refreshing.
const double pullRefreshHold = 52;

/// Loader size (px).
const double pullRefreshLoader = 20;

/// Finger travel (px) before a pull starts, so taps and jitters never pull.
const double pullRefreshSlop = 6;

/// Visible pull for [travel] px of finger travel in an area [dimension] px tall: rubber-banded like
/// iOS overscroll. Reduced motion follows the finger at half speed without the rubber band, capped
/// at 1.5 × the threshold.
double pullDistance(double travel, double dimension, {bool reduced = false}) {
  if (!(travel > 0)) return 0;
  if (reduced) return math.min(travel / 2, pullRefreshThreshold * 1.5);
  return rubberBand(travel, math.max(1, dimension));
}

/// How far toward a refresh the pull is, 0 … 1 (the loader lights a square per ninth).
double pullProgress(double distance) =>
    (distance / pullRefreshThreshold).clamp(0.0, 1.0);

/// Where a released pull settles: open at [pullRefreshHold] and refreshing, or closed.
({bool refresh, double target}) pullRelease(double distance) =>
    distance >= pullRefreshThreshold
    ? (refresh: true, target: pullRefreshHold)
    : (refresh: false, target: 0);

/// Top of the loader below the area's top reservation: centred in the revealed gap.
double pullLoaderTop(double distance) =>
    math.max(0, distance) / 2 - pullRefreshLoader / 2;
