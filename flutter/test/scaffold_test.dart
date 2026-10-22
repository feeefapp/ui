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

void main() {
  testWidgets('the sidebar cycles expanded → rail → hidden → expanded', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final modes = <ScaffoldSideMode>[];
    await tester.pumpWidget(app(workspace(onSideModeChange: modes.add)));
    await tester.pumpAndSettle();
    // 304px sidebar, 8px margin, 1px border, 24px content padding.
    expect(tester.getTopLeft(find.text('Page content')).dx, 304 + 8 + 1 + 24);
    expect(find.text('Nav item').hitTestable(), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Minimize workspace sidebar'));
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('Page content')).dx, 64 + 8 + 1 + 24);

    await tester.tap(find.bySemanticsLabel('Hide workspace sidebar'));
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('Page content')).dx, 8 + 1 + 24);
    expect(find.text('Nav item').hitTestable(), findsNothing, reason: 'inert');

    await tester.tap(find.bySemanticsLabel('Expand workspace sidebar'));
    await tester.pumpAndSettle();
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
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('Page content')).dx, 248 + 8 + 1 + 24);
  });

  testWidgets(
    'compact: the sidebar becomes a drawer that traps and returns focus',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(600, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(app(workspace()));
      await tester.pumpAndSettle();
      expect(find.text('Nav item'), findsNothing);
      expect(tester.getTopLeft(find.text('Page content')).dx, 8 + 1 + 16);

      await tester.tap(find.bySemanticsLabel('Open workspace navigation'));
      await tester.pumpAndSettle();
      expect(find.text('Nav item'), findsOneWidget);
      // Attached to the start edge, min(320, width - 56) wide.
      expect(tester.getTopLeft(find.text('Brand')).dx, lessThan(320));

      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.text('Nav item'), findsNothing);

      await tester.tap(find.bySemanticsLabel('Open workspace navigation'));
      await tester.pumpAndSettle();
      await tester.tapAt(const Offset(580, 400));
      await tester.pumpAndSettle();
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
    await tester.pumpAndSettle();
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
}
