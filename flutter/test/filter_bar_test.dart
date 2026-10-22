import 'dart:io';

import 'package:feeef_ui/filter_bar.dart';
import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(
  Widget child, {
  TextDirection direction = TextDirection.ltr,
  double width = 700,
}) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => Directionality(
    textDirection: direction,
    child: ThemeProvider(
      config: ThemeConfig.defaults,
      brightness: Brightness.light,
      // The kit's real font: the test font's square glyphs are far wider than text.
      child: DefaultTextStyle(
        style: const TextStyle(
          fontFamily: 'IBM Plex Sans Arabic',
          fontSize: 14,
          color: Color(0xFF000000),
        ),
        child: Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => FocusScope(
                autofocus: true,
                child: Align(
                  alignment: Alignment.topCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 20),
                    child: SizedBox(width: width, child: child),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  ),
);

/// Popover grain breathes and the glass springs, so pump fixed frames.
Future<void> frames(WidgetTester tester, [int count = 30]) async {
  for (var i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 16));
  }
}

Future<void> finish(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await frames(tester, 60);
}

final macOS = TargetPlatformVariant.only(TargetPlatform.macOS);

Finder button(String label) =>
    find.byWidgetPredicate((w) => w is Button && w.ariaLabel == label);

Finder textButton(String text) =>
    find.ancestor(of: find.text(text), matching: find.byType(Button)).first;

const _options = [
  FilterOption(id: 'paid', label: 'Paid', keywords: ['money']),
  FilterOption(id: 'urgent', label: 'Urgent'),
  FilterOption.choices(
    id: 'status',
    label: 'Status',
    choices: [
      FilterChoice(value: 'open', label: 'Open'),
      FilterChoice(value: 'done', label: 'Done'),
    ],
  ),
  FilterOption.temporal(
    id: 'created',
    label: 'Created',
    type: FilterType.dateRange,
  ),
  FilterOption.temporal(
    id: 'day',
    label: 'Day',
    type: FilterType.date,
    min: '2026-01-01',
  ),
];

class _Harness extends StatefulWidget {
  const _Harness({this.natural, this.options = _options, this.trailing});
  final Future<List<String>> Function(String)? natural;
  final List<FilterOption> options;
  final Widget? trailing;
  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  List<String> value = [];
  Map<String, FilterValue?> values = {};
  List<String> pinned = [];
  @override
  Widget build(BuildContext context) => FilterBar(
    label: 'Order filters',
    options: widget.options,
    value: value,
    onChange: (v) => setState(() => value = v),
    values: values,
    onValuesChange: (v) => setState(() => values = v),
    pinned: pinned,
    onPinnedChange: (v) => setState(() => pinned = v),
    onNaturalFilter: widget.natural,
    trailing: widget.trailing,
  );
}

_HarnessState _state(WidgetTester tester) =>
    tester.state<_HarnessState>(find.byType(_Harness));

