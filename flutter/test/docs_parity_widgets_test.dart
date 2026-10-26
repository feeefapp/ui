import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide Action;
import 'package:flutter_test/flutter_test.dart';

Widget _app(
  Widget child, {
  TextDirection dir = TextDirection.ltr,
}) => ThemeProvider(
  brightness: Brightness.light,
  child: Directionality(
    textDirection: dir,
    child: MediaQuery(
      data: const MediaQueryData(size: Size(800, 600), disableAnimations: true),
      child: Overlay(
        initialEntries: [OverlayEntry(builder: (_) => Center(child: child))],
      ),
    ),
  ),
);

void main() {
  testWidgets('Popover opens below its trigger and closes on Escape', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        Popover(
          label: 'Note',
          sideOffset: 8,
          width: 200,
          trigger: (context, toggle, open) => GestureDetector(
            onTap: toggle,
            child: const SizedBox(width: 100, height: 40, child: Text('open')),
          ),
          content: (context, close) =>
              GestureDetector(onTap: close, child: const Text('panel')),
        ),
      ),
    );
    expect(find.text('panel'), findsNothing);
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('panel'), findsOneWidget);
    final trigger = tester.getRect(find.text('open'));
    final panel = tester.getRect(find.byType(PopoverSurface));
    expect(panel.top, trigger.bottom + 8);
    expect(panel.width, 200);
    expect(panel.center.dx, closeTo(trigger.center.dx, 0.01));
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(find.text('panel'), findsNothing);
  });

  testWidgets('ActionsMenuAnchor runs a command and opens submenus', (
    tester,
  ) async {
    var ran = '';
    await tester.pumpWidget(
      _app(
        ActionsMenuAnchor(
          label: 'Order actions',
          actions: [
            CommandAction(id: 'a', label: 'Copy', onAction: () => ran = 'a'),
            GroupAction(
              id: 'g',
              label: 'Send with',
              actions: [
                CommandAction(
                  id: 'y',
                  label: 'Yalidine',
                  onAction: () => ran = 'y',
                ),
              ],
            ),
          ],
          builder: (open) => GestureDetector(
            onTap: open,
            child: const SizedBox(width: 40, height: 40, child: Text('…')),
          ),
        ),
      ),
    );
    await tester.tap(find.text('…'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send with'));
    await tester.pumpAndSettle();
    final row = tester.getRect(find.text('Send with'));
    final sub = tester.getRect(find.text('Yalidine'));
    expect(sub.left, greaterThan(row.right));
    await tester.tap(find.text('Yalidine'));
    await tester.pumpAndSettle();
    expect(ran, 'y');
  });

  testWidgets('revealScrollChild keeps a row clear of the bottom float', (
    tester,
  ) async {
    final keys = [for (var i = 0; i < 20; i++) GlobalKey()];
    final controller = ScrollController();
    await tester.pumpWidget(
      _app(
        SizedBox(
          width: 400,
          height: 300,
          child: ScrollArea(
            label: 'List',
            controller: controller,
            bottom: const SizedBox(width: 100, height: 50),
            child: Column(
              children: [
                for (final key in keys) SizedBox(key: key, height: 40),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    revealScrollChild(controller, keys[8].currentContext);
    await tester.pump();
    final area = tester.getRect(find.byType(ScrollArea));
    final row = tester.getRect(find.byKey(keys[8]));
    // Bottom reservation: float 50 + 2 × the shell gap G (8).
    expect(row.bottom, closeTo(area.bottom - 66, 0.01));
    final before = controller.offset;
    revealScrollChild(controller, keys[8].currentContext);
    expect(controller.offset, before);
  });

  testWidgets('FloatingLayer reserves its notice height', (tester) async {
    late BuildContext page;
    await tester.pumpWidget(
      _app(
        ScaffoldProvider(
          child: Builder(
            builder: (context) {
              page = context;
              return Stack(
                children: [
                  Text(
                    '${ScaffoldProvider.reserveOf(context, FloatingSlot.notice)}',
                  ),
                  const FloatingLayer(
                    slot: FloatingSlot.notice,
                    child: SizedBox(width: 100, height: 40),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    // 40 tall, the shell gap (8) above the bottom, plus the same gap.
    expect(ScaffoldProvider.reserveOf(page, FloatingSlot.notice), 56);
  });

  testWidgets('Small glass over a dark backdrop takes the dark theme', (
    tester,
  ) async {
    late ThemeData inside;
    await tester.pumpWidget(
      _app(
        GlassBackdrop(
          tone: GlassTone.dark,
          child: GlassContainer(
            child: GlassGroup(
              child: Builder(
                builder: (context) {
                  inside = ThemeProvider.of(context);
                  return const SizedBox(width: 80, height: 40);
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(inside.brightness, Brightness.dark);
  });
}
