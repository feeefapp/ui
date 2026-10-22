import 'dart:math' as math;
import 'dart:ui';

/// Where light comes from, as a unit vector pointing from a bubble toward the light (y down). The
/// twin of `@feeef.dev/ui/glass/light`. The default matches the kit's rim: top-left (135°).
const Offset defaultGlassLight = Offset(-math.sqrt1_2, -math.sqrt1_2);

/// How far (px) a pointer still pulls the light toward itself.
const double glassLightReach = 480;

Offset _normalize(double x, double y) {
  final length = math.sqrt(x * x + y * y);
  return length > 1e-6 ? Offset(x / length, y / length) : defaultGlassLight;
}

/// Light for a bubble at [centre] with a fine pointer at [pointer] (or none): the default light,
/// turned toward the pointer the closer it is, so the rim brightens on the edge facing it.
Offset glassLightToward(
  Offset centre,
  Offset? pointer, {
  Offset base = defaultGlassLight,
  double reach = glassLightReach,
}) {
  if (pointer == null) return base;
  final d = pointer - centre;
  final distance = d.distance;
  if (distance < 1) return base;
  final pull = 0.75 * math.exp(-distance / reach);
  final toward = _normalize(d.dx, d.dy);
  return _normalize(
    base.dx + (toward.dx - base.dx) * pull,
    base.dy + (toward.dy - base.dy) * pull,
  );
}

/// Endpoints of the rim gradient over [bounds], CSS-style: the line runs through the centre along
/// the light and its ends touch the farthest corners. The first point is the lit end.
(Offset, Offset) rimGradient(Rect bounds, Offset light) {
  final c = bounds.center;
  final half =
      ((bounds.width * light.dx).abs() + (bounds.height * light.dy).abs()) / 2;
  return (c + light * half, c - light * half);
}
