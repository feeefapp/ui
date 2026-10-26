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

/// The gentle lens (the default, like iOS 27's: it never folds the backdrop back), the twin of
/// the web kit's `gentleRefractionShift`: the largest shift (px) for glass whose shorter side is
/// [side] px, capped so the quartic bezel's slope `4 · shift / band` stays below one.
double gentleRefractionShift(double side, [double bezel = glassBezel]) {
  final size = refractionScale(side);
  final band = math.min(bezel * size, side / 2);
  return math.max(
    0.0,
    math.min(glassRefraction * size, band * 0.8 / glassBezelPower),
  );
}

/// A control lens's kind: a pill (segmented control, tab bar), a slider's thumb or a switch's
/// thumb (they bend and edge differently on iOS 26.2).
enum LensKind { pill, thumb, switchThumb }

/// How iOS 26.2's control lenses bend what is behind them, measured with phase-shifted fringes
/// under held stock controls (`research/liquid-glass/LENS-MEASURED.md` §2), the twin of the web
/// kit's `LENS_BEND`. The pill: an inward rim of [lensPillRim] px over its outer
/// [lensPillRimWidth] px, then outward (it shows the backdrop from outside its edge, so lines
/// crowd toward the rim), rising to [lensPillPeak] px at [lensPillAt] px deep, then fading as
/// `exp(-(d - at) / decay)`. The slider thumb: inward, [lensThumbPeak] px over its outer
/// [lensThumbAt] px, then `peak · (1 - (d - at) / reach)^power`, its outer [lensThumbSoft] px
/// softened ([lensSoftBlur], [lensSoftWeight]). The switch thumb: the pill's profile at
/// [lensSwitchScale] (outward, 2.9 px at 5 px deep) with the pill's lean, and its whole middle
/// zoomed out ([lensSwitchZoomX], [lensSwitchZoomY]). All the same in light and dark.
const double lensPillRim = 6;
const double lensPillRimWidth = 0.6;
const double lensPillPeak = 4.3;
const double lensPillAt = 5;
const double lensPillDecay = 10.5;

/// The pill bend's direction is the outline's normal plus this × the offset from the centre over
/// the half size, normalised: vertical lines bow along its top and bottom.
const double lensPillRadial = 1.5;
const double lensThumbPeak = 7.1;
const double lensThumbAt = 1;
const double lensThumbReach = 6.5;
const double lensThumbPower = 2.2;

/// How deep (px) the slider thumb's soft band reaches: [lensSoftWeight] falls from 1 at the rim
/// to 0 here.
const double lensThumbSoft = 5;

/// The slider thumb's soft edge: iOS 26.2 blurs the band it bends (fringe contrast 0.45 of the
/// middle at its rim, back to full about 5 px in). The backdrop blurred by this standard deviation
/// (px), then bent like the rest, mixed over the sharp bend by [lensSoftWeight]. The web kit's
/// `LENS_SOFT`.
const double lensSoftBlur = 2;

/// The switch thumb's bend is the pill's ([lensBend]) times this.
const double lensSwitchScale = 0.67;

/// The switch thumb's middle is zoomed out: a point shows the backdrop this × its offset from the
/// centre further out, per axis (it looks about 13 % smaller across).
const double lensSwitchZoomX = 0.04;
const double lensSwitchZoomY = 0;

/// Colour split of a lens's bend: red bends this much less than green and blue this much more
/// (the web kit's `LENS_DISPERSION`), the rainbow along its rim.
const double lensDispersion = 0.06;

/// The bend (px, positive inward) of a [kind] lens at depth [d] px inside its outline: the twin
/// of the web kit's `lensBend`. `shaders/glass_refraction.frag` evaluates the same per pixel.
double lensBend(LensKind kind, double d) {
  if (!(d >= 0)) return 0;
  if (kind == LensKind.thumb) {
    if (d <= lensThumbAt) return lensThumbPeak;
    final t = 1 - (d - lensThumbAt) / lensThumbReach;
    return t > 0 ? lensThumbPeak * math.pow(t, lensThumbPower) : 0;
  }
  final scale = kind == LensKind.switchThumb ? lensSwitchScale : 1.0;
  if (d < lensPillRimWidth) {
    return scale * lensPillRim * (1 - d / lensPillRimWidth);
  }
  if (d < lensPillAt) {
    return -scale *
        lensPillPeak *
        math.min(
          1.0,
          (d - lensPillRimWidth) / (lensPillAt - 1 - lensPillRimWidth),
        );
  }
  return -scale * lensPillPeak * math.exp(-(d - lensPillAt) / lensPillDecay);
}

/// How much of the softened (blurred, then bent) backdrop shows at depth [d] px inside a [kind]
/// lens: `max(0, 1 - d / lensThumbSoft)` for the slider thumb, 0 otherwise. The web kit's lens map
/// blue channel.
double lensSoftWeight(LensKind kind, double d) {
  if (kind != LensKind.thumb || !(d >= 0)) return 0;
  return math.max(0.0, 1 - d / lensThumbSoft);
}

/// The switch thumb's zoom-out at ([dx], [dy]) px from its centre: the extra shift (px, outward
/// positive) of the sample along each axis. Zero for other kinds.
({double x, double y}) lensZoom(LensKind kind, double dx, double dy) =>
    kind == LensKind.switchThumb
    ? (x: dx * lensSwitchZoomX, y: dy * lensSwitchZoomY)
    : (x: 0, y: 0);
