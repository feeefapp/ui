import 'package:feeef_ui/icons/lucide.dart';
import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/primitives/select.dart';
import 'package:feeef_ui/scroll/scroll_area.dart';
import 'package:feeef_ui/toolbar.dart';
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
  testWidgets('a title squeezed below its minimum width hides', (tester) async {
    Widget bar(double width) => WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => ThemeProvider(
        child: Center(
          child: SizedBox(
            width: width,
            child: const ScaffoldAppBar(
              trailing: SizedBox(width: 300, height: 44),
              child: ToolbarGroup(
                label: 'Page title',
                children: [Text('Theming')],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpWidget(bar(600));
    expect(find.text('Theming'), findsOneWidget);
    await tester.pumpWidget(bar(340));
    expect(
      find.text('Theming'),
      findsNothing,
      reason: 'offstage, not a sliver',
    );
    await tester.pumpWidget(bar(600));
    expect(find.text('Theming'), findsOneWidget);
  });

  testWidgets(
    'a back button bubble and Select bubbles in the app bar are 44 tall and top-aligned',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        app(
          Scaffold(
            appBar: ScaffoldAppBar(
              leading: ToolbarGroup(
                label: 'Navigation',
                children: [
                  IconButton(
                    ariaLabel: 'Back',
                    appearance: ButtonAppearance.toolbar,
                    onClick: () {},
                    icon: const LucideArrowLeft(),
                  ),
                ],
              ),
              trailing: ToolbarGroup(
                label: 'Filter',
                children: [
                  // A field-like Select (floating hint) fills the bubble like a button.
                  SizedBox(
                    width: 200,
                    child: Select(
                      hint: 'Wilaya',
                      value: 'alger',
                      onValueChange: (_) {},
                      children: const [
                        Option(value: 'alger', child: Text('Alger')),
                        Option(value: 'oran', child: Text('Oran')),
                      ],
                    ),
                  ),
                ],
              ),
              child: ToolbarGroup(
                label: 'View',
                children: [
                  Select(
                    ariaLabel: 'Sort',
                    controlSize: ControlSize.small,
                    variant: ControlVariant.text,
                    value: 'new',
                    onValueChange: (_) {},
                    children: const [
                      Option(value: 'new', child: Text('Newest')),
                      Option(value: 'old', child: Text('Oldest')),
                    ],
                  ),
                ],
              ),
            ),
            child: const Text('Page content'),
          ),
        ),
      );
      await settle(tester);
      final bubbles = tester
          .widgetList<ToolbarGroup>(find.byType(ToolbarGroup))
          .map((group) => tester.getRect(find.byWidget(group)))
          .toList();
      expect(bubbles, hasLength(3));
      for (final bubble in bubbles) {
        expect(bubble.height, 44, reason: '$bubble');
        expect(bubble.top, bubbles.first.top, reason: '$bubble');
      }
    },
    variant: TargetPlatformVariant({
      TargetPlatform.macOS,
      TargetPlatform.android,
    }),
  );

  testWidgets('the sidebar cycles expanded → rail → hidden → expanded', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final modes = <ScaffoldSideMode>[];
    await tester.pumpWidget(app(workspace(onSideModeChange: modes.add)));
    await settle(tester);
    // The default viewport starts immediately after the sidebar.
    expect(tester.getTopLeft(find.text('Page content')).dx, 304);
    expect(find.text('Nav item').hitTestable(), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Minimize workspace sidebar'));
    await settle(tester);
    expect(tester.getTopLeft(find.text('Page content')).dx, 64);

    await tester.tap(find.bySemanticsLabel('Hide workspace sidebar'));
    await settle(tester);
    // The hidden mode gives the full width to the page.
    expect(tester.getTopLeft(find.text('Page content')).dx, 0);
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
    expect(
      scaffoldSidebarWidth(Density.compact, const Metrics(sidebarWidth: 250)),
      250,
    );
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
    expect(tester.getTopLeft(find.text('Page content')).dx, 248);
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
      expect(tester.getTopLeft(find.text('Page content')).dx, 0);

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

  testWidgets(
    'card layout keeps one shell gap between window, top bar, panel and sidebar items',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        app(
          Scaffold(
            glassSidebar: false,
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
      expect(
        panel.left - 1 - item.right,
        g,
      ); // sidebar items → panel (1px border)
    },
  );

  testWidgets('sidebar toolbar groups stack vertically in the rail', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    Widget control(String label) => IconButton(
      ariaLabel: label,
      icon: const LucideArrowLeft(),
      appearance: ButtonAppearance.toolbar,
      onClick: () {},
    );
    await tester.pumpWidget(
      app(
        Scaffold(
          side: ScaffoldSide(
            trailing: ToolbarGroup(
              label: 'Appearance',
              children: [control('Palette'), control('Theme')],
            ),
            child: const Text('Nav item'),
          ),
          appBar: const ScaffoldAppBar(leading: ScaffoldToggleButton()),
          child: const Text('Page content'),
        ),
      ),
    );
    await settle(tester);
    final palette = find.bySemanticsLabel('Palette');
    final theme = find.bySemanticsLabel('Theme');
    expect(
      tester.getCenter(palette).dy,
      tester.getCenter(theme).dy,
      reason: 'a row',
    );
    expect(
      tester.getCenter(theme).dx,
      greaterThan(tester.getCenter(palette).dx),
    );

    await tester.tap(find.bySemanticsLabel('Minimize workspace sidebar'));
    await settle(tester);
    expect(
      tester.getCenter(palette).dx,
      tester.getCenter(theme).dx,
      reason: 'a column',
    );
    expect(
      tester.getCenter(theme).dy,
      greaterThan(tester.getCenter(palette).dy),
    );
    expect(
      tester.getSize(find.byType(ToolbarGroup)).width,
      lessThanOrEqualTo(64),
    );
  });
}
