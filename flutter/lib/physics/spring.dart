import 'dart:math' as math;

/// A spring described like SwiftUI: how long it takes to settle and how much it overshoots. The
/// twin of `@feeef.dev/ui/physics/spring`.
class Spring {
  const Spring({required this.duration, required this.bounce});

  /// Seconds, roughly until it settles.
  final double duration;

  /// Overshoot from -1 to 1. 0 settles without overshoot; 0.15 is a snappy hint; 0.3 bounces.
  final double bounce;
}

/// The kit's springs.
abstract final class Springs {
  /// Default for layout and presentation: pages, sheets, panels. No overshoot.
  static const smooth = Spring(duration: 0.5, bounce: 0);

  /// Small controls and state changes that should feel quick: toggles, chips, indicators.
  static const snappy = Spring(duration: 0.35, bounce: 0.15);

  /// Playful arrivals that deserve attention, such as a card landing in place.
  static const bouncy = Spring(duration: 0.5, bounce: 0.3);

  /// Something released after a drag: settles fast and keeps the finger's speed.
  static const release = Spring(duration: 0.42, bounce: 0.08);

  /// Following a pointer with a touch of lag, for values that must not jump.
  static const interactive = Spring(duration: 0.2, bounce: 0);
}

/// Physical coefficients (mass 1) for a duration/bounce spring, using SwiftUI's mapping.
({double stiffness, double damping}) springCoefficients(Spring spring) {
  final d = math.max(0.01, spring.duration);
  final b = spring.bounce.clamp(-0.99, 0.99);
  final stiffness = math.pow(2 * math.pi / d, 2).toDouble();
  final damping = b >= 0
      ? (4 * math.pi * (1 - b)) / d
      : (4 * math.pi) / (d * (1 + b));
  return (stiffness: stiffness, damping: damping);
}

/// A spring's position and velocity at one moment.
typedef SpringState = ({double position, double velocity});

/// Solves a spring from [from] (moving at [velocity] units per second) toward [to]. The returned
/// function gives the exact state `t` seconds later.
SpringState Function(double t) solveSpring(
  Spring spring,
  double from,
  double to, [
  double velocity = 0,
]) {
  final c = springCoefficients(spring);
  final omega = math.sqrt(c.stiffness);
  final zeta = c.damping / (2 * omega);
  final x0 = from - to;
  final v0 = velocity;
  if ((zeta - 1).abs() < 1e-6) {
    final b = v0 + omega * x0;
    return (t) {
      final e = math.exp(-omega * t);
      return (
        position: to + e * (x0 + b * t),
        velocity: e * (b - omega * (x0 + b * t)),
      );
    };
  }
  if (zeta < 1) {
    final wd = omega * math.sqrt(1 - zeta * zeta);
    final b = (v0 + zeta * omega * x0) / wd;
    return (t) {
      final e = math.exp(-zeta * omega * t);
      final cos = math.cos(wd * t), sin = math.sin(wd * t);
      return (
        position: to + e * (x0 * cos + b * sin),
        velocity:
            e *
            (-zeta * omega * (x0 * cos + b * sin) + wd * (b * cos - x0 * sin)),
      );
    };
  }
  final s = omega * math.sqrt(zeta * zeta - 1);
  final r1 = -zeta * omega + s, r2 = -zeta * omega - s;
  final c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2;
  return (t) {
    final e1 = math.exp(r1 * t), e2 = math.exp(r2 * t);
    return (
      position: to + c1 * e1 + c2 * e2,
      velocity: c1 * r1 * e1 + c2 * r2 * e2,
    );
  };
}

/// True once a spring is close enough to [to] and slow enough to snap and stop.
bool springAtRest(
  SpringState state,
  double to,
  double restDelta, [
  double? restSpeed,
]) =>
    (state.position - to).abs() <= restDelta &&
    state.velocity.abs() <= (restSpeed ?? restDelta * 10);

/// Where a moving value would come to rest if it decelerated like an iOS scroll view.
double projectMomentum(
  double position,
  double velocity, [
  double decelerationRate = 0.998,
]) =>
    position + ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

/// iOS rubber-banding: how far content visibly moves when pulled [overshoot] past its limit inside
/// a [dimension]-sized container. Grows quickly at first, then resists, never exceeds [dimension].
double rubberBand(
  double overshoot,
  double dimension, [
  double coefficient = 0.55,
]) {
  if (overshoot == 0 || dimension <= 0) return 0;
  final pulled =
      (1 - 1 / ((overshoot.abs() * coefficient) / dimension + 1)) * dimension;
  return overshoot.sign * pulled;
}

/// Linear interpolation; [progress] is not clamped, so springs may overshoot through it.
double mix(double from, double to, double progress) =>
    from + (to - from) * progress;
