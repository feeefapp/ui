import 'package:feeef_ui/brand/pixel_noise.dart';
import 'package:flutter_test/flutter_test.dart';

/// Runs on every platform, the web included (`flutter test --platform chrome`): the numbers are
/// pinned from the TypeScript, so 64-bit VM ints and the web's doubles must agree with JavaScript.
void main() {
  test('seed hash and random sequence match JavaScript exactly', () {
    expect(seedNumber('control'), 1386144670);
    final random = randomSequence('control');
    const expected = [
      0.36204609367996454,
      0.24614914157427847,
      0.4824488474987447,
      0.31769115454517305,
      0.6783404983580112,
      0.09257662831805646,
    ];
    for (final value in expected) {
      expect(random(), value);
    }
  });

  test('the filled button texture has the same squares as the web kit', () {
    final pixels = texturePixels(
      TextureVariant.corner,
      'control',
      TextureDensity.medium,
    );
    expect(pixels.length, 133);
    expect(pixels.last.x, 248);
    expect(pixels.last.y, 92);
    expect(pixels.last.opacity, closeTo(0.5479519286891446, 1e-12));
  });
}
