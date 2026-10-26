import 'dart:ui' show CheckedState, SemanticsRole, Tristate;

import 'package:feeef_ui/containers/tab_view.dart';
import 'package:feeef_ui/icons/lucide.dart';
import 'package:feeef_ui/scaffold.dart' show GlassGroup;
import 'package:feeef_ui/scroll/scroll_area.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

class Counter extends StatefulWidget {
  const Counter({super.key, required this.name});
  final String name;
  static final built = <String>{};
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int count = 0;
  @override
  void initState() {
    super.initState();
    Counter.built.add(widget.name);
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => setState(() => count++),
    child: Text('${widget.name} $count'),
  );
}

/// A scrollable panel that records the reserved bottom space.
class Feed extends StatelessWidget {
  const Feed({super.key, required this.name, required this.extra});
  final String name;
  final ValueChanged<double> extra;
  @override
  Widget build(BuildContext context) {
    extra(ScrollExtraBottom.of(context));
    return ListView(
      children: [
        for (var i = 0; i < 60; i++)
          SizedBox(height: 60, child: Text('$name row $i')),
      ],
    );
  }
}

Widget app({
  String? initial,
  ValueChanged<String>? onReselect,
  ValueChanged<double>? extra,
  List<String>? changes,
  Widget? accessory,
  double width = 390,
  TextDirection direction = TextDirection.ltr,
}) {
  var value = initial ?? 'home';
  return host(
    SizedBox(
      width: width,
      height: 700,
      child: StatefulBuilder(
        builder: (context, setState) => TabView(
          value: value,
          onChange: (id) {
            changes?.add(id);
            setState(() => value = id);
          },
          onReselect: onReselect,
          accessory: accessory,
          tabs: [
            Tab(
              id: 'home',
              label: 'Home',
              icon: const LucideIcon(LucideIcons.house),
              content: Feed(name: 'Home', extra: extra ?? (_) {}),
            ),
            Tab(
              id: 'orders',
              label: 'Orders',
              icon: const LucideIcon(LucideIcons.package),
              badge: '3',
              content: const Counter(name: 'orders'),
            ),
            const Tab(
              id: 'more',
              label: 'More',
              icon: LucideIcon(LucideIcons.ellipsis),
              content: Counter(name: 'more'),
            ),
          ],
        ),
      ),
    ),
    direction: direction,
  );
}

Finder tab(String label) => find
    .ancestor(of: find.text(label), matching: find.byType(GestureDetector))
    .first;

/// The tab itself: the bar's option for [id] (its label hides while the bar is minimized).
Finder button(String id) => find.byWidgetPredicate(
  (w) =>
      w.runtimeType.toString().startsWith('_Segment<') &&
      (w as dynamic).option.value == id,
);

/// The tab bar's glass bubble.
final bar = find.byWidgetPredicate(
  (w) => w is GlassGroup && w.glassId == 'tabs',
);

/// The accessory's glass bubble.
final accessory = find.byWidgetPredicate(
  (w) => w is GlassGroup && w.glassId == 'accessory',
);

/// [finder]'s box relative to the tab view (the host centres it in the test screen).
Rect rect(WidgetTester tester, Finder finder) =>
    tester.getRect(finder).shift(-tester.getTopLeft(find.byType(TabView)));

/// The visible tab's scroll position.
ScrollPosition feed(WidgetTester tester) =>
    tester.state<ScrollableState>(find.byType(Scrollable).first).position;

/// Scrolls the feed to [to] and lets the bar settle on its nearer end (scrolling stops for
/// longer than 140ms).
Future<void> scrollTo(WidgetTester tester, double to) async {
  feed(tester).jumpTo(to);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 200));
  await tester.pumpAndSettle();
}

/// Presses at [from], moves to [to] in [steps] frames, holds still and lets go (a mouse drag).
Future<void> drag(
  WidgetTester tester,
  Offset from,
  Offset to, {
  int steps = 12,
  void Function()? midway,
}) async {
  final gesture = await tester.startGesture(
    from,
    kind: PointerDeviceKind.mouse,
  );
  await tester.pump(const Duration(milliseconds: 16));
  for (var i = 1; i <= steps; i++) {
    await gesture.moveTo(Offset.lerp(from, to, i / steps)!);
    await tester.pump(const Duration(milliseconds: 16));
  }
  // Hold still before letting go, so the release carries no flick.
  await tester.pump(const Duration(milliseconds: 120));
  midway?.call();
  await gesture.up();
}

