import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

GridPlacement p(String id, int x, int y, int w, int h) =>
    GridPlacement(id: id, x: x, y: y, w: w, h: h);

GridPlacement of(List<GridPlacement> items, String id) =>
    items.firstWhere((i) => i.id == id);

void main() {
  group('GridLayout', () {
    test('compact raises widgets into holes and keeps the input order', () {
      final out = GridLayout.compact([
        p('a', 0, 3, 6, 2),
        p('b', 6, 0, 6, 2),
      ], columns: 12);
      expect(out.map((i) => i.id), ['a', 'b']);
      expect(of(out, 'a').y, 0);
      expect(of(out, 'b').y, 0);
    });

    test('compact keepOrderOf settles that widget first so it claims its cell', () {
      final out = GridLayout.compact([
        p('a', 0, 4, 6, 2),
        p('b', 0, 1, 6, 2),
      ], columns: 12, keepOrderOf: 'a');
      // a is processed first and rises to y=0; b then takes the next free row.
      expect(of(out, 'a').y, 0);
      expect(of(out, 'b').y, 2);
    });

    test('expandIntoGaps grows an orphan into the empty columns beside it', () {
      final out = GridLayout.expandIntoGaps([
        p('map', 0, 0, 6, 4),
      ], columns: 12);
      expect(of(out, 'map').w, 12);
      expect(of(out, 'map').x, 0);
    });

    test('expandIntoGaps only grows listed ids', () {
      final out = GridLayout.expandIntoGaps([
        p('map', 0, 0, 6, 4),
        p('kpi', 0, 4, 3, 2),
      ], columns: 12, ids: {'map'});
      expect(of(out, 'map').w, 12);
      expect(of(out, 'kpi').w, 3);
    });

    test('moving onto a widget pushes it down; nothing overlaps', () {
      final start = [
        p('a', 0, 0, 6, 2),
        p('b', 6, 0, 6, 2),
        p('c', 0, 2, 12, 2),
      ];
      final out = GridLayout.move(start, 'c', p('c', 0, 0, 12, 2), columns: 12);
      expect(of(out, 'c').y, 0);
      expect(of(out, 'a').y, 2);
      expect(of(out, 'b').y, 2);
      for (final a in out) {
        for (final b in out) {
          if (a.id != b.id) expect(a.overlaps(b), isFalse, reason: '$a $b');
        }
      }
    });

    test('dragging down onto the widget below swaps them', () {
      final start = [p('a', 0, 0, 12, 2), p('b', 0, 2, 12, 2)];
      final out = GridLayout.move(start, 'a', p('a', 0, 3, 12, 2), columns: 12);
      expect(of(out, 'b').y, 0);
      expect(of(out, 'a').y, 2);
    });

    test('resizing wider pushes the neighbour below, not out of the grid', () {
      final start = [p('a', 0, 0, 6, 2), p('b', 6, 0, 6, 2)];
      final out = GridLayout.move(start, 'a', p('a', 0, 0, 9, 2), columns: 12);
      expect(of(out, 'a').w, 9);
      expect(of(out, 'b').y, 2);
    });

    test('targets are clamped to the grid', () {
      final out = GridLayout.move(
        [p('a', 0, 0, 4, 2)],
        'a',
        p('a', 10, -3, 4, 2),
        columns: 12,
      );
      expect(of(out, 'a').x, 8);
      expect(of(out, 'a').y, 0);
    });

    test('add finds the first free spot', () {
      final out = GridLayout.add(
        [p('a', 0, 0, 8, 2)],
        p('b', 0, 0, 4, 2),
        columns: 12,
      );
      expect(of(out, 'b').x, 8);
      expect(of(out, 'b').y, 0);
    });

    test('reflow packs a wide layout into fewer columns in reading order', () {
      final out = GridLayout.reflow(
        [p('a', 0, 0, 3, 2), p('b', 3, 0, 3, 2), p('c', 6, 0, 6, 4)],
        columns: 4,
        widthFor: (i) => i.w <= 3 ? 2 : 4,
      );
      expect(of(out, 'a').x, 0);
      expect(of(out, 'b').x, 2);
      expect(of(out, 'b').y, 0);
      expect(of(out, 'c').y, 2);
      expect(GridLayout.height(out), 6);
    });

    test('size limits clamp to the grid and to their bounds', () {
      const limits = GridSizeLimits(minW: 3, minH: 2, maxH: 6);
      expect(limits.clamp(1, 1, 12), (3, 2));
      expect(limits.clamp(20, 9, 12), (12, 6));
      expect(limits.clamp(3, 2, 2), (2, 2));
    });

    test('placements round-trip through JSON', () {
      final a = p('a', 1, 2, 3, 4);
      expect(GridPlacement.fromJson(a.toJson()), a);
      expect(GridPlacement.fromJson({'id': 'x'}), isNull);
    });
  });

  testWidgets(
    'DashboardGrid drags a tile onto another and reports the new layout',
    (tester) async {
      List<GridPlacement>? reported;
      var layout = [
        p('a', 0, 0, 6, 2),
        p('b', 6, 0, 6, 2),
        p('c', 0, 2, 12, 2),
      ];
      await tester.pumpWidget(
        ThemeProvider(
          config: const ThemeConfig(),
          brightness: Brightness.light,
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 1200,
                child: StatefulBuilder(
                  builder: (context, setState) => DashboardGrid(
                    columns: 12,
                    rowHeight: 50,
                    gap: 10,
                    editing: true,
                    layout: layout,
                    onLayoutChanged: (next) =>
                        setState(() => layout = reported = next),
                    onRemove: (_) {},
                    tiles: [
                      for (final id in ['a', 'b', 'c'])
                        DashboardTile(id: id, label: id, child: Text(id)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      // Drag c (full width, second band) up to the top with a mouse (drags right away).
      // Arrange-mode jiggle is an infinite ticker — pump frames, don't pumpAndSettle.
      await tester.dragFrom(
        const Offset(600, 160),
        const Offset(0, -120),
        kind: PointerDeviceKind.mouse,
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 220));
      expect(tester.takeException(), isNull);
      expect(reported, isNotNull);
      expect(of(reported!, 'c').y, 0);
      expect(of(reported!, 'a').y, 2);
    },
  );

  Widget touchBoard({
    required bool Function() editing,
    required void Function() onEdit,
    required List<GridPlacement> Function() layout,
    required ValueChanged<List<GridPlacement>> onChanged,
  }) => ThemeProvider(
    config: const ThemeConfig(),
    brightness: Brightness.light,
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: Align(
        alignment: Alignment.topLeft,
        child: SizedBox(
          width: 400,
          child: StatefulBuilder(
            builder: (context, setState) => DashboardGrid(
              columns: 4,
              rowHeight: 50,
              gap: 10,
              editing: editing(),
              layout: layout(),
              onEditRequest: () => setState(onEdit),
              onLayoutChanged: (next) => setState(() => onChanged(next)),
              onRemove: (_) {},
              tiles: [
                for (final id in ['a', 'b', 'c'])
                  DashboardTile(id: id, label: id, child: Text(id)),
              ],
            ),
          ),
        ),
      ),
    ),
  );

  testWidgets(
    'touch: a long press outside editing enters editing and carries the tile',
    (tester) async {
      var editing = false;
      List<GridPlacement>? reported;
      var layout = [p('a', 0, 0, 4, 2), p('b', 0, 2, 4, 2), p('c', 0, 4, 4, 2)];
      await tester.pumpWidget(
        touchBoard(
          editing: () => editing,
          onEdit: () => editing = true,
          layout: () => layout,
          onChanged: (next) => layout = reported = next,
        ),
      );
      // Hold on c, then move it to the top in the same gesture.
      final g = await tester.startGesture(const Offset(200, 280));
      await tester.pump(kLongPressTimeout + const Duration(milliseconds: 50));
      expect(editing, isTrue);
      for (var i = 0; i < 6; i++) {
        await g.moveBy(const Offset(0, -45));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g.up();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 220));
      expect(tester.takeException(), isNull);
      expect(reported, isNotNull);
      expect(of(reported!, 'c').y, 0);
    },
  );

  testWidgets('touch: while editing a short hold picks a tile up', (
    tester,
  ) async {
    List<GridPlacement>? reported;
    var layout = [p('a', 0, 0, 4, 2), p('b', 0, 2, 4, 2), p('c', 0, 4, 4, 2)];
    await tester.pumpWidget(
      touchBoard(
        editing: () => true,
        onEdit: () {},
        layout: () => layout,
        onChanged: (next) => layout = reported = next,
      ),
    );
    final g = await tester.startGesture(const Offset(200, 280));
    await tester.pump(const Duration(milliseconds: 250));
    for (var i = 0; i < 6; i++) {
      await g.moveBy(const Offset(0, -45));
      await tester.pump(const Duration(milliseconds: 16));
    }
    await g.up();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 220));
    expect(tester.takeException(), isNull);
    expect(of(reported!, 'c').y, 0);
  });

  testWidgets('touch: the corner grip resizes right away', (tester) async {
    List<GridPlacement>? reported;
    var layout = [p('a', 0, 0, 2, 2), p('b', 2, 0, 2, 2)];
    await tester.pumpWidget(
      touchBoard(
        editing: () => true,
        onEdit: () {},
        layout: () => layout,
        onChanged: (next) => layout = reported = next,
      ),
    );
    // a is 195×110; its grip sits on the bottom-right corner.
    await tester.dragFrom(const Offset(185, 100), const Offset(0, 120));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 220));
    expect(tester.takeException(), isNull);
    expect(of(reported!, 'a').h, greaterThan(2));
  });

  testWidgets('Heatmap and DonutChart lay out in RTL', (tester) async {
    await tester.pumpWidget(
      ThemeProvider(
        config: const ThemeConfig(),
        brightness: Brightness.light,
        child: Directionality(
          textDirection: TextDirection.rtl,
          child: Center(
            child: SizedBox(
              width: 360,
              child: Column(
                children: [
                  Heatmap(
                    values: [
                      for (var r = 0; r < 7; r++)
                        [for (var h = 0; h < 24; h++) (r * h % 9).toDouble()],
                    ],
                    rowLabels: const ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'],
                    columnLabels: const {0: '0', 6: '6', 12: '12', 18: '18'},
                    color: const Color(0xFF2F7D46),
                  ),
                  const SizedBox(
                    width: 140,
                    child: DonutChart(
                      centerValue: '318',
                      centerLabel: 'طلب',
                      parts: [
                        ProportionPart(
                          label: 'a',
                          value: 176,
                          color: Color(0xFF2F7D46),
                        ),
                        ProportionPart(
                          label: 'b',
                          value: 0,
                          color: Color(0xFF888888),
                        ),
                        ProportionPart(
                          label: 'c',
                          value: 71,
                          color: Color(0xFF999999),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });
}
