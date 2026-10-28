import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/list.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('swipe landings and reorder targets match the web kit', () {
    for (final r in fixture['release'] as List) {
      final sides = SwipeSides(
        leading: 76,
        trailing: 152,
        row: 360,
        fullTrailing: r[2] as bool,
      );
      final landing = swipeRelease(n(r[0]), n(r[1]), sides);
      expect(landing.offset, n(r[3]['offset']));
      expect(landing.commit?.name, r[3]['commit']);
      expect(swipeIsFull(n(r[0]), sides), r[4]);
    }
    const heights = [56.0, 64.0, 56.0, 72.0];
    for (final r in fixture['reorder'] as List) {
      final from = r[0] as int;
      final to = reorderTarget(heights, from, n(r[1]));
      expect(to, r[2]);
      expect(reorderShifts(heights, from, to), [for (final v in r[3]) n(v)]);
      expect(reorderLanding(heights, from, to), n(r[4]));
    }
  });

  testWidgets('trailing is capped at 45% of the row it is in, not of 360px', (
    tester,
  ) async {
    Future<double> trailingWidth(double rowWidth) async {
      const trailing = Key('trailing');
      await tester.pumpWidget(
        host(
          SizedBox(
            width: rowWidth,
            child: const ListSection(
              children: [
                ListRow(
                  title: Text('Cash on hand'),
                  trailing: SizedBox(key: trailing, width: 250, height: 20),
                ),
              ],
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      return tester.getSize(find.byKey(trailing)).width;
    }

    // Wide rows give trailing its full 250px (it used to be capped at 162px and overflow).
    expect(await trailingWidth(1000), 250);
    // Narrow rows still cap it: 45% of the 360px row's content box (inside its 16px insets).
    expect(await trailingWidth(360), closeTo((360 - 32) * 0.45, 0.01));
  });

  testWidgets('selected neighbours alternate tints with no hairline between', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        const SizedBox(
          width: 360,
          child: ListSection(
            children: [
              ListRow(title: Text('A'), selected: true),
              ListRow(title: Text('B'), selected: true),
              ListRow(title: Text('C'), selected: true),
              ListRow(title: Text('D')),
            ],
          ),
        ),
      ),
    );
    Color? fill(String title) {
      final box = tester.widget<DecoratedBox>(
        find
            .ancestor(of: find.text(title), matching: find.byType(DecoratedBox))
            .first,
      );
      return (box.decoration as BoxDecoration).color;
    }

    // Each row stays distinct inside the run; the pattern alternates.
    expect(fill('A'), isNot(fill('B')));
    expect(fill('A'), fill('C'));
    // Hairlines: none inside the selected run, one before the unselected row.
    final line = ThemeProvider.of(
      tester.element(find.text('A')),
    ).colors.line;
    expect(
      find.byWidgetPredicate((w) => w is ColoredBox && w.color == line),
      findsOneWidget,
    );
  });

  testWidgets('a long swipe runs the first trailing action', (tester) async {
    var archived = 0;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 360,
          child: ListSection(
            children: [
              ListRow(
                title: const Text('Order #1042'),
                onClick: () {},
                trailingActions: [
                  RowAction(label: 'Archive', onAction: () => archived++),
                  RowAction(label: 'Delete', onAction: () {}),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    await tester.drag(find.text('Order #1042'), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(archived, 1);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a short swipe reveals the actions; a tap closes the row', (
    tester,
  ) async {
    var opened = 0;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 360,
          child: ListSection(
            children: [
              ListRow(
                title: const Text('Order #1042'),
                onClick: () => opened++,
                trailingActions: [RowAction(label: 'Archive', onAction: () {})],
              ),
            ],
          ),
        ),
      ),
    );
    await tester.drag(find.text('Order #1042'), const Offset(-60, 0));
    await tester.pumpAndSettle();
    expect(find.text('Archive'), findsOneWidget);
    await tester.tap(find.text('Order #1042'));
    await tester.pumpAndSettle();
    expect(opened, 0, reason: 'the tap closed the row instead of opening it');
    expect(find.text('Archive'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('the grip moves a row with the arrow keys', (tester) async {
    final moves = <(int, int)>[];
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 360,
          child: ListSection(
            label: 'Steps',
            onReorder: (from, to) => moves.add((from, to)),
            children: const [
              ListRow(title: Text('Confirm')),
              ListRow(title: Text('Pack')),
              ListRow(title: Text('Ship')),
            ],
          ),
        ),
      ),
    );
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    expect(moves, [(0, 1)]);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
