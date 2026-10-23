/// App-level theme configuration, the twin of `@feeef.dev/ui/theme-config`. An app chooses its look
/// once and passes it to `FeeefTheme`; components never branch on it.
library;

/// Color palette: `lab` (Feeef green) or `mono` (black and white).
enum Palette { lab, mono }

/// Size scale for controls, rows, spacing and sidebars.
enum Density { comfortable, compact, thin }

/// How floating glass behaves: moving liquid glass, still glass, or opaque surfaces.
enum GlassStyle { liquid, still, solid }

/// The look of an app. Unset options fall back to [ThemeConfig.defaults].
class ThemeConfig {
  const ThemeConfig({
    this.palette = Palette.lab,
    this.density = Density.comfortable,
    this.radius = 1,
    this.glass = GlassStyle.liquid,
    this.glassTint = 0.5,
    this.glassBlur = false,
    this.glassRefraction = true,
    this.metrics = const Metrics(),
  });

  /// `lab` (default): Feeef green. `mono`: black and white; color only where it means something.
  final Palette palette;

  /// `comfortable` (default), `compact` (denser desktop chrome) or `thin` (smaller still).
  final Density density;

  /// Corner scale: `1` is the Lab's rounding, `0` square. Clamped to 0–1.5.
  final double radius;

  /// Floating glass: `liquid` (default) moves, lights up toward the pointer and responds to
  /// presses; `still` keeps the material and its morphs with a fixed light and no press response;
  /// `solid` paints opaque chrome for dense tools.
  final GlassStyle glass;

  /// The Liquid Glass slider, `0` clear … `1` tinted: how much of the theme surface veils what is
  /// behind the glass. `0` is measured clear glass (no veil, no shadow, a slight brightness lift),
  /// `1` the measured regular material; the default `0.5` is a light veil (~40 %), as on the web. Clamped to 0–1
  /// ([tint]); the curve is `glassMaterial` in `glass/material.dart`.
  final double glassTint;

  /// Blur the backdrop with the measured blur (2.9 → 5.2 px by size). Default false: sharp.
  final bool glassBlur;

  /// Bend the backdrop at the glass edges with the measured profile. Default true. Impeller only
  /// (a fragment shader as backdrop filter); Skia and Flutter web show the same glass unbent.
  final bool glassRefraction;

  /// Control, toolbar, list and focus sizes that replace the density's (`Metrics`). Each set value
  /// applies to every density; unset ones keep the density's own.
  final Metrics metrics;

  static const defaults = ThemeConfig();

  double get radiusScale => radius.isFinite ? radius.clamp(0.0, 1.5) : 1;

  /// [glassTint] clamped to 0–1; not finite → 0.5 (`glassTintDefault`).
  double get tint => glassTint.isFinite ? glassTint.clamp(0.0, 1.0) : 0.5;

  /// Same look with the given options replaced. Callers that only change density (or one glass
  /// switch) use this so a new [ThemeConfig] field cannot be dropped by a hand-written clone.
  ThemeConfig copyWith({
    Palette? palette,
    Density? density,
    double? radius,
    GlassStyle? glass,
    double? glassTint,
    bool? glassBlur,
    bool? glassRefraction,
    Metrics? metrics,
  }) => ThemeConfig(
    palette: palette ?? this.palette,
    density: density ?? this.density,
    radius: radius ?? this.radius,
    glass: glass ?? this.glass,
    glassTint: glassTint ?? this.glassTint,
    glassBlur: glassBlur ?? this.glassBlur,
    glassRefraction: glassRefraction ?? this.glassRefraction,
    metrics: metrics ?? this.metrics,
  );
}

/// A length per control size; unset sizes keep the density's (`MetricScale` in the web kit).
class MetricScale {
  const MetricScale({this.small, this.regular, this.large});
  final double? small, regular, large;

  @override
  bool operator ==(Object other) =>
      other is MetricScale &&
      other.small == small &&
      other.regular == regular &&
      other.large == large;

  @override
  int get hashCode => Object.hash(small, regular, large);
}

/// A width and height; either may be unset (`MetricSize` in the web kit).
class MetricSize {
  const MetricSize({this.width, this.height});
  final double? width, height;

  @override
  bool operator ==(Object other) =>
      other is MetricSize && other.width == width && other.height == height;

