import 'package:feeef_ui/containers/navigation_stack.dart';
import 'package:feeef_ui/toolbar.dart';
import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/theme.dart';
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

/// A stack of `Orders` plus the routes in [path], popping on back.
Widget stack(
  NavigationPath<String> path, {
  void Function()? onBack,
  SwipeBack swipeBack = SwipeBack.content,
  FocusNode? opener,
  String? zoomSource,
  Widget? rootBody,
}) => ListenableBuilder(
  listenable: path,
  builder: (context, _) => NavigationStack(
    swipeBack: swipeBack,
    onBack: () {
      onBack?.call();
      path.pop();
    },
    children: [
      NavigationPage(
        key: const ValueKey('root'),
        title: 'Orders',
        child:
            rootBody ??
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('root body'),
                Button(
                  focusNode: opener,
                  onClick: () => path.push('Order 1'),
                  children: const [Text('Open')],
                ),
                const ZoomSource(
                  id: 'card',
                  child: SizedBox(width: 200, height: 120),
                ),
              ],
            ),
      ),
      for (final route in path.path)
        NavigationPage(
          key: ValueKey(route),
          title: route,
          zoomSource: zoomSource,
          child: Text('$route body'),
        ),
    ],
  ),
);

double left(WidgetTester tester, String text) =>
    tester.getTopLeft(find.text(text, skipOffstage: false)).dx;

