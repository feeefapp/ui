import 'dart:ui' as ui;

import 'package:feeef_ui/glass/geometry.dart';
import 'package:feeef_ui/glass/refraction.dart';
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
          0, // container glass, not a control lens
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

  test('lens mode bends by the measured pill and thumb profiles', () async {
    final program = await ui.FragmentProgram.fromAsset(
      'shaders/glass_refraction.frag',
    );
    const width = 120, height = 44;
    // Every channel = 2 · x, so a pixel's value / 2 is the backdrop column it shows.
    final sourceRecorder = ui.PictureRecorder();
    final canvas = ui.Canvas(sourceRecorder);
    for (var x = 0; x < width; x++) {
      final v = 2 * x;
      canvas.drawRect(
        ui.Rect.fromLTWH(x.toDouble(), 0, 1, height.toDouble()),
        ui.Paint()..color = ui.Color.fromARGB(255, v, v, v),
      );
    }
    final sourcePicture = sourceRecorder.endRecording();
    final source = await sourcePicture.toImage(width, height);

    Future<double Function(int x, int y)> render(LensKind kind) async {
      final shader = program.fragmentShader();
      final uniforms = <double>[
        width.toDouble(), height.toDouble(), // filter input size
        0, 0, 1, 0, 1, 1, // origin, DPR, bezel (unused), lens amount, count
        0, 0, width.toDouble(), height.toDouble(),
        ...List.filled(20, 0.0), // unused rectangles
        height / 2, ...List.filled(7, 0.0), // a capsule
        ...List.filled(8, 0.0), // blends
        0, -1, 0, 0, // light, no edge terms
        kind == LensKind.pill ? 1 : 2,
      ];
      for (var i = 0; i < uniforms.length; i++) {
        shader.setFloat(i, uniforms[i]);
      }
      shader.setImageSampler(0, source);
      final recorder = ui.PictureRecorder();
      ui.Canvas(recorder).drawRect(
        ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
        ui.Paint()..shader = shader,
      );
      final picture = recorder.endRecording();
      final output = await picture.toImage(width, height);
      final bytes = (await output.toByteData())!;
      output.dispose();
      picture.dispose();
      shader.dispose();
      return (x, y) => bytes.getUint8((y * width + x) * 4 + 1) / 2;
    }

    // Halfway down the capsule's left end the depth is x + 0.5 and the bend runs along x.
    final pill = await render(LensKind.pill);
    // Outward at 10.5 px deep: the pixel shows the backdrop 2.7 px further out.
    expect(
      pill(10, height ~/ 2),
      closeTo(10.5 + lensBend(LensKind.pill, 10.5), 1),
    );
    // The flat middle stays put.
    expect(pill(width ~/ 2, height ~/ 2), closeTo(60.5, 1));
    final thumb = await render(LensKind.thumb);
    // Inward at 2.5 px deep: 4 px further in.
    expect(
      thumb(2, height ~/ 2),
      closeTo(2.5 + lensBend(LensKind.thumb, 2.5), 1),
    );
    expect(thumb(width ~/ 2, height ~/ 2), closeTo(60.5, 1));
    source.dispose();
    sourcePicture.dispose();
  });
}
