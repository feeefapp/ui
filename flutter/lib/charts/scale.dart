import 'dart:math' as math;

/// A value axis that only shows round numbers: `ticks` from 0 to `top`, evenly spaced by a
/// 1 / 2 / 2.5 / 5 × 10ⁿ step, at most `maxTicks` intervals. Every tick is a value the axis
/// actually reaches, so labels never lie about the scale.
class NiceScale {
  const NiceScale({required this.top, required this.step, required this.ticks});

  final double top;
  final double step;
  final List<double> ticks;

  /// Position of [value] on the axis, 0 at the baseline and 1 at [top].
  double fraction(double value) => top <= 0 ? 0 : (value / top).clamp(0, 1);
}

NiceScale niceScale(double max, {int maxTicks = 4}) {
  if (!(max > 0) || !max.isFinite) {
    return const NiceScale(top: 1, step: 1, ticks: [0, 1]);
  }
  final raw = max / maxTicks;
  final magnitude = math
      .pow(10, (math.log(raw) / math.ln10).floor())
      .toDouble();
  final step = const [
    1.0,
    2.0,
    2.5,
    5.0,
    10.0,
  ].map((s) => s * magnitude).firstWhere((s) => s >= raw - 1e-9);
  final count = (max / step - 1e-9).ceil();
  final top = step * count;
  return NiceScale(
    top: top,
    step: step,
    ticks: [
      for (var i = 0; i <= count; i++)
        double.parse((step * i).toStringAsFixed(6)),
    ],
  );
}

/// Short figures for axes and tiles: 950, 1.2k, 12k, 1.5M. Latin digits, as the app uses.
String compactNumber(num value) {
  final v = value.toDouble();
  final a = v.abs();
  String trim(double x, int digits) {
    final s = x.toStringAsFixed(digits);
    return s.contains('.') ? s.replaceFirst(RegExp(r'\.?0+$'), '') : s;
  }

  if (a >= 1e9) return '${trim(v / 1e9, a >= 1e10 ? 0 : 1)}B';
  if (a >= 1e6) return '${trim(v / 1e6, a >= 1e7 ? 0 : 1)}M';
  if (a >= 1e3) return '${trim(v / 1e3, a >= 1e4 ? 0 : 1)}k';
  if (a == a.roundToDouble()) return v.round().toString();
  return trim(v, 1);
}

/// Grouped figures for a single number shown large: 1,284 · 612,400.
String groupedNumber(num value, {int decimals = 0}) {
  final fixed = value.abs().toStringAsFixed(decimals);
  final parts = fixed.split('.');
  final whole = parts[0].replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  final sign = value < 0 ? '-' : '';
  return parts.length > 1 ? '$sign$whole.${parts[1]}' : '$sign$whole';
}
