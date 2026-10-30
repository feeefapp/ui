// Timing harness for the glass engine and the outline cache (not a correctness test; it only
// prints). Run with `flutter test test/dev/glass_bench_test.dart --dart-define=bench=true`.
// ignore_for_file: avoid_print
import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/geometry.dart';
import 'package:feeef_ui/glass/hairline.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const _enabled = bool.fromEnvironment('bench');

void main() {
  test('outline cache: 2000 superellipse paths', () {
    final sw = Stopwatch()..start();
    for (var i = 0; i < 2000; i++) {
      superellipsePath(const Rect.fromLTWH(0, 0, 120, 36), const [
        18,
        18,
        18,
        18,
      ]);
    }
    print(
      'BENCH superellipsePath x2000 (same box): ${sw.elapsedMicroseconds / 2000} us each',
    );
    sw.reset();
    for (var i = 0; i < 2000; i++) {
      superellipsePath(Rect.fromLTWH(0, 0, 120 + i * 0.01, 36), const [
        18,
        18,
        18,
        18,
      ]);
    }
    print(
      'BENCH superellipsePath x2000 (changing box): ${sw.elapsedMicroseconds / 2000} us each',
    );
  }, skip: !_enabled);

  test('geometry: hairline bands of a lone 300x44 bubble', () {
    const shape = GlassShape(x: 10, y: 10, width: 300, height: 44, radius: 22);
    final sw = Stopwatch()..start();
    for (var i = 0; i < 50; i++) {
      hairlineBands([shape], 16);
    }
    print(
      'BENCH hairlineBands (field walk) x50: ${sw.elapsedMicroseconds / 50} us each',
    );
    sw.reset();
    for (var i = 0; i < 50; i++) {
      final outline = clusterOutline([shape], 16);
      hairlineBandsOfLoops(outline.loops, [shape], 16, settle: false);
    }
    print(
      'BENCH clusterOutline + hairlineBandsOfLoops x50: ${sw.elapsedMicroseconds / 50} us each',
    );
  }, skip: !_enabled);

  testWidgets('frames: press and hover over a toolbar of six bubbles', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: ThemeProvider(
          config: const ThemeConfig(performance: Performance.full),
          child: Center(
            child: GlassContainer(
              spacing: 16,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 10,
                children: [
                  for (var g = 0; g < 6; g++)
                    ToolbarGroup(
                      label: 'Group $g',
                      children: [
                        for (var b = 0; b < 3; b++)
                          IconButton(
                            key: ValueKey('b$g-$b'),
                            appearance: ButtonAppearance.toolbar,
                            ariaLabel: 'Button $g $b',
                            onClick: () {},
                            icon: const LucideBold(),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));

    // A press swells a bubble: every frame moves its glass.
    final at = tester.getCenter(find.byKey(const ValueKey('b0-1')));
    final sw = Stopwatch()..start();
    final gesture = await tester.startGesture(at);
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    await gesture.up();
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    print('BENCH press: 60 frames in ${sw.elapsedMilliseconds} ms');
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 500));
    }
    var turns = 0;
    GlassContainer.debugLightOf(find.byType(GlassContainer).evaluate().first)
        .addListener(() => turns++);

    // A mouse sweeping across the window: how many frames the light asks for.
    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: const Offset(0, 100));
    await tester.pump();
    var frames = 0;
    sw.reset();
    for (var x = 0; x <= 1200; x += 3) {
      await mouse.moveTo(Offset(x.toDouble(), 100));
      if (tester.binding.hasScheduledFrame) {
        frames++;
        await tester.pump();
      }
    }
    print(
      'BENCH hover sweep (400 moves, 700 px from the glass): $frames frames, $turns light turns, ${sw.elapsedMilliseconds} ms',
    );
    frames = 0;
    turns = 0;
    sw.reset();
    for (var x = 0; x <= 1200; x += 3) {
      await mouse.moveTo(Offset(x.toDouble(), 430));
      if (tester.binding.hasScheduledFrame) {
        frames++;
        await tester.pump();
      }
    }
    print(
      'BENCH hover sweep (400 moves, 30 px from the glass): $frames frames, $turns light turns, ${sw.elapsedMilliseconds} ms',
    );
    await mouse.removePointer();
  }, skip: !_enabled);
}
