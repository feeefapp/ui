import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter_test/flutter_test.dart';

/// The web kit's segmented pill model (`src/primitives/segmented-model.ts`) and its Dart twin
/// agree on every vector in fixtures/segmented.json (written by
/// tool/generate_segmented_fixture.ts).
void main() {
  final fixture = jsonDecode(
    File('test/fixtures/segmented.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v! as num).toDouble();

  for (final track in fixture['tracks'] as List) {
    final t = track as Map<String, dynamic>;
    final spans = [
      for (final s in t['spans'] as List)
        SegmentSpan(
          n((s as Map)['start']),
          n(s['width']),
          disabled: s['disabled'] == true,
        ),
    ];
    group('track ${t['name']}', () {
      test('segmentIndexAt', () {
        for (final v in t['indexAt'] as List) {
          expect(segmentIndexAt(n(v[0]), spans), v[1], reason: 'x ${v[0]}');
        }
      });
      test('segmentedDragCenter', () {
        for (final v in t['dragCenter'] as List) {
          expect(
            segmentedDragCenter(n(v[0]), n(v[1]), spans),
            closeTo(n(v[2]), 1e-5),
            reason: 'pointer ${v[0]} grab ${v[1]}',
          );
        }
      });
      test('segmentedPillWidth', () {
        for (final v in t['pillWidth'] as List) {
          expect(
            segmentedPillWidth(n(v[0]), spans),
            closeTo(n(v[1]), 1e-5),
            reason: 'center ${v[0]}',
          );
        }
      });
      test('segmentedSnapIndex', () {
        for (final v in t['snap'] as List) {
          expect(
            segmentedSnapIndex(n(v[0]), n(v[1]), spans),
            v[2],
            reason: 'center ${v[0]} velocity ${v[1]}',
          );
        }
      });
    });
  }

  test('segmentedAutoScrollSpeed', () {
    for (final v in fixture['autoScroll'] as List) {
      expect(
        segmentedAutoScrollSpeed(n(v[0]), n(v[1]), n(v[2])),
        closeTo(n(v[3]), 1e-5),
        reason: 'pointer ${v[0]} in ${v[1]}…${v[2]}',
      );
    }
  });

  test('segmentedRevealOffset', () {
    for (final v in fixture['reveal'] as List) {
      expect(
        segmentedRevealOffset(n(v[0]), n(v[1]), n(v[2]), n(v[3]), n(v[4])),
        closeTo(n(v[5]), 1e-5),
        reason:
            'offset ${v[0]} max ${v[1]} view ${v[2]} option ${v[3]}…${v[4]}',
      );
    }
  });
}
