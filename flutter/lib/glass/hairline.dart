import 'dart:math' as math;
import 'dart:ui';

import 'geometry.dart';
import 'material.dart';

/// The hairline's two bands outside a cluster's blended outline ([glassHairlineRingWidth] all
/// round; the slivers where the outline moved [glassHairlineSliverShift] px left or right and
/// pulled in by [glassHairlineSliverInset] px still reaches past it), each as its outer loop plus
/// the outline, to fill even-odd. The twin of the web kit's `hairlineBands` (`glass/hairline.ts`).
({List<List<Offset>> ring, List<List<Offset>> sliver}) hairlineBands(
  List<GlassShape> shapes,
  double spacing,
) {
  final ring = <List<Offset>>[];
  final sliver = <List<Offset>>[];
  if (shapes.isEmpty) return (ring: ring, sliver: sliver);
  double distance(double x, double y) => unionDistance(x, y, shapes, spacing);
  for (final loop in unionLoops(shapes, spacing, 2)) {
    final outline = <Offset>[];
    final ringOuter = <Offset>[];
    final sliverOuter = <Offset>[];
    var reach = 0.0;
    for (final p in loop) {
      // Settle the contour point on the zero level along the gradient.
      var x = p.dx, y = p.dy, nx = 0.0, ny = 0.0;
      for (var i = 0; i < 2; i++) {
        nx = distance(x + 0.25, y) - distance(x - 0.25, y);
        ny = distance(x, y + 0.25) - distance(x, y - 0.25);
        final length = math.sqrt(nx * nx + ny * ny);
        if (length > 0) {
          nx /= length;
          ny /= length;
        }
        final d = distance(x, y);
        x -= nx * d;
        y -= ny * d;
      }
      final right =
          -(distance(x - glassHairlineSliverShift, y) +
              glassHairlineSliverInset);
      final left =
          -(distance(x + glassHairlineSliverShift, y) +
              glassHairlineSliverInset);
      final t = math.max(0.0, math.max(right, left));
      reach = math.max(reach, t);
      outline.add(Offset(x, y));
      ringOuter.add(
        Offset(x + nx * glassHairlineRingWidth, y + ny * glassHairlineRingWidth),
      );
      sliverOuter.add(Offset(x + nx * t, y + ny * t));
    }
    if (outline.length < 3 ||
        outline.any((p) => !p.dx.isFinite || !p.dy.isFinite)) {
      continue;
    }
    ring.addAll([ringOuter, outline]);
    if (reach > 0.01) sliver.addAll([sliverOuter, outline]);
  }
  return (ring: ring, sliver: sliver);
}

/// Loops as one even-odd path: the band between each outer loop and the outline.
Path bandPath(List<List<Offset>> loops) {
  final path = Path()..fillType = PathFillType.evenOdd;
  for (final points in loops) {
    path.addPolygon(points, true);
  }
  return path;
}
