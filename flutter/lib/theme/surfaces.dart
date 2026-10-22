import 'dart:ui' show Brightness;

import 'package:flutter/rendering.dart';

import '../brand/geometry.dart';

/// `--lab-glass-shadow`'s colour: 18% black in light themes, 40% in dark.
Color glassShadowColor(Brightness brightness) => Color.from(
  alpha: brightness == Brightness.dark ? 0.40 : 0.18,
  red: 0,
  green: 0,
  blue: 0,
);

/// The web kit's floating surface paint (`.lab-glass-group`, `.lab-popover-surface`): the soft
/// `--lab-glass-shadow` (0 8px 24px -14px), [fill], the `--lab-glass-light` inner light (a light
/// line under the top border, a dark one over the bottom) and the 1px [line] border.
void paintFloatingSurface(
  Canvas canvas,
  Size size,
  double radius, {
  required Color fill,
  required Color line,
  required Color edgeLow,
  required Color shadow,
  bool roundEnds = false,
}) {
  final rect = Offset.zero & size;
  List<double> r(double v) => [v, v, v, v];
  final shape = superellipsePath(rect, r(radius), roundEnds: roundEnds);
  // --lab-glass-shadow: 0 8px 24px -14px (spread shrinks the shape; blur 24 → sigma 12).
  final spread = rect.deflate(14);
  if (!spread.isEmpty) {
    canvas.save();
    canvas.clipPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(rect.inflate(48)),
        shape,
      ),
    );
    canvas.drawPath(
      superellipsePath(
        spread,
        r(radius - 14),
        roundEnds: roundEnds,
      ).shift(const Offset(0, 8)),
      Paint()
        ..color = shadow
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    canvas.restore();
  }
  canvas.drawPath(shape, Paint()..color = fill);
  // --lab-glass-light: inset 0 1px 0 edge-low, inset 0 -1px 0 rgb(0 0 0 / 6%), inside the border.
  final inner = superellipsePath(
    rect,
    r(radius),
    inset: 1,
    roundEnds: roundEnds,
  );
  canvas.save();
  canvas.clipPath(inner);
  canvas.drawPath(
    Path.combine(
      PathOperation.difference,
      inner,
      inner.shift(const Offset(0, 1)),
    ),
    Paint()..color = edgeLow,
  );
  canvas.drawPath(
    Path.combine(
      PathOperation.difference,
      inner,
      inner.shift(const Offset(0, -1)),
    ),
    Paint()..color = const Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
  );
  canvas.restore();
  final border = superellipsePath(
    rect,
    r(radius),
    inset: 0.5,
    roundEnds: roundEnds,
  );
  canvas.drawPath(
    border,
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = line,
  );
}

/// A control surface in the web kit's variant recipe: the raised shadow (`0 2px 6px`), fill, the
/// inset top highlight, the 1px edge and an optional 2px focus ring just outside.
class ControlSurfacePainter extends CustomPainter {
  ControlSurfacePainter({
    required this.fill,
    required this.edge,
    required this.radius,
    required this.raised,
    required this.highlight,
    required this.depth,
    required this.focus,
  });
  final Color fill, edge, highlight;
  final double radius, depth;
  final bool raised;
  final Color? focus;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, r);
    if (raised) {
      canvas.drawPath(
        shape.shift(const Offset(0, 2)),
        Paint()
          ..color = Color.from(alpha: depth, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
    }
    canvas.drawPath(shape, Paint()..color = fill);
    if (raised) {
      final inner = superellipsePath(rect, r, inset: 1);
      canvas.save();
      canvas.clipPath(inner);
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, 1)),
        ),
        Paint()..color = highlight,
      );
      canvas.restore();
    }
    if (edge.a > 0) {
      canvas.drawPath(
        superellipsePath(rect, r, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = edge,
      );
    }
    if (focus != null) {
      canvas.drawPath(
        superellipsePath(rect.inflate(4), [for (final v in r) v + 4], inset: 1),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = focus!,
      );
    }
  }

  @override
  bool shouldRepaint(ControlSurfacePainter old) =>
      old.fill != fill ||
      old.edge != edge ||
      old.focus != focus ||
      old.radius != radius;
}
