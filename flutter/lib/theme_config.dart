/// App-level theme configuration, the twin of `@feeef.dev/ui/theme-config`. An app chooses its look
/// once and passes it to `FeeefTheme`; components never branch on it.
library;

/// Color palette: `lab` (Feeef green) or `mono` (black and white).
enum Palette { lab, mono }

/// Size scale for controls, rows, spacing and sidebars.
enum Density { comfortable, compact, thin }

/// How floating glass behaves: moving liquid glass, still frosted glass, or opaque surfaces.
enum GlassStyle { liquid, frosted, solid }

/// How much work glass does: filled (no blur), blurred, or blurred with refraction.
enum GlassRenderer { fill, css, canvas }

/// The look of an app. Unset options fall back to [ThemeConfig.defaults].
class ThemeConfig {
  const ThemeConfig({
    this.palette = Palette.lab,
    this.density = Density.comfortable,
    this.radius = 1,
    this.glass = GlassStyle.liquid,
    this.glassRenderer = GlassRenderer.fill,
  });

  /// `lab` (default): Feeef green. `mono`: black and white; color only where it means something.
  final Palette palette;

  /// `comfortable` (default), `compact` (denser desktop chrome) or `thin` (smaller still).
  final Density density;

  /// Corner scale: `1` is the Lab's rounding, `0` square. Clamped to 0–1.5.
  final double radius;

  /// Floating glass: liquid (default), frosted or solid.
  final GlassStyle glass;

  /// Glass rendering cost: fill (default), css or canvas.
  final GlassRenderer glassRenderer;

  static const defaults = ThemeConfig();

  double get radiusScale => radius.isFinite ? radius.clamp(0.0, 1.5) : 1;
}
