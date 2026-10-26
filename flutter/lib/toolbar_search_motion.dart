import 'primitives/spring_core.dart';

/// One step of the search capsule's width spring (stiffness 360, damping 34): the twin of
/// `stepSearchMorph` in `@feeef.dev/ui/toolbar-search-motion`.
StepSpringState stepSearchMorph(
  StepSpringState state,
  double target,
  double elapsed,
) => stepSpring(state, target, elapsed, stiffness: 360, damping: 34);

/// How far the capsule is between its collapsed [compact] width and its open [wide] width, 0–1.
double searchMorphProgress(double position, double compact, double wide) {
  final span = wide - compact < 1 ? 1.0 : wide - compact;
  return ((position - compact) / span).clamp(0.0, 1.0);
}

double _smooth(double value) {
  final t = value.clamp(0.0, 1.0);
  return t * t * (3 - 2 * t);
}

/// Opacity of the editor and of the absorbed neighbours at a morph [progress]. Separate
/// visibility windows keep returning controls out of the fading editor.
({double editor, double controls}) searchMorphVisibility(double progress) => (
  editor: _smooth((progress - .25) / .45),
  controls: 1 - _smooth(progress / .12),
);

/// The spring has come to rest at [target]: within 0.15px and under 0.6px/s.
bool searchMorphSettled(StepSpringState state, double target) =>
    (state.position - target).abs() < .15 && state.velocity.abs() < .6;
