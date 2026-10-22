import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:feeef_ui/theme/tokens.dart';
import 'package:feeef_ui/theme_config.dart';
import 'package:flutter_test/flutter_test.dart';

/// Parses what getComputedStyle returns: rgb(), rgba() and color(srgb …).
Color parseCss(String value) {
  final rgb = RegExp(r'^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)$')
      .firstMatch(value);
  if (rgb != null) {
    return Color.from(
      alpha: double.parse(rgb.group(4) ?? '1'),
      red: double.parse(rgb.group(1)!) / 255,
      green: double.parse(rgb.group(2)!) / 255,
      blue: double.parse(rgb.group(3)!) / 255,
    );
  }
  final srgb = RegExp(
    r'^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: / ([\d.]+))?\)$',
  ).firstMatch(value);
  if (srgb != null) {
    return Color.from(
      alpha: double.parse(srgb.group(4) ?? '1'),
      red: double.parse(srgb.group(1)!),
      green: double.parse(srgb.group(2)!),
      blue: double.parse(srgb.group(3)!),
    );
  }
  throw FormatException('Unknown CSS colour', value);
}

void expectColor(Color actual, String css, String label) {
  final expected = parseCss(css);
  // Within one 8-bit step per channel, and alpha within 0.5%.
  const step = 1 / 255;
  final ok =
      (actual.a - expected.a).abs() <= 0.005 &&
      (expected.a == 0 ||
          ((actual.r - expected.r).abs() <= step &&
              (actual.g - expected.g).abs() <= step &&
              (actual.b - expected.b).abs() <= step));
  expect(ok, isTrue, reason: '$label: got $actual, CSS $css');
}

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/css_tokens.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  for (final entry in fixture.entries) {
    final parts = entry.key.split('-');
    final palette = Palette.values.byName(parts[0]);
    final brightness = parts[1] == 'dark' ? Brightness.dark : Brightness.light;
    final tokens = ColorTokens.resolve(palette, brightness);
    final css = entry.value as Map<String, dynamic>;

    test('${entry.key}: every colour token matches the browser', () {
      final byName = <String, Color>{
        'ground': tokens.ground,
        'surface': tokens.surface,
        'surface-soft': tokens.surfaceSoft,
        'line': tokens.line,
        'ink': tokens.ink,
        'muted': tokens.muted,
        'focus': tokens.focus,
        'primary': tokens.primary,
        'on-primary': tokens.onPrimary,
        'accent': tokens.accent,
        'success': tokens.success,
        'warning': tokens.warning,
        'danger': tokens.danger,
        'on-danger': tokens.onDanger,
        'control-surface': tokens.controlSurface,
        'control-border': tokens.controlBorder,
        'control-hover': tokens.controlHover,
        'control-pressed': tokens.controlPressed,
        'control-selected': tokens.controlSelected,
        'glass-fill': tokens.glassFill,
        'glass-fill-flat': tokens.glassFillFlat,
        'glass-edge-light': tokens.glassEdgeLight,
        'glass-edge-low': tokens.glassEdgeLow,
        'glass-shadow-color': tokens.glassShadowColor,
        'glass-glow': tokens.glassGlow,
        'control-highlight': tokens.controlHighlight,
      };
      final expected = css['tokens'] as Map<String, dynamic>;
      expect(byName.keys.toSet(), expected.keys.toSet());
      for (final name in expected.keys) {
        expectColor(byName[name]!, expected[name] as String, name);
      }
    });

    test('${entry.key}: every emphasis recipe matches the browser', () {
      final variants = css['variants'] as Map<String, dynamic>;
      for (final name in variants.keys) {
        final paint = tokens.variant(ControlVariant.values.byName(name));
        final expected = variants[name] as Map<String, dynamic>;
        expectColor(paint.fill, expected['fill'] as String, '$name fill');
        expectColor(paint.hover, expected['hover'] as String, '$name hover');
        expectColor(
          paint.pressed,
          expected['pressed'] as String,
          '$name pressed',
        );
        expectColor(paint.edge, expected['edge'] as String, '$name edge');
        expectColor(paint.ink, expected['ink'] as String, '$name ink');
      }
    });
  }

  test('glass over a contrasting backdrop takes glass.css neutral tokens', () {
    final base = ColorTokens.resolve(Palette.lab, Brightness.light);
    final dark = base.backdrop(Brightness.dark);
    expect(dark.surface, const Color(0xFF1D211E));
    expect(dark.ink, const Color(0xFFF2F5F0));
    expect(dark.focus, dark.ink);
    expect(dark.muted, const Color(0xFFB7C0B4));
    expect(dark.glassFill.a, closeTo(0.62, 1e-3));
    // The palette's own colours stay.
    expect(dark.primary, base.primary);
    expect(dark.ground, base.ground);
    final light = ColorTokens.resolve(
      Palette.lab,
      Brightness.dark,
    ).backdrop(Brightness.light);
    expect(light.surface, const Color(0xFFFBFCFA));
    expect(light.ink, const Color(0xFF151A16));
    expect(light.glassFill.a, closeTo(0.72, 1e-3));
    expect(light.backdropTone, Brightness.light);
  });
}
