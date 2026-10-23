import 'dart:ui' show Tristate;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  group('slider core (same vectors as the web kit)', () {
    test('values snap to the step and clamp', () {
      expect(sliderValue(33, 0, 100, 25), 25);
      expect(sliderValue(40, 0, 100, 25), 50);
      expect(sliderValue(0.1 + 0.2, 0, 1, 0.1), 0.3);
      expect(sliderValue(double.nan, 2, 9, 1), 2);
      // The end need not sit on the step grid.
      expect(sliderValue(9.8, 0, 10, 3), 10);
    });
    test('pointer fractions honour the inset and right-to-left', () {
      expect(sliderPointer(22, 200, false), 0);
      expect(sliderPointer(100, 200, false), 0.5);
      expect(
        sliderPointer(150, 200, true),
        closeTo(50 / 156 - 22 / 156 + 0, 1e-9),
      );
    });
    test('keys step, page, jump and mirror in right-to-left', () {
      expect(sliderKey('ArrowRight', 5, 0, 10, 1, false), 6);
      expect(sliderKey('ArrowRight', 5, 0, 10, 1, true), 4);
      expect(sliderKey('PageUp', 0, 0, 100, 1, false), 10);
      expect(sliderKey('Home', 7, 0, 10, 1, false), 0);
      expect(sliderKey('End', 7, 0, 10, 1, false), 10);
      expect(sliderKey('ArrowLeft', 10, 0, 10, 3, false), 9);
      expect(sliderKey('Tab', 5, 0, 10, 1, false), isNull);
    });
    test('the spring settles on its target', () {
      var state = (position: 0.0, velocity: 0.0);
      for (var i = 0; i < 120; i++) {
        state = stepSpring(state, 1, 1 / 60);
      }
      expect(state.position, closeTo(1, 1e-3));
    });
  });

  group('Slider', () {
    testWidgets('arrow keys change and commit the value', (tester) async {
      var value = 40.0;
      final commits = <double>[];
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 300,
            child: StatefulBuilder(
              builder: (context, setState) => Slider(
                label: 'Volume',
                value: value,
                step: 10,
                onValueChange: (v) => setState(() => value = v),
                onValueCommit: commits.add,
              ),
            ),
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();
      expect(value, 50);
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(value, 100);
      expect(commits, [50, 100]);
    });

    testWidgets('pressing the track jumps there', (tester) async {
      var value = 0.0;
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 244,
            child: Slider(label: 'Volume', onValueChange: (v) => value = v),
          ),
        ),
      );
      // 244 wide with a 22px inset: the middle is 50.
      await tester.tap(find.byType(Slider));
      await tester.pumpAndSettle();
      expect(value, 50);
    });

    testWidgets(
      'dragged, the thumb becomes a stretched lens, then springs back',
      (tester) async {
        await tester.pumpWidget(
          host(
            const SizedBox(
              width: 300,
              child: Slider(label: 'Volume', trackStyle: TrackStyle.thin),
            ),
          ),
        );
        double thumbWidth() => tester
            .widgetList<PositionedDirectional>(
              find.descendant(
                of: find.byType(Slider),
                matching: find.byType(PositionedDirectional),
              ),
            )
            .map((p) => p.width ?? 0)
            .reduce((a, b) => a > b ? a : b);
        expect(thumbWidth(), closeTo(37, 0.01));
        final box = tester.getRect(find.byType(Slider));
        final gesture = await tester.startGesture(
          box.centerLeft + const Offset(40, 0),
        );
        for (var i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 16));
        }
        final pressed = thumbWidth();
        expect(pressed, closeTo(37 * lensThumbScale, 0.5));
        // Moving quickly stretches it along the drag.
        for (var i = 0; i < 4; i++) {
          await gesture.moveBy(const Offset(24, 0));
          await tester.pump(const Duration(milliseconds: 16));
        }
        expect(thumbWidth(), greaterThan(pressed + 1));
        await gesture.up();
        await tester.pumpAndSettle();
        expect(thumbWidth(), closeTo(37, 0.01));
      },
    );

    testWidgets('semantics: a named slider with its value', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 300,
            child: Slider(
              label: 'Price',
              defaultValue: 1200,
              max: 5000,
              step: 100,
              getValueText: (v) => '${v.toStringAsFixed(0)} DZD',
            ),
          ),
        ),
      );
      final node = tester.getSemantics(find.bySemanticsLabel('Price'));
      expect(node.label, 'Price');
      expect(node.value, '1200 DZD');
      expect(node.increasedValue, '1300');
      handle.dispose();
    });
  });

  group('SlideSwitch', () {
    testWidgets('a tap toggles; Space toggles; loading blocks', (tester) async {
      var checked = false;
      Widget build({bool loading = false}) => host(
        StatefulBuilder(
          builder: (context, setState) => SlideSwitch(
            label: 'SMS',
            checked: checked,
            loading: loading,
            onCheckedChange: (v) => setState(() => checked = v),
          ),
        ),
      );
      await tester.pumpWidget(build());
      await tester.tap(find.byType(SlideSwitch));
      await tester.pumpAndSettle();
      expect(checked, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(checked, isFalse);
      await tester.pumpWidget(build(loading: true));
      await tester.tap(find.byType(SlideSwitch), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(checked, isFalse);
    });

    testWidgets('dragging across flips it once at release', (tester) async {
      var commits = <bool>[];
      var checked = false;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
              onCheckedCommit: commits.add,
            ),
          ),
        ),
      );
      await tester.drag(find.byType(SlideSwitch), const Offset(60, 0));
      await tester.pumpAndSettle();
      expect(checked, isTrue);
      expect(commits, [true]);
    });

    testWidgets('the thumb drags back and forth; a careful drop stays', (
      tester,
    ) async {
      final commits = <bool>[];
      var checked = true;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
              onCheckedCommit: commits.add,
            ),
          ),
        ),
      );
      final box = tester.getRect(find.byType(SlideSwitch));
      // Drag off, slowly, and hold still before lifting: it lands off.
      final gesture = await tester.startGesture(
        box.centerRight - const Offset(12, 0),
      );
      for (var i = 0; i < 8; i++) {
        await gesture.moveBy(const Offset(-5, 0));
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(checked, isFalse, reason: 'past halfway the state flips mid-drag');
      await tester.pump(const Duration(milliseconds: 200));
      await gesture.up();
      await tester.pumpAndSettle();
      expect(checked, isFalse);
      expect(commits, [false]);
      // Past halfway and back, held still before lifting: it stays off.
      final careful = await tester.startGesture(
        box.centerLeft + const Offset(12, 0),
      );
      for (final dx in [6.0, 6.0, 4.0, -4.0, -6.0, -6.0]) {
        await careful.moveBy(Offset(dx, 0));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await tester.pump(const Duration(milliseconds: 200));
      await careful.up();
      await tester.pumpAndSettle();
      expect(checked, isFalse);
      expect(commits, [false, false]);
    });

    testWidgets('a flick toggles even short of halfway', (tester) async {
      var checked = false;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
            ),
          ),
        ),
      );
      final box = tester.getRect(find.byType(SlideSwitch));
      await tester.flingFrom(
        box.centerLeft + const Offset(12, 0),
        const Offset(22, 0),
        800,
      );
      await tester.pumpAndSettle();
      expect(checked, isTrue);
    });

    testWidgets('pressed, the thumb becomes a larger lens and springs back', (
      tester,
    ) async {
      await tester.pumpWidget(host(const SlideSwitch(label: 'SMS')));
      double thumbWidth() => tester
          .widgetList<PositionedDirectional>(
            find.descendant(
              of: find.byType(SlideSwitch),
              matching: find.byType(PositionedDirectional),
            ),
          )
          .map((p) => p.width ?? 0)
          .reduce((a, b) => a > b ? a : b);
      expect(thumbWidth(), closeTo(37, 0.01));
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(SlideSwitch)),
      );
      for (var i = 0; i < 40; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(thumbWidth(), closeTo(37 * lensThumbScale, 0.5));
      await gesture.up();
      await tester.pumpAndSettle();
      expect(thumbWidth(), closeTo(37, 0.01));
    });

    testWidgets('reduced motion: no lens, no swell', (tester) async {
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: host(const SlideSwitch(label: 'SMS')),
        ),
      );
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(SlideSwitch)),
      );
      for (var i = 0; i < 40; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
      final widths = tester
          .widgetList<PositionedDirectional>(
            find.descendant(
              of: find.byType(SlideSwitch),
              matching: find.byType(PositionedDirectional),
            ),
          )
          .map((p) => p.width ?? 0);
      expect(widths.reduce((a, b) => a > b ? a : b), closeTo(37, 0.01));
      await gesture.up();
      await tester.pumpAndSettle();
    });

    testWidgets('touch: 63 × 28 stays, a press 8px above still toggles', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      var checked = false;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
            ),
          ),
        ),
      );
      final box = tester.getRect(find.byType(SlideSwitch));
      expect(box.size, const Size(63, 28));
      await tester.tapAt(box.topCenter - const Offset(0, 7));
      await tester.pumpAndSettle();
      expect(checked, isTrue);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('semantics: a toggled, named control', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        host(const SlideSwitch(label: 'Notifications', defaultChecked: true)),
      );
      final node = tester.getSemantics(find.bySemanticsLabel('Notifications'));
      expect(node.label, 'Notifications');
      expect(node.flagsCollection.isToggled, Tristate.isTrue);
      handle.dispose();
    });
  });

  group('right to left', () {
    testWidgets('the switch turns on by dragging toward the start (left)', (
      tester,
    ) async {
      var checked = false;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
            ),
          ),
          direction: TextDirection.rtl,
        ),
      );
      // Off sits on the right in RTL; on is to the left.
      await tester.drag(find.byType(SlideSwitch), const Offset(-60, 0));
      await tester.pumpAndSettle();
      expect(checked, isTrue);
      await tester.drag(find.byType(SlideSwitch), const Offset(60, 0));
      await tester.pumpAndSettle();
      expect(checked, isFalse);
    });

    testWidgets('a flick toward the start toggles the switch on', (
      tester,
    ) async {
      var checked = false;
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => SlideSwitch(
              label: 'SMS',
              checked: checked,
              onCheckedChange: (v) => setState(() => checked = v),
            ),
          ),
          direction: TextDirection.rtl,
        ),
      );
      final box = tester.getRect(find.byType(SlideSwitch));
      await tester.flingFrom(
        box.centerRight - const Offset(12, 0),
        const Offset(-14, 0),
        800,
      );
      await tester.pumpAndSettle();
      expect(checked, isTrue);
    });

    testWidgets('dragging the slider toward the start raises it', (
      tester,
    ) async {
      var value = 50.0;
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 244,
            child: StatefulBuilder(
              builder: (context, setState) => Slider(
                label: 'Volume',
                value: value,
                onValueChange: (v) => setState(() => value = v),
              ),
            ),
          ),
          direction: TextDirection.rtl,
        ),
      );
      final box = tester.getRect(find.byType(Slider));
      await tester.dragFrom(box.center, const Offset(-50, 0));
      await tester.pumpAndSettle();
      expect(value, greaterThan(60));
      await tester.dragFrom(
        tester.getRect(find.byType(Slider)).center,
        const Offset(100, 0),
      );
      await tester.pumpAndSettle();
      expect(value, lessThan(40));
    });
  });
}
