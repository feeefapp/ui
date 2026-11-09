/// Pure geometry for `Sheet`: detent heights, where a release lands, the dimming, and the iOS 26/27
/// floating frame (a partial-height sheet floats inset from the edges on glass; rising toward full
/// height it reaches the edges and turns opaque, continuously with the height). The twin of
/// `@feeef.dev/ui/containers/sheet-model`.
library;

import 'dart:math' as math;
import 'dart:ui' show Rect;

import '../physics/spring.dart';

/// How a [SheetDetent] measures its height.
enum SheetDetentKind { peek, medium, large, fit, pixels, percent }

/// A height a sheet can rest at: [peek] (just its header, like the Maps search bar), [medium] (half
/// the screen), [large] (almost full), [fit] (its content, up to large), a pixel height ([SheetDetent.px]), or a percentage of the screen
/// ([SheetDetent.percent], like `'35%'`).
class SheetDetent {
  const SheetDetent._(this.kind, [this.value = 0]);

  /// A pixel height.
  const SheetDetent.px(double pixels) : this._(SheetDetentKind.pixels, pixels);

  /// A percentage (0–100) of the area the sheet covers.
  const SheetDetent.percent(double percent)
    : this._(SheetDetentKind.percent, percent);

  /// Just the grabber and the floating header: a sheet that lives on the page (Maps).
  static const peek = SheetDetent._(SheetDetentKind.peek);

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
    SheetDetentKind.peek => 'peek',
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
    this.peek,
  });

  /// Height of the area the sheet covers (the screen, or the container).
  final double hostHeight;

  /// Gap kept above a large sheet (safe area + breathing room).
  final double topInset;

  /// The sheet's natural content height, for [SheetDetent.fit].
  final double natural;

  /// The grabber plus the floating header and its gaps, for [SheetDetent.peek]. Default 72.
  final double? peek;
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
    SheetDetentKind.peek => m.peek ?? 72,
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

/// The height after one wheel or trackpad step of [delta] px (> 0 grows): up to [max], down to
/// [min], and on a dismissible sheet on below [min] at half speed, so scrolling up at the content's
/// top keeps pulling the sheet down until it can close ([wheelDismisses]).
double wheelHeight(
  double visible,
  double delta,
  double min,
  double max,
  bool dismissible,
) {
  if (delta > 0) return math.min(max, visible + delta);
  if (!dismissible) return math.max(min, math.min(visible, max) + delta);
  // Above [min] 1:1, the part of the step below it at half speed.
  final above = math.max(0.0, visible - min);
  final step = -delta;
  return step <= above
      ? visible - step
      : math.max(0.0, math.min(visible, min) - (step - above) * 0.5);
}

/// A sheet the wheel pulled to [visible], below its lowest height [min], closes when it stops.
bool wheelDismisses(double visible, double min) =>
    min - visible >= math.min(64.0, min * 0.35);

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

/// Scrim strength 0–1. Without [undimmed]: full at or above the lowest detent, fading as the sheet
/// leaves. With [undimmed] (the height up to which the page stays usable, iOS
/// `presentationBackgroundInteraction(.enabled(upThrough:))`): none up to it, rising to full at the
/// next detent above it (or at [large] when there is none).
double sheetDim(
  double visible,
  List<double> heights, [
  double? undimmed,
  double? large,
]) {
  if (undimmed == null) {
    final min = math.max(1.0, heights.reduce(math.min));
    return _clamp01(visible / min);
  }
  final above = heights.where((h) => h > undimmed + 0.5);
  final full = above.isNotEmpty
      ? above.reduce(math.min)
      : (large ?? heights.reduce(math.max));
  if (full <= undimmed) return 0;
  return _clamp01((visible - undimmed) / (full - undimmed));
}

/// How far the page behind should recede (0–1): only as the sheet rises from below `large`
/// toward full height, like an iOS page sheet stacking over its presenter.
double sheetRecede(double visible, double large) {
  final start = large * 0.72;
  if (large <= 0 || visible <= start) return 0;
  return _clamp01((visible - start) / (large - start));
}

