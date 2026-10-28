import 'dart:math' as math;

import 'refraction.dart' show LensKind;

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

/// Saturation applied to the backdrop under the regular veil (iOS 27, the web kit's
/// `GLASS_SATURATE`): the share of its colour that reaches the eye is 0.52 in light, 0.99 in dark.
/// iOS 27 shows no size dependence, so [size] carries the same values.
double glassSaturate({required bool dark, required GlassSize size}) =>
    dark ? 1.207 : 1.177;

/// Share of the theme surface laid over the backdrop by regular glass (iOS 27, `GLASS_VEIL`).
double glassVeil({required bool dark, required GlassSize size}) =>
    dark ? 0.05 : 0.52;

/// Regular glass's own `gain · backdrop + offset` under its veil (`GLASS_REGULAR_LIFT`).
({double gain, double offset}) glassRegularLift({required bool dark}) =>
    dark ? (gain: 0.863, offset: 0.095) : (gain: 0.92, offset: 0.0);

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

/// Shadow under every glass, clear included (iOS 27): [glassShadowDy] px down, blurred by
/// [glassShadowBlur] (std dev), black at the theme's `glassShadowColor` (2 % light, 4 % dark).
const double glassShadowDy = 8;
const double glassShadowBlur = 7.5;

/// The dark hairline iOS 27 draws outside every glass shape (the web kit's `GLASS_HAIRLINE`): a
/// ring [glassHairlineRingWidth] px wide, plus slivers where the shape moved
/// [glassHairlineSliverShift] px left and right and shrunk by [glassHairlineSliverInset] px reaches
/// past its outline. Both subtract from the backdrop (plus-darker), by [glassHairline].
const double glassHairlineRingWidth = 0.5;
const double glassHairlineSliverShift = 1.25;
const double glassHairlineSliverInset = 0.75;

/// The hairline's ring and sliver strengths (0–1 subtracted) at one tint and brightness: clear
/// light 0.2 / 0.184, regular light 0.09 / 0.184, dark 0.349 / 0.349.
({double ring, double sliver}) glassHairline(
  double tint, {
  required bool dark,
}) {
  final t = clampGlassTint(tint);
  if (dark) return (ring: 0.349, sliver: 0.349);
  return (ring: 0.2 + (0.09 - 0.2) * t, sliver: 0.184);
}

/// `x - strength` (clamped at 0) as a `ColorFilter.matrix`: plus-darker with a constant.
List<double> subtractMatrix(double strength) {
  final bias = -255.0 * math.max(0.0, strength);
  return [1, 0, 0, 0, bias, 0, 1, 0, 0, bias, 0, 0, 1, 0, bias, 0, 0, 0, 1, 0];
}

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
});

