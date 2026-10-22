import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget field(Widget child) => host(SizedBox(width: 320, child: child));

void main() {
  group('TextField', () {
    testWidgets('typing reports the text; the frame follows the CSS sizes', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
      final values = <String>[];
      await tester.pumpWidget(
        field(TextField(label: 'Customer name', onValueChange: values.add)),
      );
      expect(tester.getSize(find.byType(TextField)).height, 44);
      await tester.tap(find.byType(TextField));
      await tester.enterText(find.byType(EditableText), 'Amina');
      expect(values.last, 'Amina');
      await tester.pumpWidget(
        field(const TextField(label: 'Small', controlSize: .compact)),
      );
      expect(tester.getSize(find.byType(TextField)).height, 40);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('the hint floats on focus and stays up with a value', (
      tester,
    ) async {
      await tester.pumpWidget(field(const TextField(label: 'Phone')));
      final resting = tester.getTopLeft(find.text('Phone')).dy;
      await tester.tap(find.byType(TextField));
      await tester.pumpAndSettle();
      final floated = tester.getTopLeft(find.text('Phone')).dy;
      expect(floated, lessThan(resting));
      await tester.enterText(find.byType(EditableText), '0555');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(find.text('Phone')).dy, floated);
    });

    testWidgets('the validator speaks after the first blur, then live', (
      tester,
    ) async {
      final reported = <String?>[];
      await tester.pumpWidget(
        field(
          TextField(
            label: 'Email',
            validator: (v) => v.contains('@') ? null : 'Enter an email.',
            onValidationChange: reported.add,
          ),
        ),
      );
      await tester.tap(find.byType(TextField));
      await tester.enterText(find.byType(EditableText), 'amina');
      await tester.pump();
      expect(find.text('Enter an email.'), findsNothing);
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      expect(find.text('Enter an email.'), findsOneWidget);
      await tester.enterText(find.byType(EditableText), 'amina@x');
      await tester.pump();
      expect(find.text('Enter an email.'), findsNothing);
      expect(reported, ['Enter an email.', null]);
    });

    testWidgets('the counter counts against maxLength, which caps input', (
      tester,
    ) async {
      await tester.pumpWidget(
        field(const TextField(label: 'Note', showCounter: true, maxLength: 5)),
      );
      expect(find.text('0 / 5'), findsOneWidget);
      await tester.enterText(find.byType(EditableText), 'Call before');
      await tester.pump();
      expect(find.text('5 / 5'), findsOneWidget);
    });

    testWidgets('semantics: a named text field', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(field(const TextField(label: 'City')));
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('City'))
            .flagsCollection
            .isTextField,
        isTrue,
      );
      handle.dispose();
    });
  });
}
