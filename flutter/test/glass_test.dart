import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui';

import 'package:feeef_ui/brand/geometry.dart' show superellipsePoints;
import 'package:feeef_ui/glass/geometry.dart';
import 'package:feeef_ui/glass/hairline.dart';
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

  test('light turns toward a near pointer', () {
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
    for (final row in fixture['tint'] as List) {
      final m = glassMaterial(
        n(row[0]),
        dark: row[1] == 'dark',
        size: GlassSize.values.byName(row[2] as String),
      );
      final expected = row[3] as Map<String, dynamic>;
      final label = '${row[0]} ${row[1]} ${row[2]}';
      expect(m.veil, closeTo(n(expected['veil']), 1e-12), reason: label);
      expect(
        m.saturate,
        closeTo(n(expected['saturate']), 1e-12),
        reason: label,
      );
      expect(m.gain, closeTo(n(expected['gain']), 1e-12), reason: label);
      expect(m.offset, closeTo(n(expected['offset']), 1e-12), reason: label);
    }
    for (final row in fixture['rimLayer'] as List) {
      final rim = glassRim(n(row[2]), dark: row[3] == 'dark');
      expect(
        rimLayer(n(row[0]), n(row[1]), rim),
        closeTo(n(row[4]), 1e-12),
        reason: '$row',
      );
    }
    for (final row in fixture['hairline'] as List) {
      final h = glassHairline(n(row[0]), dark: row[1] == 'dark');
      expect(h.ring, closeTo(n(row[2]['ring']), 1e-12), reason: '$row');
      expect(h.sliver, closeTo(n(row[2]['sliver']), 1e-12), reason: '$row');
    }
    for (final row in fixture['hairlineBands'] as List) {
      final shapes = [
        for (final s in row['shapes'] as List)
          GlassShape(
            x: n(s['x']),
            y: n(s['y']),
            width: n(s['width']),
            height: n(s['height']),
            radius: n(s['radius']),
          ),
      ];
      final bands = hairlineBands(shapes, n(row['spacing']));
      expect(bands.ring.length, row['ringLoops'], reason: '$row');
      expect(bands.sliver.length, row['sliverLoops'], reason: '$row');
      double reach(List<List<Offset>> loops) {
        var most = 0.0;
        for (var i = 0; i + 1 < loops.length; i += 2) {
          for (var k = 0; k < loops[i].length; k++) {
            most = math.max(most, (loops[i][k] - loops[i + 1][k]).distance);
          }
        }
        return most;
      }

      expect(reach(bands.ring), closeTo(n(row['ringReach']), 1e-3));
      expect(reach(bands.sliver), closeTo(n(row['sliverReach']), 0.02));
    }
    for (final row in fixture['edgeMask'] as List) {
      expect(edgeMask(n(row[0]), n(row[1])), closeTo(n(row[2]), 1e-12));
    }
    for (final row in fixture['blurAt'] as List) {
      expect(
        glassBlurAt(n(row[0]), n(row[1]), blurOn: row[2] as bool),
        closeTo(n(row[3]), 1e-12),
      );
    }
    for (final row in fixture['edgeTerms'] as List) {
      final dark = row[1] == 'dark';
      final terms = glassEdgeTerms(
        n(row[0]),
        dark: dark,
        material: glassMaterial(
          n(row[0]),
          dark: dark,
          size: GlassSize.values.byName(row[2] as String),
        ),
        surface: n(row[3]),
      );
      expect(terms.k1, closeTo(n(row[4]['k1']), 1e-12), reason: '$row');
      expect(terms.k3, closeTo(n(row[4]['k3']), 1e-12), reason: '$row');
    }
  });

  test('the backdrop matrix saturates, then lifts by gain · x + offset', () {
    final m = glassMaterial(0.25, dark: false, size: GlassSize.small);
    final matrix = glassBackdropMatrix(m);
    for (final x in [0.0, 0.4, 0.9]) {
      // A grey: saturation leaves it alone, so only the lift shows (bias in 0–255).
      for (var row = 0; row < 3; row++) {
        final out =
            (matrix[row * 5] + matrix[row * 5 + 1] + matrix[row * 5 + 2]) * x +
            matrix[row * 5 + 4] / 255;
        expect(out, closeTo(m.gain * x + m.offset, 1e-9));
      }
    }
    expect(matrix.sublist(15), [0, 0, 0, 1, 0]);
  });

  test('clipped bubbles keep to their clip and merge only within it (clippedGlassPaths)', () {
    GlassShape pill(double x) =>
        GlassShape(x: x, y: 0, width: 86, height: 44, radius: 22);
    expect(intersectClips(const []), isNull);
    expect(
      intersectClips(const [
        Rect.fromLTWH(10, 0, 200, 44),
        Rect.fromLTWH(0, -1e7, 150, 2e7),
      ]),
      const Rect.fromLTRB(10, 0, 150, 44),
    );
    expect(
      intersectClips(const [
        Rect.fromLTWH(0, 0, 200, 44),
        Rect.fromLTWH(300, 0, 50, 44),
      ])!.isEmpty,
      isTrue,
    );
    // Five pills in a 200px strip scrolled by 250: three show, all cut to the strip.
    const strip = Rect.fromLTWH(0, 0, 200, 44);
    final shapes = [for (var i = 0; i < 5; i++) pill(i * 98.0 - 250)];
    final paths = clippedGlassPaths(shapes, [for (final _ in shapes) strip], 8);
    expect(paths, hasLength(3));
    for (final path in paths) {
      expect(path.clip, strip);
      final painted = path.visiblePath.getBounds();
      expect(painted.left, greaterThanOrEqualTo(-0.01));
      expect(painted.right, lessThanOrEqualTo(200.01));
    }
    // Glass inside a clip never blends with glass outside it.
    final near = [pill(0), pill(90)];
    const box = Rect.fromLTWH(-10, -10, 120, 64);
    expect(clippedGlassPaths(near, const [box, null], 8), hasLength(2));
    expect(clippedGlassPaths(near, const [box, box], 8), hasLength(1));
    expect(clippedGlassPaths(near, const [null, null], 8), hasLength(1));
  });

  test(
    'a cluster walks its contour once: lone shapes are their exact polygon',
    () {
      const lone = GlassShape(x: 30, y: 12, width: 120, height: 44, radius: 22);
      final outline = clusterOutline([lone], 8);
      expect(outline.loops, hasLength(1));
      final expected = [
        for (final p in superellipsePoints(120, 44, const [22, 22, 22, 22]))
          p + const Offset(30, 12),
      ];
      expect(outline.loops.single, expected);
      expect(outline.path.getBounds(), lone.rect);
      // Blended shapes: the same loops the union walk gives, and the same hairline from them.
      const a = GlassShape(x: 0, y: 0, width: 80, height: 40, radius: 20);
      const b = GlassShape(x: 86, y: 0, width: 80, height: 40, radius: 20);
      final blended = clusterOutline([a, b], 16);
      expect(blended.loops, unionLoops([a, b], 16, 2));
      final walked = hairlineBands([a, b], 16);
      final fromLoops = hairlineBandsOfLoops(blended.loops, [a, b], 16);
      expect(fromLoops.ring, walked.ring);
      expect(fromLoops.sliver, walked.sliver);
    },
  );

  test(
    'a lone shape\'s hairline sits half a pixel outside its exact outline',
    () {
      const lone = GlassShape(x: 30, y: 12, width: 120, height: 44, radius: 22);
      final outline = clusterOutline([lone], 8);
      final bands = hairlineBandsOfLoops(
        outline.loops,
        [lone],
        8,
        settle: false,
      );
      expect(bands.ring, hasLength(2));
      final outer = bands.ring[0], inner = bands.ring[1];
      expect(inner, outline.loops.single);
      expect(outer, hasLength(inner.length));
      for (var i = 0; i < inner.length; i++) {
        expect((outer[i] - inner[i]).distance, closeTo(0.5, 1e-9));
        // Outward: past the outline, not into the glass.
        expect(
          unionDistance(outer[i].dx, outer[i].dy, [lone], 8),
          greaterThan(0.3),
        );
      }
      // The slivers reach past the outline only at the sides.
      expect(bands.sliver, hasLength(2));
      final sliver = bands.sliver[0];
      final reach = [
        for (var i = 0; i < inner.length; i++) (sliver[i] - inner[i]).distance,
      ];
      expect(reach.reduce(math.max), greaterThan(0.3));
      expect(reach.reduce(math.min), lessThan(1e-6));
    },
  );

  test('loop normals point out of the loop whichever way it winds', () {
    const clockwise = [
      Offset(0, 0),
      Offset(10, 0),
      Offset(10, 10),
      Offset(0, 10),
    ];
    final out = loopNormals(clockwise);
    // The top-left corner's normal bisects its two edges, pointing up and left.
    expect(out[0], closeTo(-math.sqrt1_2, 1e-12));
    expect(out[1], closeTo(-math.sqrt1_2, 1e-12));
    final reversed = loopNormals(clockwise.reversed.toList());
    // Same corner, last in the reversed loop: still up and left.
    expect(reversed[6], closeTo(-math.sqrt1_2, 1e-12));
    expect(reversed[7], closeTo(-math.sqrt1_2, 1e-12));
  });
}
