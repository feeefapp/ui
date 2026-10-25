import 'dart:ui' as ui;

import 'package:feeef_ui/glass/geometry.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'native shader edge follows the painted continuous-corner outline',
    () async {
      final program = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
      // Include the vertical editor rail, its horizontal twin, a corner in the
      // smoothing transition, and a full-radius capsule.
      for (final shape in [
        GlassShape(x: 0, y: 0, width: 50, height: 140, radius: 18),
        GlassShape(x: 0, y: 0, width: 140, height: 50, radius: 18),
        GlassShape(x: 0, y: 0, width: 50, height: 140, radius: 22),
        GlassShape(x: 0, y: 0, width: 50, height: 140, radius: 25),
      ]) {
        final width = shape.width.toInt(), height = shape.height.toInt();
        final sourceRecorder = ui.PictureRecorder();
        ui.Canvas(sourceRecorder)
            .drawColor(const ui.Color(0xFFFFFFFF), ui.BlendMode.src);
        final sourcePicture = sourceRecorder.endRecording();
        final source = await sourcePicture.toImage(width, height);
        final shader = program.fragmentShader();
        final uniforms = <double>[
          shape.width, shape.height, // filter input size
          0, 0, 1, 1, 0, 1, // origin, DPR, bezel, shift, count
          shape.x, shape.y, shape.width, shape.height,
          ...List.filled(20, 0.0), // unused rectangles
          shape.radius, ...List.filled(7, 0.0),
          ...List.filled(8, 0.0), // blends
          1, 0, 0, -1, // light, edge: white minus edge mask
        ];
        for (var i = 0; i < uniforms.length; i++) {
          shader.setFloat(i, uniforms[i]);
        }
        shader.setImageSampler(0, source);
        final recorder = ui.PictureRecorder();
        ui.Canvas(recorder).drawRect(
          ui.Rect.fromLTWH(0, 0, shape.width, shape.height),
          ui.Paint()..shader = shader,
        );
        final picture = recorder.endRecording();
        final output = await picture.toImage(width, height);
        final bytes = (await output.toByteData())!;
        var edgePixels = 0;
        for (var y = 0; y < height; y++) {
          for (var x = 0; x < width; x++) {
            // Any shader edge must lie within one logical pixel of the same
            // silhouette the Dart painter clips. A circular shader fails here.
            if (bytes.getUint8((y * width + x) * 4) < 250) {
              edgePixels++;
              final distance = shapeDistance(x + 0.5, y + 0.5, shape);
              expect(
                distance,
                inInclusiveRange(-1.01, 0.01),
                reason: 'shader edge at ($x, $y), radius ${shape.radius}',
              );
            }
          }
        }
        expect(edgePixels, greaterThan(0));
        output.dispose();
        picture.dispose();
        shader.dispose();
        source.dispose();
        sourcePicture.dispose();
      }
    },
  );
}
