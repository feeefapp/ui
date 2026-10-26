import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  group('uncontrolled choices', () {
    testWidgets('a checkbox with defaultChecked keeps its own state', (
      tester,
    ) async {
      final reports = <bool>[];
      await tester.pumpWidget(
        host(
          Checkbox(
            defaultChecked: true,
            label: const Text('SMS'),
            onCheckedChange: reports.add,
          ),
        ),
      );
      await tester.tap(find.text('SMS'));
      await tester.pump();
      await tester.tap(find.text('SMS'));
      await tester.pump();
      expect(reports, [false, true]);
    });

    testWidgets('a radio group with defaultValue selects on tap', (
      tester,
    ) async {
      final reports = <String>[];
      await tester.pumpWidget(
        host(
          RadioGroup(
            label: 'Delivery',
            defaultValue: 'home',
            onValueChange: reports.add,
            options: const [
              RadioOption(value: 'home', label: Text('Home')),
              RadioOption(value: 'desk', label: Text('Desk')),
            ],
          ),
        ),
      );
      await tester.tap(find.text('Desk'));
      await tester.pump();
      expect(reports, ['desk']);
      await tester.tap(find.text('Home'));
      await tester.pump();
      expect(reports, ['desk', 'home']);
    });

    testWidgets('a single radio only reports being selected', (tester) async {
      final reports = <bool>[];
      await tester.pumpWidget(
        host(
          Radio(
            checked: true,
            label: const Text('Yalidine'),
            onCheckedChange: reports.add,
          ),
        ),
      );
      await tester.tap(find.text('Yalidine'));
      expect(reports, isEmpty);
      await tester.pumpWidget(
        host(
          Radio(
            checked: false,
            label: const Text('Yalidine'),
            onCheckedChange: reports.add,
          ),
        ),
      );
      await tester.tap(find.text('Yalidine'));
      expect(reports, [true]);
    });
  });

  group('FieldForm', () {
    testWidgets('blocks an invalid submit, then submits named values', (
      tester,
    ) async {
      Map<String, String>? sent;
      var resets = 0;
      late BuildContext inner;
      await tester.pumpWidget(
        host(
          FieldForm(
            onSubmit: (data) => sent = data,
            onReset: () => resets++,
            child: SizedBox(
              width: 320,
              child: Column(
                children: [
                  const TextField(
                    hint: 'Name',
                    name: 'name',
                    required: true,
                    minLength: 3,
                  ),
                  const NumberField(
                    label: 'Quantity',
                    name: 'quantity',
                    min: 1,
                    defaultValue: 2,
                  ),
                  Builder(
                    builder: (context) {
                      inner = context;
                      return const SizedBox();
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      expect(FieldForm.of(inner).submit(), isFalse);
      await tester.pump();
      expect(find.text('Fill in this field.'), findsOneWidget);
      await tester.enterText(find.byType(EditableText).first, 'Am');
      await tester.pump();
      expect(FieldForm.of(inner).submit(), isFalse);
      await tester.pump();
      expect(find.textContaining('at least 3'), findsOneWidget);
      await tester.enterText(find.byType(EditableText).first, 'Amina');
      await tester.pump();
      expect(FieldForm.of(inner).submit(), isTrue);
      expect(sent, {'name': 'Amina', 'quantity': '2'});
      FieldForm.of(inner).reset();
      await tester.pump();
      expect(resets, 1);
      expect(find.text('Amina'), findsNothing);
      expect(find.text('Fill in this field.'), findsNothing);
    });

    testWidgets('a required select reports its message on submit', (
      tester,
    ) async {
      late BuildContext inner;
      await tester.pumpWidget(
        host(
          FieldForm(
            child: SizedBox(
              width: 320,
              child: Builder(
                builder: (context) {
                  inner = context;
                  return Select(
                    hint: 'Method',
                    required: true,
                    requiredMessage: 'Choose a method.',
                    value: null,
                    onValueChange: (_) {},
                    children: const [Option(child: Text('Home'))],
                  );
                },
              ),
            ),
          ),
        ),
      );
      expect(FieldForm.of(inner).submit(), isFalse);
      await tester.pump();
      expect(find.text('Choose a method.'), findsOneWidget);
    });
  });

  test('an Option without a value uses its text', () {
    expect(const Option(child: Text('Oran')).resolvedValue, 'Oran');
    expect(const Option(value: '', child: Text('Any')).resolvedValue, '');
  });
}
