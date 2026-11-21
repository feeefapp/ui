import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart' as kit;
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

class _Stripes extends CustomPainter {
  @override
  void paint(Canvas c, Size size) {
    const colors = [
      Color(0xff162936),
      Color(0xffb15a74),
      Color(0xffdbb372),
      Color(0xff36a996),
      Color(0xffeeeeee),
      Color(0xff222222),
    ];
    for (int i = 0; i * 16 < size.width; i++) {
      c.drawRect(
        Rect.fromLTWH(i * 16.0, 0, 16, size.height),
        Paint()..color = colors[i % colors.length],
      );
    }
  }

  @override
  bool shouldRepaint(_Stripes old) => false;
}

// Captures of liquid_glass_renderer 1.0.0-dev.2 ios27Regular, frost: 0,
// at DPR 1. Exercise the kit from its normal entry point, including the
// backdrop-filter origin and the painter above it.
void main() {
  for (final brightness in Brightness.values) {
    testWidgets('regular capsule matches the reference in ${brightness.name}', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 160);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      await tester.runAsync(() async {
        GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
          'shaders/glass_refraction.frag',
        );
      });
      final boundary = GlobalKey();
      await tester.pumpWidget(
        WidgetsApp(
          color: const Color(0xff000000),
          builder: (context, _) => RepaintBoundary(
            key: boundary,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CustomPaint(painter: _Stripes()),
                kit.ThemeProvider(
                  config: const kit.ThemeConfig(
                    performance: kit.Performance.full,
                  ),
                  brightness: brightness,
                  child: const kit.GlassContainer(
                    adaptive: false,
                    interactive: false,
                    child: Center(
                      child: SizedBox(
                        width: 192,
                        height: 56,
                        child: kit.GlassGroup(
                          radius: 28,
                          child: SizedBox.expand(),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.runAsync(() async {
        final render =
            boundary.currentContext!.findRenderObject()
                as RenderRepaintBoundary;
        final image = await render.toImage();
        final file = File(
          'test/fixtures/glass-reference-${brightness.name}.png',
        );
        final codec = await ui.instantiateImageCodec(await file.readAsBytes());
        final reference = (await codec.getNextFrame()).image;
        final actual = (await image.toByteData())!;
        final expected = (await reference.toByteData())!;
        var total = 0, face = 0, rim = 0;
        var count = 0, faceCount = 0, rimCount = 0;
        for (var y = 52; y < 108; y++) {
          for (var x = 64; x < 256; x++) {
            final dx = math.max(0.0, (x + 0.5 - 160).abs() - 68);
            final dy = y + 0.5 - 80;
            final depth = 28 - math.sqrt(dx * dx + dy * dy);
            if (depth < 0) continue;
            for (var c = 0; c < 3; c++) {
              final index = (y * image.width + x) * 4 + c;
              final error = (actual.getUint8(index) - expected.getUint8(index))
                  .abs();
              total += error;
              count++;
              if (depth >= 14) {
                face += error;
                faceCount++;
              }
              if (depth < 3) {
                rim += error;
                rimCount++;
              }
            }
          }
        }
        image.dispose();
        reference.dispose();
        codec.dispose();
        expect(face / faceCount, lessThan(1.2), reason: 'flat face');
        expect(rim / rimCount, lessThan(9), reason: 'outer 3 logical pixels');
        expect(total / count, lessThan(2), reason: 'whole capsule');
      });
    }, skip: !GlassRefraction.supported);
  }
}
