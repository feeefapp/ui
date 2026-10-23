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
}
