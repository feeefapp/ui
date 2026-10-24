import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:feeef_ui/brand/geometry.dart';
import 'package:flutter_test/flutter_test.dart';

/// The clamped continuous corner against the web kit's numbers (`test/fixtures/corners.json`,
/// written by `tool/generate_corners_fixture.ts` from `src/brand/geometry.ts`).
void main() {
  final fixture = jsonDecode(
    File('test/fixtures/corners.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double number(Object? value) =>
      value == null ? double.infinity : (value as num).toDouble();

  group('corner smoothing curve', () {
    for (final raw in fixture['curve'] as List<dynamic>) {
      final c = raw as Map<String, dynamic>;
      final radius = number(c['radius']);
      final width = number(c['width']);
      final height = number(c['height']);
      test('r $radius on $width×$height', () {
        final smoothing = cornerSmoothing(radius, width, height);
        expect(smoothing, closeTo(number(c['smoothing']), 1e-12));
        expect(cornerShapeParameter(smoothing), closeTo(number(c['k']), 1e-12));
        expect(
          cornerExponentFor(radius, width, height),
          closeTo(number(c['exponent']), 1e-12),
        );
      });
    }
    test('degenerate boxes and radii', () {
      for (final raw in fixture['degenerate'] as List<dynamic>) {
        final c = raw as Map<String, dynamic>;
        expect(
          cornerSmoothing(
            number(c['radius']),
            number(c['width']),
            number(c['height']),
          ),
          number(c['smoothing']),
        );
      }
    });
  });

  List<Offset> parse(String path) => RegExp(r'[ML](-?[\d.]+),(-?[\d.]+)')
      .allMatches(path)
      .map((m) => Offset(double.parse(m.group(1)!), double.parse(m.group(2)!)))
      .toList();

  List<Offset> pointsOf(Map<String, dynamic> c, {double? exponent}) =>
      superellipsePoints(
        number(c['width']),
        number(c['height']),
        [for (final r in c['radii'] as List<dynamic>) number(r)],
        inset: number(c['inset']),
        exponent: exponent,
      );

  final paths = {
    for (final raw in fixture['paths'] as List<dynamic>)
      (raw as Map<String, dynamic>)['name'] as String: raw,
  };

  group('outline matches the web kit', () {
    for (final c in paths.values) {
      test(c['name'] as String, () {
        final expected = parse(c['path'] as String);
        final points = pointsOf(c);
        expect(points.length, expected.length);
        for (var i = 0; i < points.length; i++) {
          expect(
            (points[i] - expected[i]).distance,
            lessThanOrEqualTo(0.0011),
            reason: 'point $i',
          );
        }
      });
    }
  });

  test('a 44 × 44 bubble at r 22 is a circle', () {
    for (final p in pointsOf(paths['bubble 44×44 r22']!)) {
      expect(((p - const Offset(22, 22)).distance - 22).abs(), lessThan(0.25));
    }
  });

  test('a 132 × 44 bar at r 22 is a capsule: circular ends', () {
    for (final p in pointsOf(paths['capsule 132×44 r22']!)) {
      final centre = Offset(p.dx.clamp(22, 110).toDouble(), 22);
      expect(((p - centre).distance - 22).abs(), lessThan(0.25));
    }
  });

  test('a 300 × 200 card at r 16 keeps the full continuous corner', () {
    final card = paths['card 300×200 r16']!;
    final clamped = pointsOf(card);
    final full = pointsOf(card, exponent: cornerExponent);
    for (var i = 0; i < clamped.length; i++) {
      expect((clamped[i] - full[i]).distance, lessThan(0.1));
    }
    // And it is not a circle: the corner's midpoint lies outside the r 16 arc.
    final mid = clamped[17];
    expect(
      (mid - const Offset(284, 16)).distance,
      greaterThan(16 + 16 * (math.sqrt2 - 1) * 0.1),
    );
  });
}
