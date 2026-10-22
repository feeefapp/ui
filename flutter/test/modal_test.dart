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

  Widget overlay(Widget Function(StateSetter setState) child) => host(
    Overlay(
      initialEntries: [
        OverlayEntry(
          builder: (context) => StatefulBuilder(
            builder: (context, setState) => Center(child: child(setState)),
          ),
        ),
      ],
    ),
  );

  testWidgets('fitContent sizes a scrollable dialog to its body and chrome', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      overlay(
        (_) => Modal(
          label: 'Rename store',
          close: () {},
          scrollable: true,
          fitContent: true,
          width: 400,
          scrollOptions: const ScrollOptions(edgeGap: 12, contentPadding: 14),
          child: const SizedBox(height: 100, child: Text('Body')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    // The scroll area fills the dialog inside its 1px border.
    final area = tester.getSize(find.byType(ScrollArea));
    // Default header (measured) + 12px gaps above and below it, the body, 14px bottom padding;
    // far below the fixed min(720, 85%) height.
    expect(area.height, lessThan(300));
    expect(area.height, greaterThan(100 + 14 + 24));
    expect(area.width, 400 - 2);
  });

  testWidgets('returnFocus wins over the opener after closing', (tester) async {
    var open = false;
    final opener = FocusNode();
    final target = FocusNode();
    late StateSetter set;
    await tester.pumpWidget(
      overlay((setState) {
        set = setState;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Button(
              focusNode: opener,
              onClick: () => setState(() => open = true),
              children: const [Text('Open')],
            ),
            Button(
              focusNode: target,
              onClick: () {},
              children: const [Text('Row')],
            ),
            Modal(
              open: open,
              label: 'Edit',
              close: () => setState(() => open = false),
              returnFocus: target,
              child: const Text('Body'),
            ),
          ],
        );
      }),
    );
    opener.requestFocus();
    await tester.pump();
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    set(() => open = false);
    await tester.pumpAndSettle();
    expect(target.hasFocus, isTrue);
    expect(opener.hasFocus, isFalse);
    opener.dispose();
    target.dispose();
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
