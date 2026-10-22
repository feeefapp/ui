import 'dart:ui';

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
