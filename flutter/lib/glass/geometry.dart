import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import '../brand/geometry.dart';

/// Glass geometry: the outline that one glass material takes around a set of bubbles. Shapes far
/// apart keep their exact superellipse outline. Shapes closer than the container's `spacing` bend
/// toward each other and join (smooth union of signed distance fields), like Apple's
/// GlassEffectContainer. The twin of `@feeef.dev/ui/glass/geometry`, tested against its numbers
/// (`test/fixtures/glass.json`).
class GlassShape {
  const GlassShape({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.radius,
  });

  factory GlassShape.fromRect(Rect rect, double radius) => GlassShape(
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    radius: radius,
  );

  final double x, y, width, height;

  /// Corner radius before clamping to half the shorter side.
  final double radius;

  Rect get rect => Rect.fromLTWH(x, y, width, height);

  GlassShape shift(double dx, double dy) => GlassShape(
    x: x + dx,
    y: y + dy,
    width: width,
    height: height,
    radius: radius,
  );
}

double _finite(double value) => value.isFinite ? value : 0;

/// Corner radius a shape actually draws with: never more than half its shorter side.
double clampRadius(GlassShape shape) => math.max(
  0,
  math.min(_finite(shape.radius), math.min(shape.width / 2, shape.height / 2)),
);

const _normSteps = 512;
final Float64List _norm = Float64List.fromList([
  for (var i = 0; i <= _normSteps; i++)
    math
        .pow(1 + math.pow(i / _normSteps, cornerExponent), 1 / cornerExponent)
        .toDouble(),
]);

/// Signed distance from a point to a rounded box with superellipse corners (the kit's
/// `corner-shape: superellipse(1.5)`): negative inside, zero on the outline.
double shapeDistance(double px, double py, GlassShape shape) {
  final r = clampRadius(shape);
  final hx = shape.width / 2;
  final hy = shape.height / 2;
  final qx = (px - (shape.x + hx)).abs() - hx + r;
  final qy = (py - (shape.y + hy)).abs() - hy + r;
  final ox = math.max(qx, 0.0);
  final oy = math.max(qy, 0.0);
  double outside;
  if (ox == 0 || oy == 0) {
    outside = ox + oy;
  } else {
    // (a^n + b^n)^(1/n) = max · (1 + (min/max)^n)^(1/n), read from a table: this runs per pixel.
    final high = math.max(ox, oy);
    final t = (math.min(ox, oy) / high) * _normSteps;
    final index = math.min(_normSteps - 1, t.floor());
    outside =
        high * (_norm[index] + (_norm[index + 1] - _norm[index]) * (t - index));
  }
  return outside + math.min(math.max(qx, qy), 0.0) - r;
}

/// Smooth minimum (quadratic). Outlines start to bend toward each other when the gap between
/// shapes drops below [k] and join below `k / 2`. `k <= 0` is the plain union.
double smoothMin(double a, double b, double k) {
  if (!(k > 0)) return math.min(a, b);
  final h = math.max(k - (a - b).abs(), 0.0) / k;
  return math.min(a, b) - (h * h * k) / 4;
}

/// Share of `spacing` two touching shapes blend with (measured on rendered Liquid Glass).
const double glassMergeBase = 0.65;

/// How much the blend widens per unit of gap / spacing, up to the full `spacing`.
const double glassMergeGap = 0.65;

/// Blend width for two shapes [gap] px apart in a container with [spacing]: the full spacing while
/// they approach (they bend at `spacing` and join at half of it), then narrower as they close in,
/// so the neck between touching shapes stays slim. Twin of the web kit's `mergeWidth`.
double mergeWidth(double gap, double spacing) {
  if (!(spacing > 0)) return 0;
  return spacing *
      math.min(
        1.0,
        glassMergeBase + glassMergeGap * math.max(0.0, gap) / spacing,
      );
}

final _widths = Expando<(double, List<double>)>();