/// How a sheet's surface follows its height ([sheetFrame]).
enum SheetFrameMode {
  /// A phone sheet with a partial detent: inset on glass, reaching the edges and turning opaque
  /// as it rises to `large`.
  float,

  /// Always edge to edge and opaque (a sheet with only full-height detents, as on iOS).
  attached,

  /// Always floating glass (iPad Maps).
  card,
}

/// How the sheet's surface is drawn at one height.
typedef SheetFrame = ({
  /// 0 at the lowest partial height, 1 at full height (attached).
  double expansion,

  /// Gap in px between the surface and the side and bottom edges.
  double gap,

  /// Radius in px of the bottom corners (the top corners keep the sheet radius).
  double bottomRadius,

  /// Opacity 0–1 of the opaque surface over the glass.
  double solid,
});

/// The surface at [visible] height. Floating: full gap and glass up to the lowest partial detent,
/// then the gap closes and the bottom corners square off along a smoothstep as the sheet rises to
/// full height (so a medium detent sits closer to the edges, as in Maps), while the opaque surface
/// fades in over the last stretch, reaching the edges exactly when it is fully opaque. [heights]
/// are the rest heights, [large] the full height, [inset] the floating gap, [radius] the sheet's
/// corner radius.
SheetFrame sheetFrame(
  double visible, {
  required List<double> heights,
  required double large,
  required double inset,
  required double radius,
  required SheetFrameMode mode,
  bool roundedBottom = false,
}) {
  if (roundedBottom) {
    final frame = sheetFrame(
      visible,
      heights: heights,
      large: large,
      inset: inset,
      radius: radius,
      mode: mode,
    );
    return (
      expansion: frame.expansion,
      gap: math.max(inset, frame.gap),
      bottomRadius: radius,
      solid: frame.solid,
    );
  }
  switch (mode) {
    case SheetFrameMode.attached:
      return (expansion: 1, gap: 0, bottomRadius: 0, solid: 1);
    case SheetFrameMode.card:
      return (expansion: 0, gap: inset, bottomRadius: radius, solid: 0);
    case SheetFrameMode.float:
      final partial = heights.where((h) => h < large - 0.5);
      final low = partial.isNotEmpty ? partial.reduce(math.min) : 0.0;
      final span = large - low;
      final expansion = span > 0 ? _clamp01((visible - low) / span) : 1.0;
      final close = _smooth(expansion);
      return (
        expansion: expansion,
        gap: inset * (1 - close),
        bottomRadius:
            radius * (1 - _smooth(_clamp01((expansion - 0.35) / 0.65))),
        solid: _smooth(_clamp01((expansion - 0.55) / 0.45)),
      );
  }
}

/// One frame of the morph out of (or back into) the control that opened the sheet.
typedef SheetMorphFrame = ({
  /// Panel translation: moves the clip window over the source at p = 0.
  double dx,
  double dy,

  /// Clip insets of the panel (CSS `inset(0 side bottom side round radius)`): the source's size
  /// at p = 0, the whole panel at p = 1.
  double side,
  double bottom,
  double radius,

  /// Opacity of the sheet's content.
  double content,
});

/// The sheet growing out of the button that opened it (iOS 26 `matchedTransitionSource`): at
/// [p] = 0 the panel is clipped to the source's size, its top centred on the source; at 1 it is
/// the panel at rest. Corners go from the source's radius to the sheet's. [panel] and [source] are
/// in the same pixels; the clip window grows from the panel's top centre, so the header arrives
/// first, and the content fades in as it arrives.
SheetMorphFrame sheetMorphFrame(
  double p,
  Rect panel,
  Rect source,
  double sourceRadius,
  double radius,
) {
  final t = math.max(0.0, p);
  final width = math.max(0.0, mix(source.width, panel.width, t));
  final height = math.max(0.0, mix(source.height, panel.height, t));
  final start = math.min(
    sourceRadius,
    math.min(source.height / 2, source.width / 2),
  );
  return (
    dx: (source.center.dx - panel.center.dx) * (1 - t),
    dy: (source.top - panel.top) * (1 - t),
    side: math.max(0.0, (panel.width - width) / 2),
    bottom: math.max(0.0, panel.height - height),
    radius: mix(start, radius, _clamp01(t)),
    content: _smooth(_clamp01(t / 0.8)),
  );
}

