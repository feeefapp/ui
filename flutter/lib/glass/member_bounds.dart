import 'dart:math' as math;
import 'dart:ui';

/// No glass side is ever longer than this (px): longer is a broken layout, never a bubble
/// (`GLASS_MAX_SIDE`).
const double glassMaxSide = 8192;

/// A bubble may span at most this many times the larger side of its container or the viewport
/// (`GLASS_MAX_SPAN`).
const double glassMaxSpan = 4;

/// The rect a member's glass may use, in container pixels, or null when the member is not drawable
/// glass: non-finite or empty, longer than [glassMaxSide], or longer than [glassMaxSpan] times the
/// larger side of the container or viewport (an error widget overflowing by 200,000 px). The rest
/// is clamped to the container grown by [margin] or the viewport's longer side, whichever is more
/// (a bubble scrolled partly out of its row keeps its true shape), so no outline, lens, shadow
/// image or cache is ever built from an unclamped size. The twin of `glassMemberRect` in `glass/member-bounds.ts`.
Rect? glassMemberRect(Rect rect, Size container, Size viewport, double margin) {
  if (!rect.isFinite || rect.width <= 0 || rect.height <= 0) return null;
  final reach = [
    container.width,
    container.height,
    viewport.width,
    viewport.height,
  ].where((side) => side.isFinite).fold(0.0, math.max);
  final limit = reach > 0
      ? math.min(glassMaxSide, reach * glassMaxSpan)
      : glassMaxSide;
  if (rect.width > limit || rect.height > limit) return null;
  final grow = [
    margin,
    viewport.width,
    viewport.height,
  ].where((side) => side.isFinite).fold(0.0, math.max);
  final bounds = Rect.fromLTRB(
    -grow,
    -grow,
    container.width + grow,
    container.height + grow,
  );
  if (!bounds.isFinite) return rect;
  final clamped = rect.intersect(bounds);
  return clamped.width > 0 && clamped.height > 0 ? clamped : null;
}
