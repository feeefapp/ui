import 'dart:math' as math;
import 'dart:typed_data';

import '../brand/pixel_noise.dart' show imul32;

/// Scroll distance (px) over which an edge wash fades in.
const double scrollFadeZone = 80;

/// Wash strength at rest when the content doesn't scroll.
const double scrollRestTop = 0.28, scrollRestBottom = 0.48;

double _nonnegative(double value) => value.isFinite ? math.max(0, value) : 0;

/// Edge wash opacities for a scroll [offset] within [extent] (max scroll), including underflow and
/// overscroll: the twin of `scrollEdgeOpacities` in `@feeef.dev/ui/scroll`.
({double top, double bottom}) scrollEdgeOpacities(
  double offset,
  double extent, [
  double fadeZone = scrollFadeZone,
]) {
  final max = _nonnegative(extent);
  if (max <= 1) return (top: scrollRestTop, bottom: scrollRestBottom);
  final position = math.min(max, _nonnegative(offset));
  final zone = math.max(1.0, _nonnegative(fadeZone));
  return (
    top: (position / zone).clamp(0.0, 1.0),
    bottom: ((max - position) / zone).clamp(0.0, 1.0),
  );
}

/// Float height plus the edge gap on both sides. A missing float leaves normal content padding.
double scrollContentReserve(double height, double gap, double padding) =>
    height > 0
    ? _nonnegative(height) + _nonnegative(gap) * 2
    : _nonnegative(padding);

/// Minimum movement to reveal one interval.
double scrollRevealDelta(
  double start,
  double end,
  double visibleStart,
  double visibleEnd, {
  bool center = false,
}) {
  if (![start, end, visibleStart, visibleEnd].every((v) => v.isFinite)) {
    return 0;
  }
  if (center) return (start + end - visibleStart - visibleEnd) / 2;
  if (start < visibleStart && end > visibleEnd) return 0;
  if (start < visibleStart) return start - visibleStart;
  if (end > visibleEnd) return end - visibleEnd;
  return 0;
}

/// Static seeded square dithering for a wash: one level 0–11 per cell, row by row (the twin of
/// `scrollWashPaths`, which returns the same cells as SVG paths).
Uint8List scrollWashLevels(int columns, int rows) {
  final levels = Uint8List(columns * rows);
  for (var y = 0; y < rows; y++) {
    final falloff = math.pow(1 - y / math.max(1, rows - 1), 2);
    for (var x = 0; x < columns; x++) {
      final hash =
          (imul32(x + 17, 374761393) ^ imul32(y + 31, 668265263)) & 0xffffffff;
      final noise = (hash % 100) / 100;
      levels[y * columns + x] =
          ((falloff + (noise - 0.5) * 0.3).clamp(0.0, 1.0) * 11).round();
    }
  }
  return levels;
}