void main() {
  setUp(Counter.built.clear);

  testWidgets('tabs mount on first visit and stay alive', (tester) async {
    await tester.pumpWidget(app());
    expect(Counter.built, isEmpty);
    await tester.tap(tab('Orders'));
    await tester.pumpAndSettle();
    expect(Counter.built, {'orders'});
    await tester.tap(find.text('orders 0'));
    await tester.pump();
    expect(find.text('orders 1'), findsOneWidget);
    await tester.tap(tab('Home'));
    await tester.pumpAndSettle();
    // Hidden, not unmounted: its state survives.
    expect(find.text('orders 1'), findsNothing);
    await tester.tap(tab('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('orders 1'), findsOneWidget);
    expect(Counter.built, {'orders'});
  });

  testWidgets('arrow keys, Home and End select and focus tabs', (tester) async {
    await tester.pumpWidget(app());
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pumpAndSettle();
    expect(Counter.built, {'orders'});
    await tester.sendKeyEvent(LogicalKeyboardKey.end);
    await tester.pumpAndSettle();
    expect(Counter.built, {'orders', 'more'});
    expect(find.text('more 0'), findsOneWidget);
    // Wraps around, and the focused tab follows.
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pumpAndSettle();
    expect(find.text('Home row 0'), findsOneWidget);
    expect(find.text('more 0'), findsNothing);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    expect(find.text('more 0'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pumpAndSettle();
    expect(find.text('Home row 0'), findsOneWidget);
  });

  testWidgets('right-to-left mirrors the arrows', (tester) async {
    await tester.pumpWidget(app(direction: TextDirection.rtl));
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    expect(find.text('orders 0'), findsOneWidget);
  });

  testWidgets('tabs announce the tab role, selection and badge', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    final orders = tester.getSemantics(find.text('Orders'));
    expect(orders.role, SemanticsRole.tab);
    expect(orders.getSemanticsData().label, contains('Orders'));
    expect(orders.getSemanticsData().label, contains('3'));
    expect(orders.flagsCollection.isSelected, Tristate.isFalse);
    final home = tester.getSemantics(find.text('Home'));
    expect(home.flagsCollection.isSelected, Tristate.isTrue);
    expect(find.semantics.byLabel('Tabs'), findsOneWidget);
    expect(tester.takeException(), isNull);
    handle.dispose();
  });

  testWidgets('iOS 27 bar: a 62pt capsule of equal tabs overlapping by 8', (
    tester,
  ) async {
    double? reserved;
    await tester.pumpWidget(app(extra: (v) => reserved = v));
    await tester.pumpAndSettle();
    // The bar's measured height + the toolbar inset (G, 8): 54pt tabs in a 4pt inset, + the 1px
    // border.
    expect(reserved, 64 + 8);
    // 3 tabs: min(chrome 374, 3 × 90 + 16) wide, centred.
    expect(tester.getSize(bar), const Size(286, 64));
    expect(rect(tester, bar).center.dx, 195);
    final home = tester.getRect(button('home'));
    final orders = tester.getRect(button('orders'));
    final more = tester.getRect(button('more'));
    expect(home.width, closeTo((286 - 2 - 8 + 16) / 3, 1e-6));
    expect(orders.width, home.width);
    expect(home.height, 54);
    expect(orders.left, closeTo(home.right - 8, 1e-6));
    expect(more.right, closeTo(tester.getRect(bar).right - 5, 1e-6));
  });

  testWidgets('scrolling moves the bar continuously and it settles on an end', (
    tester,
  ) async {
    double? reserved;
    await tester.pumpWidget(app(extra: (v) => reserved = v));
    await tester.pumpAndSettle();
    final full = tester.getRect(bar);
    // A quarter of the 56px minimize distance: a quarter of the way, held there while scrolling.
    feed(tester).jumpTo(14);
    await tester.pump();
    final quarter = tester.getRect(bar);
    expect(quarter.width, lessThan(full.width));
    expect(quarter.width, greaterThan(48));
    // Scrolling stops: it springs back to the nearer end, full.
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(tester.getRect(bar), full);
    // Past halfway it settles minimized: a 48pt circle at the leading edge, on the bar's line.
    await scrollTo(tester, 300);
    final small = tester.getRect(bar);
    expect(small.size, const Size(48, 48));
    expect(rect(tester, bar).left, 8);
    expect(small.center.dy, closeTo(full.center.dy, 1e-6));
    // The selected tab is centred in it; the others and the labels are gone.
    expect(
      (tester.getCenter(find.byType(LucideIcon).first) - small.center).distance,
      lessThan(1),
    );
    expect(tester.getRect(button('home')).width, closeTo(97.33, 0.01));
    // The reserve keeps the full bar's height.
    expect(reserved, 72);
    // Scrolling up 40px restores it.
    await scrollTo(tester, 260);
    expect(tester.getRect(bar), full);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the top always restores the bar', (tester) async {
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    final full = tester.getRect(bar);
    await scrollTo(tester, 300);
    expect(tester.getSize(bar), const Size(48, 48));
    await scrollTo(tester, 0);
    expect(tester.getRect(bar), full);
  });

  testWidgets('a tap on the minimized bar only expands it', (tester) async {
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    final full = tester.getRect(bar);
    await scrollTo(tester, 300);
    await tester.tapAt(tester.getCenter(bar));
    await tester.pumpAndSettle();
    expect(tester.getRect(bar), full);
    expect(Counter.built, isEmpty);
  });

  testWidgets('picking the selected tab scrolls to the top or reselects', (
    tester,
  ) async {
    await tester.pumpWidget(app());
    final scrollable = tester.state<ScrollableState>(
      find.byType(Scrollable).first,
    );
    // A short scroll that stops settles the bar full again.
    scrollable.position.jumpTo(20);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    await tester.tap(tab('Home'));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, 0);

    final reselected = <String>[];
    await tester.pumpWidget(app(onReselect: reselected.add));
    await tester.tap(tab('Home'));
    await tester.pumpAndSettle();
    expect(reselected, ['home']);
  });

  testWidgets('wide tab views lay icon and label in a row', (tester) async {
    await tester.pumpWidget(app(width: 800, accessory: const Text('Player')));
    await tester.pumpAndSettle();
    final icon = tester.getCenter(find.byType(LucideIcon).first);
    final label = tester.getCenter(find.text('Home'));
    expect((icon.dy - label.dy).abs(), lessThan(2));
    expect(label.dx, greaterThan(icon.dx));
    // The accessory sits above the bar, 420px wide.
    final accessory = find
        .ancestor(of: find.text('Player'), matching: find.byType(SizedBox))
        .first;
    expect(tester.getSize(accessory).width, 420);
    expect(
      tester.getBottomLeft(accessory).dy,
      lessThan(tester.getTopLeft(tab('Home')).dy),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'minimized, the current tab leads and the accessory fills the row',
    (tester) async {
      await tester.pumpWidget(app(accessory: const Text('Player')));
      await tester.pumpAndSettle();
      final full = rect(tester, bar);
      expect(
        rect(tester, accessory).bottom,
        lessThan(full.top),
        reason: 'above the bar at rest',
      );
      await scrollTo(tester, 300);
      final small = rect(tester, bar);
      final player = rect(tester, accessory);
      expect(small, Rect.fromLTWH(8, full.center.dy - 24, 48, 48));
      // Chrome = 390 − 2 × 8 (the toolbar inset, G): the accessory takes the row after the circle
      // and the 8px toolbar gap, centred on the bar's line.
      expect(player.left, 8 + 48 + 8);
      expect(player.right, 390 - 8);
      expect(player.center.dy, closeTo(full.center.dy, 1e-6));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('right to left, the minimized bar leads on the right', (
    tester,
  ) async {
    await tester.pumpWidget(
      app(accessory: const Text('Player'), direction: TextDirection.rtl),
    );
    await tester.pumpAndSettle();
    await scrollTo(tester, 300);
    final small = rect(tester, bar);
    expect(small.right, 390 - 8);
    expect(small.width, 48);
    expect(rect(tester, accessory).right, small.left - 8);
    expect(
      (tester.getCenter(find.byType(LucideIcon).first) - tester.getCenter(bar))
          .distance,
      lessThan(1),
    );
  });

  group('the bar is a selection track', () {
    testWidgets('dragging the selected tab selects the tab it is released on', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(app(changes: changes));
      await tester.pumpAndSettle();
      await drag(
        tester,
        tester.getCenter(button('home')),
        tester.getCenter(button('more')),
        midway: () => expect(changes, isEmpty, reason: 'only on release'),
      );
      await tester.pumpAndSettle();
      expect(changes, ['more']);
      expect(find.text('more 0'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('right to left, dragging left selects the tab it lands on', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(
        app(changes: changes, direction: TextDirection.rtl),
      );
      await tester.pumpAndSettle();
      final home = tester.getCenter(button('home'));
      final orders = tester.getCenter(button('orders'));
      expect(home.dx, greaterThan(orders.dx), reason: 'first tab on the right');
      await drag(tester, home, orders);
      await tester.pumpAndSettle();
      expect(changes, ['orders']);
    });

    testWidgets('a drag released where it started changes nothing', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(app(changes: changes));
      await tester.pumpAndSettle();
      final home = tester.getCenter(button('home'));
      await drag(tester, home, home + const Offset(12, 0));
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
    });

    testWidgets('a badge is part of the tab\'s name; the bar is a tab list', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      final orders = tester.getSemantics(button('orders'));
      expect(orders.role, SemanticsRole.tab);
      expect(orders.getSemanticsData().label, 'Orders, 3');
      final home = tester.getSemantics(button('home'));
      expect(home.getSemanticsData().label, 'Home');
      expect(home.flagsCollection.isSelected, Tristate.isTrue);
      // Tabs are selected, never checked (that is a radio group's state).
      expect(orders.flagsCollection.isChecked, CheckedState.none);
      final bar = tester.getSemantics(
        find.byWidgetPredicate(
          (w) => w is Semantics && w.properties.role == SemanticsRole.tabBar,
        ),
      );
      expect(bar.getSemanticsData().label, 'Tabs');
      // The badge is drawn on the icon, the count visible once.
      expect(find.text('3'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('a tab list roves with Left and Right only', (tester) async {
      final changes = <String>[];
      await tester.pumpWidget(app(changes: changes));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      // Up and Down belong to the page, not a horizontal tab list.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      // Tabs activate as the keyboard reaches them, and focus follows.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(changes, ['orders']);
      expect(
        Focus.of(tester.element(find.text('Orders'))).hasPrimaryFocus,
        isTrue,
      );
      // Enter on the selected tab reselects it (scrolls it to the top), not another change.
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(changes, ['orders']);
    });

    testWidgets(
      'minimized, the bar shows the selected tab and cannot be dragged',
      (tester) async {
        final changes = <String>[];
        await tester.pumpWidget(app(changes: changes, initial: 'home'));
        await tester.pumpAndSettle();
        await scrollTo(tester, 300);
        expect(tester.getSize(bar), const Size(48, 48));
        // A drag across the small bar picks up nothing and selects nothing.
        final home = tester.getCenter(bar);
        await drag(tester, home, home + const Offset(120, 0));
        await tester.pumpAndSettle();
        expect(changes, isEmpty);
        // The hidden tabs take no pointer.
        await tester.tapAt(tester.getCenter(button('more')));
        await tester.pumpAndSettle();
        expect(changes, isEmpty);
        // Keys still pick tabs while it is small; the new tab is the one it shows.
        await scrollTo(tester, 300);
        expect(tester.getSize(bar), const Size(48, 48), reason: 'small again');
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.end);
        await tester.pumpAndSettle();
        expect(changes, ['more']);
        expect(tester.takeException(), isNull);
      },
    );
  });
}
