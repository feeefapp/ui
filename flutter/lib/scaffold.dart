import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import 'brand/geometry.dart';
import 'glass/container.dart';
import 'glass/member.dart';
import 'theme.dart';
import 'theme/light_edge.dart';
import 'theme/surfaces.dart';

/// One glass bubble for related floating controls: the twin of `GlassGroup` in
/// `@feeef.dev/ui/scaffold`. Inside a [GlassContainer] it hands its shape to the container's
/// single material (and merges, splits and morphs with its neighbours); on its own it paints the
/// web kit's glass: fill, 1px line edge, inner light, the 135° specular rim and a soft shadow.
/// Lays out [child] inside a 1px border, like the CSS box.
class GlassGroup extends StatefulWidget {
  const GlassGroup({
    super.key,
    this.glassId,
    this.glassUnion,
    this.glassMotion = GlassMotion.spring,
    this.radius,
    this.padding = EdgeInsets.zero,
    required this.child,
  });

  /// Identity of this bubble inside a GlassContainer. A bubble with the same id moves instead of
  /// reappearing; different ids morph into each other.
  final String? glassId;

  /// Bubbles with the same union name draw as one shape spanning all of them.
  final String? glassUnion;

  /// `follow` for bubbles that animate their own size, so the glass tracks them exactly.
  final GlassMotion glassMotion;

  /// Corner radius; defaults to the theme's glass radius (32, 27 on screens up to 720px wide).
  final double? radius;

  /// Space between the border and [child].
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  State<GlassGroup> createState() => _GlassGroupState();
}

class _GlassGroupState extends State<GlassGroup> {
  @override
  Widget build(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 720;
    final radius =
        widget.radius ?? (narrow ? 27 * s.radiusScale : s.radiusGlass);
    return GlassMemberBox(
      glassId: widget.glassId,
      union: widget.glassUnion,
      motion: widget.glassMotion,
      radius: radius,
      standalone: (child) => _StandaloneGlass(radius: radius, child: child),
      // The CSS border stays in the layout even when the container paints the glass.
      child: Padding(
        padding: const EdgeInsets.all(1),
        child: Padding(padding: widget.padding, child: widget.child),
      ),
    );
  }
}

/// `.lab-glass-group.lab-light-edge` painted by one bubble on its own.
class _StandaloneGlass extends StatelessWidget {
  const _StandaloneGlass({required this.radius, required this.child});
  final double radius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final style = theme.config.glass;
    final blurred =
        style != GlassStyle.solid &&
        theme.config.glassRenderer != GlassRenderer.fill;
    final fill = style == GlassStyle.solid
        ? c.surface
        : blurred
        ? c.glassFill
        : c.glassFillFlat;
    final painted = CustomPaint(
      painter: _GlassGroupPainter(
        fill: fill,
        line: c.line,
        edgeLight: c.glassEdgeLight,
        edgeLow: c.glassEdgeLow,
        shadow: glassShadowColor(theme.brightness),
        radius: radius,
        rim: style != GlassStyle.solid,
      ),
      child: child,
    );
    if (!blurred) return painted;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: ClipPath(
            clipper: _SuperellipseClipper(radius),
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: const SizedBox.expand(),
            ),
          ),
        ),
        painted,
      ],
    );
  }
}

class _SuperellipseClipper extends CustomClipper<Path> {
  _SuperellipseClipper(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_SuperellipseClipper old) => old.radius != radius;
}

class _GlassGroupPainter extends CustomPainter {
  _GlassGroupPainter({
    required this.fill,
    required this.line,
    required this.edgeLight,
    required this.edgeLow,
    required this.shadow,
    required this.radius,
    required this.rim,
  });
  final Color fill, line, edgeLight, edgeLow, shadow;
  final double radius;
  final bool rim;

  @override
  void paint(Canvas canvas, Size size) {
    paintFloatingSurface(
      canvas,
      size,
      radius,
      fill: fill,
      line: line,
      edgeLow: edgeLow,
      shadow: shadow,
    );
    if (rim) {
      paintLightEdge(canvas, size, radius, light: edgeLight, low: edgeLow);
    }
  }

  @override
  bool shouldRepaint(_GlassGroupPainter old) =>
      old.fill != fill ||
      old.line != line ||
      old.radius != radius ||
      old.rim != rim ||
      old.edgeLight != edgeLight ||
      old.shadow != shadow;
}
