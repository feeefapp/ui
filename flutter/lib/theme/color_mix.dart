import 'dart:math' as math;
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

/// CSS `color-mix(in oklab, a <percent>, b)` for opaque colours: [amount] is `a`'s share, 0–1.
/// Perceptually even, so a seed colour tints greys without shifting their lightness.
Color mixOklab(Color a, double amount, Color b) {
  final p = amount.clamp(0.0, 1.0);
  final x = _toOklab(a), y = _toOklab(b);
  return _fromOklab([
    for (var i = 0; i < 3; i++) x[i] * p + y[i] * (1 - p),
  ], a.a * p + b.a * (1 - p));
}

double _linear(double c) =>
    c <= 0.04045 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
double _gamma(double c) => c <= 0.0031308
    ? 12.92 * c
    : 1.055 * math.pow(c, 1 / 2.4).toDouble() - 0.055;
double _cbrt(double v) =>
    v < 0 ? -math.pow(-v, 1 / 3).toDouble() : math.pow(v, 1 / 3).toDouble();

List<double> _toOklab(Color c) {
  final r = _linear(c.r), g = _linear(c.g), b = _linear(c.b);
  final l = _cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  final m = _cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  final s = _cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

Color _fromOklab(List<double> lab, double alpha) {
  final l = math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  final m = math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  final s = math.pow(lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2], 3);
  double channel(double v) => _gamma(v).clamp(0.0, 1.0);
  return Color.from(
    alpha: alpha,
    red: channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    green: channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    blue: channel(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  );
}

/// Black-ish or white text for an opaque [background], whichever has more contrast (WCAG ratio),
/// the twin of the web kit's `readableTextOn`.
Color readableTextOn(Color background) {
  double luminance(Color c) =>
      0.2126 * _wcag(c.r) + 0.7152 * _wcag(c.g) + 0.0722 * _wcag(c.b);
  double contrast(double a, double b) =>
      (math.max(a, b) + 0.05) / (math.min(a, b) + 0.05);
  const dark = Color(0xFF111411);
  final l = luminance(background);
  return contrast(l, luminance(dark)) >= contrast(l, 1)
      ? dark
      : const Color(0xFFFFFFFF);
}

double _wcag(double c) =>
    c <= 0.03928 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();

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
