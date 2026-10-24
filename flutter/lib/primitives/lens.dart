import 'dart:math' as math;
import 'dart:ui' as ui show Gradient;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme/light_edge.dart';
import '../theme/tokens.dart';

/// A control's glass lens: the moving part of a segmented control, a switch or a slider turns into
/// clear glass while pressed or dragged (`lens_model.dart`). The twin of the web kit's `lens.css`
/// (`.lab-lens`, `.lab-lens-glow`) and the lens shadow its owners cast. Owners keep their rest paint
/// where the lens is off: reduced motion, high contrast and `GlassStyle.solid`.
class LensPaint {
  const LensPaint({
    required this.fill,
    required this.edge,
    required this.highlight,
    required this.light,
    required this.shadow,
    required this.glow,
  });

  /// The lens colours of [c]: `--lab-glass-fill`, `--lab-line`, the light rim and the glow.
  factory LensPaint.of(ColorTokens c) => LensPaint(
    fill: c.glassFill,
    edge: c.line,
    highlight: c.glassEdgeLow,
    light: c.glassEdgeLight,
    shadow: c.glassShadowColor,
    glow: c.glassGlow,
  );

  final Color fill, edge, highlight, light, shadow, glow;

  /// `0 4px 14px` in the glass shadow colour, at [lens] strength: a lifted lens casts it.
  void paintShadow(Canvas canvas, Path shape, double lens) {
    if (lens <= 0.001) return;
    canvas.drawPath(
      shape.shift(const Offset(0, 4)),
      Paint()
        ..color = shadow.withValues(alpha: shadow.a * lens)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
    );
  }

  /// The glass layer over [rect] (corner [radius]) at [lens] opacity, with the touch glow at
  /// [glowAt] (canvas coordinates), [glowRadius] px wide, at [glowOpacity] × [lens].
  void paint(
    Canvas canvas,
    Rect rect,
    double radius, {
    required double lens,
    required Offset glowAt,
    required double glowRadius,
    required double glowOpacity,
  }) {
    if (lens <= 0.001 || rect.width <= 0 || rect.height <= 0) return;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    canvas.saveLayer(
      rect.inflate(1),
      Paint()..color = Color.from(alpha: lens, red: 0, green: 0, blue: 0),
    );
    canvas.drawPath(shape, Paint()..color = fill);
    // `--lab-glass-light`: inset highlight on top, a faint shade at the bottom.
    final inner = superellipsePath(rect, radii, inset: 1);
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
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, -1)),
      ),
      Paint()..color = const Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
    );
    canvas.restore();
    canvas.drawPath(
      superellipsePath(rect, radii, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = edge,
    );
    canvas.save();
    canvas.translate(rect.left, rect.top);
    paintLightEdge(canvas, rect.size, radius, light: light, low: highlight);
    canvas.restore();
    // The touch glow, clipped to the lens.
    paintGlow(canvas, shape, glow, glowAt, glowRadius, glowOpacity);
    canvas.restore();
  }

  /// The touch glow ([color], `--lab-glass-glow`) centred on [at], [radius] px wide, at [opacity],
  /// clipped to [shape]: a pressed lens or glass button.
  static void paintGlow(
    Canvas canvas,
    Path shape,
    Color color,
    Offset at,
    double radius,
    double opacity,
  ) {
    final alpha = opacity.clamp(0.0, 1.0);
    if (alpha <= 0.01) return;
    final r = math.max(1.0, radius);
    canvas.save();
    canvas.clipPath(shape);
    canvas.drawCircle(
      at,
      r,
      Paint()
        ..shader = ui.Gradient.radial(at, r, [
          color.withValues(alpha: color.a * alpha),
          color.withValues(alpha: 0),
        ]),
    );
    canvas.restore();
  }

  @override
  bool operator ==(Object other) =>
      other is LensPaint &&
      other.fill == fill &&
      other.edge == edge &&
      other.highlight == highlight &&
      other.light == light &&
      other.shadow == shadow &&
      other.glow == glow;

  @override
  int get hashCode => Object.hash(fill, edge, highlight, light, shadow, glow);
}
