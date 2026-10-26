import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide Action, RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

NumberFieldBounds bounds(Map<String, dynamic> j) => NumberFieldBounds(
  min: (j['min'] as num?)?.toDouble(),
  max: (j['max'] as num?)?.toDouble(),
  step: (j['step'] as num).toDouble(),
);

void main() {
  widgetTests();
  final f = jsonDecode(
    File('test/fixtures/numbers.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double? n(Object? v) => (v as num?)?.toDouble();

  test('typed expressions parse like the web kit', () {
    for (final p in f['parse'] as List) {
      expect(
        parseNumberExpression(p[0] as String),
        n(p[1]),
        reason: p[0] as String,
      );
    }
  });

  test('decimals, clamping, scrubbing, keys and fill match', () {
    for (final d in f['decimals'] as List) {
      expect(stepDecimals(n(d[0])!), d[1]);
    }
    for (final c in f['clamp'] as List) {
      expect(clampNumber(n(c[0]) ?? double.nan, bounds(c[1])), n(c[2]));
    }
    for (final d in f['drag'] as List) {
      final o = d[0] as Map<String, dynamic>;
      expect(
        dragValue(
          bounds(o),
          startValue: n(o['startValue'])!,
          dx: n(o['dx'])!,
          width: n(o['width'])!,
          fine: o['fine'] == true,
          rtl: o['rtl'] == true,
        ),
        closeTo(n(d[1])!, 1e-9),
      );
    }
    const nb = NumberFieldBounds(min: 0, max: 100, step: 5);
    for (final k in f['keys'] as List) {
      expect(keyValue(k[0], n(k[1])!, nb), n(k[2]));
      expect(keyValue(k[0], n(k[1])!, nb, rtl: true), n(k[3]));
    }
    for (final x in f['fill'] as List) {
      expect(fillFraction(n(x[0])!, bounds(x[1])), n(x[2]));
    }
  });
}

Widget numberHost(Widget child) => host(SizedBox(width: 300, child: child));

void widgetTests() {
  testWidgets('dragging scrubs across the range; release commits', (
    tester,
  ) async {
    final commits = <double>[];
    double value = 50;
    await tester.pumpWidget(
      numberHost(
        StatefulBuilder(
          builder: (context, setState) => NumberField(
            label: 'Volume',
            value: value,
            min: 0,
            max: 100,
            onValueChange: (v) => setState(() => value = v),
            onValueCommit: commits.add,
          ),
        ),
      ),
    );
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(NumberField)),
    );
    await gesture.moveBy(const Offset(10, 0)); // crosses the threshold
    await gesture.moveBy(const Offset(60, 0)); // 60 of 300px = 20
    await gesture.up();
    await tester.pump();
    expect(value, 70);
    expect(commits, [70]);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a click types; an expression commits on Enter', (tester) async {
    double? committed;
    await tester.pumpWidget(
      numberHost(
        NumberField(
          label: 'Price',
          defaultValue: 100,
          onValueCommit: (v) => committed = v,
        ),
      ),
    );
    await tester.tap(find.byType(NumberField));
    await tester.pump();
    await tester.pump();
    await tester.enterText(find.byType(EditableText), '2000*15%');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(committed, 300);
    expect(find.text('300'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('keys step and Backspace resets to the default', (tester) async {
    final values = <double>[];
    await tester.pumpWidget(
      numberHost(
        NumberField(
          label: 'Qty',
          defaultValue: 3,
          step: 1,
          onValueCommit: values.add,
        ),
      ),
    );
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.sendKeyEvent(LogicalKeyboardKey.pageUp);
    await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
    await tester.pump();
    expect(values, [4, 14, 3]);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a controller holds the value; the validator blocks the form', (
    tester,
  ) async {
    final price = ValueNotifier<double>(0);
    late BuildContext inner;
    Map<String, String>? sent;
    await tester.pumpWidget(
      numberHost(
        FieldForm(
          onSubmit: (data) => sent = data,
          child: Builder(
            builder: (context) {
              inner = context;
              return NumberField(
                label: 'Price',
                name: 'price',
                unit: 'DA',
                controller: price,
                supportingText: const Text('Before delivery.'),
                validator: (v) => v <= 0 ? 'Enter a price above 0 DA.' : null,
              );
            },
          ),
        ),
      ),
    );
    expect(find.text('Before delivery.'), findsOneWidget);
    expect(FieldForm.of(inner).submit(), isFalse);
    await tester.pump();
    expect(find.text('Enter a price above 0 DA.'), findsOneWidget);
    expect(find.text('Before delivery.'), findsNothing);
    // Setting the controller updates the field; a touched field revalidates on change.
    price.value = 1250;
    await tester.pump();
    expect(find.textContaining('1,250'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.pump();
    expect(price.value, 1251, reason: 'changes write to the controller');
    expect(find.text('Enter a price above 0 DA.'), findsNothing);
    expect(FieldForm.of(inner).submit(), isTrue);
    expect(sent, {'price': '1251'});
    FieldForm.of(inner).reset();
    expect(price.value, 0);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('an error from the server shows under the field', (tester) async {
    await tester.pumpWidget(
      numberHost(
        const NumberField(label: 'Stock', error: 'Stock changed; reload it.'),
      ),
    );
    expect(find.text('Stock changed; reload it.'), findsOneWidget);
  });
}
