import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget overlay(Widget child) => host(
  Overlay(
    initialEntries: [
      OverlayEntry(
        builder: (context) => Center(child: SizedBox(width: 300, child: child)),
      ),
    ],
  ),
);

/// The open menu's grain breathes forever, like the web kit's, so pump fixed steps.
/// Long enough for a menu to open, or to close and its glass to land back (`MenuMorph.closeEnd`).
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 14; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  testWidgets('tap opens the menu; choosing an option reports it and closes', (
    tester,
  ) async {
    String? value;
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => Select(
            label: 'Wilaya',
            value: value,
            onValueChange: (v) => setState(() => value = v),
            children: const [
              Option(value: 'alger', child: Text('Alger')),
              Option(value: 'oran', child: Text('Oran')),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Oran'), findsNothing);
    await tester.tap(find.byType(Select));
    await settle(tester);
    await tester.tap(find.text('Oran'));
    await settle(tester);
    expect(value, 'oran');
    // The trigger shows the choice; the menu is gone.
    expect(find.text('Alger'), findsNothing);
    expect(find.text('Oran'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('keyboard: arrows move, Enter chooses, Escape closes', (
    tester,
  ) async {
    String? value = 'alger';
    await tester.pumpWidget(
      overlay(
        StatefulBuilder(
          builder: (context, setState) => Select(
            ariaLabel: 'Wilaya',
            value: value,
            onValueChange: (v) => setState(() => value = v),
            children: const [
              Option(value: 'alger', child: Text('Alger')),
              Option(value: 'blida', child: Text('Blida'), disabled: true),
              Option(value: 'oran', child: Text('Oran')),
            ],
          ),
        ),
      ),
    );
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await settle(tester);
    expect(find.text('Oran'), findsOneWidget, reason: 'menu open');
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await settle(tester);
    expect(value, 'oran', reason: 'skips the disabled option');
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await settle(tester);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await settle(tester);
    expect(find.text('Alger'), findsNothing, reason: 'menu closed');
    expect(value, 'oran');
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets(
    'a required select reports its error once the menu closes empty',
    (tester) async {
      await tester.pumpWidget(
        overlay(
          Select(
            label: 'Status',
            value: null,
            required: true,
            onValueChange: (_) {},
            children: const [Option(value: 'open', child: Text('Open'))],
          ),
        ),
      );
      expect(find.text('Choose an option.'), findsNothing);
      await tester.tap(find.byType(Select));
      await settle(tester);
      await tester.tapAt(const Offset(5, 5));
      await settle(tester);
      expect(find.text('Choose an option.'), findsOneWidget);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.macOS),
  );
}
