import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// A controlled month: the state a host keeps.
class _Harness extends StatefulWidget {
  const _Harness({
    this.from = '2026-10-19',
    this.to,
    this.min,
    this.max,
    this.locale,
    this.onSelect,
  });
  final String from;
  final String? to, min, max, locale;
  final ValueChanged<String>? onSelect;

  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  String month = '2026-10';
  late String from = widget.from;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 320,
    child: CalendarMonth(
      month: month,
      onMonthChange: (m) => setState(() => month = m),
      from: from,
      to: widget.to,
      min: widget.min,
      max: widget.max,
      locale: widget.locale,
      onSelect: (day) {
        setState(() => from = day);
        widget.onSelect?.call(day);
      },
    ),
  );
}

Finder day(String date) => find.byKey(ValueKey(date));
String? focused() => FocusManager.instance.primaryFocus?.debugLabel;

Future<void> focusDay(WidgetTester tester, String date) async {
  Focus.of(
    tester.element(find.descendant(of: day(date), matching: find.byType(Text))),
  ).requestFocus();
  await tester.pump();
}

void main() {
  testWidgets(
    'shows the month, Monday-first weekdays and every day; a tap selects',
    (tester) async {
      String? picked;
      await tester.pumpWidget(host(_Harness(onSelect: (d) => picked = d)));
      expect(find.text('October 2026'), findsOneWidget);
      expect(find.text('M'), findsOneWidget);
      for (var d = 1; d <= 31; d++) {
        expect(day('2026-10-${d.toString().padLeft(2, '0')}'), findsOneWidget);
      }
      await tester.tap(day('2026-10-05'));
      await tester.pump();
      expect(picked, '2026-10-05');
    },
  );

  testWidgets('arrows, Home/End and Page Up/Down move focus and page months', (
    tester,
  ) async {
    await tester.pumpWidget(host(const _Harness()));
    await focusDay(tester, '2026-10-19');
    expect(focused(), '2026-10-19');

    Future<void> press(LogicalKeyboardKey key) async {
      await tester.sendKeyEvent(key);
      await tester.pump();
      await tester.pump();
    }

    await press(LogicalKeyboardKey.arrowRight);
    expect(focused(), '2026-10-20');
    await press(LogicalKeyboardKey.arrowDown);
    expect(focused(), '2026-10-27');
    await press(LogicalKeyboardKey.arrowUp);
    await press(LogicalKeyboardKey.arrowLeft);
    expect(focused(), '2026-10-19');
    // 2026-10-19 is a Monday: Home stays, End goes to Sunday.
    await press(LogicalKeyboardKey.home);
    expect(focused(), '2026-10-19');
    await press(LogicalKeyboardKey.end);
    expect(focused(), '2026-10-25');
    // Crossing the month edge pages the calendar.
    await press(LogicalKeyboardKey.arrowDown);
    await press(LogicalKeyboardKey.arrowDown);
    expect(focused(), '2026-11-08');
    expect(find.text('November 2026'), findsOneWidget);
    await press(LogicalKeyboardKey.pageUp);
    expect(focused(), '2026-10-08');
    expect(find.text('October 2026'), findsOneWidget);
    // Page Down clamps the day to the shorter month.
    await focusDay(tester, '2026-10-31');
    await press(LogicalKeyboardKey.pageDown);
    expect(focused(), '2026-11-30');
    // Enter selects the focused day.
    await press(LogicalKeyboardKey.enter);
    expect(
      tester.widget<CalendarMonth>(find.byType(CalendarMonth)).from,
      '2026-11-30',
    );
  });

  testWidgets('arrows mirror in right-to-left', (tester) async {
    await tester.pumpWidget(
      host(const _Harness(), direction: TextDirection.rtl),
    );
    await focusDay(tester, '2026-10-19');
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pump();
    await tester.pump();
    expect(focused(), '2026-10-20');
  });

  testWidgets('min and max disable days, stop keyboard moves and paging', (
    tester,
  ) async {
    String? picked;
    await tester.pumpWidget(
      host(
        _Harness(
          from: '2026-10-10',
          min: '2026-10-05',
          max: '2026-10-25',
          onSelect: (d) => picked = d,
        ),
      ),
    );
    await tester.tap(day('2026-10-04'));
    await tester.pump();
    expect(picked, isNull);
    await focusDay(tester, '2026-10-10');
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.pump();
    await tester.pump();
    // 2026-10-03 is out of bounds: focus stays.
    expect(focused(), '2026-10-10');
    // Neither neighbour month is reachable.
    await tester.tap(find.bySemanticsLabel('Next month'));
    await tester.pump();
    expect(find.text('October 2026'), findsOneWidget);
  });

  testWidgets('the title opens a month grid that pages years', (tester) async {
    await tester.pumpWidget(host(const _Harness()));
    await tester.tap(find.text('October 2026'));
    await tester.pump();
    expect(find.text('2026'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Next month'));
    await tester.pump();
    expect(find.text('2027'), findsOneWidget);
    await tester.tap(find.text('Mar'));
    await tester.pump();
    expect(find.text('March 2027'), findsOneWidget);
  });

  testWidgets('names follow the locale (fr, ar)', (tester) async {
    await tester.pumpWidget(host(const _Harness(locale: 'fr')));
    expect(find.text('octobre 2026'), findsOneWidget);
    expect(find.text('L'), findsOneWidget);
    await tester.pumpWidget(
      host(
        const I18nProvider(locale: 'ar', child: _Harness()),
        direction: TextDirection.rtl,
      ),
    );
    expect(find.text('أكتوبر 2026'), findsOneWidget);
  });

  testWidgets('days expose their full date, pressed state and range ends', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      host(const _Harness(from: '2026-10-05', to: '2026-10-15')),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel('Monday, October 5, 2026')),
      isSemantics(isButton: true, isToggled: true, hasToggledState: true),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel('Thursday, October 15, 2026')),
      isSemantics(isToggled: true),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel('Saturday, October 10, 2026')),
      isSemantics(isToggled: false),
    );
    semantics.dispose();
  });
}
