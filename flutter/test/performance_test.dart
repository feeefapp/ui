import 'package:feeef_ui/feeef_ui.dart';
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
  });
}
