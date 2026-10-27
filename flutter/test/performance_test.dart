import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  PerformanceTier auto(DeviceTraits traits) =>
      resolvePerformance(Performance.auto, traits);

  test('native devices get everything unless they are very weak', () {
    expect(
      auto(const DeviceTraits(web: false, cores: 8)),
      PerformanceTier.full,
    );
    expect(
      auto(const DeviceTraits(web: false, cores: 4)),
      PerformanceTier.full,
    );
    expect(auto(const DeviceTraits(web: false)), PerformanceTier.full);
    expect(
      auto(const DeviceTraits(web: false, cores: 2)),
      PerformanceTier.light,
    );
  });

  test('the web never merges, and steps down on weak devices', () {
    expect(
      auto(const DeviceTraits(web: true, cores: 10, memoryGb: 8)),
      PerformanceTier.balanced,
    );
    expect(auto(const DeviceTraits(web: true)), PerformanceTier.balanced);
    expect(
      auto(const DeviceTraits(web: true, cores: 4, memoryGb: 8)),
      PerformanceTier.light,
    );
    // A renderer on its own thread copes with few cores, not with little memory.
    expect(
      auto(
        const DeviceTraits(web: true, cores: 4, memoryGb: 8, threaded: true),
      ),
      PerformanceTier.balanced,
    );
    expect(
      auto(const DeviceTraits(web: true, cores: 12, memoryGb: 4)),
      PerformanceTier.light,
    );
  });

  test('an app setting wins over the device', () {
    const weak = DeviceTraits(web: true, cores: 2, memoryGb: 2);
    expect(resolvePerformance(Performance.full, weak), PerformanceTier.full);
    expect(
      resolvePerformance(Performance.balanced, weak),
      PerformanceTier.balanced,
    );
    expect(
      resolvePerformance(Performance.light, const DeviceTraits(web: false)),
      PerformanceTier.light,
    );
  });

  test('what each tier keeps', () {
    expect(PerformanceTier.full.merge, isTrue);
    expect(PerformanceTier.balanced.merge, isFalse);
    expect(PerformanceTier.balanced.pointerLight, isTrue);
    expect(PerformanceTier.light.pointerLight, isFalse);
    expect(PerformanceTier.light.ambientMotion, isFalse);
    expect(PerformanceTier.balanced.backdrop, isTrue);
    expect(PerformanceTier.light.backdrop, isFalse);
    expect(PerformanceTier.balanced.decoration, isTrue);
    expect(PerformanceTier.light.decoration, isFalse);
  });

  test('a browser without a hardware GPU is light', () {
    expect(
      auto(
        const DeviceTraits(
          web: true,
          cores: 16,
          memoryGb: 8,
          softwareGpu: true,
        ),
      ),
      PerformanceTier.light,
    );
  });

  test('a device measured slow steps auto down, never a fixed tier', () {
    const strong = DeviceTraits(web: true, cores: 16, memoryGb: 8);
    expect(
      resolvePerformance(Performance.auto, strong, slow: true),
      PerformanceTier.light,
    );
    expect(
      resolvePerformance(Performance.full, strong, slow: true),
      PerformanceTier.full,
    );
  });

  group('MeasuredPerformance', () {
    tearDown(MeasuredPerformance.forget);

    const fast = Duration(milliseconds: 9);
    const slow = Duration(milliseconds: 40);
    final window = MeasuredPerformance.window;

    test('two slow windows in a row mark the device slow', () {
      MeasuredPerformance.debugReport(List.filled(window, slow));
      expect(MeasuredPerformance.slow.value, isFalse);
      MeasuredPerformance.debugReport(List.filled(window, slow));
      expect(MeasuredPerformance.slow.value, isTrue);
    });

    test('a fast window in between starts over', () {
      MeasuredPerformance.debugReport([
        ...List.filled(window, slow),
        ...List.filled(window, fast),
        ...List.filled(window, slow),
      ]);
      expect(MeasuredPerformance.slow.value, isFalse);
    });

    test('a few long frames (a page transition) are not slowness', () {
      final frames = [
        ...List.filled(window ~/ 3, slow),
        ...List.filled(window - window ~/ 3, fast),
      ];
      MeasuredPerformance.debugReport([...frames, ...frames, ...frames]);
      expect(MeasuredPerformance.slow.value, isFalse);
    });
  });

  testWidgets('light glass is opaque and the theme follows a slow device', (
    tester,
  ) async {
    addTearDown(MeasuredPerformance.forget);
    late BuildContext inner;
    await tester.pumpWidget(
      ThemeProvider(
        config: const ThemeConfig(performance: Performance.light),
        child: Builder(
          builder: (context) {
            inner = context;
            return const SizedBox();
          },
        ),
      ),
    );
    expect(glassStyleOf(inner), GlassStyle.solid);

    late BuildContext autoContext;
    await tester.pumpWidget(
      ThemeProvider(
        config: const ThemeConfig(performance: Performance.full),
        child: ThemeProvider(
          child: Builder(
            builder: (context) {
              autoContext = context;
              return const SizedBox();
            },
          ),
        ),
      ),
    );
    final before = performanceOf(autoContext);
    MeasuredPerformance.debugReport(
      List.filled(
        MeasuredPerformance.window * 2,
        const Duration(milliseconds: 40),
      ),
    );
    await tester.pump();
    expect(before, isNot(PerformanceTier.light));
    expect(performanceOf(autoContext), PerformanceTier.light);
    expect(glassStyleOf(autoContext), GlassStyle.solid);
  });

  testWidgets(
    'outside a theme, a scope rebuilds readers when the device measures slow',
    (tester) async {
      addTearDown(MeasuredPerformance.forget);
      final seen = <PerformanceTier>[];
      await tester.pumpWidget(
        MeasuredPerformanceScope(
          child: Builder(
            builder: (context) {
              seen.add(performanceOf(context));
              return const SizedBox();
            },
          ),
        ),
      );
      MeasuredPerformance.debugReport(
        List.filled(
          MeasuredPerformance.window * 2,
          const Duration(milliseconds: 40),
        ),
      );
      await tester.pump();
      expect(seen.last, PerformanceTier.light);
      expect(seen.length, 2);
    },
  );
}
