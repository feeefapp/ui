/// A spring's position and velocity (`StepSpringState` in the web kit).
typedef StepSpringState = ({double position, double velocity});

/// Stable semi-implicit integration in bounded substeps, including after a suspended app: the
/// twin of `stepSpring` in `@feeef.dev/ui/primitives/spring-core`.
StepSpringState stepSpring(
  StepSpringState state,
  double target,
  double elapsed, {
  double stiffness = 420,
  double damping = 28,
}) {
  var position = state.position;
  var velocity = state.velocity;
  final duration = elapsed.clamp(0.0, 0.04);
  final steps = (duration / (1 / 120)).ceil().clamp(1, 1 << 20);
  final dt = duration / steps;
  for (var i = 0; i < steps; i++) {
    velocity += ((target - position) * stiffness - velocity * damping) * dt;
    position += velocity * dt;
  }
  return (position: position, velocity: velocity);
}