void main() {
  testWidgets('push slides the page in over a parallax; pop slides it out', (
    tester,
  ) async {
    final path = NavigationPath<String>();
    await tester.pumpWidget(app(stack(path)));
    expect(left(tester, 'root body'), 24);

    path.push('Order 1');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 80));
    final mid = left(tester, 'Order 1 body');
    expect(mid, greaterThan(24));
    expect(mid, lessThan(800));
    expect(left(tester, 'root body'), lessThan(24), reason: 'parallax');

    await tester.pumpAndSettle();
    expect(left(tester, 'Order 1 body'), 24);
    expect(find.text('root body'), findsNothing, reason: 'below is hidden');
    expect(find.text('root body', skipOffstage: false), findsOneWidget);

    path.pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 80));
    expect(left(tester, 'Order 1 body'), greaterThan(24), reason: 'leaving');
    await tester.pumpAndSettle();
    expect(find.text('Order 1 body', skipOffstage: false), findsNothing);
    expect(left(tester, 'root body'), 24);
  });

  testWidgets('the back button is named for the previous page and goes back', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final path = NavigationPath<String>(['Order 1']);
    var backs = 0;
    await tester.pumpWidget(app(stack(path, onBack: () => backs++)));
    await tester.pumpAndSettle();
    final back = find.bySemanticsLabel('Back to Orders');
    expect(back, findsOneWidget);
    expect(
      tester.getSemantics(back),
      matchesSemantics(
        label: 'Back to Orders',
        isButton: true,
        hasTapAction: true,
        hasEnabledState: true,
        isEnabled: true,
        isFocusable: true,
        hasFocusAction: true,
      ),
    );
    await tester.tap(back);
    await tester.pumpAndSettle();
    expect(backs, 1);
    expect(path.path, isEmpty);
    expect(find.bySemanticsLabel('Back to Orders'), findsNothing);
    semantics.dispose();
  });

  testWidgets('focus moves to the new page and returns on pop', (tester) async {
    final path = NavigationPath<String>();
    final opener = FocusNode();
    await tester.pumpWidget(app(stack(path, opener: opener)));
    opener.requestFocus();
    await tester.pump();
    expect(opener.hasFocus, isTrue);

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    final focused = FocusManager.instance.primaryFocus;
    expect(opener.hasFocus, isFalse);
    expect(
      focused?.context?.findAncestorWidgetOfExactType<NavigationPage>()?.title,
      'Order 1',
    );

    path.pop();
    await tester.pumpAndSettle();
    expect(opener.hasFocus, isTrue);
  });

  testWidgets('a fast swipe toward the trailing edge goes back', (
    tester,
  ) async {
    final path = NavigationPath<String>(['Order 1']);
    var backs = 0;
    await tester.pumpWidget(app(stack(path, onBack: () => backs++)));
    await tester.pumpAndSettle();

    // A slow, short drag springs back.
    await tester.timedDrag(
      find.text('Order 1 body'),
      const Offset(120, 0),
      const Duration(seconds: 1),
    );
    await tester.pumpAndSettle();
    expect(backs, 0);
    expect(left(tester, 'Order 1 body'), 24);

    // Toward the leading edge does nothing.
    await tester.fling(find.text('Order 1 body'), const Offset(-300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 0);

    await tester.fling(find.text('Order 1 body'), const Offset(300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 1);
    expect(path.path, isEmpty);
    expect(find.text('Order 1 body', skipOffstage: false), findsNothing);
    expect(left(tester, 'root body'), 24);
  });

  testWidgets('the page follows the finger with the page below in parallax', (
    tester,
  ) async {
    final path = NavigationPath<String>(['Order 1']);
    await tester.pumpWidget(app(stack(path)));
    await tester.pumpAndSettle();
    final gesture = await tester.startGesture(
      tester.getCenter(find.text('Order 1 body')),
    );
    await gesture.moveBy(const Offset(30, 0));
    await gesture.moveBy(const Offset(200, 0));
    await tester.pump();
    expect(left(tester, 'Order 1 body'), closeTo(24 + 200, 1));
    // The page below shows, shifted back by 30% of the uncovered remainder.
    expect(find.text('root body'), findsOneWidget);
    expect(left(tester, 'root body'), closeTo(24 - 0.3 * (600 / 800) * 800, 1));
    await gesture.up();
    await tester.pumpAndSettle();
  });

  testWidgets('edge mode only starts at the leading edge', (tester) async {
    final path = NavigationPath<String>(['Order 1']);
    var backs = 0;
    await tester.pumpWidget(
      app(stack(path, onBack: () => backs++, swipeBack: SwipeBack.edge)),
    );
    await tester.pumpAndSettle();
    await tester.flingFrom(const Offset(400, 300), const Offset(300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 0);
    await tester.flingFrom(const Offset(10, 300), const Offset(300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 1);
  });

  testWidgets('RTL swipes back toward the left', (tester) async {
    var backs = 0;
    final rtl = NavigationPath<String>(['Order 1']);
    await tester.pumpWidget(
      app(stack(rtl, onBack: () => backs++), direction: TextDirection.rtl),
    );
    await tester.pumpAndSettle();
    await tester.fling(find.text('Order 1 body'), const Offset(300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 0, reason: 'rightward is toward the leading edge in RTL');
    await tester.fling(find.text('Order 1 body'), const Offset(-300, 0), 2000);
    await tester.pumpAndSettle();
    expect(backs, 1);
    expect(rtl.path, isEmpty);
  });

  testWidgets('a zoom page grows from its source and drags down to dismiss', (
    tester,
  ) async {
    final path = NavigationPath<String>();
    var backs = 0;
    await tester.pumpWidget(
      app(stack(path, onBack: () => backs++, zoomSource: 'card')),
    );
    path.push('Photo');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 60));
    final transform = tester.widget<Transform>(
      find
          .ancestor(
            of: find.text('Photo body', skipOffstage: false),
            matching: find.byType(Transform),
          )
          .last,
    );
    expect(transform.transform.storage[0], lessThan(1), reason: 'x scale');
    await tester.pumpAndSettle();
    expect(left(tester, 'Photo body'), 24);

    await tester.fling(find.text('Photo body'), const Offset(0, 300), 2000);
    await tester.pumpAndSettle();
    expect(backs, 1);
    expect(path.path, isEmpty);
  });

  testWidgets('a large title collapses into the bar once it scrolls away', (
    tester,
  ) async {
    final path = NavigationPath<String>();
    await tester.pumpWidget(
      app(
        stack(
          path,
          rootBody: Column(
            children: [for (var i = 0; i < 40; i++) Text('Row $i')],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    // The bar title stays in the tree while hidden (as in the web DOM) but takes no input.
    final barTitle = find
        .descendant(
          of: find.byType(ToolbarGroup),
          matching: find.text('Orders'),
        )
        .hitTestable();
    expect(barTitle, findsNothing, reason: 'large title only');
    await tester.drag(find.text('Row 3'), const Offset(0, -300));
    await tester.pumpAndSettle();
    expect(barTitle, findsOneWidget, reason: 'bar title shows');
    await tester.drag(find.text('Row 12'), const Offset(0, 400));
    await tester.pumpAndSettle();
    expect(barTitle, findsNothing, reason: 'and leaves again');
  });

  test('NavigationPath pushes, pops, replaces and notifies', () {
    final path = NavigationPath<int>([1]);
    var notified = 0;
    path.addListener(() => notified++);
    path
      ..push(2)
      ..push(3)
      ..replace(4);
    expect(path.path, [1, 2, 4]);
    path.pop(2);
    expect(path.path, [1]);
    path.popToRoot();
    expect(path.path, isEmpty);
    path.pop();
    expect(path.path, isEmpty);
    expect(notified, 6);
  });

  testWidgets('outside a stack a page is a root that cannot go back', (
    tester,
  ) async {
    late NavigationStackPage page;
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          page = NavigationStack.of(context);
          return const SizedBox();
        },
      ),
    );
    expect(page.depth, 0);
    expect(page.isTop, isTrue);
    expect(page.canGoBack, isFalse);
  });
}
