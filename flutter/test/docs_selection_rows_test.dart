import 'dart:io';

import 'package:feeef_ui/primitives/choice.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../docs/content/components/list/examples/04-select.dart';
import '../../docs/content/guidelines/patterns/examples/01-orders-list.dart';
import 'scaffold_test.dart' show app, settle;

void main() {
  setUpAll(() async {
    final loader = FontLoader('IBM Plex Sans Arabic')
      ..addFont(
        File('fonts/IBMPlexSansArabic-Regular.ttf')
            .readAsBytes()
            .then((bytes) => ByteData.sublistView(bytes)),
      );
    await loader.load();
  });
  for (final (demo, label, amount) in <(Widget, String, String)>[
    (const OrdersList(), '#1048 · Amina Benali', '9 600 DA'),
    (const SelectRows(), 'Amina Benali', '12,450.00 DA · due today'),
  ]) {
    testWidgets('${demo.runtimeType} selects across the painted row', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          DefaultTextStyle.merge(
            style: const TextStyle(
              fontFamily: 'IBM Plex Sans Arabic',
              fontSize: 14,
            ),
            child: Center(child: SizedBox(width: 390, child: demo)),
          ),
        ),
      );
      await settle(tester);
      final choice = find.ancestor(
        of: find.text(label),
        matching: find.byType(Checkbox),
      );
      final bounds = tester.getRect(choice);
      final trailing = tester.getCenter(find.text(amount));
      expect(bounds.contains(trailing), isTrue);
      var checked = tester.widget<Checkbox>(choice).checked!;
      for (final spot in [
        bounds.centerLeft + const Offset(2, 0),
        bounds.center,
        trailing,
        bounds.bottomRight - const Offset(2, 2),
      ]) {
        await tester.tapAt(spot);
        await tester.pump();
        checked = !checked;
        expect(tester.widget<Checkbox>(choice).checked, checked);
      }
    });
  }
}