  @override
  int get hashCode => Object.hash(width, height);
}

/// Overrides for the size tokens, in logical pixels: the twin of `ThemeConfig.metrics` in the web
/// kit (written there as `--lab-*` variables on `<html>`). The defaults ("comfortable") are the
/// iOS 26 controls measured in `research/liquid-glass/CONTROLS-MEASURED.md`; `compact` and `thin`
/// step down from them. A set value replaces the token for every density.
class Metrics {
  const Metrics({
    this.controlHeight,
    this.controlPadding,
    this.controlFont,
    this.fieldHeight,
    this.rowHeight,
    this.toolbarItem,
    this.toolbarGap,
    this.toolbarInset,
    this.segmentedInset,
    this.switchSize,
    this.thumbSize,
    this.sliderTrack,
    this.listRowHeight,
    this.listRadius,
    this.listInset,
    this.focusRingWidth,
    this.focusRingOffset,
    this.sidebarWidth,
    this.railWidth,
  });

  /// Button heights (and the square of icon-only buttons): small 30, regular 36, large 52.
  final MetricScale? controlHeight;

  /// A text button's side padding: 10 / 12 / 20.
  final MetricScale? controlPadding;

  /// A button label's font size: 15 / 17 / 17 (line height rounds size × 1.3).
  final MetricScale? controlFont;

  /// Text field heights: small 36, regular 44 (`large` is ignored).
  final MetricScale? fieldHeight;

  /// Navigation rows (sidebar items): 44.
  final double? rowHeight;

  /// A toolbar bubble's outer height: 44. Controls inside are 6 less.
  final double? toolbarItem;

  /// Space between toolbar groups: 12.
  final double? toolbarGap;

  /// A floating bar's inset from its panel's sides: 16.
  final double? toolbarInset;

  /// From a segmented control's edge to its pill, and between options: 2. Its height is
  /// [controlHeight]'s regular.
  final double? segmentedInset;

  /// A switch track: 63 × 28.
  final MetricSize? switchSize;

  /// The switch thumb and the thin slider's thumb: 37 × 24.
  final MetricSize? thumbSize;

  /// The thin slider's rail: 6.
  final double? sliderTrack;

  /// An inset-grouped list row: 54.
  final double? listRowHeight;

  /// An inset-grouped list card's corner radius before the radius scale: 26.
  final double? listRadius;

  /// List rows' side padding, headers and separators: 16.
  final double? listInset;

  /// The keyboard focus ring's line width: 2.
  final double? focusRingWidth;

  /// The keyboard focus ring's distance outside the control: 1.
  final double? focusRingOffset;

  /// The workspace scaffold's expanded sidebar: 304 / 248 / 224 by density.
  final double? sidebarWidth;

  /// The workspace scaffold's navigation rail: 64 / 52 / 44 by density.
  final double? railWidth;

  @override
  bool operator ==(Object other) =>
      other is Metrics &&
      other.controlHeight == controlHeight &&
      other.controlPadding == controlPadding &&
      other.controlFont == controlFont &&
      other.fieldHeight == fieldHeight &&
      other.rowHeight == rowHeight &&
      other.toolbarItem == toolbarItem &&
      other.toolbarGap == toolbarGap &&
      other.toolbarInset == toolbarInset &&
      other.segmentedInset == segmentedInset &&
      other.switchSize == switchSize &&
      other.thumbSize == thumbSize &&
      other.sliderTrack == sliderTrack &&
      other.listRowHeight == listRowHeight &&
      other.listRadius == listRadius &&
      other.listInset == listInset &&
      other.focusRingWidth == focusRingWidth &&
      other.focusRingOffset == focusRingOffset &&
      other.sidebarWidth == sidebarWidth &&
      other.railWidth == railWidth;

  @override
  int get hashCode => Object.hashAll([
    controlHeight,
    controlPadding,
    controlFont,
    fieldHeight,
    rowHeight,
    toolbarItem,
    toolbarGap,
    toolbarInset,
    segmentedInset,
    switchSize,
    thumbSize,
    sliderTrack,
    listRowHeight,
    listRadius,
    listInset,
    focusRingWidth,
    focusRingOffset,
    sidebarWidth,
    railWidth,
  ]);
}
