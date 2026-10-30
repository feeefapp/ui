import 'dart:ui' as ui;

import 'package:feeef_ui/theme/raster.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(StillRasters.clear);
  tearDown(() {
    StillRasters.clear();
    StillRasters.limitBytes = 24 << 20;
  });

  test('paintStill renders a key once and draws the image after that', () {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    var drawn = 0;
    void draw(Canvas canvas) {
      drawn++;
      canvas.drawRect(
        const Rect.fromLTWH(0, 0, 40, 20),
        Paint()..color = const Color(0xFF000000),
      );
    }

    final rendered = StillRasters.debugRendered;
    for (var i = 0; i < 3; i++) {
      paintStill(
        canvas,
        key: ('shadow', 40.0, 20.0),
        bounds: const Rect.fromLTWH(0, 0, 40, 20),
        dpr: 2,
        draw: draw,
        opacity: 0.5,
      );
    }
    expect(drawn, 1);
    expect(StillRasters.debugRendered - rendered, 1);
    expect(StillRasters.debugCount, 1);
    // Another device pixel ratio is another image; the same key at the same ratio is not.
    paintStill(
      canvas,
      key: ('shadow', 40.0, 20.0),
      bounds: const Rect.fromLTWH(0, 0, 40, 20),
      dpr: 3,
      draw: draw,
    );
    expect(drawn, 2);
    expect(StillRasters.debugCount, 2);
    recorder.endRecording().dispose();
  });

  test('the memory limit drops the oldest images', () {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    void draw(Canvas canvas) {}
    // 100 × 100 at 1× is 40 KB; room for two.
    StillRasters.limitBytes = 100 * 100 * 4 * 2;
    for (var i = 0; i < 4; i++) {
      paintStill(
        canvas,
        key: ('big', i),
        bounds: const Rect.fromLTWH(0, 0, 100, 100),
        dpr: 1,
        draw: draw,
      );
    }
    expect(StillRasters.debugCount, 2);
    recorder.endRecording().dispose();
  });

  test('what cannot be an image is drawn live', () {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    var drawn = 0;
    void draw(Canvas canvas) => drawn++;
    paintStill(canvas, key: 'empty', bounds: Rect.zero, dpr: 2, draw: draw);
    paintStill(
      canvas,
      key: 'huge',
      bounds: const Rect.fromLTWH(0, 0, 4000, 4000),
      dpr: 2,
      draw: draw,
    );
    paintStill(
      canvas,
      key: 'faint',
      bounds: const Rect.fromLTWH(0, 0, 10, 10),
      dpr: 2,
      draw: draw,
      opacity: 0,
    );
    expect(drawn, 2);
    expect(StillRasters.debugCount, 0);
    recorder.endRecording().dispose();
  });
}
