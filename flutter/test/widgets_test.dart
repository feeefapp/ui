import 'dart:ui' show CheckedState;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
// The kit's RadioGroup (same name as the web kit's) shadows Flutter's.
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

/// A real app shell, as apps provide it: WidgetsApp brings the Tab traversal and Enter/Space
/// activation shortcuts the kit relies on, like a browser does for the web kit.
Widget host(
  Widget child, {
  ThemeConfig config = ThemeConfig.defaults,
  TextDirection direction = TextDirection.ltr,
}) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => Directionality(
    textDirection: direction,
    child: FocusScope(
      autofocus: true,
      child: ThemeProvider(
        config: config,
        brightness: Brightness.light,
        child: Center(child: child),
      ),
    ),
  ),
);

void main() {
  group('Button', () {
    testWidgets(
      'desktop sizes follow the CSS: regular 44, compact 40, compact density 34',
      (tester) async {
        debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
        await tester.pumpWidget(
          host(
            Button(
              variant: ButtonVariant.filled,
              onClick: () {},
              children: const [Text('Save')],
            ),
          ),
        );
        expect(tester.getSize(find.byType(Button)).height, 36);
        await tester.pumpWidget(
          host(
            Button(
              controlSize: ControlSize.small,
              onClick: () {},
              children: const [Text('Save')],
            ),
          ),
        );
        expect(tester.getSize(find.byType(Button)).height, 30);
        await tester.pumpWidget(
          host(
            Button(
              controlSize: ControlSize.large,
              onClick: () {},
              children: const [Text('Save')],
            ),
          ),
        );
        expect(tester.getSize(find.byType(Button)).height, 52);
        await tester.pumpWidget(
          host(
            Button(onClick: () {}, children: const [Text('Save')]),
            config: const ThemeConfig(density: Density.compact),
          ),
        );
        expect(tester.getSize(find.byType(Button)).height, 30);
        await tester.pumpWidget(
          host(
            Button(
              controlSize: ControlSize.icon,
              ariaLabel: 'Add',
              onClick: () {},
              children: const [],
            ),
          ),
        );
        expect(tester.getSize(find.byType(Button)), const Size(36, 36));
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets(
      'touch keeps the look and reaches 44px without changing layout',
      (tester) async {
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        var clicks = 0;
        await tester.pumpWidget(
          host(
            Button(
              controlSize: ControlSize.small,
              onClick: () => clicks++,
              children: const [Text('Save')],
            ),
            config: const ThemeConfig(density: Density.thin),
          ),
        );
        final box = tester.getRect(find.byType(Button));
        expect(box.height, 22, reason: 'thin small: the visual size stays');
        // Just outside the button, within the 44px reach: it still presses it.
        await tester.tapAt(box.center.translate(0, box.height / 2 + 9));
        expect(clicks, 1);
        await tester.tapAt(box.center.translate(0, -box.height / 2 - 9));
        expect(clicks, 2);
        // Beyond the reach: nothing.
        await tester.tapAt(box.center.translate(0, 23));
        expect(clicks, 2);
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets(
      'segmented options and checkboxes keep their size and reach 44px',
      (tester) async {
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        var value = 'a';
        var checked = false;
        await tester.pumpWidget(
          host(
            StatefulBuilder(
              builder: (context, setState) => Column(
                mainAxisSize: MainAxisSize.min,
                spacing: 40,
                children: [
                  SegmentedControl<String>(
                    label: 'View',
                    value: value,
                    onChange: (v) => setState(() => value = v),
                    options: const [
                      SegmentOption(value: 'a', label: 'List'),
                      SegmentOption(value: 'b', label: 'Board'),
                    ],
                  ),
                  Checkbox(
                    label: const Text('Paid'),
                    controlSize: ControlSize.small,
                    checked: checked,
                    onCheckedChange: (v) => setState(() => checked = v),
                  ),
                ],
              ),
            ),
          ),
        );
        final segmented = tester.getRect(find.byType(SegmentedControl<String>));
        expect(
          segmented.height,
          36,
          reason: 'a regular button tall on touch too',
        );
        final board = tester.getRect(find.text('Board'));
        // Below the control, under "Board": within the option's 44px reach.
        await tester.tapAt(Offset(board.center.dx, segmented.bottom + 3));
        await tester.pumpAndSettle();
        expect(value, 'b');
        final box = tester.getRect(find.byType(Checkbox));
        expect(box.height, 30);
        await tester.tapAt(box.bottomCenter + const Offset(0, 6));
        await tester.pumpAndSettle();
        expect(checked, isTrue);
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets('the reach never takes a press from another control', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final pressed = <String>[];
      await tester.pumpWidget(
        host(
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Button(
                controlSize: ControlSize.small,
                onClick: () => pressed.add('a'),
                children: const [Text('A')],
              ),
              Button(
                controlSize: ControlSize.small,
                onClick: () => pressed.add('b'),
                children: const [Text('B')],
              ),
            ],
          ),
        ),
      );
      final b = tester.getRect(find.widgetWithText(Button, 'B'));
      // The top edge of B is inside A's reach, but on B itself.
      await tester.tapAt(b.topCenter.translate(0, 2));
      expect(pressed, ['b']);
      // Above A, in its reach only.
      final a = tester.getRect(find.widgetWithText(Button, 'A'));
      await tester.tapAt(a.topCenter.translate(0, -5));
      expect(pressed, ['b', 'a']);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('desktop pointers get no reach', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      var clicks = 0;
      await tester.pumpWidget(
        host(
          Button(
            controlSize: ControlSize.small,
            onClick: () => clicks++,
            children: const [Text('Save')],
          ),
        ),
      );
      final box = tester.getRect(find.byType(Button));
      await tester.tapAt(box.bottomCenter.translate(0, 5));
      expect(clicks, 0);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('tap and keyboard activate; disabled and loading block', (
      tester,
    ) async {
      var clicks = 0;
      Widget button({bool disabled = false, bool loading = false}) => host(
        Button(
          variant: ButtonVariant.filled,
          disabled: disabled,
          loading: loading,
          onClick: () => clicks++,
          children: const [Text('Ship order')],
        ),
      );
      await tester.pumpWidget(button());
      await tester.tap(find.text('Ship order'));
      expect(clicks, 1);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(clicks, 2);

      await tester.pumpWidget(button(disabled: true));
      await tester.tap(find.text('Ship order'));
      expect(clicks, 2);
      await tester.pumpWidget(button(loading: true));
      await tester.tap(find.text('Ship order'));
      expect(clicks, 2);
    });

    testWidgets(
      'semantics: a named, enabled button; icon buttons carry their label',
      (tester) async {
        final handle = tester.ensureSemantics();
        await tester.pumpWidget(
          host(
            Button(
              controlSize: ControlSize.icon,
              ariaLabel: 'Delete order',
              onClick: () {},
              children: const [],
            ),
          ),
        );
        expect(
          tester.getSemantics(find.byType(Button)),
          matchesSemantics(
            label: 'Delete order',
            isButton: true,
            hasEnabledState: true,
            isEnabled: true,
            isFocusable: true,
            hasTapAction: true,
            hasFocusAction: true,
          ),
        );
        handle.dispose();
      },
    );
  });

  group('SegmentedControl', () {
    Widget segmented(
      String value,
      ValueChanged<String> onChange, {
      TextDirection direction = TextDirection.ltr,
    }) => host(
      SegmentedControl<String>(
        label: 'Delivery type',
        value: value,
        onChange: onChange,
        options: const [
          SegmentOption(value: 'home', label: 'Home delivery'),
          SegmentOption(value: 'desk', label: 'Stop desk'),
          SegmentOption(value: 'pickup', label: 'Pickup', disabled: true),
          SegmentOption(value: 'express', label: 'Express'),
        ],
      ),
      direction: direction,
    );

    testWidgets('click selects', (tester) async {
      String? chosen;
      await tester.pumpWidget(segmented('home', (v) => chosen = v));
      await tester.tap(find.text('Stop desk'));
      expect(chosen, 'desk');
    });

    testWidgets(
      'arrows move and select, skipping disabled options; Home and End jump',
      (tester) async {
        var value = 'home';
        await tester.pumpWidget(
          StatefulBuilder(
            builder: (context, setState) =>
                segmented(value, (v) => setState(() => value = v)),
          ),
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await tester.pump();
        expect(value, 'desk');
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await tester.pump();
        expect(value, 'express', reason: 'pickup is disabled');
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await tester.pump();
        expect(value, 'home', reason: 'wraps around');
        await tester.sendKeyEvent(LogicalKeyboardKey.end);
        await tester.pump();
        expect(value, 'express');
        await tester.sendKeyEvent(LogicalKeyboardKey.home);
        await tester.pump();
        expect(value, 'home');
      },
    );

    testWidgets('in right-to-left, the right arrow goes back', (tester) async {
      var value = 'desk';
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) => segmented(
            value,
            (v) => setState(() => value = v),
            direction: TextDirection.rtl,
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();
      expect(value, 'home');
    });

    testWidgets('one Tab stop: only the selected option is in the tab order', (
      tester,
    ) async {
      await tester.pumpWidget(segmented('desk', (_) {}));
      String focusedLabel() {
        final context = FocusManager.instance.primaryFocus!.context!;
        for (final label in [
          'Home delivery',
          'Stop desk',
          'Pickup',
          'Express',
        ]) {
          if (find
              .descendant(
                of: find.byWidget(context.widget),
                matching: find.text(label),
              )
              .evaluate()
              .isNotEmpty) {
            return label;
          }
        }
        return '';
      }

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Stop desk');
      // The app has no other stop, so Tab wraps around, and still never lands on another option.
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Stop desk');
    });

    testWidgets('semantics: a radio group with checked options', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(segmented('home', (_) {}));
      expect(find.bySemanticsLabel('Delivery type'), findsOneWidget);
      final home = tester.getSemantics(find.bySemanticsLabel('Home delivery'));
      expect(home.flagsCollection.isChecked, CheckedState.isTrue);
      expect(home.flagsCollection.isInMutuallyExclusiveGroup, isTrue);
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Stop desk'))
            .flagsCollection
            .isChecked,
        CheckedState.isFalse,
      );
      handle.dispose();
    });
  });

  group('Checkbox and RadioGroup', () {
    testWidgets('clicking the row toggles; Space toggles; disabled ignores', (
      tester,
    ) async {
      var checked = false;
      Widget box({bool disabled = false}) => host(
        StatefulBuilder(
          builder: (context, setState) => Checkbox(
            checked: checked,
            disabled: disabled,
            onCheckedChange: (v) => setState(() => checked = v),
            label: const Text('Send SMS'),
          ),
        ),
      );
      await tester.pumpWidget(box());
      await tester.tap(find.text('Send SMS'));
      await tester.pump();
      expect(checked, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(checked, isFalse);
      await tester.pumpWidget(box(disabled: true));
      await tester.tap(find.text('Send SMS'));
      expect(checked, isFalse);
    });

    testWidgets('radio arrows select the next enabled option', (tester) async {
      var value = 'standard';
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => RadioGroup(
              label: 'Delivery speed',
              value: value,
              onValueChange: (v) => setState(() => value = v),
              options: const [
                RadioOption(value: 'standard', label: Text('Standard')),
                RadioOption(
                  value: 'pickup',
                  label: Text('Pickup'),
                  disabled: true,
                ),
                RadioOption(value: 'express', label: Text('Express')),
              ],
            ),
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(value, 'express');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      expect(value, 'standard', reason: 'wraps around');
    });
  });
}
