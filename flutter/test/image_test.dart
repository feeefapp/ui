import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/image/board_utils.dart';
import 'package:feeef_ui/image/freeform_board.dart';
import 'package:feeef_ui/image/freeform_frame.dart';
import 'package:feeef_ui/image/types.dart';
import 'package:flutter_test/flutter_test.dart';

/// Vectors from the web kit (`npx tsx flutter/tool/generate_image_fixture.ts`).
final Map<String, dynamic> fixture = jsonDecode(
  File('test/fixtures/image.json').readAsStringSync(),
);

double n(Object? value) => (value as num).toDouble();

ImageOptions options(Object? json) =>
    ImageOptions.fromJson((json as Map).cast<String, Object?>());

class _Card implements FrameCard {
  _Card(this.x, this.w);
  @override
  final double x;
  @override
  final double w;
}

void main() {
  test('stageRatio reads aspect ratios and sizes like the web kit', () {
    for (final row in fixture['stage'] as List) {
      expect(
        stageRatio(null, options(row['options'])),
        closeTo(n(row['ratio']), 1e-9),
        reason: '${row['options']}',
      );
    }
  });

  test('elapsed formats seconds and minutes like the web kit', () {
    for (final row in fixture['elapsed'] as List) {
      expect(elapsed(row['from'] as String, row['now'] as num), row['text']);
    }
  });

  test(
    'takeErrorText prefers a known code, then the error, then the fallback',
    () {
      const known = {'lab.board.err_image_missing': 'No picture came back.'};
      for (final row in fixture['errors'] as List) {
        final take = row['take'] as Map;
        expect(
          takeErrorText(
            (
              error: take['error'] as String?,
              errorCode: take['errorCode'] as String?,
            ),
            (key) => known[key] ?? key,
            'Fallback',
          ),
          row['text'],
          reason: '$take',
        );
      }
    },
  );

  test('sideInset matches the web kit', () {
    for (final row in fixture['insets'] as List) {
      final rect = row['rect'] as Map?;
      expect(
        sideInset(
          row['open'] as bool,
          rect == null
              ? null
              : FrameRect(
                  left: n(rect['left']),
                  right: n(rect['right']),
                  width: n(rect['width']),
                  height: n(rect['height']),
                ),
          n(row['viewportW']),
          row['side'] == 'left' ? FrameSide.left : FrameSide.right,
          n(row['gap']),
        ),
        closeTo(n(row['inset']), 1e-9),
        reason: '$row',
      );
    }
  });

  test('revealCovered matches the web kit', () {
    for (final row in fixture['reveal'] as List) {
      final cards = [
        for (final card in row['cards'] as List)
          _Card(n(card['x']), n(card['w'])),
      ];
      final view = row['view'] as Map;
      final insets = row['insets'] as Map;
      final result = revealCovered(
        FrameView(x: n(view['x']), y: n(view['y']), scale: n(view['scale'])),
        cards,
        cards[row['focus'] as int],
        (w: n((row['viewport'] as Map)['w'])),
        (left: n(insets['left']), right: n(insets['right'])),
        n(row['padding']),
      );
      final expected = row['result'] as Map;
      expect(result.x, closeTo(n(expected['x']), 1e-9));
      expect(result.y, closeTo(n(expected['y']), 1e-9));
      expect(result.scale, closeTo(n(expected['scale']), 1e-9));
    }
  });

  test('layoutCards lays versions oldest first, sized by ratio', () {
    for (final row in fixture['layout'] as List) {
      final takes = [
        for (final take in row['takes'] as List)
          ImageTake(
            id: take['id'] as String,
            status: TakeStatus.completed,
            createdAt: '2026-10-22T08:00:00.000Z',
            options: options(take['options']),
          ),
      ];
      final ratios = {
        for (final entry in (row['ratios'] as Map).entries)
          entry.key as String: n(entry.value),
      };
      final cards = layoutCards(takes, ratios);
      final expected = row['cards'] as List;
      expect(cards.length, expected.length);
      for (final (i, card) in cards.indexed) {
        final e = expected[i] as Map;
        expect(card.take.id, e['id']);
        expect(card.x, closeTo(n(e['x']), 1e-9));
        expect(card.y, closeTo(n(e['y']), 1e-9));
        expect(card.w, closeTo(n(e['w']), 1e-9));
        expect(card.h, closeTo(n(e['h']), 1e-9));
        expect(card.number, e['number']);
      }
    }
  });

  test('fitView matches the web kit', () {
    for (final row in fixture['fit'] as List) {
      final rect = row['rect'] as Map, viewport = row['viewport'] as Map;
      final insets = row['insets'] as Map;
      final view = fitView(
        (x: n(rect['x']), y: n(rect['y']), w: n(rect['w']), h: n(rect['h'])),
        (w: n(viewport['w']), h: n(viewport['h'])),
        (
          top: n(insets['top']),
          right: n(insets['right']),
          bottom: n(insets['bottom']),
          left: n(insets['left']),
        ),
        n(row['padding']),
        n(row['maxScale']),
      );
      final expected = row['view'] as Map;
      expect(view.x, closeTo(n(expected['x']), 1e-9));
      expect(view.y, closeTo(n(expected['y']), 1e-9));
      expect(view.scale, closeTo(n(expected['scale']), 1e-9));
    }
  });
}
