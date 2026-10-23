import 'package:feeef_ui/scroll/scroll_area.dart';
import 'package:feeef_ui/theme.dart';
import 'package:feeef_ui/workspace/scaffold.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {TextDirection direction = TextDirection.ltr}) =>
    WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => Directionality(
        textDirection: direction,
        child: FocusScope(
          autofocus: true,
          child: ThemeProvider(
            brightness: Brightness.light,
            child: Overlay(
              initialEntries: [OverlayEntry(builder: (_) => child)],
            ),
          ),
        ),
      ),
    );

Widget workspace({
  bool? compact,
  ValueChanged<ScaffoldSideMode>? onSideModeChange,
}) => Scaffold(
  compact: compact,
  onSideModeChange: onSideModeChange,
  side: const ScaffoldSide(
    leading: Text('Brand'),
    trailing: Text('Account'),
    child: Text('Nav item'),
  ),
  appBar: const ScaffoldAppBar(
    leading: ScaffoldToggleButton(),
    child: Text('Title'),
  ),
  child: const Text('Page content'),
);

/// The scaffold's ground pixel field animates forever (like the web kit's), so pump fixed time.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 20; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  testWidgets('the sidebar cycles expanded → rail → hidden → expanded', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final modes = <ScaffoldSideMode>[];
    await tester.pumpWidget(app(workspace(onSideModeChange: modes.add)));
    await settle(tester);
    // 304px sidebar (its own 8px shell gap on the panel side), no panel start margin, 1px
    // border, 24px content padding.
    expect(tester.getTopLeft(find.text('Page content')).dx, 304 + 1 + 24);
    expect(find.text('Nav item').hitTestable(), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Minimize workspace sidebar'));
    await settle(tester);
    expect(tester.getTopLeft(find.text('Page content')).dx, 64 + 1 + 24);

    await tester.tap(find.bySemanticsLabel('Hide workspace sidebar'));
    await settle(tester);
    // Nothing frames the content any more: no card margin (1px border + 24px padding).
    expect(tester.getTopLeft(find.text('Page content')).dx, 1 + 24);
    expect(find.text('Nav item').hitTestable(), findsNothing, reason: 'inert');

    await tester.tap(find.bySemanticsLabel('Expand workspace sidebar'));
    await settle(tester);
    expect(modes, [
      ScaffoldSideMode.rail,
      ScaffoldSideMode.hidden,
      ScaffoldSideMode.expanded,
    ]);
    semantics.dispose();
  });

  testWidgets('the sidebar width follows the density', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    expect(scaffoldSidebarWidth(Density.compact), 248);
    expect(scaffoldRailWidth(Density.thin), 44);
    expect(scaffoldSidebarWidth(Density.compact, const Metrics(sidebarWidth: 250)), 250);
    expect(scaffoldRailWidth(Density.thin, const Metrics(railWidth: 66)), 66);
    await tester.pumpWidget(
      WidgetsApp(
        color: const Color(0xFF000000),
        builder: (context, _) => ThemeProvider(
          config: const ThemeConfig(density: Density.compact),
          brightness: Brightness.light,
          child: Overlay(
            initialEntries: [OverlayEntry(builder: (_) => workspace())],
          ),
        ),
      ),
    );
    await settle(tester);
    expect(tester.getTopLeft(find.text('Page content')).dx, 248 + 1 + 24);
  });

  testWidgets(
    'compact: the sidebar becomes a drawer that traps and returns focus',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(600, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(app(workspace()));
      await settle(tester);
      expect(find.text('Nav item'), findsNothing);
      // Compact: the sidebar is a drawer, so the content fills the window edge to edge.
      expect(tester.getTopLeft(find.text('Page content')).dx, 1 + 16);

      await tester.tap(find.bySemanticsLabel('Open workspace navigation'));
      await settle(tester);
      expect(find.text('Nav item'), findsOneWidget);
      // Attached to the start edge, min(320, width - 56) wide.
      expect(tester.getTopLeft(find.text('Brand')).dx, lessThan(320));

      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await settle(tester);
      expect(find.text('Nav item'), findsNothing);

      await tester.tap(find.bySemanticsLabel('Open workspace navigation'));
      await settle(tester);
      await tester.tapAt(const Offset(580, 400));
      await settle(tester);
      expect(find.text('Nav item'), findsNothing, reason: 'backdrop closes');
      semantics.dispose();
    },
  );

  testWidgets('RTL opens the drawer from the right', (tester) async {
    await tester.binding.setSurfaceSize(const Size(600, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      app(workspace(compact: true), direction: TextDirection.rtl),
    );
    Scaffold.of(tester.element(find.text('Page content'))).setDrawerOpen(true);
    await settle(tester);
    expect(tester.getTopRight(find.text('Brand')).dx, greaterThan(600 - 320));
  });

  testWidgets('Scaffold.of throws outside a scaffold', (tester) async {
    late BuildContext outside;
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          outside = context;
          return const SizedBox();
        },
      ),
    );
    expect(() => Scaffold.of(outside), throwsFlutterError);
    expect(Scaffold.maybeOf(outside), isNull);
  });

  testWidgets('one shell gap between window, top bar, panel and sidebar items', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      app(
        Scaffold(
          topSide: const ScaffoldTopBar(
            leading: SizedBox(key: ValueKey('top'), width: 40, height: 40),
          ),
          side: const ScaffoldSide(
            child: SizedBox(key: ValueKey('item'), height: 40),
          ),
          child: const SizedBox(key: ValueKey('page'), height: 10),
        ),
      ),
    );
    await settle(tester);
    const g = 8.0;
    final top = tester.getRect(find.byKey(const ValueKey('top')));
    final item = tester.getRect(find.byKey(const ValueKey('item')));
    final panel = tester.getRect(find.byType(ScrollArea).last);
    expect(top.top, g); // window → top bar
    expect(item.left, g); // window → sidebar items
    expect(item.top - top.bottom, g); // top bar → sidebar items
    expect(panel.left - 1 - item.right, g); // sidebar items → panel (1px border)
  });
}
