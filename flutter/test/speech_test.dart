import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/speech/block.dart';
import 'package:feeef_ui/speech/block_order.dart';
import 'package:feeef_ui/speech/reorder.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Future<void> frames(WidgetTester tester, [int ms = 400]) async {
  for (var t = 0; t < ms; t += 16) {
    await tester.pump(const Duration(milliseconds: 16));
  }
}

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/misc.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();
  List<SpeechSlot> slots(List items) => [
    for (final i in items) (top: n(i['top']), height: n(i['height'])),
  ];

  group('block order matches the web kit', () {
    test('moveSpeechBlock', () {
      for (final row in fixture['move'] as List) {
        final list = (row['list'] as List).cast<String>();
        expect(
          moveSpeechBlock(list, row['from'] as int, row['to'] as int),
          row['result'],
        );
      }
      final same = ['a', 'b'];
      expect(identical(moveSpeechBlock(same, 1, 1), same), isTrue);
    });

    test('remapSpeechIndex', () {
      for (final row in fixture['remap'] as List) {
        expect(
          remapSpeechIndex(
            row['index'] as int,
            (row['previous'] as List).cast<String>(),
            (row['next'] as List).cast<String>(),
          ),
          row['result'],
        );
      }
    });

    test('speechPreviewOffsets', () {
      for (final row in fixture['offsets'] as List) {
        final result = speechPreviewOffsets(
          slots(row['items'] as List),
          row['from'] as int,
          row['to'] as int,
        );
        final expected = row['result'] as List;
        for (var i = 0; i < expected.length; i++) {
          expect(result[i], closeTo(n(expected[i]), 1e-9));
        }
      }
    });

    test('speechDragIndex and the lane clamp', () {
      for (final row in fixture['drag'] as List) {
        final items = slots(row['items'] as List);
        final from = row['from'] as int, delta = n(row['delta']);
        expect(speechDragIndex(items, from, delta), row['index']);
        expect(
          speechDragOffset(items, from, delta),
          closeTo(n(row['offset']), 1e-9),
        );
      }
    });

    test('auto-scroll speed', () {
      for (final row in fixture['scroll'] as List) {
        expect(
          speechAutoScrollSpeed(n(row[0]), n(row[1]), n(row[2])),
          closeTo(n(row[3]), 1e-9),
        );
      }
    });
  });

  group('SpeechBlock', () {
    late List<String> order;
    final moves = <(int, int)>[];

    Widget script({bool disabled = false}) => host(
      SizedBox(
        width: 320,
        child: StatefulBuilder(
          builder: (context, setState) => SpeechReorderGroup(
            children: [
              for (var i = 0; i < order.length; i++)
                SpeechBlock(
                  key: ValueKey(order[i]),
                  index: i,
                  count: order.length,
                  seed: order[i],
                  reorderDisabled: disabled,
                  onMove: (from, to) {
                    moves.add((from, to));
                    setState(() => order = moveSpeechBlock(order, from, to));
                  },
                  child: SizedBox(height: 60, child: Text('text ${order[i]}')),
                ),
            ],
          ),
        ),
      ),
    );

    Finder handle(String id) => find.descendant(
      of: find.byKey(ValueKey(id)),
      matching: find.byType(Button),
    );

    setUp(() {
      order = ['a', 'b', 'c'];
      moves.clear();
    });

    testWidgets('shows the default caption and 12px gaps', (tester) async {
      await tester.pumpWidget(script());
      expect(find.text('Speech block 1'), findsOneWidget);
      expect(find.text('Speech block 3'), findsOneWidget);
      final a = tester.getRect(find.byKey(const ValueKey('a')));
      final b = tester.getRect(find.byKey(const ValueKey('b')));
      expect(b.top - a.bottom, 12);
    });

    testWidgets('arrow keys on the handle move the block one place', (
      tester,
    ) async {
      await tester.pumpWidget(script());
      final top0 = tester.getTopLeft(find.text('text a')).dy;
      final topB = tester.getTopLeft(find.text('text b')).dy;
      await tester.tap(handle('a'));
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(moves, [(0, 1)]);
      expect(order, ['b', 'a', 'c']);
      // The moved blocks start from where they were drawn, then glide.
      expect(tester.getTopLeft(find.text('text a')).dy, closeTo(top0, 0.5));
      await frames(tester);
      expect(tester.getTopLeft(find.text('text b')).dy, closeTo(top0, 0.5));
      expect(tester.getTopLeft(find.text('text a')).dy, closeTo(topB, 0.5));
      // The handle keeps focus: up moves it back; up again at the top does nothing.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await frames(tester);
      expect(order, ['a', 'b', 'c']);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await frames(tester);
      expect(moves, [(0, 1), (1, 0)]);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('dragging the handle previews and drops one move', (
      tester,
    ) async {
      await tester.pumpWidget(script());
      final b0 = tester.getTopLeft(find.text('text b')).dy;
      final c0 = tester.getTopLeft(find.text('text c')).dy;
      final gesture = await tester.startGesture(tester.getCenter(handle('a')));
      await tester.pump();
      for (var i = 0; i < 10; i++) {
        await gesture.moveBy(const Offset(0, 30));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await frames(tester);
      // Past the middle of b and c: both slide up while a is carried.
      expect(moves, isEmpty);
      expect(tester.getTopLeft(find.text('text b')).dy, lessThan(b0 - 50));
      expect(tester.getTopLeft(find.text('text c')).dy, lessThan(c0 - 50));
      await gesture.up();
      await tester.pump();
      expect(moves, [(0, 2)]);
      expect(order, ['b', 'c', 'a']);
      await frames(tester);
      final a = tester.getRect(find.byKey(const ValueKey('a')));
      final c = tester.getRect(find.byKey(const ValueKey('c')));
      expect(a.top - c.bottom, closeTo(12, 0.5));
    });

    testWidgets('Escape cancels a drag', (tester) async {
      await tester.pumpWidget(script());
      final b0 = tester.getTopLeft(find.text('text b')).dy;
      final gesture = await tester.startGesture(tester.getCenter(handle('a')));
      await tester.pump();
      for (var i = 0; i < 6; i++) {
        await gesture.moveBy(const Offset(0, 20));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await frames(tester);
      await gesture.up();
      await frames(tester);
      expect(moves, isEmpty);
      expect(order, ['a', 'b', 'c']);
      expect(tester.getTopLeft(find.text('text b')).dy, closeTo(b0, 0.5));
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('a disabled handle neither drags nor moves', (tester) async {
      await tester.pumpWidget(script(disabled: true));
      final gesture = await tester.startGesture(tester.getCenter(handle('a')));
      for (var i = 0; i < 10; i++) {
        await gesture.moveBy(const Offset(0, 20));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await gesture.up();
      await frames(tester);
      expect(moves, isEmpty);
      expect(tester.widget<Button>(handle('a')).disabled, isTrue);
    });

    testWidgets('noteInput lights the card up while typing', (tester) async {
      await tester.pumpWidget(script());
      final context = tester.element(find.text('text a'));
      SpeechBlock.noteInput(context);
      await tester.pump(const Duration(milliseconds: 200));
      SpeechBlock.noteInput(context);
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
    });
  });
}
