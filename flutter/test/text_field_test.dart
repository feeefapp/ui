import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/rendering.dart' show RenderParagraph;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget field(Widget child) => host(SizedBox(width: 320, child: child));

void main() {
  group('TextField', () {
    testWidgets('the counter reads current / limit from left to right in RTL', (
      tester,
    ) async {
      await tester.pumpWidget(
        field(
          const Directionality(
            textDirection: TextDirection.rtl,
            child: TextField(value: 'Hello', maxLength: 255, showCounter: true),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final text = find.text('5 / 255');
      final paragraph = tester.renderObject<RenderParagraph>(
        find.descendant(of: text, matching: find.byType(RichText)),
      );
      final current = paragraph
          .getBoxesForSelection(
            const TextSelection(baseOffset: 0, extentOffset: 1),
          )
          .first;
      final limit = paragraph
          .getBoxesForSelection(
            const TextSelection(baseOffset: 4, extentOffset: 7),
          )
          .first;
      expect(current.left, lessThan(limit.left));
    });

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
        field(const TextField(label: 'Small', controlSize: .small)),
      );
      expect(tester.getSize(find.byType(TextField)).height, 36);
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

    for (final direction in TextDirection.values) {
      for (final labelStyle in FieldLabelStyle.values) {
        testWidgets('scaled $labelStyle labels fit in $direction', (
          tester,
        ) async {
          const label = 'Customer email address';
          for (final scale in [1.0, 1.6, 2.0]) {
            for (final value in ['', 'amina@example.com']) {
              await tester.pumpWidget(
                field(
                  MediaQuery(
                    data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                    child: Directionality(
                      textDirection: direction,
                      child: TextField(
                        label: label,
                        labelStyle: labelStyle,
                        value: value,
                      ),
                    ),
                  ),
                ),
              );
              await tester.pumpAndSettle();
              final labelRect = tester.getRect(find.text(label));
              final fieldRect = tester.getRect(find.byType(TextField));
              final line = value.isEmpty
                  ? 20
                  : labelStyle == FieldLabelStyle.outlined
                  ? 14
                  : 12;
              expect(labelRect.height, closeTo(line * scale, 0.01));
              expect(labelRect.left, greaterThanOrEqualTo(fieldRect.left));
              expect(labelRect.right, lessThanOrEqualTo(fieldRect.right));
              if (value.isNotEmpty) {
                final valueRect = tester.getRect(find.byType(EditableText));
                expect(labelRect.bottom, lessThanOrEqualTo(valueRect.top));
              }
              expect(tester.takeException(), isNull);
              await tester.pumpWidget(const SizedBox.shrink());
            }
          }
        });
      }
    }

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

    testWidgets('formatters and capitalization reach the editable', (
      tester,
    ) async {
      final values = <String>[];
      await tester.pumpWidget(
        field(
          TextField(
            label: 'Amount',
            maxLength: 4,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textCapitalization: TextCapitalization.characters,
            onValueChange: values.add,
          ),
        ),
      );
      final editable = tester.widget<EditableText>(find.byType(EditableText));
      expect(editable.textCapitalization, TextCapitalization.characters);
      await tester.enterText(find.byType(EditableText), '12a3456');
      await tester.pump();
      // Digits only, then maxLength.
      expect(values.last, '1234');
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
