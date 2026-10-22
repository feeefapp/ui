import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  testWidgets('Escape and a backdrop tap close; focus returns to the opener', (
    tester,
  ) async {
    var open = false;
    var closes = 0;
    final opener = FocusNode();
    late StateSetter set;
    await tester.pumpWidget(
      host(
        Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => StatefulBuilder(
                builder: (context, setState) {
                  set = setState;
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Button(
                          focusNode: opener,
                          onClick: () => setState(() => open = true),
                          children: const [Text('Delete')],
                        ),
                        Modal(
                          open: open,
                          label: 'Delete order',
                          close: () => setState(() {
                            closes++;
                            open = false;
                          }),
                          child: const SizedBox(
                            height: 120,
                            child: Text('Delete order #1042?'),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
    opener.requestFocus();
    await tester.pump();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(find.text('Delete order #1042?'), findsOneWidget);
    expect(opener.hasFocus, isFalse, reason: 'focus moves into the dialog');

    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(closes, 1);
    expect(find.text('Delete order #1042?'), findsNothing);
    expect(opener.hasFocus, isTrue, reason: 'focus returns to the opener');

    set(() => open = true);
    await tester.pumpAndSettle();
    await tester.tapAt(const Offset(5, 5));
    await tester.pumpAndSettle();
    expect(closes, 2);
    // A tap inside the dialog doesn't close it.
    set(() => open = true);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete order #1042?'));
    await tester.pumpAndSettle();
    expect(closes, 2);
    opener.dispose();
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
