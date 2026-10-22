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
  /// `1` the measured regular material; the default `0.5` is a light veil (~40 %). Clamped to 0–1
  /// ([tint]); the curve is `glassMaterial` in `glass/material.dart`.
  final double glassTint;

  /// Blur the backdrop with the measured blur (2.9 → 5.2 px by size). Default false: sharp.
  final bool glassBlur;

  /// Bend the backdrop at the glass edges with the measured profile. Default true. Impeller only
  /// (a fragment shader as backdrop filter); Skia and Flutter web show the same glass unbent.
  final bool glassRefraction;

  static const defaults = ThemeConfig();

  double get radiusScale => radius.isFinite ? radius.clamp(0.0, 1.5) : 1;

  /// [glassTint] clamped to 0–1; not finite → 0.5.
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
  }) => ThemeConfig(
    palette: palette ?? this.palette,
    density: density ?? this.density,
    radius: radius ?? this.radius,
    glass: glass ?? this.glass,
    glassTint: glassTint ?? this.glassTint,
    glassBlur: glassBlur ?? this.glassBlur,
    glassRefraction: glassRefraction ?? this.glassRefraction,
  );
}
