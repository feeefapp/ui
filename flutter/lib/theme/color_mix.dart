import 'dart:ui';

import 'package:flutter/animation.dart' show Tween;

/// CSS `color-mix(in srgb, a <percent>, b)`: interpolates premultiplied sRGB, like browsers do.
/// [amount] is `a`'s share, 0–1.
Color mixSrgb(Color a, double amount, Color b) {
  final p = amount.clamp(0.0, 1.0);
  final alpha = a.a * p + b.a * (1 - p);
  if (alpha <= 0) return const Color.from(alpha: 0, red: 0, green: 0, blue: 0);
  double channel(double x, double y) =>
      (x * a.a * p + y * b.a * (1 - p)) / alpha;
  return Color.from(
    alpha: alpha,
    red: channel(a.r, b.r),
    green: channel(a.g, b.g),
    blue: channel(a.b, b.b),
  );
}

/// Fully transparent, as CSS `transparent` (black at zero alpha).
const Color transparent = Color.from(alpha: 0, red: 0, green: 0, blue: 0);

/// `#rrggbb` → opaque colour.
Color hex(int rgb) => Color(0xFF000000 | rgb);

/// White or black at an alpha, as `rgb(255 255 255 / a)`.
Color white(double alpha) =>
    Color.from(alpha: alpha, red: 1, green: 1, blue: 1);
Color black(double alpha) =>
    Color.from(alpha: alpha, red: 0, green: 0, blue: 0);

/// [ColorTween] the way browsers animate colours: premultiplied, so a fade from or to
/// [transparent] keeps the other end's hue instead of passing through grey (plain [Color.lerp]
/// mixes RGB and alpha apart, so transparent black darkens every mid frame). Use it for every
/// animated fill, border and ink in the kit.
class PaintColorTween extends Tween<Color?> {
  PaintColorTween({super.begin, super.end});

  @override
  Color? lerp(double t) {
    final a = begin, b = end;
    if (a == null || b == null) return t < 0.5 ? (a ?? b) : (b ?? a);
    return mixSrgb(b, t, a);
  }
}
