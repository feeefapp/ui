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
    // 46px float + 12px gap above and below.
    expect(tester.getTopLeft(find.text('Row 0')).dy - area.top, 70);
    await tester.drag(find.byType(ScrollArea), const Offset(0, -5000));
    await tester.pumpAndSettle();
    // At the end, the last row clears the 50px dock and its gaps.
    expect(
      area.bottom - tester.getBottomLeft(find.text('Row 29')).dy,
      closeTo(74, 0.5),
    );
  });
}
