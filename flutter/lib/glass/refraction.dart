import 'dart:math' as math;

/// Refraction profile, the twin of `@feeef.dev/ui/glass/refraction`: at depth `t` from the edge a
/// pixel shows the backdrop from `shift · (1 - t / bezel)^4` deeper inside. Our own fit to
/// measurements of rendered Liquid Glass (`ui/research/liquid-glass/FINDINGS.md`). The fragment
/// shader `shaders/glass_refraction.frag` evaluates the same profile per pixel.

/// Bezel width (px) of large glass: where the bend fades to nothing.
const double glassBezel = 27;

/// Largest shift (px), at the very edge of large glass.
const double glassRefraction = 47;

/// Exponent of the bend's fall-off across the bezel.
const double glassBezelPower = 4;

/// Glass whose shorter side reaches this (px) bends fully; smaller glass scales bezel and shift.
const double glassLargeSide = 88;

/// How fast smaller glass shrinks its bezel: scale = (side / [glassLargeSide]) ^ this.
const double glassSizeExponent = 0.78;

/// Bezel and shift scale for glass whose shorter side is [side] px (1 for large glass).
double refractionScale(double side) {
  if (!(side > 0)) return 0;
  return math
      .pow(math.min(1.0, side / glassLargeSide), glassSizeExponent)
      .toDouble();
}

/// Bend at one point from its signed distance [d] (negative inside) and the outward normal
/// ([nx], [ny]): a shift toward the inside, -1…1 per axis as a share of the largest shift.
({double x, double y}) refractionAt(
  double d,
  double nx,
  double ny, [
  double bezel = glassBezel,
]) {
  if (d >= 0 || bezel <= 0) return (x: 0, y: 0);
  final t = math.min(1.0, -d / bezel);
  if (t >= 1) return (x: 0, y: 0);
  final bend = math.pow(1 - t, glassBezelPower).toDouble();
  return (x: -nx * bend, y: -ny * bend);
}
