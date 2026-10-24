import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// A screen with an overlay; [child] gets a setState to drive `open`.
Widget _overlay(
  Widget Function(StateSetter setState) child, {
  TextDirection direction = TextDirection.ltr,
  ThemeConfig config = ThemeConfig.defaults,
}) => host(
  config: config,
  direction: direction,
  // A new overlay every pump: initialEntries are read once.
  Overlay(
    key: UniqueKey(),
    initialEntries: [
      OverlayEntry(
        builder: (context) => StatefulBuilder(
          builder: (context, setState) => Center(child: child(setState)),
        ),
      ),
    ],
  ),
);

/// A WidgetsApp with a navigator, for the show* helpers (no MaterialApp).
Widget _app(Widget Function(BuildContext context) home) => WidgetsApp(
  color: const Color(0xFF000000),
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) =>
      PageRouteBuilder<T>(
        settings: settings,
        pageBuilder: (context, _, _) => builder(context),
      ),
  home: Builder(builder: home),
  builder: (context, child) => ThemeProvider(
    config: ThemeConfig.defaults,
    brightness: Brightness.light,
    child: child!,
  ),
);

void _size(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

const _cancelDelete = [
  AlertAction(label: 'Keep order', role: AlertActionRole.cancel),
  AlertAction(label: 'Delete order', role: AlertActionRole.destructive),
];

void main() {
  group('alert model matches the TypeScript (tests/presentation.test.ts)', () {
    test('two fit side by side only within half the row', () {
      expect(alertActionsFit([120, 140], 288, 8), isTrue);
      expect(alertActionsFit([120, 141], 288, 8), isFalse);
      expect(alertActionsFit([140.4, 100], 288, 8), isTrue);
      expect(alertActionsFit([80], 288, 8), isFalse);
      expect(alertActionsFit([60, 60, 60], 288, 8), isFalse);
    });
    test('cancel leads a row and ends a stack', () {
      const c = AlertActionRole.cancel,
          p = AlertActionRole.primary,
          d = AlertActionRole.destructive;
      expect(alertActionOrder([d, c], true), [1, 0]);
      expect(alertActionOrder([d, c], false), [0, 1]);
      expect(alertActionOrder([c, p], false), [1, 0]);
      expect(alertActionOrder([p, d, c], false), [0, 1, 2]);
      expect(alertActionOrder([c, null, p], false), [1, 2, 0]);
      expect(alertActionOrder([null, p], true), [0, 1]);
    });
    test('pop motion opens from 1.1', () {
      expect(popScale(0), PopMotion.fromScale);
      expect(popScale(1), 1);
    });
  });

  group('Alert', () {
    testWidgets(
      'two short actions sit side by side, cancel first; RTL mirrors',
      (tester) async {
        _size(tester, const Size(800, 700));
        for (final direction in TextDirection.values) {
          await tester.pumpWidget(
            _overlay(
              direction: direction,
              (_) => const Alert(
                title: 'Delete order #1042?',
                message: Text("You can't undo this."),
                actions: [
                  AlertAction(
                    label: 'Delete',
                    role: AlertActionRole.destructive,
                  ),
                  AlertAction(label: 'Cancel', role: AlertActionRole.cancel),
                ],
              ),
            ),
          );
          await tester.pumpAndSettle();
          final cancel = tester.getRect(find.text('Cancel'));
          final delete = tester.getRect(find.text('Delete'));
          expect(cancel.center.dy, closeTo(delete.center.dy, 0.5));
          if (direction == TextDirection.ltr) {
            expect(cancel.center.dx, lessThan(delete.center.dx));
          } else {
            expect(cancel.center.dx, greaterThan(delete.center.dx));
          }
          final render = tester.renderObject<RenderAlertActions>(
            find.byType(AlertActionsLayout),
          );
          expect(render.sideBySide, isTrue);
          // 320 wide, 16 from the edges, 48px capsules.
          expect(render.size.width, 320 - 32);
          expect(render.size.height, 48);
        }
      },
    );

    testWidgets('long labels and three actions stack, cancel at the bottom', (
      tester,
    ) async {
      _size(tester, const Size(800, 700));
      await tester.pumpWidget(
        _overlay(
          (_) => const Alert(
            title: 'Cancel order?',
            actions: [
              AlertAction(label: 'Keep order', role: AlertActionRole.cancel),
              AlertAction(
                label: 'Restock items',
                role: AlertActionRole.destructive,
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      var render = tester.renderObject<RenderAlertActions>(
        find.byType(AlertActionsLayout),
      );
      expect(render.sideBySide, isFalse);
      expect(
        tester.getCenter(find.text('Keep order')).dy,
        greaterThan(tester.getCenter(find.text('Restock items')).dy),
      );
      expect(render.size.height, 48 * 2 + 8);

      await tester.pumpWidget(
        _overlay(
          (_) => const Alert(
            title: 'Save your changes?',
            actions: [
              AlertAction(label: 'Save', role: AlertActionRole.primary),
              AlertAction(label: 'Discard', role: AlertActionRole.destructive),
              AlertAction(label: 'Cancel', role: AlertActionRole.cancel),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      render = tester.renderObject<RenderAlertActions>(
        find.byType(AlertActionsLayout),
      );
      expect(render.sideBySide, isFalse);
      final save = tester.getCenter(find.text('Save')).dy;
      final discard = tester.getCenter(find.text('Discard')).dy;
      final cancel = tester.getCenter(find.text('Cancel')).dy;
      expect(save < discard && discard < cancel, isTrue);
    });

    testWidgets(
      'focus starts on cancel, Escape runs it, focus returns to the opener',
      (tester) async {
        var open = false;
        var cancelled = 0, deleted = 0;
        final opener = FocusNode();
        await tester.pumpWidget(
          _overlay(
            (setState) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Button(
                  focusNode: opener,
                  onClick: () => setState(() => open = true),
                  children: const [Text('Delete')],
                ),
                Alert(
                  open: open,
                  onOpenChange: (value) => setState(() => open = value),
                  title: 'Delete order?',
                  actions: [
                    AlertAction(
                      label: 'Keep order',
                      role: AlertActionRole.cancel,
                      onAction: () {
                        cancelled++;
                        return null;
                      },
                    ),
                    AlertAction(
                      label: 'Delete order',
                      role: AlertActionRole.destructive,
                      onAction: () {
                        deleted++;
                        return null;
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
        opener.requestFocus();
        await tester.pump();
        await tester.tap(find.text('Delete'));
        await tester.pumpAndSettle();
        expect(opener.hasFocus, isFalse);
        final focused = FocusManager.instance.primaryFocus!;
        expect(
          find.descendant(
            of: find.byWidgetPredicate(
              (w) => w is Button && w.focusNode == focused,
            ),
            matching: find.text('Keep order'),
          ),
          findsOneWidget,
          reason: 'the safe choice has focus',
        );
        // A tap on the dimmed page doesn't answer it.
        await tester.tapAt(const Offset(4, 4));
        await tester.pumpAndSettle();
        expect(open, isTrue);

        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect((open, cancelled, deleted), (false, 1, 0));
        expect(find.text('Keep order'), findsNothing);
        expect(opener.hasFocus, isTrue);
        opener.dispose();
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets('an action returning false keeps it open', (tester) async {
      var open = true;
      await tester.pumpWidget(
        _overlay(
          (setState) => Alert(
            open: open,
            onOpenChange: (value) => setState(() => open = value),
            title: 'Cancel order?',
            actions: [
              AlertAction(
                label: 'Cancel order',
                role: AlertActionRole.destructive,
                onAction: () => false,
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel order'));
      await tester.pumpAndSettle();
      expect(open, isTrue);
      expect(find.text('Cancel order?'), findsOneWidget);
    });

    testWidgets('opens from a larger scale, closes with a fade only', (
      tester,
    ) async {
      var open = false;
      late StateSetter set;
      await tester.pumpWidget(
        _overlay((setState) {
          set = setState;
          return Alert(
            open: open,
            onOpenChange: (v) => setState(() => open = v),
            title: 'Delete?',
            actions: _cancelDelete,
          );
        }),
      );
      set(() => open = true);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      PopTransition pop() => tester.widget(find.byType(PopTransition));
      expect(pop().controller.scale, greaterThan(1.05));
      expect(pop().controller.opacity, lessThan(0.6));
      await tester.pumpAndSettle();
      expect(pop().controller.scale, closeTo(1, 1e-3));
      expect(pop().controller.opacity, 1);

      set(() => open = false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 60));
      expect(
        pop().controller.scale,
        closeTo(1, 1e-3),
        reason: 'no scale on exit',
      );
      expect(pop().controller.opacity, inExclusiveRange(0, 1));
      await tester.pumpAndSettle();
      expect(find.byType(PopTransition), findsNothing);
    });

    testWidgets('reduced motion crossfades without scale; none is instant', (
      tester,
    ) async {
      var open = false;
      late StateSetter set;
      Widget app(Motion motion) =>
          _overlay(config: ThemeConfig(motion: motion), (setState) {
            set = setState;
            return Alert(
              open: open,
              onOpenChange: (v) => setState(() => open = v),
              title: 'Delete?',
              actions: _cancelDelete,
            );
          });
      await tester.pumpWidget(app(Motion.reduced));
      set(() => open = true);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      PopTransition pop() => tester.widget(find.byType(PopTransition));
      expect(pop().controller.scale, 1);
      expect(pop().controller.opacity, lessThan(1));
      await tester.pumpAndSettle();
      set(() => open = false);
      await tester.pumpAndSettle();

      await tester.pumpWidget(app(Motion.none));
      set(() => open = true);
      await tester.pump();
      await tester.pump();
      expect(pop().controller.opacity, 1);
      set(() => open = false);
      await tester.pump();
      await tester.pump();
      expect(find.byType(PopTransition), findsNothing);
    });
  });

  group('Modal', () {
    testWidgets(
      'Escape and a backdrop tap close; focus returns; taps inside do not',
      (tester) async {
        var open = false;
        var closes = 0;
        final opener = FocusNode();
        late StateSetter set;
        await tester.pumpWidget(
          _overlay((setState) {
            set = setState;
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Button(
                  focusNode: opener,
                  onClick: () => setState(() => open = true),
                  children: const [Text('Edit')],
                ),
                Modal(
                  open: open,
                  onOpenChange: (_) => setState(() {
                    closes++;
                    open = false;
                  }),
                  label: 'Edit address',
                  title: const Text('Edit address'),
                  child: const SizedBox(height: 120, child: Text('Body')),
                ),
              ],
            );
          }),
        );
        opener.requestFocus();
        await tester.pump();
        await tester.tap(find.text('Edit'));
        await tester.pumpAndSettle();
        expect(find.text('Body'), findsOneWidget);
        expect(opener.hasFocus, isFalse);

        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(closes, 1);
        expect(find.text('Body'), findsNothing);
        expect(opener.hasFocus, isTrue);

        set(() => open = true);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Body'));
        await tester.pumpAndSettle();
        expect(closes, 1);
        await tester.tapAt(const Offset(5, 5));
        await tester.pumpAndSettle();
        expect(closes, 2);

        // The close bubble closes too.
        set(() => open = true);
        await tester.pumpAndSettle();
        await tester.tap(find.bySemanticsLabel('Close Edit address').last);
        await tester.pumpAndSettle();
        expect(closes, 3);
        opener.dispose();
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets('the card hugs its body and chrome, or fills with fill', (
      tester,
    ) async {
      _size(tester, const Size(1000, 900));
      Widget modal({bool fill = false}) => _overlay(
        (_) => Modal(
          label: 'Rename store',
          title: const Text('Rename store'),
          width: 400,
          fill: fill,
          edgeGap: 12,
          contentPadding: 14,
          child: const SizedBox(height: 100, child: Text('Body')),
        ),
      );
      await tester.pumpWidget(modal());
      await tester.pumpAndSettle();
      final area = tester.getSize(find.byType(ScrollArea));
      // The header (measured) + 12px gaps above and below it, the body, 14px bottom padding.
      expect(area.height, lessThan(300));
      expect(area.height, greaterThan(100 + 14 + 24));
      expect(area.width, 400 - 2);

      await tester.pumpWidget(modal(fill: true));
      await tester.pumpAndSettle();
      expect(tester.getSize(find.byType(ScrollArea)).height, 720 - 2);
    });

    testWidgets('returnFocus wins over the opener after closing', (
      tester,
    ) async {
      var open = false;
      final opener = FocusNode();
      final target = FocusNode();
      late StateSetter set;
      await tester.pumpWidget(
        _overlay((setState) {
          set = setState;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Button(
                focusNode: opener,
                onClick: () => setState(() => open = true),
                children: const [Text('Open')],
              ),
              Button(
                focusNode: target,
                onClick: () {},
                children: const [Text('Row')],
              ),
              Modal(
                open: open,
                onOpenChange: (v) => setState(() => open = v),
                label: 'Edit',
                returnFocus: target,
                child: const Text('Body'),
              ),
            ],
          );
        }),
      );
      opener.requestFocus();
      await tester.pump();
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      set(() => open = false);
      await tester.pumpAndSettle();
      expect(target.hasFocus, isTrue);
      expect(opener.hasFocus, isFalse);
      opener.dispose();
      target.dispose();
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
  });

  group('Pane', () {
    /// [state] holds `open`; the pane's onOpenChange writes it back through the overlay's setState.
    Widget pane(
      List<bool> state, {
      TextDirection direction = TextDirection.ltr,
    }) => _overlay(
      direction: direction,
      (setState) => Pane(
        open: state[0],
        onOpenChange: (v) => setState(() => state[0] = v),
        label: 'Edit customer',
        title: const Text('Edit customer'),
        dock: PresentationDock(
          children: [
            Button(onClick: () {}, children: const [Text('Save')]),
          ],
        ),
        child: const SizedBox(height: 80, child: Text('Fields')),
      ),
    );

    testWidgets('slides in from the end, G from the edges, and closes', (
      tester,
    ) async {
      _size(tester, const Size(1200, 800));
      final state = [true];
      await tester.pumpWidget(pane(state));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      final moving = tester.getRect(find.text('Fields'));
      await tester.pumpAndSettle();
      final rest = tester.getRect(find.text('Fields'));
      expect(
        moving.left,
        greaterThan(rest.left + 20),
        reason: 'it comes from the right',
      );
      // 420 wide, G (8) from the right edge; content 16 inside a 1px border.
      expect(rest.left, closeTo(1200 - 8 - 420 + 1 + 16, 0.5));
      // The close bubble floats beside it, to its start.
      final close = tester.getRect(
        find.bySemanticsLabel('Close Edit customer').last,
      );
      expect(close.right, lessThan(1200 - 8 - 420));
      expect(close.top, lessThan(8 + 50));

      await tester.tap(find.bySemanticsLabel('Close Edit customer').last);
      await tester.pump();
      expect(state[0], isFalse);
      await tester.pump(const Duration(milliseconds: 60));
      expect(tester.getRect(find.text('Fields')).left, greaterThan(rest.left));
      await tester.pumpAndSettle();
      expect(find.text('Fields'), findsNothing);
    });

    testWidgets('RTL: it sits at the left and slides from the left', (
      tester,
    ) async {
      _size(tester, const Size(1200, 800));
      await tester.pumpWidget(pane([true], direction: TextDirection.rtl));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      final moving = tester.getRect(find.text('Fields'));
      await tester.pumpAndSettle();
      final rest = tester.getRect(find.text('Fields'));
      expect(moving.right, lessThan(rest.right - 20));
      expect(rest.right, closeTo(8 + 420 - 1 - 16, 0.5));
    });

    testWidgets('non-modal: the page behind stays usable', (tester) async {
      _size(tester, const Size(1200, 800));
      var taps = 0;
      await tester.pumpWidget(
        _overlay(
          (_) => Stack(
            fit: StackFit.expand,
            children: [
              Positioned(
                left: 20,
                top: 20,
                child: Button(
                  onClick: () => taps++,
                  children: const [Text('Row')],
                ),
              ),
              Pane(
                open: true,
                modal: false,
                label: 'Inspector',
                child: const Text('Fields'),
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Fields'), findsOneWidget);
      await tester.tap(find.text('Row'));
      expect(taps, 1);
    });

    testWidgets('below 720 it is a bottom sheet that fits its content', (
      tester,
    ) async {
      _size(tester, const Size(390, 800));
      final state = [true];
      await tester.pumpWidget(pane(state));
      await tester.pumpAndSettle();
      expect(find.byType(Sheet), findsOneWidget);
      final fields = tester.getRect(find.text('Fields'));
      expect(fields.left, closeTo(16, 0.5), reason: 'full width, 16 inside');
      expect(
        fields.top,
        greaterThan(800 - 300),
        reason: 'fit: a short sheet at the bottom',
      );
      // The close bubble moved into the sheet's header.
      await tester.tap(find.bySemanticsLabel('Close Edit customer').last);
      await tester.pumpAndSettle();
      expect(state[0], isFalse);
      expect(find.text('Fields'), findsNothing);
    });
  });

  group('Sheet', () {
    testWidgets('fit hugs the content plus header and dock', (tester) async {
      _size(tester, const Size(390, 800));
      await tester.pumpWidget(
        _overlay(
          (_) => Sheet(
            label: 'Contact',
            title: const Text('Contact'),
            detents: const [SheetDetent.fit],
            dock: PresentationDock(
              children: [
                Button(onClick: () {}, children: const [Text('Call')]),
              ],
            ),
            child: const SizedBox(height: 120, child: Text('Rows')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final rows = tester.getRect(find.text('Rows'));
      final call = tester.getRect(find.text('Call'));
      expect(
        call.top,
        greaterThan(rows.top + 120 - 1),
        reason: 'the dock sits below the content',
      );
      expect(
        800 - call.bottom,
        lessThan(40),
        reason: 'the dock is at the bottom',
      );
      expect(
        rows.top,
        greaterThan(800 - 120 - 160),
        reason: 'no taller than it needs',
      );
    });

    testWidgets('a pull down from the top of the content dismisses it', (
      tester,
    ) async {
      _size(tester, const Size(390, 800));
      var open = true;
      await tester.pumpWidget(
        _overlay(
          (setState) => Sheet(
            open: open,
            onOpenChange: (v) => setState(() => open = v),
            label: 'Orders',
            detents: const [SheetDetent.large],
            child: Column(
              children: [
                for (var i = 0; i < 40; i++)
                  SizedBox(height: 44, child: Text('Order $i')),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // Scrolled down, a pull scrolls the content back.
      await tester.drag(find.text('Order 5'), const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.drag(find.text('Order 10'), const Offset(0, 150));
      await tester.pumpAndSettle();
      expect(open, isTrue);
      // At the top, the same pull drags the sheet and a flick closes it.
      await tester.drag(find.text('Order 3'), const Offset(0, 400));
      await tester.pumpAndSettle();
      await tester.fling(find.text('Order 2'), const Offset(0, 300), 2000);
      await tester.pumpAndSettle();
      expect(open, isFalse);
      expect(find.text('Order 2'), findsNothing);
    });
  });

  group('show helpers return values', () {
    testWidgets('showAlert completes with the chosen action\'s value', (
      tester,
    ) async {
      bool? result;
      await tester.pumpWidget(
        _app(
          (context) => Center(
            child: Button(
              onClick: () async => result = await showAlert<bool>(
                context,
                builder: (context) => const Alert(
                  title: 'Delete order?',
                  actions: [
                    AlertAction(
                      label: 'Keep',
                      role: AlertActionRole.cancel,
                      value: false,
                    ),
                    AlertAction(
                      label: 'Delete',
                      role: AlertActionRole.destructive,
                      value: true,
                    ),
                  ],
                ),
              ),
              children: const [Text('Open')],
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Delete order?'), findsOneWidget);
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(result, isTrue);
      expect(find.text('Delete order?'), findsNothing);
    });

    testWidgets(
      'showModal completes with Navigator.pop\'s value; Escape gives null',
      (tester) async {
        final results = <String?>[];
        await tester.pumpWidget(
          _app(
            (context) => Center(
              child: Button(
                onClick: () async => results.add(
                  await showModal<String>(
                    context,
                    builder: (context) => Modal(
                      label: 'Rename',
                      dock: PresentationDock(
                        children: [
                          Button(
                            onClick: () => Navigator.pop(context, 'Atlas'),
                            children: const [Text('Save')],
                          ),
                        ],
                      ),
                      child: const Text('Name'),
                    ),
                  ),
                ),
                children: const [Text('Open')],
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Save'));
        await tester.pumpAndSettle();
        expect(find.text('Name'), findsNothing);
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(results, ['Atlas', null]);
        expect(find.text('Name'), findsNothing);
      },
    );

    testWidgets('showPane and showSheet return the popped value', (
      tester,
    ) async {
      final results = <Object?>[];
      _size(tester, const Size(1200, 800));
      await tester.pumpWidget(
        _app(
          (context) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Button(
                  onClick: () async => results.add(
                    await showPane<int>(
                      context,
                      builder: (context) => Pane(
                        label: 'Pick',
                        child: Button(
                          onClick: () => Navigator.pop(context, 7),
                          children: const [Text('Seven')],
                        ),
                      ),
                    ),
                  ),
                  children: const [Text('Pane')],
                ),
                Button(
                  onClick: () async => results.add(
                    await showSheet<int>(
                      context,
                      builder: (context) => Sheet(
                        label: 'Pick',
                        detents: const [SheetDetent.fit],
                        child: Button(
                          onClick: () => Navigator.pop(context, 3),
                          children: const [Text('Three')],
                        ),
                      ),
                    ),
                  ),
                  children: const [Text('Sheet')],
                ),
              ],
            ),
          ),
        ),
      );
      await tester.tap(find.text('Pane'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Seven'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sheet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Three'));
      await tester.pumpAndSettle();
      expect(results, [7, 3]);
      expect(find.text('Three'), findsNothing);
    });
  });
}
