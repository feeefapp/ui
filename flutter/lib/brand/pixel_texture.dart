import 'dart:math' as math;

import 'package:flutter/painting.dart';

import 'pixel_noise.dart';

final _cache = <(TextureVariant, String, TextureDensity), List<TexturePixel>>{};

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
  final pixels = _cache.putIfAbsent((
    variant,
    seed,
    density,
  ), () => texturePixels(variant, seed, density));
  final scale = math.max(box.width / 256, box.height / 96);
  final dx = box.left + (box.width - 256 * scale) / 2;
  final dy = box.top + (box.height - 96 * scale) / 2;
  final paint = Paint()..isAntiAlias = false;
  for (final pixel in pixels) {
    paint.color = color.withValues(alpha: color.a * opacity * pixel.opacity);
    canvas.drawRect(
      Rect.fromLTWH(
        dx + pixel.x * scale,
        dy + pixel.y * scale,
        2 * scale,
        2 * scale,
      ),
      paint,
    );
  }
}
