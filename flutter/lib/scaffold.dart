import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import 'brand/geometry.dart';
import 'glass/container.dart';
import 'theme.dart';

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

/// Marks a subtree that already belongs to a bubble: never a bubble inside a bubble.
class _InsideBubble extends InheritedWidget {
  const _InsideBubble({required super.child});
  @override
  bool updateShouldNotify(_InsideBubble old) => false;
}

class _GlassGroupState extends State<GlassGroup> {
  final _box = GlobalKey();
  GlassMemberHandle? _handle;
  GlassMemberRegistry? _registry;
  String? _id;
  double _radius = 0;
  static int _serial = 0;
  late final String _autoId = 'glass-group-${_serial++}';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(GlassGroup old) {
    super.didUpdateWidget(old);
    _sync(
      force:
          old.glassUnion != widget.glassUnion ||
          old.glassMotion != widget.glassMotion,
    );
  }

  void _sync({bool force = false}) {
    final nested =
        context.dependOnInheritedWidgetOfExactType<_InsideBubble>() != null;
    final registry = nested ? null : GlassMember.of(context);
    final id = widget.glassId ?? _autoId;
    if (!force && registry == _registry && id == _id) return;
    _handle?.unregister();
    _handle = null;
    _registry = registry;
    _id = id;
    if (registry != null) {
      _handle = registry.register(
        id,
        _box,
        radius: () => _radius,
        union: widget.glassUnion,
        motion: widget.glassMotion,
      );
    }
  }

  @override
  void dispose() {
    _handle?.unregister();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 720;
    _radius = widget.radius ?? (narrow ? 27 * s.radiusScale : s.radiusGlass);
    final nested =
        context.dependOnInheritedWidgetOfExactType<_InsideBubble>() != null;
    Widget content = Padding(
      // The CSS border stays in the layout even when the container paints the glass.
      padding: const EdgeInsets.all(1),
      child: Padding(padding: widget.padding, child: widget.child),
    );
    content = _InsideBubble(child: content);
    final handle = _handle;
    if (handle != null) {
      // Content rides with its glass while the bubble moves, and swells with a press.
      content = ValueListenableBuilder<(Offset, double)>(
        valueListenable: handle.content,
        builder: (context, value, child) => Transform.translate(
          offset: value.$1,
          child: Transform.scale(scale: value.$2, child: child),
        ),
        child: content,
      );
      return KeyedSubtree(key: _box, child: content);
    }
    if (nested) return KeyedSubtree(key: _box, child: content);
    return KeyedSubtree(
      key: _box,
      child: _StandaloneGlass(radius: _radius, child: content),
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
        shadow: Color.from(
          alpha: theme.brightness == Brightness.dark ? 0.40 : 0.18,
          red: 0,
          green: 0,
          blue: 0,
        ),
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
    final rect = Offset.zero & size;
    List<double> r(double v) => [v, v, v, v];
    final shape = superellipsePath(rect, r(radius));
    // --lab-glass-shadow: 0 8px 24px -14px (spread shrinks the shape; blur 24 → sigma 12).
    final spread = rect.deflate(14);
    if (!spread.isEmpty) {
      canvas.save();
      canvas.clipPath(
        Path.combine(
          PathOperation.difference,
          Path()..addRect(rect.inflate(48)),
          shape,
        ),
      );
      canvas.drawPath(
        superellipsePath(spread, r(radius - 14)).shift(const Offset(0, 8)),
        Paint()
          ..color = shadow
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
      );
      canvas.restore();
    }
    canvas.drawPath(shape, Paint()..color = fill);
    // --lab-glass-light: inset 0 1px 0 edge-low, inset 0 -1px 0 rgb(0 0 0 / 6%), inside the border.
    final inner = superellipsePath(rect, r(radius), inset: 1);
    canvas.save();
    canvas.clipPath(inner);
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, 1)),
      ),
      Paint()..color = edgeLow,
    );
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, -1)),
      ),
      Paint()..color = const Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
    );
    canvas.restore();
    final border = superellipsePath(rect, r(radius), inset: 0.5);
    canvas.drawPath(
      border,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = line,
    );
    if (rim) {
      // .lab-light-edge::after: a 135° gradient on the 1px border ring.
      final half = (size.width + size.height) / 2 * 0.7071067811865476;
      final c = rect.center;
      const light = Offset(-0.7071067811865476, -0.7071067811865476);
      canvas.drawPath(
        border,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..shader = ui.Gradient.linear(
            c + light * half,
            c - light * half,
            [
              edgeLight,
              edgeLow,
              const Color(0x00000000),
              const Color(0x00000000),
              edgeLow,
            ],
            const [0, 0.22, 0.48, 0.72, 1],
          ),
      );
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
