import 'dart:math' as math;
import 'dart:ui' as ui show Gradient;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import 'geometry.dart';
import 'material.dart';
import 'refraction.dart';
import 'refraction_filter.dart';

/// The real glass of a control's lens: the moving part of a slider, a switch, a segmented control
/// or a tab bar, pressed or dragged, as iOS 26.2 draws it (`research/liquid-glass/
/// LENS-MEASURED.md`), the twin of the web kit's `GlassLensLayer` and `lens.css`. Clear: never
/// blurred, lifted, saturated or magnified; over the backdrop the measured veil and shade, the rim
/// light, a thumb's dark lines and the shadow ([lensMaterial]), with no hairline and no touch
/// glow. Liquid glass also bends what is behind it by the measured profile of its [kind]
/// ([lensBend], with the colour split [lensDispersion]) on Impeller with the theme's refraction
/// on; transparent glass keeps the clear lens unbent. [lens] (0 rest … 1 glass) eases every part
/// in, so the owner's rest paint can fade out under it.
///
/// It fills its parent and draws over [rect] (in the parent's pixels) with corner [radius]. Put it
/// above what the lens should bend (the track, the labels). Off for solid glass, more contrast
/// and reduced transparency, where owners keep their rest paint.
class GlassLens extends StatelessWidget {
  const GlassLens({
    super.key,
    required this.kind,
    required this.rect,
    required this.radius,
    required this.lens,
  });

  /// A lens over the whole of its parent: a thumb's own box.
  static Widget fill({
    Key? key,
    required LensKind kind,
    required double radius,
    required double lens,
  }) => LayoutBuilder(
    key: key,
    builder: (context, box) => GlassLens(
      kind: kind,
      rect: Offset.zero & box.biggest,
      radius: radius,
      lens: lens,
    ),
  );

  /// A pill (segmented control, tab bar), a slider thumb or a switch thumb: its bend and material.
  final LensKind kind;
  final Rect rect;
  final double radius;

  /// How much of the lens shows, 0 … 1.
  final double lens;

  /// Whether lenses under [context] are liquid: a pill lifts out bigger and lenses bend. False for
  /// transparent glass (a plain clear lens) and solid (none).
  static bool liquidOf(BuildContext context) =>
      glassStyleOf(context) == GlassStyle.liquid;

  /// Whether lenses under [context] bend what is behind them: liquid, with the theme's refraction
  /// on, on Impeller.
  static bool bendsOf(BuildContext context) =>
      liquidOf(context) &&
      ThemeProvider.of(context).config.glassRefraction &&
      GlassRefraction.supported;

  /// Whether a lens can show under [context]'s theme and platform settings.
  static bool enabledOf(BuildContext context) =>
      glassStyleOf(context) != GlassStyle.solid;

  static const _identity = [
    1.0, 0.0, 0.0, 0.0, 0.0, //
    0.0, 1.0, 0.0, 0.0, 0.0, //
    0.0, 0.0, 1.0, 0.0, 0.0, //
    0.0, 0.0, 0.0, 1.0, 0.0, //
  ];

