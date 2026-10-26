import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' show PointMode;

import 'package:flutter/painting.dart';

import 'pixel_noise.dart';

/// Square centres per opacity step (in view-box units), per texture: one draw call per step
/// instead of one per square.
final _cache =
    <(TextureVariant, String, TextureDensity), Map<int, Float32List>>{};

/// Square opacities are kept to this many steps (finer than 8-bit alpha can show at the
/// textures' strengths).
const _steps = 64;

/// Paints a PixelTexture (the web kit's `<svg viewBox="0 0 256 96" preserveAspectRatio="xMidYMid
/// slice" shape-rendering="crispEdges">`) into [box]: the view box covers the box and is centred,
/// squares are 2 units, unblended at their edges, in [color] at [opacity] × each square's opacity.
void paintPixelTexture(
  Canvas canvas,
  Rect box, {
  required Color color,
  required double opacity,
  TextureVariant variant = TextureVariant.corner,
  String seed = 'feeef-surface',
  TextureDensity density = TextureDensity.medium,
}) {
  final levels = _cache.putIfAbsent((variant, seed, density), () {
    final points = <int, List<double>>{};
    for (final pixel in texturePixels(variant, seed, density)) {
      final level = (pixel.opacity * _steps).round();
      if (level <= 0) continue;
      (points[level] ??= [])
        ..add(pixel.x + 1)
        ..add(pixel.y + 1);
    }
    return {
      for (final MapEntry(:key, :value) in points.entries)
        key: Float32List.fromList(value),
    };
  });
  final scale = math.max(box.width / 256, box.height / 96);
  final dx = box.left + (box.width - 256 * scale) / 2;
  final dy = box.top + (box.height - 96 * scale) / 2;
  canvas.save();
  canvas.translate(dx, dy);
  canvas.scale(scale);
  final paint = Paint()
    ..isAntiAlias = false
    ..strokeWidth = 2
    ..strokeCap = StrokeCap.square;
  for (final MapEntry(key: level, value: points) in levels.entries) {
    paint.color = color.withValues(alpha: color.a * opacity * level / _steps);
    canvas.drawRawPoints(PointMode.points, points, paint);
  }
  canvas.restore();
}
