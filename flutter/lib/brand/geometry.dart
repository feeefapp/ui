import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/painting.dart';

/// CSS `corner-shape: superellipse(1.5)` has exponent 2^1.5, not the circle's 2. The twin of
/// `brand/geometry.ts`: same sampling (32 segments per corner), same radius scaling, same rounding,
/// so the web and Flutter kits draw the same corner to the third decimal.
final double cornerExponent = math.pow(2, 1.5).toDouble();

double _finite(double value) => value.isFinite ? math.max(0, value) : 0;
double _coordinate(double value) => double.parse(value.toStringAsFixed(3));

/// Outline points of a box with superellipse corners, in drawing order (top-left corner's end,
/// clockwise). [radii] is top-left, top-right, bottom-right, bottom-left.
List<Offset> superellipsePoints(
  double width,
  double height,
  List<double> radii, {
  double inset = 0,
  double? exponent,
}) {
  final e = exponent ?? cornerExponent;
  final power = 2 / math.max(1, e.isFinite ? e : cornerExponent);
  final x = _finite(inset);
  final y = x;
  final w = math.max(0.0, _finite(width) - x * 2);
  final h = math.max(0.0, _finite(height) - y * 2);
  final corners = [for (final r in radii) math.max(0.0, _finite(r) - x)];
  // CSS scales all radii together when any pair would overlap an edge.
  final pairs = [
    [w, corners[0] + corners[1]],
    [w, corners[3] + corners[2]],
    [h, corners[0] + corners[3]],
    [h, corners[1] + corners[2]],
  ];
  final scale = pairs.fold<double>(
    1,
    (s, pair) => math.min(s, pair[1] > 0 ? pair[0] / pair[1] : 1),
  );
  for (var i = 0; i < 4; i++) {
    corners[i] *= scale;
  }
  final right = x + w;
  final bottom = y + h;
  final [topLeft, topRight, bottomRight, bottomLeft] = corners;
  final points = <Offset>[Offset(_coordinate(x + topLeft), _coordinate(y))];
  void line(double px, double py) =>
      points.add(Offset(_coordinate(px), _coordinate(py)));
  void arc(double cx, double cy, double radius, int quadrant) {
    for (var step = 1; step <= 32; step++) {
      final angle = (quadrant + step / 32) * (math.pi / 2);
      final cos = math.cos(angle);
      final sin = math.sin(angle);
      line(
        cx + radius * cos.sign * math.pow(cos.abs(), power),
        cy + radius * sin.sign * math.pow(sin.abs(), power),
      );
    }
  }

  line(right - topRight, y);
  arc(right - topRight, y + topRight, topRight, 3);
  line(right, bottom - bottomRight);
  arc(right - bottomRight, bottom - bottomRight, bottomRight, 0);
  line(x + bottomLeft, bottom);
  arc(x + bottomLeft, bottom - bottomLeft, bottomLeft, 1);
  line(x, y + topLeft);
  arc(x + topLeft, y + topLeft, topLeft, 2);
  return points;
}

/// The outline as a closed path, offset to [origin]. With [roundEnds], a shape whose radii all
/// reach half its shorter side (within half a pixel) is a true circle or capsule instead (Liquid
/// Glass's round ends; glass uses this, other surfaces keep the superellipse).
Path superellipsePath(
  Rect rect,
  List<double> radii, {
  double inset = 0,
  bool roundEnds = false,
}) {
  final half = math.min(rect.width, rect.height) / 2;
  if (roundEnds && radii.every((r) => r >= half - 0.5)) {
    final inner = rect.deflate(inset);
    return Path()..addRRect(
      RRect.fromRectAndRadius(
        inner,
        Radius.circular(math.max(0, math.min(inner.width, inner.height) / 2)),
      ),
    );
  }
  final points = superellipsePoints(
    rect.width,
    rect.height,
    radii,
    inset: inset,
  );
  return Path()..addPolygon([for (final p in points) p + rect.topLeft], true);
}

/// A shape border drawing the kit's superellipse corners (`corner-shape: superellipse(1.5)`).
class SuperellipseBorder extends OutlinedBorder {
  const SuperellipseBorder({super.side, this.radius = 0});

  /// Corner radius before the CSS overlap scaling.
  final double radius;

  List<double> get _radii => [radius, radius, radius, radius];

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) =>
      superellipsePath(rect, _radii);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      superellipsePath(rect, _radii, inset: side.strokeInset);

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    if (side.style == BorderStyle.none || side.width == 0) return;
    // Like CSS borders: inside the box.
    canvas.drawPath(
      superellipsePath(rect, _radii, inset: side.width / 2),
      side.toPaint(),
    );
  }

  @override
  OutlinedBorder copyWith({BorderSide? side, double? radius}) =>
      SuperellipseBorder(
        side: side ?? this.side,
        radius: radius ?? this.radius,
      );

  @override
  ShapeBorder scale(double t) =>
      SuperellipseBorder(side: side.scale(t), radius: radius * t);

  @override
  ShapeBorder? lerpFrom(ShapeBorder? a, double t) => a is SuperellipseBorder
      ? SuperellipseBorder(
          side: BorderSide.lerp(a.side, side, t),
          radius: lerpDouble(a.radius, radius, t)!,
        )
      : super.lerpFrom(a, t);

  @override
  ShapeBorder? lerpTo(ShapeBorder? b, double t) => b is SuperellipseBorder
      ? SuperellipseBorder(
          side: BorderSide.lerp(side, b.side, t),
          radius: lerpDouble(radius, b.radius, t)!,
        )
      : super.lerpTo(b, t);

  @override
  bool operator ==(Object other) =>
      other is SuperellipseBorder &&
      other.side == side &&
      other.radius == radius;

  @override
  int get hashCode => Object.hash(side, radius);
}