/// The tint curve, the twin of `glassMaterial` in `@feeef.dev/ui/glass/material`. Clear (0) and
/// regular (1) are the measured materials (iOS 27); between them every parameter follows the tint
/// in a straight line, except saturation: `(1 - veil) · saturate` stays linear (1 for clear glass,
/// 0.565 light / 1.147 dark for regular), so saturation is derived from it and the veil.
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
  final lift = glassRegularLift(dark: dark);
  return (
    veil: veil,
    saturate: colour / (1 - veil),
    gain: glassClearGain + (lift.gain - glassClearGain) * t,
    offset: glassClearOffset + (lift.offset - glassClearOffset) * t,
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

/// One alpha per side of a lens's outline.
typedef LensSides = ({double top, double side, double bottom});

/// The material of a control lens, from held iOS 26.2 controls over flat white, grey and black
/// backdrops (`research/liquid-glass/LENS-MEASURED.md` §3), the twin of the web kit's
/// `lensMaterial`. Not the container material: lenses never blur, lift or saturate the backdrop.
/// Over it, in this order: white at `veil`; black from `shade.top` at the top edge to
/// `shade.middle` by half the height (flat below); the rim, white along the inner edge per side,
/// `band` over 1 px and `edge` over its outermost third; a thumb's dark lines, `line.inner` over
/// its inner 1 px and `line.outer` over 0.5 px outside its top edge, `line.bottom` over the inner
/// 1 px of its bottom edge; then the `shadow` ([lensShadowDy], [lensShadowBlur]). No hairline:
/// iOS draws none around control lenses.
typedef LensMaterial = ({
  double veil,
  ({double top, double middle}) shade,
  LensSides band,
  LensSides edge,
  ({double inner, double outer, double bottom}) line,
  double shadow,
});

/// The shadow every control lens casts: black at [lensShadowAlpha], [lensShadowDy] px down,
/// blurred by [lensShadowBlur] (a CSS blur radius: sigma is half of it). The web's `LENS_SHADOW`.
const double lensShadowDy = 6;
const double lensShadowBlur = 11;
const double lensShadowAlpha = 0.13;

LensSides _sides(double top, double side, double bottom) =>
    (top: top, side: side, bottom: bottom);

/// A [kind] lens's material at [lens] (0 rest … 1 glass), every alpha eased in with it. The pill
/// (segmented control, tab bar) is even all round; the slider thumb is lit at its sides with a
/// dark top line; the switch thumb has the slider thumb's veil and shade, dark lines along its top
/// and bottom edges and the rim light over them.
LensMaterial lensMaterial({
  required LensKind kind,
  required double lens,
  required bool dark,
}) {
  final t = lens.isFinite ? lens.clamp(0.0, 1.0) : 0.0;
  final LensSides band, edge;
  final double veil, top, middle, inner, outer, bottom;
  switch (kind) {
    case LensKind.pill:
      veil = 0;
      top = 0.105;
      middle = 0.035;
      band = dark ? _sides(0.2, 0.2, 0.2) : _sides(0.27, 0.27, 0.27);
      edge = dark ? _sides(1, 1, 1) : _sides(0.45, 0.45, 0.45);
      inner = 0;
      outer = 0;
      bottom = 0;
    case LensKind.thumb:
      veil = 0.09;
      top = 0.14;
      middle = 0.04;
      band = dark ? _sides(0, 0.15, 0.15) : _sides(0, 0.25, 0.08);
      edge = dark ? _sides(0, 0.18, 0.18) : _sides(0, 0.3, 0.1);
      inner = dark ? 0.24 : 0.35;
      outer = dark ? 0.31 : 0.23;
      bottom = 0;
    case LensKind.switchThumb:
      veil = 0.09;
      top = 0.14;
      middle = 0.04;
      band = _sides(0.2, 0.2, 0.3);
      edge = _sides(0.25, 0.25, 0.45);
      inner = dark ? 0.5 : 0.55;
      outer = 0;
      bottom = 0.6;
  }
  LensSides eased(LensSides s) => _sides(s.top * t, s.side * t, s.bottom * t);
  return (
    veil: veil * t,
    shade: (top: top * t, middle: middle * t),
    band: eased(band),
    edge: eased(edge),
    line: (inner: inner * t, outer: outer * t, bottom: bottom * t),
    shadow: lensShadowAlpha * t,
  );
}

/// The container's materials (the web kit's `GlassKind`): `regular` is the tint curve above;
/// `menu` is the thick glass menus are made of (they carry text over anything): regular glass
/// (tint 1, large) veiled at least [glassMenuVeil], blurred at least [glassMenuBlur] px whatever
/// the theme's `glassBlur` says, and lifted off the page by a deeper shadow ([glassMenuShadow]). The
/// hairline, rim light and lens are the container's as for every glass.
enum GlassKind { regular, menu }

/// The least share of the surface veiling what is under menu glass (`GLASS_MENU.veil`).
const double glassMenuVeil = 0.88;

/// The least backdrop blur of menu glass, in px (`GLASS_MENU.blur`).
const double glassMenuBlur = 20;

/// Menu glass's shadow (`GLASS_MENU.shadow`): [dy] px down, std dev [blur], the shape shrunk by
/// [inset] px first, black at [alpha] (CSS `0 14px 40px -12px rgb(0 0 0 / 24%)`).
const glassMenuShadow = (dy: 14.0, blur: 20.0, inset: 12.0, alpha: 0.24);

/// The menu material for one brightness (`glassMenuMaterial` in the web kit).
GlassMaterial glassMenuMaterial({required bool dark}) {
  final regular = glassMaterial(1, dark: dark, size: GlassSize.large);
  return (
    veil: math.max(regular.veil, glassMenuVeil),
    saturate: regular.saturate,
    gain: regular.gain,
    offset: regular.offset,
  );
}

/// How much more frosted glass blurs than the measured blur (the web kit's
/// `GLASS_FROSTED_BLUR_SCALE`).
const double glassFrostedBlurScale = 2;

/// Blur (std dev, px) of liquid glass that should bend but can't (no shader filters: Flutter web,
/// Skia): clear glass over busy content all but vanishes, so it frosts instead.
double glassFrostedBlur(double side) => glassBlur(side) * glassFrostedBlurScale;

/// Backdrop blur (std dev, px) of [kind] glass whose shorter side is [side] px ([glassBlurAt]);
/// at least [glassFrostedBlur] when [frosted].
double glassKindBlur(
  GlassKind kind,
  double side,
  double tint, {
  required bool blurOn,
  bool frosted = false,
}) {
  final blur = kind == GlassKind.menu
      ? math.max(glassBlur(side), glassMenuBlur)
      : glassBlurAt(side, tint, blurOn: blurOn);
  return frosted ? math.max(blur, glassFrostedBlur(side)) : blur;
}
