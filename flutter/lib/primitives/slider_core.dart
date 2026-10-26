import 'dart:math' as math;

/// Shared numeric contract for pointer, keyboard and programmatic values: the twin of
/// `@feeef.dev/ui/primitives/slider-core`.
({double min, double max, double step}) sliderRange([
  double min = 0,
  double max = 100,
  double step = 1,
]) {
  final start = min.isFinite ? min : 0.0;
  final end = max.isFinite ? math.max(start, max) : start;
  return (min: start, max: end, step: step.isFinite && step > 0 ? step : 1.0);
}

double sliderValue(double value, double min, double max, double step) {
  if (!value.isFinite) return min;
  if (value >= max) return max;
  var snapped = min + ((value - min) / step).round() * step;
  if ((max - value).abs() < (snapped - value).abs()) snapped = max;
  // Avoid floating point artifacts in callbacks and semantics readouts.
  return double.parse(snapped.toStringAsFixed(10)).clamp(min, max);
}

double sliderFraction(double value, double min, double max) =>
    max > min ? ((value - min) / (max - min)).clamp(0.0, 1.0) : 0;

/// The fraction under a pointer [x] measured from the track's left edge.
double sliderPointer(double x, double width, bool rtl, [double inset = 22]) {
  final edge = math.min(inset, width / 2);
  final along = rtl ? width - x : x;
  return ((along - edge) / math.max(1, width - edge * 2)).clamp(0.0, 1.0);
}

/// Keys, by their web names: ArrowRight/Left/Up/Down, PageUp/Down, Home, End.
double? sliderKey(
  String key,
  double value,
  double min,
  double max,
  double step,
  bool rtl,
) {
  final delta = <String, double>{
    'ArrowRight': rtl ? -step : step,
    'ArrowLeft': rtl ? step : -step,
    'ArrowUp': step,
    'ArrowDown': -step,
    'PageUp': step * 10,
    'PageDown': -step * 10,
  };
  if (key == 'Home') return min;
  if (key == 'End') return max;
  final d = delta[key];
  if (d == null) return null;
  // A final endpoint need not align to the step grid; stepping back reaches its last stop.
  final origin = value == max && d < 0
      ? min + ((max - min) / step).ceil() * step
      : value;
  return sliderValue(origin + d, min, max, step);
}
