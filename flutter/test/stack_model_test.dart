import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:feeef_ui/containers/stack_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/stack.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();
  Rect rect(Map<String, dynamic> j) =>
      Rect.fromLTWH(n(j['x']), n(j['y']), n(j['width']), n(j['height']));
  Size size(Map<String, dynamic> j) => Size(n(j['width']), n(j['height']));
  void expectRect(Rect actual, Map<String, dynamic> expected) {
    expect(actual.left, closeTo(n(expected['x']), 1e-9));
    expect(actual.top, closeTo(n(expected['y']), 1e-9));
    expect(actual.width, closeTo(n(expected['width']), 1e-9));
    expect(actual.height, closeTo(n(expected['height']), 1e-9));
  }

  test('parallax matches', () {
    expect(stackParallax, n(fixture['parallax']));
  });

  test('diffStack classifies every change like the web kit', () {
    for (final row in fixture['diff'] as List) {
      final previous = (row['previous'] as List).cast<String>();
      final next = (row['next'] as List).cast<String>();
      final expected = row['change'] as Map<String, dynamic>;
      final change = diffStack<String>(previous, next);
      final reason = '$previous → $next';
      switch (expected['kind']) {
        case 'none':
          expect(change, isA<StackNone<String>>(), reason: reason);
        case 'push':
          final push = change as StackPush<String>;
          expect(push.enter, expected['enter'], reason: reason);
          expect(push.exit, expected['exit'], reason: reason);
        case 'pop':
          final pop = change as StackPop<String>;
          expect(pop.enter, expected['enter'], reason: reason);
          expect(pop.exit, expected['exit'], reason: reason);
          expect(pop.removed, expected['removed'], reason: reason);
        case 'replace':
          final replace = change as StackReplace<String>;
          expect(replace.enter, expected['enter'], reason: reason);
          expect(replace.exit, expected['exit'], reason: reason);
          expect(replace.removed, expected['removed'], reason: reason);
        default:
          fail('unknown kind ${expected['kind']}');
      }
    }
  });

  test('slideFrame matches, mirrored for RTL', () {
    for (final row in fixture['slide'] as List) {
      final frame = slideFrame(n(row['shown']), n(row['width']), row['rtl']);
      final expected = row['frame'] as Map<String, dynamic>;
      expect(frame.front, closeTo(n(expected['front']), 1e-9));
      expect(frame.back, closeTo(n(expected['back']), 1e-9));
      expect(frame.dim, closeTo(n(expected['dim']), 1e-9));
    }
  });

  test('mixRect does not clamp its progress', () {
    for (final row in fixture['mix'] as List) {
      expectRect(
        mixRect(rect(row['from']), rect(row['to']), n(row['progress'])),
        row['rect'],
      );
    }
  });

  test('zoomFrame gives the numbers of the CSS transform and clip', () {
    for (final row in fixture['zoom'] as List) {
      final frame = zoomFrame(
        rect(row['rect']),
        n(row['radius']),
        size(row['page']),
      );
      final translate = row['translate'] as List;
      expect(frame.scale, closeTo(n(row['scale']), 1e-9));
      expect(frame.translate.dx, closeTo(n(translate[0]), 1e-9));
      expect(frame.translate.dy, closeTo(n(translate[1]), 1e-9));
      expect(frame.clipBottom, closeTo(n(row['clipBottom']), 1e-9));
      expect(frame.clipRadius, closeTo(n(row['clipRadius']), 1e-9));
    }
  });

  test('dragDismissRect shrinks around the grabbed point', () {
    for (final row in fixture['drag'] as List) {
      final anchor = row['anchor'] as Map<String, dynamic>;
      expectRect(
        dragDismissRect(
          size(row['page']),
          Offset(n(anchor['x']), n(anchor['y'])),
          n(row['dx']),
          n(row['dy']),
          row['pull'] == null ? null : n(row['pull']),
        ),
        row['rect'],
      );
    }
  });
}
