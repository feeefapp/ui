/// Pure geometry for `Sheet`: detent heights, where a release lands, and the dimming. The twin of
/// `@feeef.dev/ui/containers/sheet-model`.
library;

import 'dart:math' as math;

import '../physics/spring.dart';

/// How a [SheetDetent] measures its height.
enum SheetDetentKind { medium, large, fit, pixels, percent }

/// A height a sheet can rest at: [medium] (half the screen), [large] (almost full), [fit] (its
/// content, up to large), a pixel height ([SheetDetent.px]), or a percentage of the screen
/// ([SheetDetent.percent], like `'35%'`).
class SheetDetent {
  const SheetDetent._(this.kind, [this.value = 0]);

  /// A pixel height.
  const SheetDetent.px(double pixels) : this._(SheetDetentKind.pixels, pixels);

  /// A percentage (0–100) of the area the sheet covers.
  const SheetDetent.percent(double percent)
    : this._(SheetDetentKind.percent, percent);

  /// Half the area the sheet covers.
  static const medium = SheetDetent._(SheetDetentKind.medium);

  /// Almost full height: the area minus the top inset.
  static const large = SheetDetent._(SheetDetentKind.large);

  /// The sheet's natural content height, up to [large].
  static const fit = SheetDetent._(SheetDetentKind.fit);

  /// How the height is measured.
  final SheetDetentKind kind;

  /// Pixels or percent for [SheetDetentKind.pixels] / [SheetDetentKind.percent]; 0 otherwise.
  final double value;

  @override
  bool operator ==(Object other) =>
      other is SheetDetent && other.kind == kind && other.value == value;

  @override
  int get hashCode => Object.hash(kind, value);

  @override
  String toString() => switch (kind) {
    SheetDetentKind.medium => 'medium',
    SheetDetentKind.large => 'large',
    SheetDetentKind.fit => 'fit',
    SheetDetentKind.pixels => '$value',
    SheetDetentKind.percent => '$value%',
  };
}

/// What a detent is measured against.
class SheetMetrics {
  const SheetMetrics({
    required this.hostHeight,
    required this.topInset,
    required this.natural,
  });

  /// Height of the area the sheet covers (the screen, or the container).
  final double hostHeight;

  /// Gap kept above a large sheet (safe area + breathing room).
  final double topInset;

  /// The sheet's natural content height, for [SheetDetent.fit].
  final double natural;
}

/// JS `Math.round` (halves round up).
double _round(double v) => (v + 0.5).floorToDouble();

/// Pixel height of one detent, clamped to [0, large].
double detentHeight(SheetDetent detent, SheetMetrics m) {
  final large = math.max(0.0, m.hostHeight - m.topInset);
  final value = switch (detent.kind) {
    SheetDetentKind.large => large,
    SheetDetentKind.medium => m.hostHeight * 0.5,
    SheetDetentKind.fit => m.natural,
    SheetDetentKind.pixels => detent.value,
    SheetDetentKind.percent => (detent.value / 100) * m.hostHeight,
  };
  return _round(math.max(0.0, math.min(large, value)));
}

/// Every detent's height, in the order given.
List<double> detentHeights(List<SheetDetent> detents, SheetMetrics m) => [
  for (final d in detents) detentHeight(d, m),
];

/// The visible height while a finger drags the sheet: 1:1 between its lowest and highest rest
/// heights, rubber-banded above the highest, and below the lowest either free (dismissible, down
/// to 0) or rubber-banded.
double dragHeight(
  double raw,
  List<double> heights,
  double hostHeight,
  bool dismissible,
) {
  final min = heights.reduce(math.min), max = heights.reduce(math.max);
  if (raw > max) return max + rubberBand(raw - max, hostHeight);
  if (raw < min) {
    return dismissible
        ? math.max(0.0, raw)
        : min + rubberBand(raw - min, hostHeight);
  }
  return raw;
}

/// Where a released sheet goes. [velocity] is upward speed in px/s (positive = growing). The
/// height is projected with the flick's momentum and snapped to the nearest detent, or to 0
/// (dismiss) when that is nearer and the sheet is dismissible.
({double height, int index, bool dismiss}) releaseTarget(
  double visible,
  double velocity,
  List<double> heights,
  bool dismissible,
) {
  final projected = projectMomentum(visible, velocity, 0.99);
  final targets = dismissible ? [0.0, ...heights] : [...heights];
  final height = nearestTarget(projected, targets);
  if (dismissible && height == 0) {
    return (height: 0, index: -1, dismiss: true);
  }
  return (height: height, index: heights.indexOf(height), dismiss: false);
}

/// Scrim strength 0–1: full at or above the lowest detent, fading as the sheet leaves.
double sheetDim(double visible, List<double> heights) {
  final min = math.max(1.0, heights.reduce(math.min));
  return (visible / min).clamp(0.0, 1.0);
}

/// How far the page behind should recede (0–1): only as the sheet rises from below `large`
/// toward full height, like an iOS page sheet stacking over its presenter.
double sheetRecede(double visible, double large) {
  final start = large * 0.72;
  if (large <= 0 || visible <= start) return 0;
  return ((visible - start) / (large - start)).clamp(0.0, 1.0);
}
