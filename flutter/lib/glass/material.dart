import 'dart:math' as math;

/// The glass material: how much it blurs, saturates and veils what is behind it, how its rim
/// catches the light and how far its shadow falls. Our own model, fitted to measurements of
/// rendered Liquid Glass (`ui/research/liquid-glass/FINDINGS.md`). The twin of
/// `@feeef.dev/ui/glass/material`; colours live in the theme tokens.
///
/// Glass comes in two sizes: control-sized glass (shorter side up to [glassSmallSide]) is denser
/// and lets more colour through; larger panels are more transparent.

/// Glass whose shorter side is at most this (px) uses the small, denser material.
const double glassSmallSide = 72;

enum GlassSize { small, large }

GlassSize glassSize(double side) =>
    side <= glassSmallSide ? GlassSize.small : GlassSize.large;

/// Backdrop blur (standard deviation, px): [glassBlurMin] up to [glassBlurFrom] px, growing by
/// [glassBlurSlope] per px to [glassBlurMax] on panels.
const double glassBlurMin = 2.9;
const double glassBlurMax = 5.2;
const double glassBlurFrom = 64;
const double glassBlurSlope = 0.025;

/// Blur (standard deviation, px) for glass whose shorter side is [side] px.
double glassBlur(double side) => math.min(
  glassBlurMax,
  math.max(
    glassBlurMin,
    glassBlurMin + (side - glassBlurFrom) * glassBlurSlope,
  ),
);

/// Saturation applied to the blurred backdrop before the veil, by brightness and size.
double glassSaturate({required bool dark, required GlassSize size}) => dark
    ? (size == GlassSize.small ? 2.9 : 2.4)
    : (size == GlassSize.small ? 5.5 : 2.2);

/// Share of the theme surface laid over the backdrop, by brightness and size.
double glassVeil({required bool dark, required GlassSize size}) => dark
    ? (size == GlassSize.small ? 0.75 : 0.72)
    : (size == GlassSize.small ? 0.87 : 0.71);

/// Rim light alpha: `base + (peak - base) cos²a` for the angle `a` between the edge normal and the
/// light axis (lit at both ends of the axis).
({double base, double peak}) glassRim({required bool dark}) =>
    dark ? (base: 0.14, peak: 0.25) : (base: 0.27, peak: 0.72);

double rimAlpha(double angle, {required bool dark}) {
  final rim = glassRim(dark: dark);
  final c = math.cos(angle);
  return rim.base + (rim.peak - rim.base) * c * c;
}

/// Stops for the rim's gradient line (offset 0 and 1 at the lit ends): the share of the lit colour
/// laid over the base rim at each offset.
final List<(double, double)> glassRimStops = [
  for (var i = 0; i <= 10; i++)
    (
      i / 10,
      ((1 - 2 * i / 10) * (1 - 2 * i / 10) * 1000).roundToDouble() / 1000,
    ),
];

/// Shadow under the glass: [glassShadowDy] px down, blurred by [glassShadowBlur] (std dev).
const double glassShadowDy = 7.5;
const double glassShadowBlur = 19.5;

/// The CSS `saturate()` matrix, for `ColorFilter.matrix`.
List<double> saturateMatrix(double s) => [
  0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0, //
  0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0, //
  0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0, //
  0, 0, 0, 1, 0,
];

/// Measured clear glass (FINDINGS §3): no veil, no shadow, full colour, and a slight brightness
/// lift on what is behind it, `out = gain · backdrop + offset` in sRGB.
const double glassClearGain = 1.03;
const double glassClearOffset = 0.076;

/// The default tint: the midpoint between clear and tinted, a light veil over the bent backdrop.
const double glassTintDefault = 0.5;

/// The least tint of glass bars floating over scrolling content (a ScrollArea's app bar and
/// dock, a TabView's tab bar): their labels sit on moving content, so the glass stays this
/// veiled even when the theme's tint is clearer ([GlassBar]). The web's `GLASS_BAR_TINT`.
const double glassBarTint = 0.85;

/// A tint clamped to 0–1; anything not finite is the default.
double clampGlassTint(double tint) =>
    tint.isFinite ? tint.clamp(0.0, 1.0) : glassTintDefault;

/// The material at one tint, for one brightness and glass size. Mixed in sRGB over the backdrop:
/// `out = veil · surface + (1 - veil) · (gain · saturate(backdrop) + offset)`.
typedef GlassMaterial = ({
  double veil,
  double saturate,
  double gain,
  double offset,
  double shadow,
});

/// The tint curve, the twin of `glassMaterial` in `@feeef.dev/ui/glass/material`. Clear (0) and
/// regular (1) are the measured materials; between them every parameter follows the tint in a
/// straight line, except saturation: the share of the backdrop's colour that reaches the eye,
/// `(1 - veil) · saturate`, is what stays linear (1 for clear glass, 0.64–0.73 for regular), so
/// saturation is derived from it and the veil. At the default 0.5 the veil is 36–44 %.
GlassMaterial glassMaterial(
  double tint, {
  required bool dark,
  required GlassSize size,
}) {
  final t = clampGlassTint(tint);
  final regularVeil = glassVeil(dark: dark, size: size);
  final regularColour =
      (1 - regularVeil) * glassSaturate(dark: dark, size: size);
  final veil = t * regularVeil;
  final colour = 1 - t * (1 - regularColour);
  return (
    veil: veil,
    saturate: colour / (1 - veil),
    gain: 1 + (glassClearGain - 1) * (1 - t),
    offset: glassClearOffset * (1 - t),
    shadow: t,
  );
}

/// The backdrop's colour treatment for [material] as one `ColorFilter.matrix`: saturation, then
/// the lift `gain · x + offset` (Flutter's bias column is in 0–255).
List<double> glassBackdropMatrix(GlassMaterial material) {
  final s = saturateMatrix(material.saturate);
  final g = material.gain;
  final bias = material.offset * 255;
  return [
    for (var row = 0; row < 4; row++)
      for (var col = 0; col < 5; col++)
        row == 3
            ? s[row * 5 + col]
            : col == 4
            ? s[row * 5 + col] * g + bias
            : s[row * 5 + col] * g,
  ];
}
