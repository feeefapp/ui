import 'package:flutter/foundation.dart';
import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  group('SizeTokens', () {
    test(
      'comfortable is the iOS 26 control scale; compact and thin step down',
      () {
        final comfortable = SizeTokens.of(const ThemeConfig());
        expect(
          [
            comfortable.controlSmall,
            comfortable.controlHeight,
            comfortable.controlLarge,
          ],
          [30, 36, 52],
        );
        expect(
          [
            comfortable.controlPaddingSmall,
            comfortable.controlPadding,
            comfortable.controlPaddingLarge,
          ],
          [10, 12, 20],
        );
        expect(
          [
            comfortable.controlFontSmall,
            comfortable.controlFont,
            comfortable.controlFontLarge,
          ],
          [15, 17, 17],
        );
        expect(comfortable.toolbarItem, 44);
        expect(comfortable.toolbarControl, 38);
        expect(comfortable.toolbarGap, 12);
        expect(comfortable.toolbarInset, 16);
        expect(comfortable.segmentedInset, 2);
        expect([comfortable.switchWidth, comfortable.switchHeight], [63, 28]);
        expect([comfortable.thumbWidth, comfortable.thumbHeight], [37, 24]);
        expect(comfortable.sliderTrack, 6);
        expect(comfortable.listRowHeight, 54);
        expect(comfortable.listRadius, 26);
        expect(comfortable.listInset, 16);
        expect(
          [comfortable.fieldHeightSmall, comfortable.fieldHeight],
          [36, 44],
        );
        expect(comfortable.radiusControl, 18);
        expect(comfortable.radiusControlSmall, 15);
        expect(comfortable.focusRingWidth, 2);
        expect(comfortable.focusRingOffset, 1);

        final compact = SizeTokens.of(const ThemeConfig(density: .compact));
        // One step down: compact large = comfortable regular, compact regular = comfortable small.
        expect(compact.controlLarge, comfortable.controlHeight);
        expect(compact.controlHeight, comfortable.controlSmall);
        expect(compact.controlFont, comfortable.controlFontSmall);
        final thin = SizeTokens.of(const ThemeConfig(density: .thin));
        expect(
          [thin.controlSmall, thin.controlHeight, thin.controlLarge],
          [22, 26, 30],
        );
      },
    );

    test('control line heights are whole pixels', () {
      expect(SizeTokens.controlLine(17), 22);
      expect(SizeTokens.controlLine(15), 20);
      expect(SizeTokens.controlLine(13), 17);
      expect(SizeTokens.controlLine(12), 16);
    });

    test('metrics override single tokens for every density', () {
      const metrics = Metrics(
        controlHeight: MetricScale(regular: 44),
        toolbarItem: 48,
        switchSize: MetricSize(width: 51),
        listRadius: 10,
        focusRingWidth: 3,
      );
      for (final density in Density.values) {
        final s = SizeTokens.of(
          ThemeConfig(density: density, radius: 0.5, metrics: metrics),
        );
        expect(s.controlHeight, 44);
        expect(s.radiusControl, 11);
        expect(s.toolbarItem, 48);
        expect(s.toolbarControl, 42);
        expect(s.switchWidth, 51);
        expect(s.listRadius, 5);
        expect(s.focusRingWidth, 3);
      }
      // Unset values keep the density's.
      final s = SizeTokens.of(const ThemeConfig(metrics: metrics));
      expect(s.controlSmall, 30);
      expect(s.switchHeight, 28);
    });

    test('metrics take part in theme equality and copyWith', () {
      const a = ThemeConfig(metrics: Metrics(toolbarGap: 8));
      final b = const ThemeConfig().copyWith(
        metrics: const Metrics(toolbarGap: 8),
      );
      expect(a.metrics, b.metrics);
      expect(
        ThemeData(config: a, brightness: .light),
        ThemeData(config: b, brightness: .light),
      );
      expect(
        ThemeData(config: a, brightness: .light) ==
            ThemeData(config: const ThemeConfig(), brightness: .light),
        isFalse,
      );
    });
  });

  testWidgets('a metrics override resizes the controls', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
    await tester.pumpWidget(
      host(
        Button(onClick: () {}, children: const [Text('Save')]),
        config: const ThemeConfig(
          metrics: Metrics(controlHeight: MetricScale(regular: 40)),
        ),
      ),
    );
    expect(tester.getSize(find.byType(Button)).height, 40);
    debugDefaultTargetPlatformOverride = null;
  });

  group('keyboard focus ring', () {
    Widget segmented() => host(
      SegmentedControl<String>(
        label: 'View',
        value: 'list',
        onChange: (_) {},
        options: const [
          SegmentOption(value: 'list', label: 'List'),
          SegmentOption(value: 'board', label: 'Board'),
        ],
      ),
    );
    bool ringShown(WidgetTester tester) => tester
        .widgetList<FocusRing>(find.byType(FocusRing))
        .any((ring) => ring.visible);

    tearDown(() {
      FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.automatic;
    });

    testWidgets('shows for keyboard focus', (tester) async {
      FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(segmented());
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(ringShown(tester), isTrue);
    });

    testWidgets('stays hidden for touch focus', (tester) async {
      FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.alwaysTouch;
      await tester.pumpWidget(segmented());
      await tester.tap(find.text('Board'));
      await tester.pump();
      expect(ringShown(tester), isFalse);
    });

    testWidgets('hugs the shape; high contrast makes it strong', (
      tester,
    ) async {
      late FocusRingStyle normal, strong;
      await tester.pumpWidget(
        host(
          Builder(
            builder: (context) {
              normal = FocusRingStyle.of(context);
              return const SizedBox();
            },
          ),
        ),
      );
      final colors = ColorTokens.resolve(Palette.lab, Brightness.light);
      expect(normal.width, 2);
      expect(normal.offset, 1);
      expect(normal.color, colors.focusRing);
      await tester.pumpWidget(
        host(
          Builder(
            builder: (outer) => MediaQuery(
              data: MediaQuery.of(outer).copyWith(highContrast: true),
              child: Builder(
                builder: (context) {
                  strong = FocusRingStyle.of(context);
                  return const SizedBox();
                },
              ),
            ),
          ),
        ),
      );
      expect(strong.width, 3);
      expect(strong.offset, 2);
      expect(strong.color, colors.focus);
    });
  });
}
