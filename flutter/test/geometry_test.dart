import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/brand/geometry.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final cases = jsonDecode(
    File('test/fixtures/superellipse.json').readAsStringSync(),
  ) as List<dynamic>;
  for (final raw in cases) {
    final c = raw as Map<String, dynamic>;
    test(
      'superellipse ${c['width']}×${c['height']} radii ${c['radii']} matches the web kit',
      () {
        final expected = RegExp(r'[ML](-?[\d.]+),(-?[\d.]+)')
            .allMatches(c['path'] as String)
            .map(
              (m) =>
                  Offset(double.parse(m.group(1)!), double.parse(m.group(2)!)),
            )
            .toList();
        final points = superellipsePoints(
          (c['width'] as num).toDouble(),
          (c['height'] as num).toDouble(),
          [for (final r in c['radii'] as List<dynamic>) (r as num).toDouble()],
          inset: (c['inset'] as num).toDouble(),
        );
        expect(points.length, expected.length);
        for (var i = 0; i < points.length; i++) {
          expect(
            (points[i] - expected[i]).distance,
            lessThanOrEqualTo(0.0011),
            reason: 'point $i',
          );
        }
      },
    );
  }
}
