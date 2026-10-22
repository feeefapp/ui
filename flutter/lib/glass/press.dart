import '../physics/spring.dart';
import 'geometry.dart';

/// Press response for interactive glass, after Apple's `.interactive()`: the twin of
/// `@feeef.dev/ui/glass/press`.

/// How much a pressed bubble grows.
const double glassPressScale = 1.06;

/// The farthest (px) a bubble stretches toward a drag, however far the finger goes.
const double glassStretchLimit = 12;

/// Fraction of the stretch the bubble's content follows.
const double glassContentFollow = 0.4;

/// Stretch (px) for a drag of [dx], [dy] from where the press started.
({double x, double y}) glassStretch(
  double dx,
  double dy, [
  double limit = glassStretchLimit,
]) => (x: rubberBand(dx, limit * 4) / 4, y: rubberBand(dy, limit * 4) / 4);

/// The drawn shape of a pressed bubble: scaled around its centre, then lengthened toward the
/// stretch and slightly narrowed across it.
GlassShape pressedShape(
  GlassShape shape,
  double scale,
  double stretchX,
  double stretchY,
) {
  final width = shape.width * scale;
  final height = shape.height * scale;
  final ax = stretchX.abs(), ay = stretchY.abs();
  final w = width + ax - ay * 0.25;
  final h = height + ay - ax * 0.25;
  final cx = shape.x + shape.width / 2 + stretchX / 2;
  final cy = shape.y + shape.height / 2 + stretchY / 2;
  return GlassShape(
    x: cx - w / 2,
    y: cy - h / 2,
    width: w < 0 ? 0 : w,
    height: h < 0 ? 0 : h,
    radius: shape.radius * scale,
  );
}
