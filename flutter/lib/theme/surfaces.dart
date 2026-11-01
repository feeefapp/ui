import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import 'raster.dart';

/// `--lab-glass-shadow`'s colour: 18% black in light themes, 40% in dark.
Color glassShadowColor(Brightness brightness) => Color.from(
  alpha: brightness == Brightness.dark ? 0.40 : 0.18,
  red: 0,
  green: 0,
  blue: 0,
);

/// The web kit's floating surface paint (`.lab-glass-group`, `.lab-popover-surface`): the soft
/// `--lab-glass-shadow` (0 8px 24px -14px), [fill], the `--lab-glass-light` inner light (a light
/// line under the top border, a dark one over the bottom) and the 1px [line] border.
/// Set [innerLight] to false when the caller already paints a rim on the silhouette.
void paintFloatingSurface(
  Canvas canvas,
  Size size,
  double radius, {
  required Color fill,
  required Color line,
  required Color edgeLow,
  required Color shadow,
  bool innerLight = true,
}) {
  final rect = Offset.zero & size;
  List<double> r(double v) => [v, v, v, v];
  final shape = superellipsePath(rect, r(radius));
  // --lab-glass-shadow: 0 8px 24px -14px (spread shrinks the shape; blur 24 → sigma 12).
  final spread = rect.deflate(14);
  if (!spread.isEmpty) {
    // A box shadow is never drawn under its box: paint it on a layer and clear the shape (a
    // difference clip leaves an antialiased seam on some backends, Chrome among them, and the
    // translucent glass fill above would show the shadow through it).
    canvas.saveLayer(rect.inflate(48), Paint());
    canvas.drawPath(
      superellipsePath(spread, r(radius - 14)).shift(const Offset(0, 8)),
      Paint()
        ..color = shadow
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    canvas.drawPath(shape, Paint()..blendMode = BlendMode.clear);
    canvas.restore();
  }
  canvas.drawPath(shape, Paint()..color = fill);
  // Compact glass supplies its own rim on the outer silhouette; don't add an inset contour.
  if (innerLight) {
    // --lab-glass-light: inset 0 1px 0 edge-low, inset 0 -1px 0 rgb(0 0 0 / 6%), inside the border.
    final inner = superellipsePath(rect, r(radius), inset: 1);
    canvas.save();
    canvas.clipPath(inner);
    canvas.drawPath(
      outlineBand(rect, r(radius), inset: 1, by: const Offset(0, 1)),
      Paint()..color = edgeLow,
    );
    canvas.drawPath(
      outlineBand(rect, r(radius), inset: 1, by: const Offset(0, -1)),
      Paint()..color = const Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
    );
    canvas.restore();
  }
  final border = superellipsePath(rect, r(radius), inset: 0.5);
  canvas.drawPath(
    border,
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = line,
  );
}

/// How the keyboard focus ring looks (`--lab-focus-ring-width|offset|color`): a thin line that
/// hugs the shape [offset] px outside it (negative: inside). Only keyboard focus shows it
/// (`onShowFocusHighlight`, i.e. `FocusManager.highlightMode == traditional`, like
/// `:focus-visible`); pointer and touch focus show nothing.
@immutable
class FocusRingStyle {
  const FocusRingStyle({
    required this.width,
    required this.offset,
    required this.color,
  });
  final double width, offset;
  final Color color;

  /// The theme's ring. [inside] draws it inside the edge (rows and panels whose edge is clipped
  /// or touches a neighbour). High contrast (`MediaQuery.highContrast`, the twin of
  /// `prefers-contrast: more` / forced colours) draws a strong 3px ring 2px out in the full focus
  /// colour.
  factory FocusRingStyle.of(BuildContext context, {bool inside = false}) {
    final theme = ThemeProvider.of(context);
    final strong = MediaQuery.maybeHighContrastOf(context) ?? false;
    final width = strong ? 3.0 : theme.sizes.focusRingWidth;
    return FocusRingStyle(
      width: width,
      offset: inside ? -width : (strong ? 2.0 : theme.sizes.focusRingOffset),
      color: strong ? theme.colors.focus : theme.colors.focusRing,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is FocusRingStyle &&
      other.width == width &&
      other.offset == offset &&
      other.color == color;

  @override
  int get hashCode => Object.hash(width, offset, color);
}

/// Paints [style]'s ring around [rect] whose corners have [radius] (a CSS outline with
/// `outline-offset`: the ring's inner edge sits [FocusRingStyle.offset] from the shape and its
/// corners grow or shrink by the same amount).
void paintFocusRing(
  Canvas canvas,
  Rect rect,
  double radius,
  FocusRingStyle style,
) {
  final grow = style.offset + style.width / 2;
  final ring = rect.inflate(grow);
  if (ring.isEmpty) return;
  final r = (radius + grow).clamp(0.0, ring.shortestSide / 2);
  canvas.drawPath(
    superellipsePath(ring, [r, r, r, r]),
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = style.width
      ..color = style.color,
  );
}

/// A widget that paints the keyboard focus ring over [child] while [visible].
class FocusRing extends StatelessWidget {
  const FocusRing({
    super.key,
    required this.visible,
    required this.radius,
    this.inside = false,
    required this.child,
  });
  final bool visible, inside;
  final double radius;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('visible', value: visible, ifTrue: 'visible'))
      ..add(FlagProperty('inside', value: inside, ifTrue: 'inside'))
      ..add(DoubleProperty('radius', radius));
  }

  // Always the same CustomPaint, so toggling the ring never remounts [child] (and its state).
  @override
  Widget build(BuildContext context) => CustomPaint(
    foregroundPainter: visible
        ? _FocusRingPainter(FocusRingStyle.of(context, inside: inside), radius)
        : null,
    child: child,
  );
}

class _FocusRingPainter extends CustomPainter {
  _FocusRingPainter(this.style, this.radius);
  final FocusRingStyle style;
  final double radius;
  @override
  void paint(Canvas canvas, Size size) =>
      paintFocusRing(canvas, Offset.zero & size, radius, style);
  @override
  bool shouldRepaint(_FocusRingPainter old) =>
      old.style != style || old.radius != radius;
}

/// A control surface in the web kit's variant recipe: the raised shadow (`0 2px 6px`), fill, the
/// inset top highlight, the 1px edge and an optional keyboard focus ring hugging it.
class ControlSurfacePainter extends CustomPainter {
  ControlSurfacePainter({
    required this.dpr,
    required this.fill,
    required this.edge,
    required this.radius,
    required this.raised,
    required this.highlight,
    required this.depth,
    required this.focus,
    this.edgeWidth = 1,
  });
  final Color fill, edge, highlight;
  final double radius, depth, edgeWidth;
  final bool raised;
  final FocusRingStyle? focus;

  /// The device pixel ratio the still shadow is rendered at.
  final double dpr;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, r);
    if (raised) {
      // The soft drop shadow, rendered once per size ([paintStill]).
      paintStill(
        canvas,
        key: ('raised', size.width, size.height, radius, depth),
        bounds: rect.shift(const Offset(0, 2)).inflate(9),
        dpr: dpr,
        draw: (canvas) => canvas.drawPath(
          shape.shift(const Offset(0, 2)),
          Paint()
            ..color = Color.from(alpha: depth, red: 0, green: 0, blue: 0)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
        ),
      );
    }
    canvas.drawPath(shape, Paint()..color = fill);
    if (raised) {
      final inner = superellipsePath(rect, r, inset: 1);
      canvas.save();
      canvas.clipPath(inner);
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, 1)),
        ),
        Paint()..color = highlight,
      );
      canvas.restore();
    }
    if (edge.a > 0) {
      canvas.drawPath(
        superellipsePath(rect, r, inset: edgeWidth / 2),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = edgeWidth
          ..color = edge,
      );
    }
    if (focus != null) paintFocusRing(canvas, rect, radius, focus!);
  }

  @override
  bool shouldRepaint(ControlSurfacePainter old) =>
      old.dpr != dpr ||
      old.fill != fill ||
      old.edge != edge ||
      old.focus != focus ||
      old.edgeWidth != edgeWidth ||
      old.radius != radius;
}
