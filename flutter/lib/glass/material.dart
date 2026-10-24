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

/// Clear glass softens what it covers even when the theme's backdrop blur is off (σ 1.6 px,
/// LIGHT-EDGES.md): part of why it reads as a surface over detailed content.
const double glassClearBlur = 1.6;

/// The blur (std dev, px) of glass at [tint] whose shorter side is [side] px: clear glass's
/// [glassClearBlur] mixed with the regular blur ([glassBlur], or none when the theme's
/// `glassBlur` is off).
double glassBlurAt(double side, double tint, {required bool blurOn}) {
  final t = clampGlassTint(tint);
  return glassClearBlur * (1 - t) + t * (blurOn ? glassBlur(side) : 0);
}

/// Saturation applied to the blurred backdrop before the veil, by brightness and size.
double glassSaturate({required bool dark, required GlassSize size}) => dark
    ? (size == GlassSize.small ? 2.9 : 2.4)
    : (size == GlassSize.small ? 5.5 : 2.2);

/// Share of the theme surface laid over the backdrop, by brightness and size.
double glassVeil({required bool dark, required GlassSize size}) => dark
    ? (size == GlassSize.small ? 0.75 : 0.72)
    : (size == GlassSize.small ? 0.87 : 0.71);

/// Rim light, the twin of the web kit's `glassRim` (research/liquid-glass/LIGHT-EDGES.md): a layer
/// of white over the material at the inner edge. At depth `d` (px inward from the outline) and
/// angle `a` between the edge normal and the light axis (lit at both ends), its alpha is
/// `(w0 + w1 · |cos a|^p) · max(0, 1 - (d / width)³)`. Clear (tint 0) and regular (tint 1) are the
/// measured ends; the tint mixes every parameter linearly.
typedef GlassRim = ({double w0, double w1, double p, double width});

const GlassRim glassRimLightClear = (w0: 0.03, w1: 0.63, p: 1.1, width: 1.1);
const GlassRim glassRimLightRegular = (w0: 0.05, w1: 0.81, p: 0.9, width: 1);
const GlassRim glassRimDarkClear = (w0: 0, w1: 0.08, p: 1.1, width: 1.17);
const GlassRim glassRimDarkRegular = (w0: 0, w1: 0.16, p: 1, width: 1.2);

/// The rim at one tint and brightness.
GlassRim glassRim(double tint, {required bool dark}) {
  final t = clampGlassTint(tint);
  final clear = dark ? glassRimDarkClear : glassRimLightClear;
  final regular = dark ? glassRimDarkRegular : glassRimLightRegular;
  double mix(double a, double b) => a + (b - a) * t;
  return (
    w0: mix(clear.w0, regular.w0),
    w1: mix(clear.w1, regular.w1),
    p: mix(clear.p, regular.p),
    width: mix(clear.width, regular.width),
  );
}

/// Rim alpha at [depth] px inside the outline, where [cosine] is the cosine of the angle between
/// the edge normal and the light axis (its sign does not matter). 0 outside.
double rimLayer(double depth, double cosine, GlassRim rim) {
  if (!(depth >= 0) || depth >= rim.width) return 0;
  final c = math.min(1.0, cosine.abs());
  final angular = rim.w0 + rim.w1 * math.pow(c, rim.p);
  final d = depth / rim.width;
  return (angular * (1 - d * d * d)).clamp(0.0, 1.0);
}

/// The edge of the material, applied to the bent backdrop before the veil (the twin of the web
/// kit's `GLASS_EDGE`): `out = x + k1 · x · E + k3 · E` with the edge mask
/// `E = max(0, 1 - (d / glassEdgeWidth)³) · (glassEdgeFloor + (1 - glassEdgeFloor) · |cos a|)`.
/// The veil thins at the edge by [glassEdgeThinLight] / [glassEdgeThinDark] × tint; in dark
/// appearance clear glass adds `glassEdgeAddBase + glassEdgeAddGain · x` × (1 - tint).
const double glassEdgeWidth = 1;
const double glassEdgeFloor = 0.2;
const double glassEdgeThinLight = 0.35;
const double glassEdgeThinDark = 0.3;
const double glassEdgeAddBase = 0.106;
const double glassEdgeAddGain = 0.31;

/// The edge mask at [depth] px inside the outline (0 outside), for [cosine] against the light axis.
double edgeMask(double depth, double cosine) {
  if (!(depth >= 0) || depth >= glassEdgeWidth) return 0;
  final d = depth / glassEdgeWidth;
  return (1 - d * d * d) *
      (glassEdgeFloor + (1 - glassEdgeFloor) * math.min(1.0, cosine.abs()));
}

/// The edge terms `(k1, k3)` for [material], where [surface] is the grey level (0–1) of the
/// veil's colour: the veil is laid over the result, so thinning it by K needs
/// `veil · K / (1 - veil)` here.
({double k1, double k3}) glassEdgeTerms(
  double tint, {
  required bool dark,
  required GlassMaterial material,
  required double surface,
}) {
  final t = clampGlassTint(tint);
  final k = (dark ? glassEdgeThinDark : glassEdgeThinLight) * t;
  final thin = material.veil < 1
      ? material.veil * k / (1 - material.veil)
      : 0.0;
  final add = dark ? 1 - t : 0.0;
  return (
    k1: thin + glassEdgeAddGain * add,
    k3: glassEdgeAddBase * add - thin * surface,
  );
}

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
