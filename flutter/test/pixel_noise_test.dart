import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/brand/pixel_noise.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('imul matches Math.imul on large operands', () {
    expect(imul32(0xFFFFFFFF, 0xFFFFFFFF), 1);
    expect(imul32(2166136261, 16777619), (2166136261 * 16777619) & 0xFFFFFFFF);
    expect(imul32(0x7FFFFFFF, 2), 0xFFFFFFFE);
  });

  final cases = jsonDecode(
    File('test/fixtures/pixel_texture.json').readAsStringSync(),
  ) as List<dynamic>;
  for (final raw in cases) {
    final c = raw as Map<String, dynamic>;
    test(
      '${c['variant']} texture for "${c['seed']}" matches the web kit square for square',
      () {
        final expected = c['pixels'] as List<dynamic>;
        final actual = texturePixels(
          TextureVariant.values.byName(c['variant'] as String),
          c['seed'] as String,
          TextureDensity.values.byName(c['density'] as String),
        );
        expect(actual.length, expected.length);
        for (var i = 0; i < actual.length; i++) {
          final e = expected[i] as Map<String, dynamic>;
          expect(actual[i].x, (e['x'] as num).toDouble());
          expect(actual[i].y, (e['y'] as num).toDouble());
          expect(
            actual[i].opacity,
            closeTo((e['opacity'] as num).toDouble(), 1e-12),
          );
        }
      },
    );
  }
}
