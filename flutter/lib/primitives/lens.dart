import 'dart:math' as math;
import 'dart:ui' as ui show Gradient;

import 'package:flutter/widgets.dart';

import '../theme/tokens.dart';

/// What a control's lens paints itself (the glass is [GlassLens]): the lift shadow under a pressed
/// lens and the touch glow (also a pressed glass button's). The twin of the shadow and glow in the
/// web kit's `lens.css`.
class LensPaint {
  const LensPaint({required this.shadow});

  /// The lens paint of [c]: the glass shadow colour.
  factory LensPaint.of(ColorTokens c) => LensPaint(shadow: c.glassShadowColor);

  final Color shadow;

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
      other is LensPaint && other.shadow == shadow;

  @override
  int get hashCode => shadow.hashCode;
}
