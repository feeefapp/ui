import 'dart:math' as math;
import 'dart:ui' as ui show Gradient;

import 'package:flutter/widgets.dart';

/// The touch glow of a pressed glass button. Control lenses ([GlassLens]) have none, as on iOS
/// 26.2, and paint their own shadow.
abstract final class LensPaint {
  /// The touch glow ([color], `--lab-glass-glow`) centred on [at], [radius] px wide, at [opacity],
  /// clipped to [shape]: a pressed glass button.
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
}
