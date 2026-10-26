import 'dart:math' as math;
import 'dart:ui';

import '../physics/spring.dart';
import 'geometry.dart';

/// How bubbles change when the layout changes, following Apple's glass rules: the twin of
/// `@feeef.dev/ui/glass/transitions`. Inside one container the glass is one material, so a bubble
/// is never born or lost on its own while another is there.
/// - a new bubble within `spacing` of a bubble that just left grows out of it (a split or a
///   replacement);
/// - otherwise a new bubble is born out of its nearest neighbour, preferring one in the same row: a
///   droplet at the neighbour's facing edge ([glassSeed]) that stretches out to its place;
/// - a leaving bubble is absorbed into the new bubble it overlaps (a merge), else into its nearest
///   neighbour, preferring the same row, shrinking into that neighbour's facing edge;
/// - only a bubble with no other bubble in the container materializes or dematerializes;
/// - a bubble with an origin (a menu and the button that opened it) is born out of its origin and
///   returns into it, whatever else is in the container ([glassOriginId]).
sealed class GlassBirth {
  const GlassBirth(this.id);
  final String id;
}

/// Start at [from] (the source bubble's rect, or a droplet at its facing edge) and spring to the
/// target.
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

/// Keep drawing the leaving bubble while it springs into [into] (the bubble it merges into, or a
/// droplet at that bubble's facing edge), then drop it.
final class GlassAbsorb extends GlassDeath {
  const GlassAbsorb(super.id, this.target, this.into);
  final String target;
  final Rect into;
}

/// Shrink to a point and drop it.
final class GlassDematerialize extends GlassDeath {
  const GlassDematerialize(super.id);
}

/// The `source` of a birth and `target` of a death that come from or go to the bubble's origin:
/// the control that opened it (`GLASS_ORIGIN`).
const glassOriginId = 'origin';

/// The springs of a bubble growing out of its origin and returning into it
/// (`GLASS_ORIGIN_SPRINGS`): iOS 26 menus springing out of their button and flying back into it.
const glassOriginSprings = (grow: Springs.menu, absorb: Springs.menuDismiss);

/// Side (px) of the droplet a bubble grows out of when its origin is not glass
/// (`GLASS_ORIGIN_SEED`).
const double glassOriginSeed = 8;

/// How far (px) a bubble may reach past its origin on each side and still be the origin's glass
/// (`GLASS_ORIGIN_HUG`).
const double glassOriginHug = 12;

/// The rect a bubble is born out of and returns into (`glassOrigin`). [origin] is the control's
/// rect; [glass] the glass bubble around it, or null when it is not glass. A bubble hugging the
/// control (within [glassOriginHug]) gives its own rect, so the new bubble leaves and rejoins
/// exactly that glass; a wider one gives the control's rect; no glass gives a [glassOriginSeed]
/// droplet at the control's centre, so no glass copy of a plain button pops in.
Rect glassOrigin(Rect origin, Rect? glass) {
  if (glass != null) {
    final hugs =
        glass.width <= origin.width + 2 * glassOriginHug &&
        glass.height <= origin.height + 2 * glassOriginHug;
    return hugs ? glass : origin;
  }
  final side = math.min(glassOriginSeed, math.min(origin.width, origin.height));
  return Rect.fromCenter(center: origin.center, width: side, height: side);
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

/// True when [a] and [b] share some height: bubbles of one row.
bool sameGlassRow(Rect a, Rect b) =>
    math.min(a.bottom, b.bottom) - math.max(a.top, b.top) > 0;

/// Closest candidate at any distance: one in the same row first, then the smallest gap.
(String, Rect)? _neighbour(Rect rect, Map<String, Rect> candidates) {
  (String, Rect, bool, double)? best;
  for (final MapEntry(key: id, value: other) in candidates.entries) {
    final row = sameGlassRow(rect, other);
    final gap = _gap(rect, other);
    if (best == null ||
        (row && !best.$3) ||
        (row == best.$3 && gap < best.$4)) {
      best = (id, other, row, gap);
    }
  }
  return best == null ? null : (best.$1, best.$2);
}

/// The droplet a bubble is born from, or absorbed into, at [anchor]'s end facing [toward]: a round
/// drop as tall (stacked: as wide) as the smaller of the two, tucked inside that end so it is
/// hidden in the anchor's glass. A new bubble stretches out of its neighbour from there instead of
/// sliding out from under it, and a leaving one shrinks back into it without a trace.
Rect glassSeed(Rect anchor, Rect toward) {
  final a = anchor.center;
  final t = toward.center;
  double clamp(double v, double lo, double hi) =>
      math.min(math.max(v, lo), math.max(lo, hi));
  final horizontal =
      sameGlassRow(anchor, toward) ||
      (t.dx - a.dx).abs() * anchor.height >= (t.dy - a.dy).abs() * anchor.width;
  if (horizontal) {
    final height = math.min(anchor.height, toward.height);
    final width = math.min(math.min(height, toward.width), anchor.width);
    final x = t.dx >= a.dx ? anchor.right - width : anchor.left;
    final cy = clamp(t.dy, anchor.top + height / 2, anchor.bottom - height / 2);
    return Rect.fromLTWH(x, cy - height / 2, width, height);
  }
  final width = math.min(anchor.width, toward.width);
  final height = math.min(math.min(width, toward.height), anchor.height);
  final y = t.dy >= a.dy ? anchor.bottom - height : anchor.top;
  final cx = clamp(t.dx, anchor.left + width / 2, anchor.right - width / 2);
  return Rect.fromLTWH(cx - width / 2, y, width, height);
}

/// Plans births and deaths between two measurements. [previous]: current visual rects of bubbles
/// drawn before the change (including ones leaving); [next]: targets after the change; [origins]:
/// the [glassOrigin] rect of bubbles with an origin, born out of it and returning into it.
({List<GlassBirth> births, List<GlassDeath> deaths}) planGlassTransition(
  Map<String, Rect> previous,
  Map<String, Rect> next,
  double spacing, [
  Map<String, Rect> origins = const {},
]) {
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
    final origin = origins[id];
    if (origin != null) {
      births.add(GlassGrow(id, glassOriginId, origin));
      continue;
    }
    // A bubble that just left right here (a split or a replacement), else the nearest neighbour
    // that stays, else the nearest one leaving.
    final source =
        _nearest(rect, leaving, spacing) ??
        _neighbour(rect, staying) ??
        _neighbour(rect, leaving);
    births.add(
      source == null
          ? GlassMaterialize(id)
          : GlassGrow(
              id,
              source.$1,
              _overlap(source.$2, rect) > 0
                  ? source.$2
                  : glassSeed(source.$2, rect),
            ),
    );
  }
  final deaths = <GlassDeath>[];
  for (final MapEntry(key: id, value: rect) in leaving.entries) {
    final origin = origins[id];
    if (origin != null) {
      deaths.add(GlassAbsorb(id, glassOriginId, origin));
      continue;
    }
    // In a split the parent is absorbed into the child it overlaps most while the children grow
    // out of it, so the glass never has a gap; otherwise into its nearest neighbour.
    final target = _nearest(rect, next, spacing) ?? _neighbour(rect, next);
    deaths.add(
      target == null
          ? GlassDematerialize(id)
          : GlassAbsorb(
              id,
              target.$1,
              _overlap(target.$2, rect) > 0
                  ? target.$2
                  : glassSeed(target.$2, rect),
            ),
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
