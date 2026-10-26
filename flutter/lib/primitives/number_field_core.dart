import 'slider_core.dart';

/// Pure number-field math: drag scrubbing, keyboard steps, display precision and typed
/// expressions. The twin of `@feeef.dev/ui/primitives/number-field-core`.
class NumberFieldBounds {
  const NumberFieldBounds({this.min, this.max, this.step = 1});
  final double? min, max;
  final double step;
}

bool _finite(double? n) => n != null && n.isFinite;

/// Both ends are known, so the field behaves like a slider (fill, absolute range mapping).
bool isBounded(NumberFieldBounds b) =>
    _finite(b.min) && _finite(b.max) && b.max! > b.min!;

/// Decimal places implied by the step: 1 → 0, 0.25 → 2, 0.1 → 1.
int stepDecimals(double step) {
  if (!step.isFinite) return 0;
  if (step == step.roundToDouble() && step.abs() < 1e21) return 0;
  final text = step.toString();
  if (text.contains('e-')) return int.parse(text.split('e-')[1]);
  return text.contains('.') ? text.split('.')[1].length : 0;
}

// JavaScript's Math.round: halves round up.
double _jsRound(double v) => (v + 0.5).floorToDouble();

/// Clamps to the bounds that exist and snaps to the step grid (from `min` when it exists, else 0).
double clampNumber(double value, NumberFieldBounds b) {
  if (!value.isFinite) return _finite(b.min) ? b.min! : 0;
  if (_finite(b.min) && _finite(b.max)) {
    return sliderValue(value, b.min!, b.max!, b.step);
  }
  final origin = _finite(b.min) ? b.min! : (_finite(b.max) ? b.max! : 0.0);
  var snapped = origin + _jsRound((value - origin) / b.step) * b.step;
  if (_finite(b.min) && snapped < b.min!) snapped = b.min!;
  if (_finite(b.max) && snapped > b.max!) snapped = b.max!;
  final digits = (stepDecimals(b.step) + 2).clamp(0, 10);
  return double.parse(snapped.toStringAsFixed(digits));
}

/// Pixels of drag per step when the field has no range to map across.
const double unboundedPxPerStep = 8;

/// The value while scrubbing: a bounded field maps its full width to its full range relative to
/// the value at press time; an unbounded one moves one step per few pixels. [fine] (Shift) is ten
/// times slower. In RTL, dragging toward the start (right) increases the value.
double dragValue(
  NumberFieldBounds b, {
  required double startValue,
  required double dx,
  required double width,
  bool fine = false,
  bool rtl = false,
}) {
  final delta = (rtl ? -dx : dx) * (fine ? 0.1 : 1);
  final raw = isBounded(b)
      ? startValue + (delta / (width < 1 ? 1 : width)) * (b.max! - b.min!)
      : startValue + (delta / unboundedPxPerStep) * b.step;
  return clampNumber(raw, b);
}

/// Keyboard stepping on the step grid, by web key name; null when the key is not a value key.
double? keyValue(
  String key,
  double value,
  NumberFieldBounds b, {
  bool rtl = false,
}) {
  final step = b.step;
  if (key == 'Home') return _finite(b.min) ? b.min : null;
  if (key == 'End') return _finite(b.max) ? b.max : null;
  final delta = switch (key) {
    'ArrowUp' => step,
    'ArrowDown' => -step,
    'ArrowRight' => rtl ? -step : step,
    'ArrowLeft' => rtl ? step : -step,
    'PageUp' => step * 10,
    'PageDown' => -step * 10,
    _ => null,
  };
  if (delta == null) return null;
  return clampNumber(value + delta, b);
}

/// Fill fraction 0–1 for a bounded field.
double fillFraction(double value, NumberFieldBounds b) {
  if (!isBounded(b)) return 0;
  return ((value - b.min!) / (b.max! - b.min!)).clamp(0.0, 1.0);
}

/// Parses what a person types: numbers with `.` or `,` decimals, spaces as thousands separators,
/// `+ - * /` (also `× ÷ −`) with parentheses, and `%` dividing the term before it by 100
/// (`2000*15%` → 300). Arabic-Indic digits are accepted. Returns null for anything else.
double? parseNumberExpression(String input) {
  final buffer = StringBuffer();
  for (final rune in input.runes) {
    if (rune >= 0x0660 && rune <= 0x0669) {
      buffer.write(rune - 0x0660);
    } else if (rune >= 0x06f0 && rune <= 0x06f9) {
      buffer.write(rune - 0x06f0);
    } else if (rune == 0x20 ||
        rune == 0xa0 ||
        rune == 0x202f ||
        rune == 0x27 ||
        rune == 0x09 ||
        rune == 0x0a ||
        rune == 0x0d) {
      continue;
    } else if (rune == 0xd7) {
      buffer.write('*');
    } else if (rune == 0xf7) {
      buffer.write('/');
    } else if (rune == 0x2212) {
      buffer.write('-');
    } else {
      buffer.writeCharCode(rune);
    }
  }
  final text = buffer.toString();
  if (text.isEmpty) return null;
  // A lone comma is a decimal separator ("1,5"); with a dot present, commas group thousands.
  final s = text.contains('.')
      ? text.replaceAll(',', '')
      : text.replaceAll(',', '.');
  var i = 0;
  String? peek() => i < s.length ? s[i] : null;
  final numberPattern = RegExp(
    r'^\d*\.?\d+(e[+-]?\d+)?|^\d+\.',
    caseSensitive: false,
  );
  double? number() {
    final match = numberPattern.firstMatch(s.substring(i));
    if (match == null) return null;
    i += match.group(0)!.length;
    return double.parse(
      match.group(0)!.endsWith('.') ? '${match.group(0)}0' : match.group(0)!,
    );
  }

  late double? Function() sum;
  double? factor() {
    if (peek() == '+' || peek() == '-') {
      final sign = s[i++] == '-' ? -1 : 1;
      final inner = factor();
      return inner == null ? null : sign * inner;
    }
    double? value;
    if (peek() == '(') {
      i++;
      value = sum();
      if (value == null || peek() != ')') return null;
      i++;
    } else {
      value = number();
    }
    if (value != null && peek() == '%') {
      i++;
      value /= 100;
    }
    return value;
  }

  double? product() {
    var left = factor();
    while (left != null && (peek() == '*' || peek() == '/')) {
      final op = s[i++];
      final right = factor();
      if (right == null) return null;
      left = op == '*' ? left * right : left / right;
    }
    return left;
  }

  sum = () {
    var left = product();
    while (left != null && (peek() == '+' || peek() == '-')) {
      final op = s[i++];
      final right = product();
      if (right == null) return null;
      left = op == '+' ? left + right : left - right;
    }
    return left;
  };
  final result = sum();
  return result != null && i == s.length && result.isFinite ? result : null;
}
