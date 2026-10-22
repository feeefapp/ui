import 'dart:math' as math;
import 'dart:ui';

import 'geometry.dart';

/// How bubbles change when the layout changes, following Apple's glass rules: the twin of
/// `@feeef.dev/ui/glass/transitions`.
/// - a new bubble within `spacing` of a bubble that just left (or of a living one) grows out of it;
/// - a bubble that leaves within `spacing` of a new or living bubble is absorbed into it;
/// - anything farther away materializes in place or dematerializes where it was.
sealed class GlassBirth {
  const GlassBirth(this.id);
  final String id;
}

/// Start at [from] (the source bubble's current rect) and spring to the target.
final class GlassGrow extends GlassBirth {
  const GlassGrow(super.id, this.source, this.from);
  final String source;
  final Rect from;
}

/// Start as a point at the target's centre and spring open.
final class GlassMaterialize extends GlassBirth {
  const GlassMaterialize(super.id);
}

sealed class GlassDeath {
  const GlassDeath(this.id);
  final String id;
}

/// Keep drawing the leaving bubble while it springs into [into], then drop it.
final class GlassAbsorb extends GlassDeath {
  const GlassAbsorb(super.id, this.target, this.into);
  final String target;
  final Rect into;
}

/// Shrink to a point and drop it.
final class GlassDematerialize extends GlassDeath {
  const GlassDematerialize(super.id);
}

double _gap(Rect a, Rect b) =>
    rectGap(GlassShape.fromRect(a, 0), GlassShape.fromRect(b, 0));

double _overlap(Rect a, Rect b) =>
    math.max(0.0, math.min(a.right, b.right) - math.max(a.left, b.left)) *
    math.max(0.0, math.min(a.bottom, b.bottom) - math.max(a.top, b.top));

/// Closest candidate within [spacing], preferring the largest overlap, then the smallest gap.
(String, Rect)? _nearest(
  Rect rect,
  Map<String, Rect> candidates,
  double spacing,
) {
  (String, Rect, double, double)? best;
  for (final MapEntry(key: id, value: other) in candidates.entries) {
    final gap = _gap(rect, other);
    if (gap > spacing) continue;
    final shared = _overlap(rect, other);
    if (best == null ||
        shared > best.$3 ||
        (shared == best.$3 && gap < best.$4)) {
      best = (id, other, shared, gap);
    }
  }
  return best == null ? null : (best.$1, best.$2);
}

/// Plans births and deaths between two measurements. [previous]: current visual rects of bubbles
/// drawn before the change (including ones leaving); [next]: targets after the change.
({List<GlassBirth> births, List<GlassDeath> deaths}) planGlassTransition(
  Map<String, Rect> previous,
  Map<String, Rect> next,
  double spacing,
) {
  final leaving = {
    for (final e in previous.entries)
      if (!next.containsKey(e.key)) e.key: e.value,
  };
  final staying = {
    for (final e in previous.entries)
      if (next.containsKey(e.key)) e.key: e.value,
  };
  final births = <GlassBirth>[];
  for (final MapEntry(key: id, value: rect) in next.entries) {
    if (previous.containsKey(id)) continue;
    // Prefer a bubble that just left (a split or a replacement), then a living neighbour.
    final source =
        _nearest(rect, leaving, spacing) ?? _nearest(rect, staying, spacing);
    births.add(
      source != null
          ? GlassGrow(id, source.$1, source.$2)
          : GlassMaterialize(id),
    );
  }
  final deaths = <GlassDeath>[];
  for (final MapEntry(key: id, value: rect) in leaving.entries) {
    final target = _nearest(rect, next, spacing);
    deaths.add(
      target != null
          ? GlassAbsorb(id, target.$1, target.$2)
          : GlassDematerialize(id),
    );
  }
  return (births: births, deaths: deaths);
}

/// True when [a] and [b] describe the same rect within half a pixel.
bool sameRect(Rect a, Rect b) =>
    (a.left - b.left).abs() < 0.5 &&
    (a.top - b.top).abs() < 0.5 &&
    (a.width - b.width).abs() < 0.5 &&
    (a.height - b.height).abs() < 0.5;
