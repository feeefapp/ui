import 'dart:math' as math;
import 'dart:ui' show Offset, Rect;

/// The tab bar's minimize morph as pure geometry: the twin of
/// `src/containers/tab-view-minimize.ts`. One progress value runs from 0 (the full bar, the
/// accessory above it) to 1 (the selected tab as a round bubble at the leading edge, the accessory
/// filling the rest of the row). Scrolling moves the progress; every frame places the pieces
/// between the boxes measured at rest.

/// Boxes measured with the bar full, in the chrome's coordinates.
class MinimizeBoxes {
  const MinimizeBoxes({
    required this.chrome,
    required this.bar,
    required this.track,
    required this.option,
    required this.icon,
    required this.accessory,
    required this.gap,
    required this.rtl,
  });

  final Rect chrome;
  final Rect bar;

  /// The tabs' resting width: held while minimizing, the bar clips them.
  final double track;

  /// The selected tab.
  final Rect option;

  /// How far the selected tab's icon is from the tab's centre (it moves there as the label goes).
  final Offset icon;
  final Rect? accessory;

  /// Space between the accessory and the bar.
  final double gap;
  final bool rtl;
}

/// Where the pieces sit at one progress value.
class MinimizeFrame {
  const MinimizeFrame({
    required this.bar,
    required this.accessory,
    required this.trackShift,
    required this.icon,
  });

  final Rect bar;

  /// The accessory's left, top and width (its height stays its own): `Rect.fromLTWH(x, y, w, 0)`.
  final Rect? accessory;

  /// Moves the tabs so the selected one ends centred in the round bubble.
  final Offset trackShift;

  /// Moves the selected icon to the centre of its tab.
  final Offset icon;
}

/// Scroll distance (px) that takes the bar from full to minimized.
const double minimizeDistance = 56;

/// Scrolling back up restores it over a shorter distance, so the bar returns readily.
const double restoreDistance = 40;

/// The minimized bubble's diameter (iOS 27: a 40pt tab in a 48pt glass circle), centred on the
/// line the full bar sat on.
const double minimizedSize = 48;

/// Within this distance of the top the bar can't be more minimized than the scroll position
/// allows.
const double minimizeTop = 24;

double _lerp(double a, double b, double t) => a + (b - a) * t;
double _clamp01(double v) => math.min(1, math.max(0, v));

/// The bar gives up its width early...
double _early(double t) => 1 - math.pow(1 - t, 4).toDouble();

/// ...and the accessory drops into the row only once the bar has made room (smoothstep, delayed).
double _descend(double t) {
  final u = _clamp01((t - 0.35) / 0.65);
  return u * u * (3 - 2 * u);
}

/// The progress after the content scrolled by [delta] px to [top].
double minimizeProgress(double progress, double delta, double top) {
  if (top <= 0) return 0;
  final next =
      progress + delta / (delta > 0 ? minimizeDistance : restoreDistance);
  return _clamp01(math.min(next, top / minimizeTop));
}

/// Where the pieces sit at progress [t].
MinimizeFrame minimizeGeometry(MinimizeBoxes at, double t) {
  final p = _clamp01(t);
  final round = math.min(at.bar.height, minimizedSize);
  final barEnd = at.rtl ? at.chrome.width - round : 0.0;
  final shrink = _early(p);
  final height = _lerp(at.bar.height, round, shrink);
  final bar = Rect.fromLTWH(
    _lerp(at.bar.left, barEnd, shrink),
    at.bar.top + (at.bar.height - height) / 2,
    _lerp(at.bar.width, round, shrink),
    height,
  );
  Rect? accessory;
  final a = at.accessory;
  if (a != null) {
    final y = _lerp(
      a.top,
      at.bar.top + (at.bar.height - a.height) / 2,
      _descend(p),
    );
    // Its outer edge glides to the chrome's edge; its inner edge never crosses the shrinking bar
    // once the two share a row, so the accessory makes room as the bar gives it.
    final sharesRow = y + a.height > at.bar.top;
    if (at.rtl) {
      final left = _lerp(a.left, 0, shrink);
      var right = _lerp(a.right, at.chrome.width - round - at.gap, shrink);
      if (sharesRow) right = math.min(right, bar.left - at.gap);
      accessory = Rect.fromLTWH(left, y, math.max(0, right - left), 0);
    } else {
      final right = _lerp(a.right, at.chrome.width, shrink);
      var left = _lerp(a.left, round + at.gap, shrink);
      if (sharesRow) left = math.max(left, bar.right + at.gap);
      accessory = Rect.fromLTWH(left, y, math.max(0, right - left), 0);
    }
  }
  final optionCentre = at.option.left - at.bar.left + at.option.width / 2;
  final optionMiddle = at.option.top - at.bar.top + at.option.height / 2;
  return MinimizeFrame(
    bar: bar,
    accessory: accessory,
    trackShift: Offset(
      (round / 2 - optionCentre) * shrink,
      (round / 2 - optionMiddle) * shrink,
    ),
    icon: at.icon * p,
  );
}