/// Each shape's blend width against the shapes before it (its nearest one), cached per list.
List<double> _blendWidths(List<GlassShape> shapes, double spacing) {
  final cached = _widths[shapes];
  if (cached != null &&
      cached.$1 == spacing &&
      cached.$2.length == shapes.length) {
    return cached.$2;
  }
  final k = <double>[
    for (var i = 0; i < shapes.length; i++)
      if (i == 0)
        0
      else
        mergeWidth(
          [for (var j = 0; j < i; j++) rectGap(shapes[i], shapes[j])]
              .reduce(math.min),
          spacing,
        ),
  ];
  _widths[shapes] = (spacing, k);
  return k;
}

/// Distance to the union of [shapes], blended by [spacing] (see [mergeWidth]).
double unionDistance(
  double px,
  double py,
  List<GlassShape> shapes,
  double spacing,
) {
  final k = shapes.length > 1
      ? _blendWidths(shapes, spacing)
      : const <double>[];
  var d = double.infinity;
  for (var i = 0; i < shapes.length; i++) {
    final s = shapeDistance(px, py, shapes[i]);
    d = d == double.infinity ? s : smoothMin(d, s, k[i]);
  }
  return d;
}

/// Gap between two boxes (0 when they touch or overlap).
double rectGap(GlassShape a, GlassShape b) {
  final dx = math.max(
    math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)),
    0.0,
  );
  final dy = math.max(
    math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)),
    0.0,
  );
  return math.sqrt(dx * dx + dy * dy);
}

/// Groups shapes that are close enough to blend (gap below [spacing]), in input order.
List<List<T>> glassClusters<T extends GlassShape>(
  List<T> shapes,
  double spacing,
) {
  final parent = [for (var i = 0; i < shapes.length; i++) i];
  int find(int i) => parent[i] == i ? i : (parent[i] = find(parent[i]));
  for (var i = 0; i < shapes.length; i++) {
    for (var j = i + 1; j < shapes.length; j++) {
      if (rectGap(shapes[i], shapes[j]) < spacing) parent[find(j)] = find(i);
    }
  }
  final groups = <int, List<T>>{};
  for (var i = 0; i < shapes.length; i++) {
    groups.putIfAbsent(find(i), () => []).add(shapes[i]);
  }
  return groups.values.toList();
}

/// Bounding box of several shapes.
Rect boundsOf(List<GlassShape> shapes) {
  var left = double.infinity, top = double.infinity;
  var right = -double.infinity, bottom = -double.infinity;
  for (final s in shapes) {
    left = math.min(left, s.x);
    top = math.min(top, s.y);
    right = math.max(right, s.x + s.width);
    bottom = math.max(bottom, s.y + s.height);
  }
  return Rect.fromLTRB(left, top, right, bottom);
}

// Math.round(v * 100) / 100: halves round up, like JavaScript.
double _round(double value) => (value * 100 + 0.5).floorToDouble() / 100;

/// The exact outline of one shape, as the kit draws it elsewhere.
Path shapePath(GlassShape shape) {
  final r = clampRadius(shape);
  return superellipsePath(shape.rect, [r, r, r, r]);
}