  @override
  Widget build(BuildContext context) {
    final t = lens.isFinite ? lens.clamp(0.0, 1.0) : 0.0;
    if (t <= 0.001 || rect.width <= 0 || rect.height <= 0) {
      return const SizedBox.shrink();
    }
    if (!enabledOf(context)) return const SizedBox.shrink();
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    final r = math.min(radius, math.min(rect.width, rect.height) / 2);
    final outline = superellipsePath(Offset.zero & rect.size, [r, r, r, r]);
    final material = lensMaterial(kind: kind, lens: t, dark: dark);
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
                // The bend is the liquid effect; transparent lenses are plain clear glass.
                if (bendsOf(context))
                  ClipPath(
                    clipper: _PathClip(outline),
                    child: GlassRefraction(
                      path: GlassPath(
                        [
                          GlassShape(
                            x: 0,
                            y: 0,
                            width: rect.width,
                            height: rect.height,
                            radius: r,
                          ),
                        ],
                        Offset.zero & rect.size,
                        outline,
                      ),
                      spacing: 0,
                      // Lenses stay sharp and untinted, as iOS's: whatever they cross reads
                      // through them.
                      blur: 0,
                      colour: _identity,
                      strength: t,
                      lens: kind,
                    ),
                  ),
                CustomPaint(
                  painter: _LensPainter(
                    outline: outline,
                    radius: r,
                    material: material,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
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

/// The lens's material over the backdrop (the web kit's `.lab-lens` background and box shadows):
/// the shadow outside, the veil and the shade inside, the rim light by side and a thumb's dark
/// top and bottom lines.
class _LensPainter extends CustomPainter {
  _LensPainter({
    required this.outline,
    required this.radius,
    required this.material,
  });
  final Path outline;

  /// The corner radius [outline] was drawn with, for the cached bands along it.
  final double radius;
  final LensMaterial material;

  static const _black = Color(0xFF000000);
  static const _white = Color(0xFFFFFFFF);

  /// The rim's brightest band: its outermost third of a px.
  static const _edge = 0.34;

  @override
  void paint(Canvas canvas, Size size) {
    final m = material;
    final bounds = Offset.zero & size;
    // `inset dx dy`: what of the outline the outline moved by (dx, dy) leaves uncovered (kept
    // per size and shift: a pressed pill asks for the same bands on every frame).
    Path band(Offset by) =>
        outlineBand(bounds, [radius, radius, radius, radius], by: by);
    void fill(Path path, Color colour, double alpha) {
      if (alpha <= 0.001) return;
      canvas.drawPath(path, Paint()..color = colour.withValues(alpha: alpha));
    }

    // `0 6px 11px` black, only outside the lens (a CSS box shadow never shows through it).
    if (m.shadow > 0.001) {
      canvas.save();
      canvas.clipPath(
        Path()
          ..fillType = PathFillType.evenOdd
          ..addRect(bounds.inflate(lensShadowDy + lensShadowBlur * 2))
          ..addPath(outline, Offset.zero),
      );
      canvas.drawPath(
        outline.shift(const Offset(0, lensShadowDy)),
        Paint()
          ..color = _black.withValues(alpha: m.shadow)
          ..maskFilter = const MaskFilter.blur(
            BlurStyle.normal,
            lensShadowBlur / 2,
          ),
      );
      canvas.restore();
    }
    // The thumb's dark line just outside its top edge (`0 -0.5px`).
    if (m.line.outer > 0.001) {
      fill(
        Path.combine(
          PathOperation.difference,
          outline.shift(const Offset(0, -0.5)),
          outline,
        ),
        _black,
        m.line.outer,
      );
    }

    canvas.save();
    canvas.clipPath(outline);
    fill(Path()..addRect(bounds), _white, m.veil);
    if (m.shade.top > 0.001 || m.shade.middle > 0.001) {
      canvas.drawRect(
        bounds,
        Paint()
          ..shader = ui.Gradient.linear(
            Offset.zero,
            Offset(0, size.height / 2),
            [
              _black.withValues(alpha: m.shade.top),
              _black.withValues(alpha: m.shade.middle),
            ],
          ),
      );
    }
    // The rim (CSS paints the last inset shadow first): 1 px bands, then the outermost third,
    // then a thumb's dark lines inside its bottom and top edges.
    void rim(Offset by, Color colour, double alpha) {
      if (alpha > 0.001) fill(band(by), colour, alpha);
    }

    rim(const Offset(-1, 0), _white, m.band.side);
    rim(const Offset(1, 0), _white, m.band.side);
    rim(const Offset(0, -1), _white, m.band.bottom);
    rim(const Offset(0, 1), _white, m.band.top);
    rim(const Offset(-_edge, 0), _white, m.edge.side);
    rim(const Offset(_edge, 0), _white, m.edge.side);
    rim(const Offset(0, -_edge), _white, m.edge.bottom);
    rim(const Offset(0, _edge), _white, m.edge.top);
    rim(const Offset(0, -1), _black, m.line.bottom);
    rim(const Offset(0, 1), _black, m.line.inner);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LensPainter old) =>
      old.outline != outline || old.material != material;
}
