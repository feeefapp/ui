import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/theme/color_mix.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const blue = Color(0xFF2563EB);

  test('oklab mix keeps its ends and lands between them', () {
    const grey = Color(0xFFFDFDFC);
    expect(mixOklab(blue, 1, grey).toARGB32(), blue.toARGB32());
    expect(mixOklab(blue, 0, grey).toARGB32(), grey.toARGB32());
    final half = mixOklab(blue, 0.5, grey);
    expect(half.b, greaterThan(half.r));
  });

  test('a primary colours actions and tints lab surfaces, light and dark', () {
    final light = ColorTokens.resolve(
      Palette.lab,
      Brightness.light,
      primary: blue,
    );
    expect(light.primary.toARGB32(), blue.toARGB32());
    expect(light.onPrimary.toARGB32(), 0xFFFFFFFF);
    // The surface leans to the seed's hue instead of the Lab green.
    expect(light.surface.b, greaterThan(light.surface.g));
    final dark = ColorTokens.resolve(
      Palette.lab,
      Brightness.dark,
      primary: blue,
    );
    expect(dark.primary.toARGB32(), mixSrgb(blue, 0.7, white(1)).toARGB32());
    expect(dark.onPrimary.toARGB32(), 0xFF111411);
    // Meaningful colours stay.
    final base = ColorTokens.resolve(Palette.lab, Brightness.light);
    expect(light.danger, base.danger);
    expect(light.success, base.success);
  });

  test('mono keeps its greys with a primary', () {
    final base = ColorTokens.resolve(Palette.mono, Brightness.light);
    final seeded = ColorTokens.resolve(
      Palette.mono,
      Brightness.light,
      primary: blue,
    );
    expect(seeded.surface, base.surface);
    expect(seeded.ink, base.ink);
    expect(seeded.primary.toARGB32(), blue.toARGB32());
  });

  test('copyWith keeps, sets and clears the primary', () {
    const config = ThemeConfig(primary: blue);
    expect(config.copyWith(density: Density.compact).primary, blue);
    expect(config.copyWith(primary: null).primary, isNull);
    expect(const ThemeConfig().copyWith(primary: blue).primary, blue);
  });
}