/// Closed outlines of the blended union of [shapes] (marching squares on a [cell]-sized grid with
/// linear interpolation). Every loop keeps the inside on its left, so outer outlines and holes
/// wind opposite ways and fill correctly with the nonzero rule.
List<List<Offset>> unionLoops(
  List<GlassShape> shapes,
  double spacing, [
  double cell = 2,
]) {
  if (shapes.isEmpty) return [];
  final box = boundsOf(shapes);
  final pad = cell * 2;
  final ox = box.left - pad;
  final oy = box.top - pad;
  final nx = math.max(1, ((box.width + pad * 2) / cell).ceil());
  final ny = math.max(1, ((box.height + pad * 2) / cell).ceil());
  final field = Float64List((nx + 1) * (ny + 1));
  double at(int i, int j) => field[j * (nx + 1) + i];
  for (var j = 0; j <= ny; j++) {
    for (var i = 0; i <= nx; i++) {
      final value = unionDistance(
        ox + i * cell,
        oy + j * cell,
        shapes,
        spacing,
      );
      field[j * (nx + 1) + i] = value == 0 ? 1e-9 : value;
    }
  }
  final points = <String, Offset>{};
  String point(
    String key,
    int ax,
    int ay,
    double av,
    int bx,
    int by,
    double bv,
  ) {
    points.putIfAbsent(key, () {
      final t = av / (av - bv);
      return Offset(
        _round(ox + (ax + (bx - ax) * t) * cell),
        _round(oy + (ay + (by - ay) * t) * cell),
      );
    });
    return key;
  }

  final links = <String, List<String>>{};
  void link(String a, String b) {
    links.putIfAbsent(a, () => []);
    links.putIfAbsent(b, () => []);
    links[a]!.add(b);
    links[b]!.add(a);
  }

  for (var j = 0; j < ny; j++) {
    for (var i = 0; i < nx; i++) {
      final tl = at(i, j), tr = at(i + 1, j);
      final br = at(i + 1, j + 1), bl = at(i, j + 1);
      final top = (tl < 0) != (tr < 0)
          ? point('h$i,$j', i, j, tl, i + 1, j, tr)
          : null;
      final bottom = (bl < 0) != (br < 0)
          ? point('h$i,${j + 1}', i, j + 1, bl, i + 1, j + 1, br)
          : null;
      final left = (tl < 0) != (bl < 0)
          ? point('v$i,$j', i, j, tl, i, j + 1, bl)
          : null;
      final right = (tr < 0) != (br < 0)
          ? point('v${i + 1},$j', i + 1, j, tr, i + 1, j + 1, br)
          : null;
      final edges = [top, right, bottom, left].whereType<String>().toList();
      if (edges.length == 2) {
        link(edges[0], edges[1]);
      } else if (edges.length == 4) {
        // Saddle: decide by the centre whether the inside corners connect through it.
        final centre =
            unionDistance(
              ox + (i + 0.5) * cell,
              oy + (j + 0.5) * cell,
              shapes,
              spacing,
            ) <
            0;
        if ((tl < 0) == centre) {
          link(top!, right!);
          link(bottom!, left!);
        } else {
          link(left!, top!);
          link(right!, bottom!);
        }
      }
    }
  }
  final loops = <List<Offset>>[];
  final seen = <String>{};
  for (final start in links.keys) {
    if (seen.contains(start)) continue;
    final loop = <Offset>[];
    var previous = '';
    var current = start;
    while (!seen.contains(current)) {
      seen.add(current);
      loop.add(points[current]!);
      String? next;
      for (final key in links[current]!) {
        if (key != previous && !seen.contains(key)) {
          next = key;
          break;
        }
      }
      if (next == null) break;
      previous = current;
      current = next;
    }
    // Crossings that land on a grid vertex appear twice; drop the repeats.
    final unique = <Offset>[
      for (var index = 0; index < loop.length; index++)
        if ((loop[index].dx - loop[(index + loop.length - 1) % loop.length].dx)
                    .abs() >
                1e-3 ||
            (loop[index].dy - loop[(index + loop.length - 1) % loop.length].dy)
                    .abs() >
                1e-3)
          loop[index],
    ];
    if (unique.length < 3) continue;
    // Keep the inside on the left: sample just left of the longest of the first few segments.
    var best = 0;
    var bestLength = 0.0;
    for (var k = 0; k < math.min(unique.length, 8); k++) {
      final length = (unique[(k + 1) % unique.length] - unique[k]).distance;
      if (length > bestLength) {
        best = k;
        bestLength = length;
      }
    }
    final a = unique[best], b = unique[(best + 1) % unique.length];
    final sx = (a.dx + b.dx) / 2 + ((b.dy - a.dy) / bestLength) * cell * 0.4;
    final sy = (a.dy + b.dy) / 2 - ((b.dx - a.dx) / bestLength) * cell * 0.4;
    loops.add(
      unionDistance(sx, sy, shapes, spacing) > 0
          ? unique.reversed.toList()
          : unique,
    );
  }
  return loops;
}

