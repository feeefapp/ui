import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

import '../devtools/devtools.dart';

/// Paints [draw]'s output from an image rendered once per [key] and device pixel ratio, instead of
/// drawing it again on every frame. For blurred shadows: Impeller keeps no raster cache, so a
/// `MaskFilter.blur` on screen is a Gaussian pass on every frame anything moves, for every button,
/// pill, popover and sheet that carries one. A shadow rendered once at [dpr] and drawn as an image
/// costs one textured quad. [bounds] is the area [draw] paints, in the canvas's coordinates;
/// [opacity] scales the image's alpha on the way out, so a fading shadow needs no new image. Anything
/// not finite or absurdly large is drawn live.
///
/// Cached images are kept up to [StillRasters.limitBytes] and dropped oldest first. The key must
/// name everything that changes the pixels but the opacity: geometry, colour, blur.
void paintStill(
  Canvas canvas, {
  required Object key,
  required Rect bounds,
  required double dpr,
  required void Function(Canvas canvas) draw,
  double opacity = 1,
}) {
  if (opacity <= 0.001) return;
  final image = StillRasters._imageFor(key, bounds, dpr, draw);
  if (image == null) {
    if (opacity >= 0.999) {
      draw(canvas);
    } else {
      canvas.saveLayer(
        bounds,
        Paint()..color = Color.from(alpha: opacity, red: 0, green: 0, blue: 0),
      );
      draw(canvas);
      canvas.restore();
    }
    return;
  }
  canvas.drawImageRect(
    image.image,
    Rect.fromLTWH(
      0,
      0,
      image.image.width.toDouble(),
      image.image.height.toDouble(),
    ),
    Rect.fromLTWH(
      bounds.left,
      bounds.top,
      image.image.width / dpr,
      image.image.height / dpr,
    ),
    Paint()
      ..filterQuality = FilterQuality.low
      ..color = Color.from(
        alpha: opacity.clamp(0.0, 1.0),
        red: 0,
        green: 0,
        blue: 0,
      ),
  );
}

/// The images [paintStill] keeps.
abstract final class StillRasters {
  /// At most this many bytes of images (a 2× 200 × 60 shadow is about 200 KB).
  static int limitBytes = 24 << 20;

  /// Images larger than this many pixels are drawn live instead.
  static const int maxPixels = 4 << 20;

  static final _images = <(Object, double), _Still>{};
  static int _bytes = 0;

  /// How many images are kept.
  static int get debugCount => _images.length;

  /// How many images were rendered since start.
  @visibleForTesting
  static int debugRendered = 0;

  /// Drops every image (tests, or an app that wants the memory back).
  static void clear() {
    for (final still in _images.values) {
      still.image.dispose();
    }
    _images.clear();
    _bytes = 0;
  }

  static _Still? _imageFor(
    Object key,
    Rect bounds,
    double dpr,
    void Function(Canvas canvas) draw,
  ) {
    if (!bounds.isFinite || bounds.isEmpty || !(dpr > 0)) return null;
    final width = (bounds.width * dpr).ceil();
    final height = (bounds.height * dpr).ceil();
    if (width <= 0 || height <= 0 || width * height > maxPixels) return null;
    final id = (key, dpr);
    final kept = _images.remove(id);
    if (kept != null) {
      // Most recently used last.
      _images[id] = kept;
      return kept;
    }
    final recorder = ui.PictureRecorder();
    final offscreen = Canvas(recorder)
      ..scale(dpr)
      ..translate(-bounds.left, -bounds.top);
    draw(offscreen);
    final picture = recorder.endRecording();
    final image = kitTimeline(
      'still raster',
      () => picture.toImageSync(width, height),
      arguments: {'key': '$key', 'width': width, 'height': height},
    );
    picture.dispose();
    debugRendered++;
    final still = _Still(image, width * height * 4);
    _bytes += still.bytes;
    _images[id] = still;
    while (_bytes > limitBytes && _images.length > 1) {
      final oldest = _images.keys.first;
      final gone = _images.remove(oldest)!;
      _bytes -= gone.bytes;
      gone.image.dispose();
    }
    return still;
  }
}

class _Still {
  _Still(this.image, this.bytes);
  final ui.Image image;
  final int bytes;
}
