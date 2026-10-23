import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart'
    show debugDefaultTargetPlatformOverride;
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/scheduler.dart' show SchedulerBinding;
import 'package:flutter/services.dart' show LogicalKeyboardKey;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// A controlled control: [changes] records every onChange, [value] follows it.
class _Harness extends StatefulWidget {
  const _Harness({required this.changes, this.reduceMotion = false});
  final List<String> changes;
  final bool reduceMotion;

  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  String value = 'list';

  @override
  Widget build(BuildContext context) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(disableAnimations: widget.reduceMotion),
    child: SegmentedControl<String>(
      label: 'Orders view',
      value: value,
      onChange: (next) {
        widget.changes.add(next);
        setState(() => value = next);
      },
      options: const [
        SegmentOption(value: 'list', label: 'List'),
        SegmentOption(value: 'board', label: 'Board'),
        SegmentOption(value: 'grid', label: 'Grid'),
      ],
    ),
  );
}

Future<void> _drag(
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

const _statuses = [
  ('new', 'New', '21'),
  ('calling', 'Calling', '14'),
  ('no_answer', 'No answer', '9'),
  ('postponed', 'Postponed', '6'),
  ('confirmed', 'Confirmed', '32'),
  ('packed', 'Packed', '12'),
  ('shipped', 'Shipped', '48'),
  ('delivered', 'Delivered', '120'),
  ('returned', 'Returned', '7'),
  ('cancelled', 'Cancelled', '3'),
];

/// Ten order statuses with counts, 360 px wide: far too many to fit, so the control scrolls.
class _Statuses extends StatefulWidget {
  const _Statuses({
    required this.changes,
    this.initial = 'new',
    this.direction = TextDirection.ltr,
    this.inToolbar = false,
  });
  final List<String> changes;
  final String initial;
  final TextDirection direction;
  final bool inToolbar;

  @override
  State<_Statuses> createState() => _StatusesState();
}

class _StatusesState extends State<_Statuses> {
  late String value = widget.initial;

  /// The owner changes the value (not the control).
  void select(String next) => setState(() => value = next);

  @override
  Widget build(BuildContext context) {
    final control = SegmentedControl<String>(
      label: 'Order status',
      value: value,
      onChange: (next) {
        widget.changes.add(next);
        setState(() => value = next);
      },
      options: [
        for (final (value, label, count) in _statuses)
          SegmentOption(value: value, label: label, badge: count),
      ],
    );
    return Directionality(
      textDirection: widget.direction,
      child: SizedBox(
        width: 360,
        child: widget.inToolbar
            ? GlassScope(
                child: ToolbarGroup(
                  label: 'Order status',
                  children: [Flexible(child: control)],
                ),
              )
            : control,
      ),
    );
  }
}

/// The control's own horizontal scroll position.
ScrollPosition _scrollOf(WidgetTester tester) => tester
    .state<ScrollableState>(
      find.descendant(
        of: find.byType(SegmentedControl<String>),
        matching: find.byType(Scrollable),
      ),
    )
    .position;

/// The visible part of the control (its scroll viewport).
Rect _viewport(WidgetTester tester) => tester.getRect(
  find.descendant(
    of: find.byType(SegmentedControl<String>),
    matching: find.byType(Scrollable),
  ),
);

Rect _option(WidgetTester tester, String label) => tester.getRect(
  find
      .ancestor(of: find.text(label), matching: find.byType(DecoratedBox))
      .first,
);

void main() {
  testWidgets('equalWidth fills the row with equal options that ellipsize', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          child: SegmentedControl<String>(
            label: 'Which end',
            value: 'from',
            onChange: (_) {},
            equalWidth: true,
            options: const [
              SegmentOption(value: 'from', label: 'Start · Oct 1'),
              SegmentOption(
                value: 'to',
                label: 'End · a label far too long to fit in half of the row',
              ),
            ],
          ),
        ),
      ),
    );
    final control = tester.getSize(find.byType(SegmentedControl<String>));
    expect(control.width, 400);
    final start = tester.getRect(
      find
          .ancestor(
            of: find.text('Start · Oct 1'),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    final end = tester.getRect(
      find
          .ancestor(
            of: find.textContaining('End ·'),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    expect(start.width, closeTo(end.width, 0.01));
    expect(tester.takeException(), isNull, reason: 'no overflow');
  });

  testWidgets('a regular button tall, the pill inset inside it', (
    tester,
  ) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byType(SegmentedControl<String>)).height, 36);
    final option = find
        .ancestor(of: find.text('List'), matching: find.byType(DecoratedBox))
        .first;
    expect(tester.getSize(option).height, 32);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('a tap selects', (tester) async {
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Grid'));
    await tester.pumpAndSettle();
    expect(changes, ['grid']);
  });

  testWidgets(
    'dragging the pill selects where it is released, only on release',
    (tester) async {
      final changes = <String>[];
      await tester.pumpWidget(host(_Harness(changes: changes)));
      await tester.pumpAndSettle();
      await _drag(
        tester,
        tester.getCenter(find.text('List')),
        tester.getCenter(find.text('Grid')),
        midway: () => expect(changes, isEmpty, reason: 'not while dragging'),
      );
      await tester.pumpAndSettle();
      expect(changes, ['grid']);
    },
  );

  testWidgets('pressing another option and dragging brings the pill along', (
    tester,
  ) async {
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    // Press Board, drag to Grid: the release lands on Grid, not a tap on Board.
    await _drag(
      tester,
      tester.getCenter(find.text('Board')),
      tester.getCenter(find.text('Grid')),
    );
    await tester.pumpAndSettle();
    expect(changes, ['grid']);
  });

  testWidgets('a short drag that ends where it started changes nothing', (
    tester,
  ) async {
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    final list = tester.getCenter(find.text('List'));
    await _drag(tester, list, list + const Offset(12, 0));
    await tester.pumpAndSettle();
    expect(changes, isEmpty);
  });

  testWidgets('arrows, Home and End select and move focus', (tester) async {
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.end);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pumpAndSettle();
    expect(changes, ['board', 'grid', 'list']);
  });

  testWidgets('the pill slides on a spring, and jumps with reduced motion', (
    tester,
  ) async {
    final changes = <String>[];
    await tester.pumpWidget(host(_Harness(changes: changes)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Grid'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    expect(tester.binding.hasScheduledFrame, isTrue, reason: 'sliding');
    await tester.pumpAndSettle();

    await tester.pumpWidget(
      host(_Harness(changes: changes, reduceMotion: true)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Board'));
    await tester.pump();
    await tester.pump();
    expect(tester.binding.hasScheduledFrame, isFalse, reason: 'no slide');
    expect(changes.last, 'board');
  });

  testWidgets('a reduced-motion drag still selects on release', (tester) async {
    final changes = <String>[];
    await tester.pumpWidget(
      host(_Harness(changes: changes, reduceMotion: true)),
    );
    await tester.pumpAndSettle();
    await _drag(
      tester,
      tester.getCenter(find.text('List')),
      tester.getCenter(find.text('Board')),
    );
    await tester.pumpAndSettle();
    expect(changes, ['board']);
  });

  testWidgets(
    'a value that matches no option settles, and the pill appears without growing',
    (tester) async {
      String? value;
      late StateSetter set;
      await tester.pumpWidget(
        WidgetsApp(
          color: const Color(0xFF000000),
          builder: (context, _) => ThemeProvider(
            child: Center(
              child: StatefulBuilder(
                builder: (context, setState) {
                  set = setState;
                  return SegmentedControl<String?>(
                    label: 'Pick',
                    value: value,
                    onChange: (_) {},
                    options: const [
                      SegmentOption(value: 'a', label: 'A'),
                      SegmentOption(value: 'b', label: 'B'),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      );
      // One frame to lay out and one to place (no pill); then nothing more is scheduled.
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(SchedulerBinding.instance.hasScheduledFrame, isFalse);
      set(() => value = 'b');
      await tester.pumpAndSettle();
      expect(SchedulerBinding.instance.hasScheduledFrame, isFalse);
    },
  );

  group('badges', () {
    testWidgets('a badge is part of the option\'s accessible name', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(_Statuses(changes: [])));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('New, 21'), findsOneWidget);
      expect(find.bySemanticsLabel('Calling, 14'), findsOneWidget);
      expect(find.text('21'), findsOneWidget, reason: 'drawn once');
      handle.dispose();
    });
  });

  group('many options', () {
    testWidgets('they scroll in one row at 360 px, with no overflow', (
      tester,
    ) async {
      await tester.pumpWidget(host(_Statuses(changes: [])));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byType(SegmentedControl<String>)).width, 360);
      expect(_scrollOf(tester).maxScrollExtent, greaterThan(0));
      final first = _option(tester, 'New');
      final last = _option(tester, 'Cancelled');
      expect(last.top, first.top, reason: 'one row, no wrapping');
      expect(last.height, first.height);

      // In a glass toolbar bubble too.
      await tester.pumpWidget(host(_Statuses(changes: [], inToolbar: true)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(_scrollOf(tester).maxScrollExtent, greaterThan(0));
    });

    testWidgets(
      'the selection starts in view and is revealed when it changes',
      (tester) async {
        final changes = <String>[];
        await tester.pumpWidget(
          host(_Statuses(changes: changes, initial: 'delivered')),
        );
        await tester.pumpAndSettle();
        final view = _viewport(tester);
        final delivered = _option(tester, 'Delivered');
        expect(
          delivered.left,
          greaterThanOrEqualTo(view.left + segmentedFade - 0.5),
        );
        expect(
          delivered.right,
          lessThanOrEqualTo(view.right - segmentedFade + 0.5),
        );

        // A programmatic change, back to the start.
        final state = tester.state<_StatusesState>(find.byType(_Statuses));
        state.select('new');
        await tester.pumpAndSettle();
        expect(_scrollOf(tester).pixels, 0);
        expect(_option(tester, 'New').left, greaterThanOrEqualTo(view.left));
      },
    );

    testWidgets('a reveal scrolls by segmentedRevealOffset', (tester) async {
      await tester.pumpWidget(host(_Statuses(changes: [])));
      await tester.pumpAndSettle();
      final position = _scrollOf(tester);
      final view = _viewport(tester);
      final shipped = _option(tester, 'Shipped');
      final expected = segmentedRevealOffset(
        position.pixels,
        position.maxScrollExtent,
        view.width,
        shipped.left - view.left + position.pixels,
        shipped.right - view.left + position.pixels,
      );
      final state = tester.state<_StatusesState>(find.byType(_Statuses));
      state.select('shipped');
      await tester.pumpAndSettle();
      expect(position.pixels, closeTo(expected, 0.5));
    });

    testWidgets('arrow keys move, select and reveal', (tester) async {
      final changes = <String>[];
      await tester.pumpWidget(host(_Statuses(changes: changes)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      for (var i = 0; i < 7; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await tester.pump();
      }
      await tester.pumpAndSettle();
      expect(changes.last, 'delivered');
      final view = _viewport(tester);
      final delivered = _option(tester, 'Delivered');
      expect(_scrollOf(tester).pixels, greaterThan(0));
      expect(
        delivered.right,
        lessThanOrEqualTo(view.right - segmentedFade + 0.5),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(_scrollOf(tester).pixels, _scrollOf(tester).maxScrollExtent);
      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pumpAndSettle();
      expect(_scrollOf(tester).pixels, 0);
    });

    testWidgets('right-to-left: scrolls from the right and reveals', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(
        host(
          _Statuses(
            changes: changes,
            initial: 'cancelled',
            direction: TextDirection.rtl,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final view = _viewport(tester);
      final cancelled = _option(tester, 'Cancelled');
      expect(cancelled.left, greaterThanOrEqualTo(view.left));
      expect(cancelled.right, lessThanOrEqualTo(view.right));
    });

    testWidgets(
      'dragging the pill near an edge scrolls on, and selects on release',
      (tester) async {
        final changes = <String>[];
        await tester.pumpWidget(host(_Statuses(changes: changes)));
        await tester.pumpAndSettle();
        final view = _viewport(tester);
        final gesture = await tester.startGesture(
          tester.getCenter(find.text('New')),
          kind: PointerDeviceKind.mouse,
        );
        await tester.pump(const Duration(milliseconds: 16));
        final edge = Offset(view.right - 4, view.center.dy);
        for (var i = 1; i <= 8; i++) {
          await gesture.moveTo(
            Offset.lerp(tester.getCenter(find.text('New')), edge, i / 8)!,
          );
          await tester.pump(const Duration(milliseconds: 16));
        }
        // Hold near the edge: the control scrolls on its own.
        final before = _scrollOf(tester).pixels;
        for (var i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 16));
        }
        expect(_scrollOf(tester).pixels, greaterThan(before + 100));
        expect(changes, isEmpty, reason: 'not while dragging');
        await gesture.up();
        await tester.pumpAndSettle();
        expect(changes, hasLength(1));
        expect(
          _statuses.indexWhere((s) => s.$1 == changes.single),
          greaterThan(3),
          reason: 'released far along the track',
        );
      },
    );

    testWidgets('a touch swipe off the pill scrolls; on the pill it drags', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(host(_Statuses(changes: changes)));
      await tester.pumpAndSettle();
      // Swipe left from "Calling": the track scrolls, nothing is chosen.
      await tester.dragFrom(
        tester.getCenter(find.text('Calling')),
        const Offset(-160, 0),
        kind: PointerDeviceKind.touch,
      );
      await tester.pumpAndSettle();
      expect(_scrollOf(tester).pixels, greaterThan(0));
      expect(changes, isEmpty);

      _scrollOf(tester).jumpTo(0);
      await tester.pumpAndSettle();
      // From the pill ("New"): the pill moves and lands on the next option.
      final from = tester.getCenter(find.text('New'));
      final to = tester.getCenter(find.text('Calling'));
      final gesture = await tester.startGesture(
        from,
        kind: PointerDeviceKind.touch,
      );
      for (var i = 1; i <= 10; i++) {
        await gesture.moveTo(Offset.lerp(from, to, i / 10)!);
        await tester.pump(const Duration(milliseconds: 16));
      }
      await tester.pump(const Duration(milliseconds: 120));
      await gesture.up();
      await tester.pumpAndSettle();
      expect(changes, ['calling']);
    });
  });

  group('right-to-left drag', () {
    testWidgets('tap selects the option under the pointer', (tester) async {
      final changes = <String>[];
      await tester.pumpWidget(
        host(_Harness(changes: changes), direction: TextDirection.rtl),
      );
      await tester.pumpAndSettle();
      expect(
        tester.getCenter(find.text('List')).dx,
        greaterThan(tester.getCenter(find.text('Grid')).dx),
        reason: 'first option on the right',
      );
      await tester.tap(find.text('Grid'));
      await tester.pumpAndSettle();
      expect(changes, ['grid']);
    });

    testWidgets('dragging the pill left selects the option it lands on', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(
        host(_Harness(changes: changes), direction: TextDirection.rtl),
      );
      await tester.pumpAndSettle();
      await _drag(
        tester,
        tester.getCenter(find.text('List')),
        tester.getCenter(find.text('Grid')),
      );
      await tester.pumpAndSettle();
      expect(changes, ['grid']);
    });

    testWidgets('a short drag to the neighbour selects it', (tester) async {
      final changes = <String>[];
      await tester.pumpWidget(
        host(_Harness(changes: changes), direction: TextDirection.rtl),
      );
      await tester.pumpAndSettle();
      final from = tester.getCenter(find.text('List'));
      final to = tester.getCenter(find.text('Board'));
      final gesture = await tester.startGesture(
        from,
        kind: PointerDeviceKind.mouse,
      );
      await tester.pump(const Duration(milliseconds: 16));
      for (var i = 1; i <= 10; i++) {
        await gesture.moveTo(Offset.lerp(from, to, i / 10)!);
        await tester.pump(const Duration(milliseconds: 16));
      }
      await tester.pump(const Duration(milliseconds: 200));
      await gesture.up();
      await tester.pumpAndSettle();
      expect(changes, ['board']);
    });

    testWidgets('scrolling row: drag to the start edge scrolls and selects', (
      tester,
    ) async {
      final changes = <String>[];
      await tester.pumpWidget(
        host(_Statuses(changes: changes, direction: TextDirection.rtl)),
      );
      await tester.pumpAndSettle();
      final view = _viewport(tester);
      final start = tester.getCenter(find.text('New'));
      final gesture = await tester.startGesture(
        start,
        kind: PointerDeviceKind.mouse,
      );
      await tester.pump(const Duration(milliseconds: 16));
      final edge = Offset(view.left + 4, view.center.dy);
      for (var i = 1; i <= 8; i++) {
        await gesture.moveTo(Offset.lerp(start, edge, i / 8)!);
        await tester.pump(const Duration(milliseconds: 16));
      }
      final before = _scrollOf(tester).pixels;
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(
        (_scrollOf(tester).pixels - before).abs(),
        greaterThan(100),
        reason: 'auto-scrolls toward the end of the row',
      );
      await gesture.up();
      await tester.pumpAndSettle();
      expect(changes, hasLength(1));
      expect(changes.single, isNot('new'));
      expect(tester.takeException(), isNull);
    });
  });
}
