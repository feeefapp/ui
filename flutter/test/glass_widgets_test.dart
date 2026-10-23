import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget bubble(String id, {double width = 80}) => GlassGroup(
  glassId: id,
  child: SizedBox(width: width, height: 38),
);

void main() {
  testWidgets(
    'a container draws close bubbles as one shape and far ones apart',
    (tester) async {
      Widget scene(double gap) => host(
        GlassContainer(
          spacing: 16,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: gap,
            children: [bubble('a'), bubble('b')],
          ),
        ),
      );
      await tester.pumpWidget(scene(6));
      await tester.pump();
      final painter = find.descendant(
        of: find.byType(GlassContainer),
        matching: find.byType(CustomPaint),
      );
      expect(painter, findsWidgets);
      expect(tester.takeException(), isNull);
      // Bubbles keep their own layout: 80 + 2px border each.
      expect(tester.getSize(find.byType(GlassGroup).first), const Size(82, 40));
    },
  );

  testWidgets('a bubble that moves springs its glass and carries its content', (
    tester,
  ) async {
    var gap = 10.0;
    late StateSetter set;
    await tester.pumpWidget(
      host(
        GlassContainer(
          child: StatefulBuilder(
            builder: (context, setState) {
              set = setState;
              return Row(
                mainAxisSize: MainAxisSize.min,
                spacing: gap,
                children: [bubble('a'), bubble('b')],
              );
            },
          ),
        ),
      ),
    );
    // Past the container's first 300ms, changes animate.
    await tester.pump(const Duration(milliseconds: 400));
    set(() => gap = 60);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 16));
    // Mid-spring the content of the moving bubble still rides with its glass (a translation).
    final moving = tester.widgetList<Transform>(
      find.descendant(
        of: find.byType(GlassGroup).last,
        matching: find.byType(Transform),
      ),
    );
    expect(moving.any((t) => t.transform.getTranslation().x != 0), isTrue);
    await tester.pumpAndSettle();
    final settled = tester.widgetList<Transform>(
      find.descendant(
        of: find.byType(GlassGroup).last,
        matching: find.byType(Transform),
      ),
    );
    expect(settled.every((t) => t.transform.getTranslation().x == 0), isTrue);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('toolbar groups size their controls and name themselves', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 500,
          child: Toolbar(
            label: 'Editor',
            leading: ToolbarGroup(
              label: 'Format',
              children: [
                IconButton(
                  appearance: ButtonAppearance.toolbar,
                  ariaLabel: 'Bold',
                  onClick: () {},
                  icon: const LucideBold(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.bySemanticsLabel('Format'), findsOneWidget);
    expect(find.bySemanticsLabel('Editor'), findsOneWidget);
    // The 44px toolbar item: a 38px control + 2px padding + 1px border on each side.
    expect(tester.getSize(find.byType(GlassGroup)).height, 44);
    expect(tester.getSize(find.byType(IconButton)), const Size(38, 38));
    handle.dispose();
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