void main() {
  setUpAll(() async {
    final loader = FontLoader('IBM Plex Sans Arabic')
      ..addFont(
        File('fonts/IBMPlexSansArabic-Regular.ttf')
            .readAsBytes()
            .then((bytes) => ByteData.sublistView(bytes)),
      );
    await loader.load();
  });

  testWidgets('catalog toggles an on/off filter and pins it', (tester) async {
    await tester.pumpWidget(_host(const _Harness()));
    await tester.tap(button('Choose filters'));
    await frames(tester);
    expect(find.text('Status'), findsOneWidget);
    expect(find.text('0 active · 0 pinned'), findsOneWidget);

    // The search matches keywords.
    await tester.enterText(find.byType(EditableText).first, 'money');
    await frames(tester, 5);
    expect(find.text('Urgent'), findsNothing);
    expect(find.text('Paid'), findsOneWidget);
    // Escape in the search clears it and keeps the popover open.
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await frames(tester, 5);
    expect(find.text('Urgent'), findsOneWidget);
    await tester.enterText(find.byType(EditableText).first, 'money');
    await frames(tester, 5);

    await tester.tap(textButton('Paid'));
    await frames(tester, 5);
    expect(_state(tester).value, ['paid']);
    expect(_state(tester).pinned, ['paid']);
    expect(find.text('1 active · 1 pinned'), findsOneWidget);
    expect(button('Choose filters (1 active)'), findsOneWidget);

    // The row took focus from the search, so Escape closes the popover.
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await frames(tester, 5);
    expect(find.text('Status'), findsNothing);
    // The chip shows the value.
    expect(button('Edit Paid filter'), findsOneWidget);
    expect(find.text('On'), findsOneWidget);

    await tester.tap(button('Clear Paid value'));
    await frames(tester, 5);
    expect(_state(tester).value, isEmpty);
    expect(find.text('Any'), findsOneWidget);

    await tester.tap(button('Unpin Paid'));
    await frames(tester, 5);
    expect(_state(tester).pinned, isEmpty);
    expect(button('Edit Paid filter'), findsNothing);
    await finish(tester);
  }, variant: macOS);

  testWidgets('choice filters open a value menu from the catalog', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const _Harness()));
    await tester.tap(button('Choose filters'));
    await frames(tester);
    await tester.tap(textButton('Status'));
    await frames(tester);
    // The catalog closed; the value menu has its own search.
    expect(find.text('Paid'), findsNothing);
    expect(find.text('Open'), findsOneWidget);
    await tester.enterText(find.byType(EditableText).first, 'do');
    await frames(tester, 5);
    expect(find.text('Open'), findsNothing);
    await tester.tap(textButton('Done'));
    await frames(tester);
    expect(_state(tester).values['status'], const FilterText('done'));
    expect(_state(tester).pinned, ['status']);
    // Chip summary uses the choice label.
    expect(find.text('Done'), findsOneWidget);

    // Reopen from the chip and clear.
    await tester.tap(button('Edit Status filter'));
    await frames(tester);
    await tester.tap(textButton('Clear value'));
    await frames(tester);
    expect(_state(tester).values['status'], isNull);
    expect(_state(tester).pinned, ['status']);
    await finish(tester);
  }, variant: macOS);

  testWidgets('date ranges are edited in a dialog and validated', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const _Harness()));
    await tester.tap(button('Choose filters'));
    await frames(tester);
    await tester.tap(textButton('Created'));
    await frames(tester);
    final fields = find.byType(EditableText);
    expect(fields, findsNWidgets(2));
    await tester.enterText(fields.at(0), '2026-05-10');
    await tester.enterText(fields.at(1), '2026-05-01');
    await tester.pump();
    await tester.tap(textButton('Apply filter'));
    await frames(tester);
    expect(find.text('The end must be on or after the start.'), findsOneWidget);
    expect(_state(tester).values['created'], isNull);

    await tester.enterText(fields.at(1), '2026-05-20');
    await tester.pump();
    await tester.tap(textButton('Apply filter'));
    await frames(tester);
    expect(
      _state(tester).values['created'],
      const FilterRange(from: '2026-05-10', to: '2026-05-20'),
    );
    expect(find.text('2026-05-10 → 2026-05-20'), findsOneWidget);
    await finish(tester);
  }, variant: macOS);

  testWidgets('single dates use the value menu with min checks', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const _Harness()));
    await tester.tap(button('Choose filters'));
    await frames(tester);
    await tester.tap(textButton('Day'));
    await frames(tester);
    await tester.enterText(find.byType(EditableText).first, '2025-02-30');
    await tester.pump();
    await tester.tap(textButton('Apply'));
    await frames(tester, 5);
    expect(find.text('Enter a valid date or time.'), findsOneWidget);
    await tester.enterText(find.byType(EditableText).first, '2025-12-31');
    await tester.pump();
    await tester.tap(textButton('Apply'));
    await frames(tester, 5);
    expect(find.text('Use a value on or after 2026-01-01.'), findsOneWidget);
    await tester.enterText(find.byType(EditableText).first, '2026-03-02');
    await tester.pump();
    await tester.tap(textButton('Apply'));
    await frames(tester);
    expect(_state(tester).values['day'], const FilterText('2026-03-02'));
    await finish(tester);
  }, variant: macOS);

  testWidgets('custom filters render their own editor', (tester) async {
    final options = [
      FilterOption.custom(
        id: 'amount',
        label: 'Amount',
        renderEditor: (context, value, onChange) => Button(
          onClick: () => onChange(const FilterText('100')),
          children: const [Text('Set 100')],
        ),
        formatValue: (value) => '≥ ${(value! as FilterText).value} DA',
        validate: (value) => value == null ? 'Pick an amount.' : null,
      ),
    ];
    await tester.pumpWidget(_host(_Harness(options: options)));
    await tester.tap(button('Choose filters'));
    await frames(tester);
    await tester.tap(textButton('Amount'));
    await frames(tester);
    await tester.tap(textButton('Apply filter'));
    await frames(tester, 5);
    expect(find.text('Pick an amount.'), findsOneWidget);
    await tester.tap(textButton('Set 100'));
    await tester.pump();
    await tester.tap(textButton('Apply filter'));
    await frames(tester);
    expect(_state(tester).values['amount'], const FilterText('100'));
    expect(find.text('≥ 100 DA'), findsOneWidget);
    await finish(tester);
  }, variant: macOS);

  testWidgets('natural filters enable ids or show the thrown message', (
    tester,
  ) async {
    Future<List<String>> parse(String text) async {
      if (text == 'bad') throw const FilterError('Not understood.');
      if (text == 'status') return ['status'];
      return ['urgent'];
    }

    await tester.pumpWidget(_host(_Harness(natural: parse)));
    await tester.tap(button('Create filter from natural language'));
    await frames(tester);
    expect(find.text('Available: Paid, Urgent.'), findsOneWidget);
    await tester.enterText(find.byType(EditableText).first, 'bad');
    await tester.pump();
    await tester.tap(textButton('Apply filters'));
    await frames(tester);
    expect(find.text('Not understood.'), findsOneWidget);

    await tester.enterText(find.byType(EditableText).first, 'status');
    await tester.pump();
    await tester.tap(textButton('Apply filters'));
    await frames(tester);
    expect(find.text('Choose a supported on/off filter.'), findsOneWidget);

    await tester.enterText(find.byType(EditableText).first, 'urgent ones');
    await tester.pump();
    await tester.tap(textButton('Apply filters'));
    await frames(tester);
    expect(_state(tester).value, ['urgent']);
    expect(_state(tester).pinned, ['urgent']);
    expect(find.text('Describe what you want'), findsNothing);
    await finish(tester);
  }, variant: macOS);

  testWidgets('trailing sits at the end of its line, mirrored in RTL', (
    tester,
  ) async {
    const trailing = SizedBox(key: Key('trailing'), width: 80, height: 46);
    await tester.pumpWidget(_host(const _Harness(trailing: trailing)));
    await frames(tester, 2);
    final bar = tester.getRect(find.byType(FilterBar));
    expect(tester.getRect(find.byKey(const Key('trailing'))).right, bar.right);
    await tester.pumpWidget(
      _host(const _Harness(trailing: trailing), direction: TextDirection.rtl),
    );
    await frames(tester, 2);
    expect(tester.getRect(find.byKey(const Key('trailing'))).left, bar.left);
    await finish(tester);
  }, variant: macOS);
}
