import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import 'metrics.dart';

/// Dithered top and bottom edge washes over a scroller, fading content under floating chrome:
/// the twin of `ScrollGradientOverlay` in `@feeef.dev/ui/scroll`. Listens to [controller] and
/// repaints without rebuilding the content.
class ScrollGradientOverlay extends StatelessWidget {
  const ScrollGradientOverlay({
    super.key,
    required this.controller,
    this.metrics,
    this.topHeight = 100,
    this.bottomHeight = 160,
    this.density = 0.8,
    this.fadeZone = scrollFadeZone,
    required this.color,
    this.radius = 0,
  });

  final ScrollController controller;

  /// Notifies when the scroll view's size or content changes (its [ScrollMetricsNotification]s).
  /// The washes sit in their own layer, so they repaint on these and on scrolling only.
  final Listenable? metrics;

  /// Wash heights in px, capped at 40% of the viewport.
  final double topHeight, bottomHeight;

  /// Overall wash strength, 0 to 1.
  final double density;

  /// Scroll distance over which a wash fades in from an edge.
  final double fadeZone;

  /// The surface the content sits on.
  final Color color;

  /// Corner radius the washes are clipped to (the enclosing panel's).
  final double radius;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    // The washes repaint on every scroll step: in their own layer, so the page doesn't.
    child: RepaintBoundary(
      child: CustomPaint(
        size: Size.infinite,
        painter: _WashPainter(
          controller: controller,
          metrics: metrics,
          top: topHeight,
          bottom: bottomHeight,
          density: density.clamp(0.0, 1.0),
          fadeZone: fadeZone,
          color: color,
          radius: radius,
        ),
      ),
    ),
  );
}

/// The dither cells per wash grid, grouped by level (1–11): one path per level, so a wash is at
/// most 11 draw calls instead of one per cell.
final _cells = <(int, int, double, double), List<Path?>>{};

List<Path?> _cellPaths(int columns, int rows, double cw, double ch) =>
    _cells.putIfAbsent((columns, rows, cw, ch), () {
      if (_cells.length > 32) _cells.clear();
      final levels = scrollWashLevels(columns, rows);
      final paths = List<Path?>.filled(12, null);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < columns; x++) {
          final level = levels[y * columns + x];
          if (level == 0) continue;
          (paths[level] ??= Path()).addRect(
            Rect.fromLTWH(x * cw, y * ch, cw, ch),
          );
        }
      }
      return paths;
    });

class _WashPainter extends CustomPainter {
  _WashPainter({
    required this.controller,
    required this.metrics,
    required this.top,
    required this.bottom,
    required this.density,
    required this.fadeZone,
    required this.color,
    required this.radius,
  }) : super(
         repaint: metrics == null
             ? controller
             : Listenable.merge([controller, metrics]),
       );
  final ScrollController controller;
  final Listenable? metrics;
  final double top, bottom, density, fadeZone, radius;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    var opacity = (top: scrollRestTop, bottom: scrollRestBottom);
    // Replacing a sheet's keyed editor can briefly leave both scroll views attached.
    // Follow the newest view until the outgoing one detaches, without a single-client assertion.
    final p = controller.hasClients ? controller.positions.last : null;
    if (p != null && p.hasContentDimensions) {
      opacity = scrollEdgeOpacities(p.pixels, p.maxScrollExtent, fadeZone);
    }
    canvas.save();
    canvas.clipPath(
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]),
    );
    _wash(canvas, size.width, math.min(top, size.height * 0.4), opacity.top);
    // The bottom wash is the top one turned around.
    canvas.save();
    canvas.translate(size.width, size.height);
    canvas.rotate(math.pi);
    _wash(
      canvas,
      size.width,
      math.min(bottom, size.height * 0.4),
      opacity.bottom,
    );
    canvas.restore();
    canvas.restore();
  }

  void _wash(Canvas canvas, double width, double height, double opacity) {
    if (width <= 0 || height <= 0 || opacity <= 0) return;
    final columns = math.max(1, (width / 8).ceil());
    final rows = math.max(1, (height / 8).ceil());
    final paths = _cellPaths(columns, rows, width / columns, height / rows);
    final paint = Paint()..isAntiAlias = false;
    for (var level = 1; level < paths.length; level++) {
      final path = paths[level];
      if (path == null) continue;
      paint.color = color.withValues(
        alpha: color.a * density * opacity * level / 11,
      );
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_WashPainter old) =>
      old.top != top ||
      old.bottom != bottom ||
      old.density != density ||
      old.color != color ||
      old.radius != radius ||
      old.controller != controller ||
      old.metrics != metrics;
}
