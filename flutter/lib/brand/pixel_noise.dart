import 'dart:math' as math;

/// Seeded pixel noise, the twin of `brand/pixel-noise.ts`. All arithmetic is explicit unsigned
/// 32-bit so the Dart VM (64-bit ints), the web (doubles) and Wasm produce the same numbers as
/// JavaScript's `Math.imul` and bit operators.
int _u32(int value) => value & 0xFFFFFFFF;

/// `Math.imul`, without relying on 64-bit products (which the web can't hold exactly).
int imul32(int a, int b) {
  final x = _u32(a);
  final y = _u32(b);
  final high = ((x >> 16) * (y & 0xFFFF) + (x & 0xFFFF) * (y >> 16)) & 0xFFFF;
  return _u32((high << 16) + (x & 0xFFFF) * (y & 0xFFFF));
}

/// FNV-1a hash of a seed string.
int seedNumber(String value) {
  var result = 2166136261;
  for (final unit in value.codeUnits) {
    result = imul32(result ^ unit, 16777619);
  }
  return _u32(result);
}

/// Deterministic random numbers in [0, 1) for a seed (mulberry32).
double Function() randomSequence(String value) {
  var state = seedNumber(value);
  return () {
    state = _u32(state + 0x6d2b79f5);
    var next = imul32(state ^ (state >> 15), 1 | state);
    next = _u32(next ^ _u32(next + imul32(next ^ (next >> 7), 61 | next)));
    return _u32(next ^ (next >> 14)) / 4294967296;
  };
}

/// One square of a pixel texture: position in the 256 × 96 view box and opacity.
typedef TexturePixel = ({double x, double y, double opacity});

/// Where texture pixels gather: toward the top end, along a wave, or everywhere.
enum TextureVariant { corner, grain, wave }

/// How many squares a texture draws.
enum TextureDensity { sparse, medium, dense }

/// Squares of a PixelTexture for a seed: 2px squares on a 4px grid in a 256 × 96 view box.
List<TexturePixel> texturePixels(
  TextureVariant variant,
  String seed,
  TextureDensity density,
) {
  final random = randomSequence(seed);
  final threshold = switch (density) {
    TextureDensity.dense => 0.6,
    TextureDensity.medium => 0.39,
    TextureDensity.sparse => 0.23,
  };
  final pixels = <TexturePixel>[];
  for (var row = 0; row < 24; row++) {
    for (var column = 0; column < 64; column++) {
      final x = column / 63;
      final y = row / 23;
      final double field = switch (variant) {
        TextureVariant.corner =>
          math.pow(x, 1.7) * (0.35 + math.pow(1 - y, 1.4) * 0.65),
        TextureVariant.wave => math.max(
          0,
          1 - (y - 0.5 - math.sin(x * 8) * 0.24).abs() * 3,
        ),
        TextureVariant.grain => 1,
      };
      if (random() < field * threshold) {
        pixels.add((
          x: column * 4.0,
          y: row * 4.0,
          opacity: 0.25 + random() * 0.75,
        ));
      }
    }
  }
  return pixels;
}
