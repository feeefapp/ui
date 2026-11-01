import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('niceScale', () {
    test('round ticks that cover the max, at most 4 intervals', () {
      for (final max in [1.0, 7.0, 32.0, 99.0, 113.0, 300.0, 1234.0, 61200.0]) {
        final s = niceScale(max);
        expect(s.top, greaterThanOrEqualTo(max));
        expect(s.ticks.first, 0);
        expect(s.ticks.last, s.top);
        expect(s.ticks.length - 1, lessThanOrEqualTo(4), reason: '$max');
      }
      expect(niceScale(32).ticks, [0, 10, 20, 30, 40]);
      expect(niceScale(0).top, 1);
    });

    test('compact and grouped figures', () {
      expect(compactNumber(950), '950');
      expect(compactNumber(1200), '1.2k');
      expect(compactNumber(12000), '12k');
      expect(compactNumber(1500000), '1.5M');
      expect(compactNumber(0.5), '0.5');
      expect(groupedNumber(612400), '612,400');
      expect(groupedNumber(-1284.5, decimals: 1), '-1,284.5');
    });
  });

  testWidgets('BarChart and stat widgets render in RTL without overflow', (tester) async {
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
                  BarChart(
                    labels: [for (var i = 1; i <= 30; i++) '$i/10'],
                    bars: [
                      BarSeries(label: 'a', values: List.filled(30, 12), color: const Color(0xFF2F7D46)),
                      BarSeries(label: 'b', values: List.filled(30, 4), color: const Color(0xFFB4322B)),
                    ],
                    lines: [
                      LineSeries(label: 'prev', values: List.filled(30, 14), color: const Color(0xFF888888), dashed: true),
                    ],
                  ),
                  const StatTile(
                    label: 'الطلبات',
                    value: '1,284',
                    delta: DeltaChip(text: '12%', tone: DeltaTone.positive, up: true),
                    chart: SegmentMeter(decided: 0.6, pending: 0.4),
                    footer: 'مقابل 1,140',
                  ),
                  const RankedRow(label: 'الجزائر', value: '113', fraction: 1, rate: '81%'),
                  const Sparkline(values: [1, 3, 2, 5]),
                  const ChartLegend(items: [('سُلّمت', Color(0xFF2F7D46), false)]),
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
