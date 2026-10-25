import 'dart:ui' show Offset, Rect;

import 'package:feeef_ui/containers/tab_view_minimize.dart';
import 'package:flutter_test/flutter_test.dart';

/// The same vectors as `tests/tab-view-minimize.test.ts`.
const at = MinimizeBoxes(
  chrome: Rect.fromLTWH(0, 0, 374, 120),
  bar: Rect.fromLTWH(47, 60, 280, 60),
  track: 280,
  option: Rect.fromLTWH(51, 64, 72, 52),
  icon: Offset(0, 8),
  accessory: Rect.fromLTWH(0, 0, 374, 52),
  gap: 8,
  rtl: false,
);

MinimizeBoxes mirrored(MinimizeBoxes at) => MinimizeBoxes(
  chrome: at.chrome,
  bar: at.bar,
  track: at.track,
  option: at.option,
  icon: at.icon,
  accessory: at.accessory,
  gap: at.gap,
  rtl: true,
);

/// x, y and width of a placed accessory.
List<double> xyw(Rect r) => [r.left, r.top, r.width];

void main() {
  test('scrolling moves the progress continuously, both ways', () {
    expect(minimizeProgress(0, minimizeDistance / 4, 200), 0.25);
    expect(minimizeProgress(0.25, minimizeDistance / 4, 200), 0.5);
    expect(minimizeProgress(0.5, -10, 200), lessThan(0.5));
    expect(minimizeProgress(0.8, 4, 0), 0, reason: 'the top restores the bar');
    expect(
      minimizeProgress(0, 2, 2),
      2 / 24 < 2 / minimizeDistance ? 2 / 24 : 2 / minimizeDistance,
    );
    expect(minimizeProgress(0.98, 50, 400), 1);
  });

  test('rest and minimized ends', () {
    final full = minimizeGeometry(at, 0);
    expect(full.bar, const Rect.fromLTWH(47, 60, 280, 60));
    expect(xyw(full.accessory!), [0, 0, 374]);
    expect(full.trackShift.dx + 0, 0);
    expect(full.trackShift.dy + 0, 0);
    final min = minimizeGeometry(at, 1);
    // A 48pt circle centred on the bar's line (iOS 27).
    expect(min.bar, const Rect.fromLTWH(0, 66, 48, 48));
    expect(xyw(min.accessory!), [56, 64, 318]);
    // The selected tab's centre (4 + 36 = 40 from the bar's start, 30 down) ends at the circle's
    // (24, 24).
    expect(min.trackShift, const Offset(-16, -6));
    expect(min.icon, const Offset(0, 8));
  });

  test('the accessory never overlaps the shrinking bar', () {
    for (var i = 0; i <= 20; i++) {
      final f = minimizeGeometry(at, i / 20);
      final a = f.accessory!;
      if (a.top + at.accessory!.height > at.bar.top) {
        expect(
          a.left,
          greaterThanOrEqualTo(f.bar.right + at.gap - 1e-9),
          reason: 't=${i / 20}',
        );
      }
    }
  });

  test('right to left mirrors the ends', () {
    final min = minimizeGeometry(mirrored(at), 1);
    expect(min.bar, const Rect.fromLTWH(326, 66, 48, 48));
    expect(xyw(min.accessory!), [0, 64, 318]);
  });
}
