/// Pure carousel math: how far each slide is from the center, and which slide a flick lands on.
/// The twin of `@feeef.dev/ui/containers/carousel-model`.
library;

import 'dart:math' as math;

import '../physics/spring.dart';

/// Signed distance of a slide from the track's center, in slide steps (slide width + gap):
/// 0 = centered, ±1 = the neighbour's place. Physical (screen) axis.
double slideProgress(double slideCenter, double trackCenter, double step) =>
    step > 0 ? (slideCenter - trackCenter) / step : 0;

/// Index of the slide closest to the center.
int centeredIndex(List<double> progress) {
  var best = 0;
  for (var i = 1; i < progress.length; i++) {
    if (progress[i].abs() < progress[best].abs()) best = i;
  }
  return best;
}

/// Where a flicked track settles: the scroll offset projected with momentum, snapped to the
/// nearest slide's offset. Never skips more than [maxSkip] slides from [current].
int flickTarget(
  double scroll,
  double velocity,
  List<double> offsets,
  int current, [
  int maxSkip = 3,
]) {
  final projected = projectMomentum(scroll, velocity, 0.998);
  var best = 0;
  for (var i = 1; i < offsets.length; i++) {
    if ((offsets[i] - projected).abs() < (offsets[best] - projected).abs()) {
      best = i;
    }
  }
  return math.max(current - maxSkip, math.min(current + maxSkip, best));
}

/// The built-in scroll transitions of a carousel slide.
enum CarouselEffect { none, scale, fade, parallax }

/// The built-in scroll transition for a slide at [progress]: the slide body's scale and opacity
/// (React returns the same as a CSS `transform` string).
({double scale, double opacity}) slideEffect(
  CarouselEffect effect,
  double progress,
) {
  final d = math.min(1.5, progress.abs());
  return switch (effect) {
    CarouselEffect.scale => (scale: 1 - 0.08 * math.min(1, d), opacity: 1.0),
    CarouselEffect.fade => (scale: 1.0, opacity: 1 - 0.55 * math.min(1, d)),
    CarouselEffect.parallax ||
    CarouselEffect.none => (scale: 1.0, opacity: 1.0),
  };
}
