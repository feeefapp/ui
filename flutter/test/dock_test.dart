import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action, RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget dock(String key, {DockAlign align = DockAlign.center}) => host(
  SizedBox(
    width: 600,
    child: Dock(
      label: 'Orders',
      swapKey: key,
      align: align,
      content: Text(key == 'idle' ? '12 orders' : '2 selected'),
      children: [
        Button(
          onClick: () {},
          children: [Text(key == 'idle' ? 'New' : 'Ship')],
        ),
      ],
    ),
  ),
);

void main() {
  for (final platform in [TargetPlatform.iOS, TargetPlatform.macOS]) {
    testWidgets(
      'responsive actions preserve dock insets and touch reach: $platform',
      (tester) async {
        var calls = 0;
        await tester.pumpWidget(
          host(
            SizedBox(
              width: 600,
              child: Dock(
                label: 'Order bulk actions',
                children: [
                  ActionsBar(
                    label: 'Actions',
                    actions: [
                      CommandAction(
                        id: 'ship',
                        label: 'Ship',
                        onAction: () => calls++,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
        for (var i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        final glass = tester.getRect(find.byType(GlassGroup).first);
        final button = find.byType(Button).hitTestable().first;
        final bounds = tester.getRect(button);
        expect(bounds.top - glass.top, closeTo(5, 0.01));
        expect(glass.bottom - bounds.bottom, closeTo(5, 0.01));
        if (platform == TargetPlatform.iOS) {
          await tester.tapAt(Offset(bounds.center.dx, bounds.top - 2));
        } else {
          await tester.tap(button);
        }
        await tester.pump();
        expect(calls, 1);
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 1));
      },
      variant: TargetPlatformVariant.only(platform),
    );
  }

  testWidgets('a new swap key fades the old content out, then the new one in', (
    tester,
  ) async {
    await tester.pumpWidget(dock('idle'));
    await tester.pumpAndSettle();
    expect(find.text('12 orders'), findsOneWidget);
    await tester.pumpWidget(dock('selected'));
    await tester.pump(const Duration(milliseconds: 50));
    // Still the old content, fading out and inert.
    expect(find.text('12 orders'), findsOneWidget);
    expect(find.text('2 selected'), findsNothing);
    await tester.pumpAndSettle();
    expect(find.text('2 selected'), findsOneWidget);
    expect(find.text('Ship'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('the dock hugs its content and centres it; it names its group', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(dock('idle'));
    await tester.pumpAndSettle();
    final glass = tester.getRect(find.byType(GlassGroup));
    expect(glass.width, lessThan(600));
    final host = tester.getRect(find.byType(Dock));
    expect(glass.center.dx, closeTo(host.center.dx, 0.5));
    expect(find.bySemanticsLabel('Orders'), findsOneWidget);
    await tester.pumpWidget(dock('idle', align: DockAlign.start));
    await tester.pumpAndSettle();
    expect(
      tester.getRect(find.byType(GlassGroup)).left,
      tester.getRect(find.byType(Dock)).left,
    );
    handle.dispose();
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
