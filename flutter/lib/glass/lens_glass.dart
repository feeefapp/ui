import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../primitives/lens.dart';
import '../theme.dart';
import 'container.dart' show glassRimVertices;
import 'geometry.dart';
import 'hairline.dart';
import 'material.dart';
import 'refraction_filter.dart';

/// The real glass of a control's lens: the moving part of a slider, a switch, a segmented control
/// or a tab bar, pressed or dragged. It is the material a [GlassContainer] paints, at the clear
/// tint iOS uses for lenses: the backdrop saturated and lifted but never blurred (whatever the lens
/// crosses stays readable), bent at the rim on Impeller, the rim light, the dark hairline outside and the touch glow. [lens]
/// (0 rest … 1 glass) eases every part in, so the owner's rest paint can fade out under it.
///
/// It fills its parent and draws over [rect] (in the parent's pixels) with corner [radius]. Put it
/// above what the lens should bend (the track, the labels). Off for solid glass, more contrast
/// and reduced transparency, where owners keep their rest paint.
class GlassLens extends StatelessWidget {
  const GlassLens({
    super.key,
    required this.rect,
    required this.radius,
    required this.lens,
    this.glowAt,
    this.glowRadius = 0,
    this.glowOpacity = 0,
    this.magnify = 0,
  });

  /// A lens over the whole of its parent: a thumb's own box.
  static Widget fill({
    Key? key,
    required double radius,
    required double lens,
    Offset? glowAt,
    double glowRadius = 0,
    double glowOpacity = 0,
    double magnify = 0,
  }) => LayoutBuilder(
    key: key,
    builder: (context, box) => GlassLens(
      rect: Offset.zero & box.biggest,
      radius: radius,
      lens: lens,
      glowAt: glowAt,
      glowRadius: glowRadius,
      glowOpacity: glowOpacity,
      magnify: magnify,
    ),
  );

  final Rect rect;
  final double radius;

  /// How much of the lens shows, 0 … 1.
  final double lens;

  /// The touch glow's centre, in the lens's own pixels (its top-left is 0, 0); null for none.
  final Offset? glowAt;
  final double glowRadius, glowOpacity;

  /// How much the lens enlarges what it covers at full [lens] (0 none, 0.2 = 1.2×). Liquid glass
  /// on Impeller only, with the theme's refraction on.
  final double magnify;

  /// Whether lenses under [context] are liquid: they lift out bigger, bend and magnify. False for
  /// transparent glass (a plain clear lens) and solid (none).
  static bool liquidOf(BuildContext context) =>
      glassStyleOf(context) == GlassStyle.liquid;

  /// Whether lenses under [context] magnify for real: liquid, with the theme's refraction on, on
  /// Impeller. Where they don't, a control may fake the enlargement in its own paint.
  static bool magnifiesOf(BuildContext context) =>
      liquidOf(context) &&
      ThemeProvider.of(context).config.glassRefraction &&
      GlassRefraction.supported;

  /// Whether a lens can show under [context]'s theme and platform settings.
  static bool enabledOf(BuildContext context) =>
      glassStyleOf(context) != GlassStyle.solid;

