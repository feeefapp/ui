import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/scroll.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('wash dithering, edge opacities and reserves match the web kit', () {
    for (final wash in fixture['wash'] as List) {
      expect(
        scrollWashLevels(wash['columns'], wash['rows']).toList(),
        wash['levels'],
      );
    }
    for (final e in fixture['edges'] as List) {
      final o = scrollEdgeOpacities(n(e[0]), n(e[1]));
      expect(o.top, closeTo(n(e[2]['top']), 1e-12));
      expect(o.bottom, closeTo(n(e[2]['bottom']), 1e-12));
    }
    for (final r in fixture['reserve'] as List) {
      expect(scrollContentReserve(n(r[0]), n(r[1]), n(r[2])), n(r[3]));
    }
  });

  testWidgets('keyboard focus scrolls a row clear of the floats', (
    tester,
  ) async {
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    addTearDown(
      () => FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.automatic,
    );
    final nodes = [for (var i = 0; i < 30; i++) FocusNode()];
    addTearDown(() {
      for (final node in nodes) {
        node.dispose();
      }
    });
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          height: 300,
          child: ScrollArea(
            label: 'Orders',
            top: const SizedBox(width: 200, height: 46),
            bottom: const SizedBox(width: 200, height: 50),
            child: Column(
              children: [
                for (var i = 0; i < 30; i++)
                  Focus(
                    focusNode: nodes[i],
                    child: SizedBox(height: 40, child: Text('Row $i')),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    final area = tester.getRect(find.byType(ScrollArea));
    nodes[12].requestFocus();
    await tester.pumpAndSettle();
    final row = tester.getRect(find.text('Row 12'));
    // Below the bottom float's reservation: 50 + G + G (the shell gap, 8) from the bottom edge.
    expect(row.bottom, lessThanOrEqualTo(area.bottom - 66 + 0.5));
    nodes[2].requestFocus();
    await tester.pumpAndSettle();
    expect(
      tester.getRect(find.text('Row 2')).top,
      greaterThanOrEqualTo(area.top + 62 - 0.5),
    );
  });

  testWidgets('floats are measured and reserved as content padding', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          height: 300,
          child: ScrollArea(
            label: 'Orders',
            top: const SizedBox(width: 200, height: 46),
            bottom: const SizedBox(width: 200, height: 50),
            child: Column(
              children: [
                for (var i = 0; i < 30; i++)
                  SizedBox(height: 40, child: Text('Row $i')),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    final area = tester.getRect(find.byType(ScrollArea));
    // 46px float + the shell gap G (8) above and below.
    expect(tester.getTopLeft(find.text('Row 0')).dy - area.top, 62);
    await tester.drag(find.byType(ScrollArea), const Offset(0, -5000));
    await tester.pumpAndSettle();
    // At the end, the last row clears the 50px dock and its gaps.
    expect(
      area.bottom - tester.getBottomLeft(find.text('Row 29')).dy,
      closeTo(66, 0.5),
    );
  });

  testWidgets(
    'edge gap and content padding default to the theme\'s shell gap',
    (tester) async {
      await tester.pumpWidget(
        host(
          const SizedBox(
            width: 400,
            height: 300,
            child: ScrollArea(
              label: 'Orders',
              top: SizedBox(width: 200, height: 46),
              child: Text('Row 0'),
            ),
          ),
          config: const ThemeConfig(metrics: Metrics(shellGap: 12)),
        ),
      );
      await tester.pump();
      final area = tester.getRect(find.byType(ScrollArea));
      final row = tester.getTopLeft(find.text('Row 0'));
      expect(row.dy - area.top, 46 + 12 * 2);
      expect(row.dx - area.left, 12);
    },
  );
}
