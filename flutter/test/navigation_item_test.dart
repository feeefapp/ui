import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  Widget side(Widget child, {double width = 260}) =>
      SizedBox(width: width, child: child);

  Size slotSize(WidgetTester tester, int index) =>
      tester.getSize(find.byType(SquareSlot).at(index));

  testWidgets('an item is exactly a regular button tall, at every density', (
    tester,
  ) async {
    for (final (density, height) in [
      (Density.comfortable, 36.0),
      (Density.compact, 30.0),
      (Density.thin, 26.0),
    ]) {
      await tester.pumpWidget(
        host(
          side(
            const NavigationItem(
              compact: false,
              label: 'Orders',
              icon: LucideIcon(LucideIcons.shoppingBag),
            ),
          ),
          config: ThemeConfig(density: density),
        ),
      );
      expect(tester.getSize(find.byType(Button)), Size(260, height));
      expect(slotSize(tester, 0), Size(height, height));
    }
  });

  testWidgets('leading and trailing slots are squares flush with the ends', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        side(
          const NavigationItem(
            compact: false,
            label: 'Orders',
            icon: LucideIcon(LucideIcons.shoppingBag),
            trailing: Text('12'),
          ),
        ),
      ),
    );
    final item = tester.getRect(find.byType(Button));
    final leading = tester.getRect(find.byType(SquareSlot).first);
    final trailing = tester.getRect(find.byType(SquareSlot).last);
    expect(leading.size, const Size(36, 36));
    expect(trailing.size, const Size(36, 36));
    expect(leading.left, item.left);
    expect(trailing.right, item.right);
    // Icons are centred in their square at an icon button's size.
    final icon = tester.getRect(find.byType(LucideIcon));
    expect(icon.center, leading.center);
    expect(icon.size, const Size(20, 20));
    expect(
      tester.getCenter(find.text('12')).dx,
      closeTo(trailing.center.dx, 0.5),
    );
  });

  testWidgets('right to left mirrors the slots', (tester) async {
    await tester.pumpWidget(
      host(
        side(
          const NavigationItem(
            compact: false,
            label: 'الطلبات',
            icon: LucideIcon(LucideIcons.shoppingBag),
            trailing: Text('12'),
          ),
        ),
        direction: TextDirection.rtl,
      ),
    );
    final item = tester.getRect(find.byType(Button));
    expect(tester.getRect(find.byType(SquareSlot).first).right, item.right);
    expect(tester.getRect(find.byType(SquareSlot).last).left, item.left);
  });

  testWidgets('the rail item is just the icon square, centred', (tester) async {
    await tester.pumpWidget(
      host(
        side(
          const NavigationItem(
            compact: true,
            label: 'Orders',
            icon: LucideIcon(LucideIcons.shoppingBag),
            trailing: Text('12'),
          ),
          width: 64,
        ),
      ),
    );
    final item = tester.getRect(find.byType(Button));
    expect(item.size, const Size(36, 36));
    // The same box (the label's CSS baseline nudge moves the content by a fraction of a pixel).
    final slot = tester.getRect(find.byType(SquareSlot));
    expect(slot.size, item.size);
    expect((slot.center - item.center).distance, lessThan(0.5));
    expect(find.text('12'), findsNothing);
    expect(find.text('Orders'), findsNothing);
    expect(item.center.dx, tester.getCenter(find.byType(SizedBox).first).dx);
  });

  testWidgets('touch reaches 44px without growing the item', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      host(
        side(
          NavigationItem(
            compact: true,
            label: 'Orders',
            icon: const LucideIcon(LucideIcons.shoppingBag),
            onSelect: () => taps++,
          ),
          width: 64,
        ),
      ),
    );
    final item = tester.getRect(find.byType(Button));
    expect(item.size, const Size(36, 36));
    // 3px outside the 36px square, inside the 44px reach (tests run as a touch platform).
    await tester.tapAt(item.centerRight + const Offset(3, 0));
    expect(taps, 1);
  });

  testWidgets('the current page is announced selected, not toggled', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      host(
        side(
          NavigationItem(
            compact: false,
            label: 'Orders',
            icon: const LucideIcon(LucideIcons.shoppingBag),
            active: true,
            onSelect: () {},
          ),
        ),
      ),
    );
    expect(
      tester.getSemantics(find.byType(Button)),
      isSemantics(
        isButton: true,
        hasSelectedState: true,
        isSelected: true,
        hasToggledState: false,
      ),
    );
    handle.dispose();
  });
}
