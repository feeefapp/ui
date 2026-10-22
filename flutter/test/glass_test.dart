import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:feeef_ui/glass/geometry.dart';
import 'package:feeef_ui/glass/light.dart';
import 'package:feeef_ui/glass/material.dart';
import 'package:feeef_ui/glass/refraction.dart';
import 'package:flutter_test/flutter_test.dart';

GlassShape shape(Map<String, dynamic> j) => GlassShape(
  x: (j['x'] as num).toDouble(),
  y: (j['y'] as num).toDouble(),
  width: (j['width'] as num).toDouble(),
  height: (j['height'] as num).toDouble(),
  radius: (j['radius'] as num).toDouble(),
);

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/glass.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('shape distance matches the web kit', () {
    for (final entry in fixture['distance'] as List) {
      final s = shape(entry['shape']);
      expect(clampRadius(s), closeTo(n(entry['clamped']), 1e-9));
      for (final sample in entry['samples'] as List) {
        expect(
          shapeDistance(n(sample[0]), n(sample[1]), s),
          closeTo(n(sample[2]), 1e-9),
        );
      }
    }
  });

  test('circles and capsules draw round ends, like Liquid Glass', () {
    for (final entry in fixture['fullRound'] as List) {
      final [w, h, r, round] = entry as List;
      final shape = GlassShape(
        x: 0,
        y: 0,
        width: (w as num).toDouble(),
        height: (h as num).toDouble(),
        radius: (r as num).toDouble(),
      );
      expect(isFullRound(shape), round, reason: '$w x $h, radius $r');
    }
  });

  test('smooth minimum matches', () {
    for (final row in fixture['smoothMin'] as List) {
      expect(
        smoothMin(n(row[0]), n(row[1]), n(row[2])),
        closeTo(n(row[3]), 1e-12),
      );
    }
  });

  test('unions: gaps, clusters, distances and outlines match', () {
    for (final entry in fixture['union'] as List) {
      final a = shape(entry['a']), b = shape(entry['b']);
      final spacing = n(entry['spacing']);
      expect(rectGap(a, b), closeTo(n(entry['gap']), 1e-9));
      expect(glassClusters([a, b], spacing).length, entry['clusters']);
      for (final sample in entry['samples'] as List) {
        expect(
          unionDistance(n(sample[0]), n(sample[1]), [a, b], spacing),
          closeTo(n(sample[2]), 1e-9),
        );
      }
      final loops = unionLoops([a, b], spacing, 2);
      final expected = entry['loops'] as List;
      expect(loops.length, expected.length);
      for (var i = 0; i < loops.length; i++) {
        expect(loops[i].length, expected[i]['points']);
        expect(loopArea(loops[i]), closeTo(n(expected[i]['area']), 1e-6));
        final first = expected[i]['first'] as List;
        expect(loops[i].first, Offset(n(first[0]), n(first[1])));
      }
    }
  });

  test('light turns toward a near pointer; rim gradients match', () {
    for (final entry in fixture['light'] as List) {
      final c = entry['centre'];
      final p = entry['pointer'];
      final light = glassLightToward(
        Offset(n(c['x']), n(c['y'])),
        p == null ? null : Offset(n(p['x']), n(p['y'])),
      );
      expect(light.dx, closeTo(n(entry['light']['x']), 1e-12));
      expect(light.dy, closeTo(n(entry['light']['y']), 1e-12));
    }
    for (final entry in fixture['rim'] as List) {
      final b = entry['bounds'];
      final (start, end) = rimGradient(
        Rect.fromLTWH(n(b['x']), n(b['y']), n(b['width']), n(b['height'])),
        Offset(n(entry['light']['x']), n(entry['light']['y'])),
      );
      final g = entry['gradient'];
      expect(start.dx, closeTo(n(g['x1']), 1e-9));
      expect(start.dy, closeTo(n(g['y1']), 1e-9));
      expect(end.dx, closeTo(n(g['x2']), 1e-9));
      expect(end.dy, closeTo(n(g['y2']), 1e-9));
    }
  });

  test('the measured model: merge width, bend and material match', () {
    for (final row in fixture['mergeWidth'] as List) {
      expect(mergeWidth(n(row[0]), n(row[1])), closeTo(n(row[2]), 1e-12));
    }
    for (final row in fixture['refraction'] as List) {
      final bend = refractionAt(n(row[0]), n(row[1]), n(row[2]), n(row[3]));
      expect(bend.x, closeTo(n(row[4]['x']), 1e-12));
      expect(bend.y, closeTo(n(row[4]['y']), 1e-12));
    }
    for (final row in fixture['refractionScale'] as List) {
      expect(refractionScale(n(row[0])), closeTo(n(row[1]), 1e-12));
    }
    for (final row in fixture['material'] as List) {
      expect(glassBlur(n(row[0])), closeTo(n(row[1]), 1e-12));
      expect(glassSize(n(row[0])).name, row[2]);
    }
    for (final row in fixture['rimAlpha'] as List) {
      expect(rimAlpha(n(row[0]), dark: false), closeTo(n(row[1]), 1e-12));
      expect(rimAlpha(n(row[0]), dark: true), closeTo(n(row[2]), 1e-12));
    }
    final stops = fixture['rimStops'] as List;
    expect(glassRimStops.length, stops.length);
    for (var i = 0; i < stops.length; i++) {
      expect(glassRimStops[i].$1, closeTo(n(stops[i][0]), 1e-12));
      expect(glassRimStops[i].$2, closeTo(n(stops[i][1]), 1e-12));
    }
  });
}
