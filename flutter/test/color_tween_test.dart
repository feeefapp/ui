import 'dart:ui';

import 'package:feeef_ui/theme/color_mix.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a fade from transparent keeps the hue: no grey mid frames', () {
    final hover = Color.from(alpha: 0.08, red: 0.1, green: 0.4, blue: 0.1);
    final tween = PaintColorTween(begin: transparent, end: hover);
    for (final t in [0.1, 0.25, 0.5, 0.75, 0.9]) {
      final c = tween.lerp(t)!;
      expect(c.r, closeTo(hover.r, 1e-6), reason: 't=$t');
      expect(c.g, closeTo(hover.g, 1e-6), reason: 't=$t');
      expect(c.b, closeTo(hover.b, 1e-6), reason: 't=$t');
      expect(c.a, closeTo(hover.a * t, 1e-6), reason: 't=$t');
    }
    // And back out.
    final out = PaintColorTween(begin: hover, end: transparent).lerp(0.5)!;
    expect(out.g, closeTo(hover.g, 1e-6));
  });

  test('between opaque colours it matches a plain lerp', () {
    const a = Color(0xFFFF0000), b = Color(0xFF0000FF);
    final c = PaintColorTween(begin: a, end: b).lerp(0.5)!;
    expect(c.r, closeTo(0.5, 1e-6));
    expect(c.b, closeTo(0.5, 1e-6));
    expect(c.a, closeTo(1, 1e-6));
  });
}
