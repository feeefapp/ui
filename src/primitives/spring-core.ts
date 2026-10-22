export type StepSpringState = { position: number; velocity: number }
/** Stable semi-implicit integration in bounded substeps, including after a suspended tab. */
export function stepSpring(
  state: StepSpringState,
  target: number,
  elapsed: number,
  stiffness = 420,
  damping = 28
): StepSpringState {
  let { position, velocity } = state
  const duration = Math.max(0, Math.min(0.04, elapsed))
  const steps = Math.max(1, Math.ceil(duration / (1 / 120)))
  const dt = duration / steps
  for (let i = 0; i < steps; i++) {
    velocity += ((target - position) * stiffness - velocity * damping) * dt
    position += velocity * dt
  }
  return { position, velocity }
}