  @override
  Widget build(BuildContext context) {
    final t = lens.clamp(0.0, 1.0);
    if (t <= 0.001 || rect.width <= 0 || rect.height <= 0) {
      return const SizedBox.shrink();
    }
    if (!enabledOf(context)) return const SizedBox.shrink();
    final theme = ThemeProvider.of(context);
    final config = theme.config;
    final dark = theme.brightness == Brightness.dark;
    final side = math.min(rect.width, rect.height);
    final r = math.min(radius, side / 2);
    // Clear glass, as iOS lenses are: the material eases in from the bare backdrop.
    final material = glassMaterial(0, dark: dark, size: glassSize(side));
    final matrix = _lerpMatrix(glassBackdropMatrix(material), t);
    final terms = glassEdgeTerms(0, dark: dark, material: material, surface: 0);
    final shape = GlassShape(
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height,
      radius: r,
    );
    final outline = superellipsePath(Offset.zero & rect.size, [r, r, r, r]);
    // The bend and magnification are the liquid effect; transparent lenses are plain clear glass.
    final refract =
        liquidOf(context) &&
        config.glassRefraction &&
        (config.refractionStrength > 0 || magnify > 0) &&
        GlassRefraction.supported;
    final Widget backdrop = refract
        ? GlassRefraction(
            path: GlassPath([shape], Offset.zero & rect.size, outline),
            spacing: 0,
            // Lenses stay sharp, as iOS's: whatever they cross reads through them.
            blur: 0,
            colour: matrix,
            edge: (
              k1: terms.k1 * config.highlight * t,
              k3: terms.k3 * config.highlight * t,
            ),
            strength: config.refractionStrength * t,
            magnify: magnify * t,
          )
        : BackdropFilter(
            filter: ColorFilter.matrix(matrix),
            child: const SizedBox.expand(),
          );
    final bands = hairlineBands([shape], 0);
    final hairline = glassHairline(0, dark: dark);
    final rim = glassRim(0, dark: dark);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fromRect(
          rect: rect,
          child: IgnorePointer(
            child: Stack(
              clipBehavior: Clip.none,
              fit: StackFit.expand,
              children: [
                ClipPath(clipper: _PathClip(outline), child: backdrop),
                for (final (band, strength) in [
                  (bands.ring, hairline.ring),
                  (bands.sliver, hairline.sliver),
                ])
                  ClipPath(
                    clipper: _PathClip(bandPath(band)),
                    child: BackdropFilter(
                      filter: ColorFilter.matrix(subtractMatrix(strength * t)),
                      child: const SizedBox.expand(),
                    ),
                  ),
                CustomPaint(
                  painter: _LensPainter(
                    outline: outline,
                    rim: (
                      w0: rim.w0 * config.highlight * t,
                      w1: rim.w1 * config.highlight * t,
                      p: rim.p,
                      width: rim.width * config.highlightWidth,
                    ),
                    glow: theme.colors.glassGlow,
                    glowAt: glowAt,
                    glowRadius: glowRadius,
                    glowOpacity: glowOpacity * t,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// [matrix] at [t]: the identity at 0, [matrix] at 1.
  static List<double> _lerpMatrix(List<double> matrix, double t) {
    const identity = [
      1.0, 0.0, 0.0, 0.0, 0.0, //
      0.0, 1.0, 0.0, 0.0, 0.0, //
      0.0, 0.0, 1.0, 0.0, 0.0, //
      0.0, 0.0, 0.0, 1.0, 0.0, //
    ];
    return [
      for (var i = 0; i < 20; i++) identity[i] + (matrix[i] - identity[i]) * t,
    ];
  }
}

class _PathClip extends CustomClipper<Path> {
  _PathClip(this.path);
  final Path path;

  @override
  Path getClip(Size size) => path;

  @override
  bool shouldReclip(_PathClip old) => old.path != path;
}

/// The rim light along the lens's outline and the touch glow inside it.
class _LensPainter extends CustomPainter {
  _LensPainter({
    required this.outline,
    required this.rim,
    required this.glow,
    required this.glowAt,
    required this.glowRadius,
    required this.glowOpacity,
  });
  final Path outline;
  final GlassRim rim;
  final Color glow;
  final Offset? glowAt;
  final double glowRadius, glowOpacity;

  // The kit's default light, from the top left.
  static const _light = Offset(-0.7071067811865476, -0.7071067811865476);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipPath(outline);
    final vertices = glassRimVertices(outline, _light, rim);
    if (vertices != null) {
      canvas.drawVertices(vertices, BlendMode.dst, Paint());
      vertices.dispose();
    }
    canvas.restore();
    final at = glowAt;
    if (at != null) {
      LensPaint.paintGlow(canvas, outline, glow, at, glowRadius, glowOpacity);
    }
  }

  @override
  bool shouldRepaint(_LensPainter old) =>
      old.outline != outline ||
      old.rim != rim ||
      old.glow != glow ||
      old.glowAt != glowAt ||
      old.glowRadius != glowRadius ||
      old.glowOpacity != glowOpacity;
}
