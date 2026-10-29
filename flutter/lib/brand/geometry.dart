import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/painting.dart';

/// The exponent of a fully smoothed corner: CSS `superellipse(1.5)` is 2^1.5 (a circle is 2). The
/// twin of `brand/geometry.ts`: same sampling (32 segments per corner), same radius scaling, same
/// clamped smoothing, same rounding, so the web and Flutter kits draw the same corner to the third
/// decimal.
final double cornerExponent = math.pow(2, 1.5).toDouble();

/// Where corner smoothing starts to fade, as a share of the largest radius a box can take (half its
/// shorter side). Twin of `CORNER_SMOOTHING_FADE`.
const double cornerSmoothingFade = 0.75;

double _finite(double value) => value.isFinite ? math.max(0, value) : 0;
// Rounded to the third decimal like the web kit's `Number(value.toFixed(3))`, without going
// through a string: this runs for every point of every outline the kit draws.
double _coordinate(double value) => (value * 1000).roundToDouble() / 1000;

/// Smoothing for a corner filling [fill] of the box's largest radius (1 = half the shorter side).
double _smoothingAt(double fill) {
  if (!(fill > cornerSmoothingFade)) return 1;
  final u = math.min(
    1.0,
    (fill - cornerSmoothingFade) / (1 - cornerSmoothingFade),
  );
  return 1 - u * u * (3 - 2 * u);
}

/// Clamped continuous corners (Apple's continuous corners, Figma's clamped corner smoothing): how
/// much a corner of [radius] on a [width] × [height] box is smoothed, from 1 (the kit's
/// superellipse(1.5)) to 0 (a circular arc). Full smoothing while the radius is at most
/// [cornerSmoothingFade] (0.75) of half the shorter side, then a smoothstep down to 0 at half the
/// shorter side: a 44 × 44 bubble at r 22 is a circle, a 44-tall bar at r 22 a true capsule, and a
/// 300 × 200 card at r 16 keeps the full continuous corner. Twin of the web kit's
/// `cornerSmoothing` (vectors in `test/fixtures/corners.json`).
double cornerSmoothing(double radius, double width, double height) {
  final half = math.min(_finite(width), _finite(height)) / 2;
  if (!(half > 0)) return 0;
  return _smoothingAt(_finite(radius) / half);
}

/// The CSS `superellipse(k)` parameter for a smoothing (k = 1 + smoothing / 2).
double cornerShapeParameter(double smoothing) =>
    1 + smoothing.clamp(0.0, 1.0) / 2;

/// The superellipse exponent a corner draws with: 2^k, from 2 (circle) to 2^1.5.
double cornerExponentFor(double radius, double width, double height) => math
    .pow(2, cornerShapeParameter(cornerSmoothing(radius, width, height)))
    .toDouble();

/// Outline points of a box with superellipse corners, in drawing order (top-left corner's end,
/// clockwise). [radii] is top-left, top-right, bottom-right, bottom-left. Without [exponent], every
/// corner takes its clamped exponent ([cornerSmoothing], measured on the box after the inset and
/// the CSS overlap scaling); a given exponent applies to all four.
List<Offset> superellipsePoints(
  double width,
  double height,
  List<double> radii, {
  double inset = 0,
  double? exponent,
}) {
  final key = _outlineKey(width, height, radii, inset, exponent);
  final cached = _outlinePoints[key];
  if (cached != null) return cached;
  if (_outlinePoints.length >= _outlineCacheLimit) _outlinePoints.clear();
  final points = List<Offset>.unmodifiable(
    _superellipsePoints(width, height, radii, inset: inset, exponent: exponent),
  );
  _outlinePoints[key] = points;
  return points;
}

/// The same outline is asked for over and over with the same geometry (every paint of a button,
/// a wash, a bubble at rest, a pill), so the last few hundred are kept by box, corners, inset and
/// exponent. Cached points and paths are shared: callers never mutate them.
typedef _OutlineKey = (
  double,
  double,
  double,
  double,
  double,
  double,
  double,
  double?,
);

const _outlineCacheLimit = 256;
final _outlinePoints = <_OutlineKey, List<Offset>>{};
final _outlinePaths = <_OutlineKey, Path>{};

_OutlineKey _outlineKey(
  double width,
  double height,
  List<double> radii,
  double inset,
  double? exponent,
) => (
  width,
  height,
  radii.isNotEmpty ? radii[0] : 0,
  radii.length > 1 ? radii[1] : 0,
  radii.length > 2 ? radii[2] : 0,
  radii.length > 3 ? radii[3] : 0,
  inset,
  exponent,
);

List<Offset> _superellipsePoints(
  double width,
  double height,
  List<double> radii, {
  double inset = 0,
  double? exponent,
}) {
  final fixed = exponent == null
      ? null
      : 2 / math.max(1, exponent.isFinite ? exponent : cornerExponent);
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
    final power =
        fixed ??
        2 /
            math.pow(
              2,
              cornerShapeParameter(
                _smoothingAt(
                  math.max(
                    w > 0 ? radius / (w / 2) : double.infinity,
                    h > 0 ? radius / (h / 2) : double.infinity,
                  ),
                ),
              ),
            );
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

/// The outline as a closed path, offset to [origin].
Path superellipsePath(Rect rect, List<double> radii, {double inset = 0}) {
  final key = _outlineKey(rect.width, rect.height, radii, inset, null);
  var path = _outlinePaths[key];
  if (path == null) {
    if (_outlinePaths.length >= _outlineCacheLimit) _outlinePaths.clear();
    path = Path()
      ..addPolygon(
        superellipsePoints(rect.width, rect.height, radii, inset: inset),
        true,
      );
    _outlinePaths[key] = path;
  }
  // The cached outline sits at the origin; a box elsewhere gets a moved copy.
  final origin = rect.topLeft;
  return origin == Offset.zero ? path : path.shift(origin);
}

/// The band an outline leaves uncovered when moved by [by] (a CSS `inset dx dy` shadow of no
/// blur): the outline of [rect] with [radii] (inset by [inset]) minus the same outline shifted.
/// A path operation, so kept like the outlines themselves: a lens's rim and a button's inner
/// light ask for the same bands on every paint.
Path outlineBand(
  Rect rect,
  List<double> radii, {
  double inset = 0,
  required Offset by,
}) {
  final key = (_outlineKey(rect.width, rect.height, radii, inset, null), by);
  var band = _outlineBands[key];
  if (band == null) {
    if (_outlineBands.length >= _outlineCacheLimit) _outlineBands.clear();
    final outline = superellipsePath(
      Rect.fromLTWH(0, 0, rect.width, rect.height),
      radii,
      inset: inset,
    );
    band = Path.combine(PathOperation.difference, outline, outline.shift(by));
    _outlineBands[key] = band;
  }
  final origin = rect.topLeft;
  return origin == Offset.zero ? band : band.shift(origin);
}

final _outlineBands = <(_OutlineKey, Offset), Path>{};

/// A shape border drawing the kit's clamped continuous corners ([cornerSmoothing]: superellipse(1.5),
/// round at full radius, so a capsule-radius border is a true capsule).
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
