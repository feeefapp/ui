import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter_test/flutter_test.dart';

/// The web kit's glass lens model (`src/primitives/lens-model.ts`) and its Dart twin agree on every
/// vector in fixtures/lens.json (written by tool/generate_lens_fixture.ts).
void main() {
  final fixture = jsonDecode(
    File('test/fixtures/lens.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v! as num).toDouble();

  test('constants', () {
    final c = fixture['constants'] as Map<String, dynamic>;
    expect(lensThumbScale, n(c['lensThumbScale']));
    expect(lensStretchTime, n(c['lensStretchTime']));
    expect(switchOverdrag, n(c['switchOverdrag']));
    expect(switchDeceleration, n(c['switchDeceleration']));
    expect(switchSlopMouse, n(c['switchSlopMouse']));
    expect(switchSlopTouch, n(c['switchSlopTouch']));
    expect(contentPressScale, n(c['contentPressScale']));
  });
  test('lensStretch', () {
    for (final v in fixture['stretch'] as List) {
      expect(lensStretch(n(v[0])), closeTo(n(v[1]), 1e-5), reason: 'v ${v[0]}');
    }
  });
  test('switchDragPosition', () {
    for (final v in fixture['dragPosition'] as List) {
      expect(
        switchDragPosition(n(v[0]), n(v[1]), n(v[2])),
        closeTo(n(v[3]), 1e-5),
        reason: 'start ${v[0]} dx ${v[1]} travel ${v[2]}',
      );
    }
  });
  test('switchSnap', () {
    for (final v in fixture['snap'] as List) {
      expect(
        switchSnap(n(v[0]), n(v[1])),
        n(v[2]),
        reason: 'position ${v[0]} velocity ${v[1]}',
      );
    }
  });
  test('touchOutset', () {
    for (final v in fixture['outset'] as List) {
      expect(
        touchOutset(n(v[0]), n(v[1])),
        closeTo(n(v[2]), 1e-9),
        reason: 'size ${v[0]} target ${v[1]}',
      );
    }
  });
}
