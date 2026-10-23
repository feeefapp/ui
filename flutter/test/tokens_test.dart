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
    final css = entry.value as Map<String, dynamic>;
    // Resolve at the tint the browser used (the web default), not the Dart default.
    final tint = (css['glassTint'] as num?)?.toDouble();
    final tokens = tint == null
        ? ColorTokens.resolve(palette, brightness)
        : ColorTokens.resolve(palette, brightness, glassTint: tint);

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
        'glass-fill-large': tokens.glassFillLarge,
        'glass-edge-light': tokens.glassEdgeLight,
        'glass-edge-low': tokens.glassEdgeLow,
        'glass-shadow-color': tokens.glassShadowColor,
        'glass-shadow-small': tokens.glassShadowSmall,
        'glass-glow': tokens.glassGlow,
        'control-highlight': tokens.controlHighlight,
        'focus-ring-color': tokens.focusRing,
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

  final sizesFile = File('test/fixtures/css_sizes.json');
  test(
    'every size token matches the browser, per density',
    () {
      final sizes =
          jsonDecode(sizesFile.readAsStringSync()) as Map<String, dynamic>;
      for (final entry in sizes.entries) {
        final s = SizeTokens.of(
          ThemeConfig(density: Density.values.byName(entry.key)),
        );
        final byName = <String, double>{
          'control-small': s.controlSmall,
          'control-height': s.controlHeight,
          'control-large': s.controlLarge,
          'control-padding-small': s.controlPaddingSmall,
          'control-padding': s.controlPadding,
          'control-padding-large': s.controlPaddingLarge,
          'control-font-small': s.controlFontSmall,
          'control-font': s.controlFont,
          'control-font-large': s.controlFontLarge,
          'field-height-small': s.fieldHeightSmall,
          'field-height': s.fieldHeight,
          'row-height': s.rowHeight,
          'menu-row-height': s.menuRowHeight,
          'toolbar-item': s.toolbarItem,
          'toolbar-control': s.toolbarControl,
          'toolbar-gap': s.toolbarGap,
          'toolbar-inset': s.toolbarInset,
          'segmented-inset': s.segmentedInset,
          'switch-width': s.switchWidth,
          'switch-height': s.switchHeight,
          'thumb-width': s.thumbWidth,
          'thumb-height': s.thumbHeight,
          'slider-track': s.sliderTrack,
          'list-row-height': s.listRowHeight,
          'list-radius': s.listRadius,
          'list-inset': s.listInset,
          'focus-ring-width': s.focusRingWidth,
          'focus-ring-offset': s.focusRingOffset,
          'radius-control': s.radiusControl,
          'radius-control-small': s.radiusControlSmall,
        };
        final expected = entry.value as Map<String, dynamic>;
        expect(byName.keys.toSet(), expected.keys.toSet());
        for (final name in expected.keys) {
          expect(
            byName[name],
            closeTo((expected[name] as num).toDouble(), 0.01),
            reason: '${entry.key} $name',
          );
        }
      }
    },
    // Written by tool/generate_css_tokens.mjs from the built parity app.
    skip: sizesFile.existsSync() ? false : 'css_sizes.json not generated yet',
  );

  test('glass over a contrasting backdrop takes glass.css neutral tokens', () {
    final base = ColorTokens.resolve(Palette.lab, Brightness.light);
    final dark = base.backdrop(Brightness.dark);
    expect(dark.surface, const Color(0xFF1D211E));
    expect(dark.ink, const Color(0xFFF2F5F0));
    expect(dark.focus, dark.ink);
    expect(dark.muted, const Color(0xFFB7C0B4));
    // At the default tint (0.5) the veil is half the measured regular one.
    expect(dark.glassFill.a, closeTo(0.375, 1e-3));
    // The palette's own colours stay.
    expect(dark.primary, base.primary);
    expect(dark.ground, base.ground);
    final light = ColorTokens.resolve(
      Palette.lab,
      Brightness.dark,
    ).backdrop(Brightness.light);
    expect(light.surface, const Color(0xFFFBFCFA));
    expect(light.ink, const Color(0xFF151A16));
    expect(light.glassFill.a, closeTo(0.435, 1e-3));
    expect(light.backdropTone, Brightness.light);
  });

  test(
    'the glass tint scales the veil and the shadow, from clear to regular',
    () {
      ColorTokens at(double tint, Brightness b) =>
          ColorTokens.resolve(Palette.lab, b, glassTint: tint);
      final clear = at(0, Brightness.light);
      expect(clear.glassFill.a, 0);
      expect(clear.glassShadowColor.a, 0);
      final regular = at(1, Brightness.light);
      expect(regular.glassFill.a, closeTo(0.87, 1e-3));
      expect(regular.glassFillLarge.a, closeTo(0.71, 1e-3));
      expect(regular.glassShadowColor.a, closeTo(0.095, 1e-3));
      expect(at(1, Brightness.dark).glassFill.a, closeTo(0.75, 1e-3));
      expect(at(1, Brightness.dark).glassShadowSmall.a, closeTo(0.033, 1e-3));
      // Out of range clamps; the backdrop tokens keep the tint.
      expect(at(7, Brightness.light).glassFill.a, closeTo(0.87, 1e-3));
      expect(
        at(0.2, Brightness.light).backdrop(Brightness.dark).glassFill.a,
        closeTo(0.15, 1e-3),
      );
    },
  );
}
