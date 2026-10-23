import 'dart:ui' show SemanticsRole, Tristate;

import 'package:feeef_ui/containers/tab_view.dart';
import 'package:feeef_ui/icons/lucide.dart';
import 'package:feeef_ui/scroll/scroll_area.dart';
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
          onChange: (id) => setState(() => value = id),
          onReselect: onReselect,
          accessory: accessory,
          tabs: [
            Tab(
              id: 'home',
              label: const Text('Home'),
              icon: const LucideIcon(LucideIcons.house),
              content: Feed(name: 'Home', extra: extra ?? (_) {}),
            ),
            Tab(
              id: 'orders',
              label: const Text('Orders'),
              icon: const LucideIcon(LucideIcons.package),
              badge: const Text('3'),
              content: const Counter(name: 'orders'),
            ),
            const Tab(
              id: 'more',
              label: Text('More'),
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

/// The tab button itself (panels share the tab's key).
Finder button(String id) => find.byWidgetPredicate(
  (w) => w.key == ValueKey(id) && w.runtimeType.toString() == '_TabButton',
);

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

  testWidgets('the bar minimizes on scroll down and returns on scroll up', (
    tester,
  ) async {
    double? reserved;
    await tester.pumpWidget(app(extra: (v) => reserved = v));
    await tester.pumpAndSettle();
    // The bar's measured height + the toolbar inset (G, 8): 4 + 1 padding/border around a 52px
    // tab, twice.
    expect(reserved, 62 + 8);
    final width = tester.getSize(button('orders')).width;
    await tester.drag(find.text('Home row 2'), const Offset(0, -300));
    await tester.pumpAndSettle();
    // Only the selected tab remains, as a 52px round button; the label hides.
    expect(tester.getSize(button('orders')).width, 0);
    expect(tester.getSize(button('home')).width, 52);
    expect(find.text('Home'), findsNothing);
    // The reserve keeps the full bar's height.
    expect(reserved, 70);
    await tester.drag(find.text('Home row 6'), const Offset(0, 60));
    await tester.pumpAndSettle();
    expect(tester.getSize(button('orders')).width, width);
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('a tap on the minimized bar only expands it', (tester) async {
    await tester.pumpWidget(app());
    await tester.drag(find.text('Home row 2'), const Offset(0, -300));
    await tester.pumpAndSettle();
    await tester.tap(button('home'));
    await tester.pumpAndSettle();
    expect(find.text('Home'), findsOneWidget);
    expect(Counter.built, isEmpty);
  });

  testWidgets('picking the selected tab scrolls to the top or reselects', (
    tester,
  ) async {
    await tester.pumpWidget(app());
    final scrollable = tester.state<ScrollableState>(
      find.byType(Scrollable).first,
    );
    // Below 24px the bar stays full.
    scrollable.position.jumpTo(20);
    await tester.pump();
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
      await tester.drag(find.text('Home row 2'), const Offset(0, -300));
      await tester.pumpAndSettle();
      final home = tester.getRect(button('home'));
      final player = tester.getRect(
        find
            .ancestor(of: find.text('Player'), matching: find.byType(SizedBox))
            .first,
      );
      expect(player.left, greaterThan(home.right));
      // Chrome = 390 − 2 × 8 (the toolbar inset, G); the bar is 52 + two 2px gaps (hidden tabs
      // keep their flex gap, as in CSS) + 2 × 5, then the 8px toolbar gap.
      expect(player.width, 374 - 66 - 8);
      expect(player.height, 62);
      expect(tester.takeException(), isNull);
    },
  );
}