/// The detent index a text field focused at [index] should raise the sheet to, or null to stay.
/// [focusDetent] null: from `peek`, the highest detent; otherwise it stays. [raise] false never
/// raises (the web kit's `focusDetent={null}`).
int? focusRaise(
  List<SheetDetent> detents,
  List<double> heights,
  int index,
  SheetDetent? focusDetent, {
  bool raise = true,
}) {
  if (!raise || heights.isEmpty) return null;
  final target = focusDetent != null
      ? detents.indexOf(focusDetent)
      : index < detents.length && detents[index] == SheetDetent.peek
      ? heights.indexOf(heights.reduce(math.max))
      : -1;
  final current = index < heights.length ? heights[index] : 0.0;
  if (target < 0 || heights[target] <= current) return null;
  return target;
}

double _clamp01(double value) => value.clamp(0.0, 1.0);
double _smooth(double t) => t * t * (3 - 2 * t);

/// Where a released free sheet (`snap: false`) comes to rest: the flick's momentum projected and
/// kept between the lowest and highest detents, or dismissed when it is flung below half the lowest
/// one and the sheet is dismissible.
({double height, bool dismiss}) freeTarget(
  double visible,
  double velocity,
  List<double> heights,
  bool dismissible,
) {
  final min = heights.reduce(math.min), max = heights.reduce(math.max);
  final projected = projectMomentum(visible, velocity, 0.99);
  if (dismissible && projected < min / 2) return (height: 0, dismiss: true);
  return (height: projected.clamp(min, max), dismiss: false);
}

/// The nearest detent index to a free height.
int nearestDetent(double height, List<double> heights) {
  var best = 0;
  for (var i = 0; i < heights.length; i++) {
    if ((heights[i] - height).abs() < (heights[best] - height).abs()) best = i;
  }
  return best;
}

/// One gesture over a resizable sheet's content: the sheet's unclamped height and the scroll.
typedef SheetScrollState = ({double raw, double scroll});

/// Splits one finger movement over the content between the sheet and its scroll, like iOS sheets
/// and Flutter's DraggableScrollableSheet. [delta] > 0 moves the content up (finger up): the sheet
/// grows to [max] first, then the content scrolls to [scrollMax] and stops there; content that
/// does not scroll lets the sheet stretch past [max]. [delta] < 0 undoes that in reverse: the
/// stretch, then the scroll back to the top, then the sheet shrinks (below its lowest detent the
/// caller's [dragHeight] applies). `raw` is the height before rubber-banding.
SheetScrollState sheetScrollStep(
  SheetScrollState state,
  double delta,
  double max,
  double scrollMax,
) {
  var raw = state.raw, scroll = state.scroll, d = delta;
  if (d > 0) {
    final grow = math.max(0.0, math.min(d, max - raw));
    raw += grow;
    d -= grow;
    final scrolled = math.max(0.0, math.min(d, scrollMax - scroll));
    scroll += scrolled;
    d -= scrolled;
    // Content that scrolls stops at its end, like a list; a sheet with nothing to scroll stretches.
    if (scrollMax <= 0) raw += d;
  } else if (d < 0) {
    final unstretch = math.max(0.0, math.min(-d, raw - max));
    raw -= unstretch;
    d += unstretch;
    final back = math.max(0.0, math.min(-d, scroll));
    scroll -= back;
    d += back;
    raw += d;
  }
  return (raw: raw, scroll: scroll);
}

/// iOS UIScrollView's normal deceleration per ms, for content flung inside a sheet.
const double scrollDeceleration = 0.998;

/// One step of a content fling: [velocity] (px/s, positive = content moving up / scroll growing)
/// decays by [rate] per ms. Returns the scroll after [ms] and the velocity left.
({double scroll, double velocity}) flingStep(
  double scroll,
  double velocity,
  double ms, [
  double rate = scrollDeceleration,
]) {
  final decay = math.pow(rate, ms).toDouble();
  final travel = ((velocity / 1000) * rate * (1 - decay)) / (1 - rate);
  return (scroll: scroll + travel, velocity: velocity * decay);
}