/// Signed area of a loop (screen coordinates, y down): positive for clockwise.
double loopArea(List<Offset> loop) {
  var area = 0.0;
  for (var i = 0; i < loop.length; i++) {
    final a = loop[i], b = loop[(i + 1) % loop.length];
    area += a.dx * b.dy - b.dx * a.dy;
  }
  return area / 2;
}

/// One cluster's outline: the exact shape when alone, the blended union when several.
Path clusterPath(List<GlassShape> shapes, double spacing, [double cell = 2]) {
  if (shapes.length == 1) return shapePath(shapes.first);
  final path = Path()..fillType = PathFillType.nonZero;
  for (final loop in unionLoops(shapes, spacing, cell)) {
    path.addPolygon(loop, true);
  }
  return path;
}

/// One cluster of blended bubbles and its outline.
class GlassPath {
  const GlassPath(this.shapes, this.bounds, this.path, [this.clip]);
  final List<GlassShape> shapes;
  final Rect bounds;
  final Path path;

  /// The scissor its paint (material, rim, shadow, refraction) is cut to, in the container's
  /// pixels: the visible part of the scroll view or clip around its bubbles; null when none is.
  /// The outline itself stays whole, so the cut is a straight edge, like CSS overflow clip.
  final Rect? clip;

  /// The outline cut to [clip]: what the backdrop and the glow are clipped to.
  Path get visiblePath {
    final clip = this.clip;
    if (clip == null || _covers(clip, path.getBounds())) return path;
    return Path.combine(PathOperation.intersect, path, Path()..addRect(clip));
  }
}

/// The visible part of the container a bubble may paint in: the intersection of the clips of the
/// render objects between it and the container (viewports, ClipRect, …), or null when nothing clips
/// it. Disjoint clips give an empty rect: the bubble is scrolled or clipped out of view.
Rect? intersectClips(Iterable<Rect> clips) {
  Rect? visible;
  for (final clip in clips) {
    visible = visible == null ? clip : visible.intersect(clip);
  }
  if (visible == null) return null;
  return visible.width <= 0 || visible.height <= 0
      ? Rect.fromLTWH(visible.left, visible.top, 0, 0)
      : visible;
}

/// [glassPaths] for bubbles that may sit in clipped views: [clips] holds each shape's visible rect
/// ([intersectClips]; null = unclipped). Only bubbles sharing a clip blend (glass inside a scroll
/// view never merges with glass outside it); each cluster is cut straight at its clip, and a
/// cluster wholly outside its clip draws nothing. A clipped-out bubble stays in its cluster while
/// it is within [spacing] of the visible part, so the neck toward it is cut, not dropped.
List<GlassPath> clippedGlassPaths(
  List<GlassShape> shapes,
  List<Rect?> clips,
  double spacing, [
  double cell = 2,
]) {
  final groups = <String, (Rect?, List<GlassShape>)>{};
  for (var i = 0; i < shapes.length; i++) {
    final clip = i < clips.length ? clips[i] : null;
    final shape = shapes[i];
    if (clip != null && !clip.overlaps(shape.rect.inflate(spacing))) continue;
    final key = clip == null
        ? ''
        : [
            clip.left,
            clip.top,
            clip.right,
            clip.bottom,
          ].map((v) => v.toStringAsFixed(2)).join(',');
    groups.putIfAbsent(key, () => (clip, <GlassShape>[])).$2.add(shape);
  }
  return [
    for (final (clip, members) in groups.values)
      for (final path in glassPaths(members, spacing, cell))
        if (clip == null)
          path
        else if (clip.overlaps(path.bounds))
          GlassPath(path.shapes, path.bounds, path.path, clip),
  ];
}

bool _covers(Rect outer, Rect inner) =>
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.right >= inner.right &&
    outer.bottom >= inner.bottom;

/// Outline of every cluster, one path per cluster.
List<GlassPath> glassPaths(
  List<GlassShape> shapes,
  double spacing, [
  double cell = 2,
]) => [
  for (final cluster in glassClusters(
    shapes.where((s) => s.width > 0.5 && s.height > 0.5).toList(),
    spacing,
  ))
    GlassPath(cluster, boundsOf(cluster), clusterPath(cluster, spacing, cell)),
];
