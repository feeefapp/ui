import 'package:feeef_ui/filters/temporal.dart';
import 'package:feeef_ui/filters/temporal_editor.dart';
import 'package:feeef_ui/primitives/temporal_field.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget overlay(Widget child) => host(
  Overlay(
    initialEntries: [
      OverlayEntry(
        builder: (context) => Center(child: SizedBox(width: 320, child: child)),
      ),
    ],
  ),
);

/// Popover surfaces breathe forever, like the web kit's, so pump fixed steps.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Finder day(String date) => find.byKey(ValueKey(date));

/// A tall test window so the popover fits below the field, and a clean teardown: the glass
/// springs and the popover grain keep scheduling frames until their widgets are gone.
void fieldTest(String description, Future<void> Function(WidgetTester) body) =>
    testWidgets(description, (tester) async {
      tester.view.physicalSize = const Size(900, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await body(tester);
      await tester.pumpWidget(const SizedBox());
      for (var i = 0; i < 60; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
    });

void main() {
  fieldTest('a date opens a popover and commits the day you pick', (
    tester,
  ) async {
    String? value = '2026-10-05';
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => DateField(
            hint: 'Delivery day',
            value: value,
            onValueChange: (v) => setState(() => value = v),
          ),
        ),
      ),
    );
    expect(find.text('Oct 5, 2026'), findsOneWidget);
    await tester.tap(find.byType(DateField));
    await settle(tester);
    expect(find.text('October 2026'), findsOneWidget);
    await tester.tap(day('2026-10-19'));
    await settle(tester);
    expect(value, '2026-10-19');
    expect(find.text('October 2026'), findsNothing);
    expect(find.text('Oct 19, 2026'), findsOneWidget);
  });

  fieldTest('Escape and an outside tap close the popover without a change', (
    tester,
  ) async {
    var changes = 0;
    await tester.pumpWidget(
      overlay(
        DateField(
          hint: 'Delivery day',
          value: '2026-10-05',
          onValueChange: (_) => changes++,
        ),
      ),
    );
    await tester.tap(find.byType(DateField));
    await settle(tester);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await settle(tester);
    expect(find.text('October 2026'), findsNothing);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await settle(tester);
    expect(find.text('October 2026'), findsOneWidget);
    await tester.tapAt(const Offset(5, 5));
    await settle(tester);
    expect(find.text('October 2026'), findsNothing);
    expect(changes, 0);
  });

  fieldTest('a time picks a preset as a draft and commits on Apply', (
    tester,
  ) async {
    String? value;
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => TimeField(
            hint: 'Opens at',
            value: value,
            onValueChange: (v) => setState(() => value = v),
          ),
        ),
      ),
    );
    await tester.tap(find.byType(TimeField));
    await settle(tester);
    await tester.tap(find.text('17:00'));
    await settle(tester);
    expect(value, isNull);
    await tester.tap(find.text('Apply'));
    await settle(tester);
    expect(value, '17:00');
    expect(find.text('Apply'), findsNothing);
  });

  fieldTest('typed entry is validated on Apply and keeps the old value', (
    tester,
  ) async {
    String? value = '2026-10-05T09:00';
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => DateTimeField(
            hint: 'Pickup',
            value: value,
            onValueChange: (v) => setState(() => value = v),
          ),
        ),
      ),
    );
    await tester.tap(find.byType(DateTimeField));
    await settle(tester);
    await tester.tap(find.text('Type a date'));
    await settle(tester);
    await tester.enterText(find.byType(EditableText), '2026-02-30T10:00');
    await settle(tester);
    await tester.tap(find.text('Apply'));
    await settle(tester);
    expect(find.text('Enter a valid date or time.'), findsOneWidget);
    expect(value, '2026-10-05T09:00');
    await tester.enterText(find.byType(EditableText), '2026-02-28T10:00');
    await settle(tester);
    expect(find.text('Enter a valid date or time.'), findsNothing);
    // Enter in the typed field applies.
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await settle(tester);
    expect(value, '2026-02-28T10:00');
  });

  fieldTest('a range opens a dialog: two clicks, then Apply', (tester) async {
    TemporalRange? value = const TemporalRange(from: '2026-10-01', to: '');
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => DateRangeField(
            hint: 'Period',
            value: value,
            onValueChange: (v) => setState(() => value = v),
          ),
        ),
      ),
    );
    expect(find.text('Oct 1, 2026 – Any'), findsOneWidget);
    await tester.tap(find.byType(DateRangeField));
    await settle(tester);
    // An open start resumes at the end.
    expect(find.text('End · Any'), findsOneWidget);
    await tester.tap(find.text('Start · Oct 1'));
    await settle(tester);
    await tester.tap(day('2026-10-05'));
    await settle(tester);
    await tester.tap(day('2026-10-15'));
    await settle(tester);
    expect(find.text('End · Oct 15'), findsOneWidget);
    await tester.tap(find.text('Apply'));
    await settle(tester);
    expect(value, const TemporalRange(from: '2026-10-05', to: '2026-10-15'));
    expect(find.text('Oct 5, 2026 – Oct 15, 2026'), findsOneWidget);
  });

  fieldTest('Cancel and Escape close the dialog without committing', (
    tester,
  ) async {
    var changes = 0;
    await tester.pumpWidget(
      overlay(
        DateRangeField(
          hint: 'Period',
          value: null,
          onValueChange: (_) => changes++,
        ),
      ),
    );
    await tester.tap(find.byType(DateRangeField));
    await settle(tester);
    expect(find.text('Cancel'), findsOneWidget);
    await tester.tap(find.text('Today'));
    await settle(tester);
    await tester.tap(find.text('Cancel'));
    await settle(tester);
    expect(find.text('Cancel'), findsNothing);
    await tester.tap(find.byType(DateRangeField));
    await settle(tester);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await settle(tester);
    expect(find.text('Cancel'), findsNothing);
    expect(changes, 0);
  });

  fieldTest('required fields report an error on blur; clear empties', (
    tester,
  ) async {
    final node = FocusNode();
    String? error;
    String? value = '2026-10-05';
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => DateField(
            hint: 'Delivery day',
            required: true,
            clearable: true,
            focusNode: node,
            value: value,
            onValueChange: (v) => setState(() => value = v),
            onValidationChange: (e) => error = e,
          ),
        ),
      ),
    );
    await tester.tap(find.bySemanticsLabel('Clear Delivery day'));
    await settle(tester);
    expect(value, isNull);
    expect(error, 'Choose a value.');
    expect(find.text('Choose a value.'), findsOneWidget);
    node.dispose();
  });

  fieldTest('bounds reject out-of-range values with the web kit message', (
    tester,
  ) async {
    String? error;
    final node = FocusNode();
    await tester.pumpWidget(
      overlay(
        DateField(
          hint: 'Delivery day',
          value: '2026-10-01',
          min: '2026-10-05',
          focusNode: node,
          onValueChange: (_) {},
          onValidationChange: (e) => error = e,
        ),
      ),
    );
    node.requestFocus();
    await tester.pump();
    node.unfocus();
    await tester.pump();
    expect(error, 'Use a value on or after 2026-10-05.');
    node.dispose();
  });

  fieldTest(
    'trigger semantics: a button named by the hint, valued by the text',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        overlay(
          DateField(
            hint: 'Delivery day',
            value: '2026-10-05',
            onValueChange: (_) {},
          ),
        ),
      );
      expect(
        tester.getSemantics(find.bySemanticsLabel(RegExp('^Delivery day'))),
        isSemantics(
          isButton: true,
          value: 'Oct 5, 2026',
          hasExpandedState: true,
          isExpanded: false,
        ),
      );
      semantics.dispose();
    },
  );

  fieldTest('readOnly shows the value and never opens', (tester) async {
    await tester.pumpWidget(
      overlay(
        DateField(
          hint: 'Delivery day',
          value: '2026-10-05',
          readOnly: true,
          onValueChange: (_) {},
        ),
      ),
    );
    await tester.tap(find.byType(DateField));
    await settle(tester);
    expect(find.text('October 2026'), findsNothing);
  });

  fieldTest('the filter editor shows presets, edges, two months when wide', (
    tester,
  ) async {
    TemporalValue? value = const TemporalRange(
      from: '2026-10-05',
      to: '2026-10-15',
    );
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 700,
          child: StatefulBuilder(
            builder: (context, setState) => TemporalFilterEditor(
              config: const TemporalConfig(type: TemporalType.dateRange),
              value: value,
              onChange: (v) => setState(() => value = v),
            ),
          ),
        ),
      ),
    );
    expect(find.text('All time'), findsOneWidget);
    expect(find.text('Start · Oct 5'), findsOneWidget);
    expect(find.text('October 2026'), findsOneWidget);
    expect(find.text('November 2026'), findsOneWidget);
    await tester.tap(find.text('All time'));
    await tester.pump();
    expect(value, isNull);
  });
}
