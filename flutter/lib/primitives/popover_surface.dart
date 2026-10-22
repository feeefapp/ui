import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_noise.dart';
import '../brand/pixel_texture.dart';
import '../theme.dart';
import '../theme/surfaces.dart';

/// The shared opaque material for menus and popovers: surface, border, group corners and a faint
/// breathing pixel grain. Paint only; the owner keeps positioning and interaction. The twin of
/// `PopoverSurface` in `@feeef.dev/ui/primitives/popover-surface`.
class PopoverSurface extends StatefulWidget {
  const PopoverSurface({
    super.key,
    this.seed = 'lab-popover',
    this.padding = EdgeInsets.zero,
    required this.child,
  });

  /// Seed for the decorative pixel grain, so neighbouring surfaces don't look identical.
  final String seed;

  /// Space between the 1px border and [child].
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  State<PopoverSurface> createState() => _PopoverSurfaceState();
}

class _PopoverSurfaceState extends State<PopoverSurface>
    with SingleTickerProviderStateMixin {
  // `lab-pixel-texture-breathe`: 2.8s, ease-in-out, opacity down to 55% and back.
  late final _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2800),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still) {
      _breath.stop();
      _breath.value = 0;
    } else if (!_breath.isAnimating) {
      _breath.repeat();
    }
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = theme.sizes.radiusGroup;
    return CustomPaint(
      painter: _PopoverPainter(
        breath: _breath,
        radius: radius,
        fill: c.surface,
        line: c.line,
        edgeLow: c.glassEdgeLow,
        shadow: glassShadowColor(theme.brightness),
        grain: c.focus,
        seed: widget.seed,
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: c.ink),
        child: Padding(
          padding: const EdgeInsets.all(1),
          child: Padding(padding: widget.padding, child: widget.child),
        ),
      ),
    );
  }
}

class _PopoverPainter extends CustomPainter {
  _PopoverPainter({
    required this.breath,
    required this.radius,
    required this.fill,
    required this.line,
    required this.edgeLow,
    required this.shadow,
    required this.grain,
    required this.seed,
  }) : super(repaint: breath);
  final Animation<double> breath;
  final double radius;
  final Color fill, line, edgeLow, shadow, grain;
  final String seed;

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
    // The grain sits inside the border, clipped to the corners, at 6.5% (breathing to 55% of it).
    final box = (Offset.zero & size).deflate(1);
    final t = breath.value;
    final wave = Curves.easeInOut.transform(t < 0.5 ? t * 2 : (1 - t) * 2);
    canvas.save();
    canvas.clipPath(superellipsePath(box, [radius, radius, radius, radius]));
    paintPixelTexture(
      canvas,
      box,
      color: grain,
      opacity: 0.065 * (1 - 0.45 * wave),
      variant: TextureVariant.grain,
      seed: seed,
      density: TextureDensity.sparse,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PopoverPainter old) =>
      old.fill != fill ||
      old.line != line ||
      old.radius != radius ||
      old.seed != seed ||
      old.grain != grain;
}
