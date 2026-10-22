import 'package:flutter/animation.dart' show Cubic;

import 'dart:ui';

import '../theme_config.dart';
import 'color_mix.dart';

/// Every colour the kit paints, resolved for one palette and brightness. Literal values come from
/// `theme-tokens.css` and `system.css`; derived ones repeat their `color-mix()` formulas, and
/// `test/tokens_test.dart` checks all of them against what the browser computes.
class ColorTokens {
  const ColorTokens._({
    required this.ground,
    required this.pixelInk,
    required this.surface,
    required this.surfaceSoft,
    required this.line,
    required this.ink,
    required this.muted,
    required this.focus,
    required this.primary,
    required this.onPrimary,
    required this.accent,
    required this.success,
    required this.warning,
    required this.danger,
    required this.onDanger,
    required this.glassEdgeLight,
    required this.glassEdgeLow,
    required this.glassShadowColor,
    required this.glassGlow,
    required this.controlHighlight,
  });

  /// `--lab-pixel-ink`: the colour of the ambient pixel field.
  final Color pixelInk;
  final Color ground,
      surface,
      surfaceSoft,
      line,
      ink,
      muted,
      focus,
      primary,
      onPrimary,
      accent;
  final Color success, warning, danger, onDanger;
  final Color glassEdgeLight,
      glassEdgeLow,
      glassShadowColor,
      glassGlow,
      controlHighlight;

  Color get controlSurface => surface;
  Color get controlBorder => mixSrgb(ink, 0.15, surface);
  Color get controlHover => mixSrgb(ink, 0.05, surface);
  Color get controlPressed => mixSrgb(ink, 0.10, surface);
  Color get controlSelected => mixSrgb(primary, 0.22, surface);
  Color get glassFill => mixSrgb(surface, 0.76, transparent);
  Color get glassFillFlat => mixSrgb(surface, 0.93, transparent);

  /// The five emphasis recipes shared by buttons, fields and selects (`control-variants.css`).
  VariantPaint variant(ControlVariant variant) => switch (variant) {
    ControlVariant.filled => VariantPaint(
      fill: primary,
      hover: mixSrgb(primary, 0.92, white(1)),
      pressed: mixSrgb(primary, 0.90, onPrimary),
      edge: mixSrgb(onPrimary, 0.12, primary),
      ink: onPrimary,
    ),
    ControlVariant.tonal => VariantPaint(
      fill: mixSrgb(primary, 0.22, surface),
      hover: mixSrgb(primary, 0.30, surface),
      pressed: mixSrgb(primary, 0.36, surface),
      edge: transparent,
      ink: ink,
    ),
    ControlVariant.elevated => VariantPaint(
      fill: controlSurface,
      hover: controlHover,
      pressed: controlPressed,
      edge: controlBorder,
      ink: ink,
    ),
    ControlVariant.outlined => VariantPaint(
      fill: transparent,
      hover: controlHover,
      pressed: controlPressed,
      edge: controlBorder,
      ink: ink,
    ),
    ControlVariant.text => VariantPaint(
      fill: transparent,
      hover: controlHover,
      pressed: controlPressed,
      edge: transparent,
      ink: ink,
    ),
  };

  static ColorTokens resolve(Palette palette, Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final shared = (
      edgeLight: white(dark ? 0.30 : 0.76),
      edgeLow: white(dark ? 0.10 : 0.20),
      shadow: black(dark ? 0.26 : 0.10),
      glow: white(dark ? 0.16 : 0.45),
      highlight: white(dark ? 0.20 : 0.76),
      danger: hex(dark ? 0xffb4ab : 0xa02b2b),
      onDanger: hex(dark ? 0x571812 : 0xffffff),
    );
    ColorTokens make({
      required int ground,
      required int pixelInk,
      required int surface,
      required int surfaceSoft,
      required int line,
      required int ink,
      required int muted,
      required int focus,
      required int primary,
      required int onPrimary,
      required int accent,
      required int success,
      required int warning,
    }) => ColorTokens._(
      ground: hex(ground),
      pixelInk: hex(pixelInk),
      surface: hex(surface),
      surfaceSoft: hex(surfaceSoft),
      line: hex(line),
      ink: hex(ink),
      muted: hex(muted),
      focus: hex(focus),
      primary: hex(primary),
      onPrimary: hex(onPrimary),
      accent: hex(accent),
      success: hex(success),
      warning: hex(warning),
      danger: shared.danger,
      onDanger: shared.onDanger,
      glassEdgeLight: shared.edgeLight,
      glassEdgeLow: shared.edgeLow,
      glassShadowColor: shared.shadow,
      glassGlow: shared.glow,
      controlHighlight: shared.highlight,
    );
    return switch ((palette, dark)) {
      (Palette.lab, false) => make(
        ground: 0xf3f6ef,
        pixelInk: 0x86e672,
        surface: 0xfcfdf9,
        surfaceSoft: 0xe8eee2,
        line: 0xd6e1cf,
        ink: 0x17261b,
        muted: 0x657460,
        focus: 0x315d2c,
        primary: 0x72ce5d,
        onPrimary: 0x142512,
        accent: 0x86e672,
        success: 0x2f6b28,
        warning: 0x8a5300,
      ),
      (Palette.lab, true) => make(
        ground: 0x101e17,
        pixelInk: 0xb7e593,
        surface: 0x23372a,
        surfaceSoft: 0x1a2a21,
        line: 0x405744,
        ink: 0xedf4e8,
        muted: 0xb4c3ae,
        focus: 0xb7e593,
        primary: 0xb7e593,
        onPrimary: 0x142512,
        accent: 0xb7e593,
        success: 0xb7e593,
        warning: 0xf2c66d,
      ),
      (Palette.mono, false) => make(
        ground: 0xf4f4f4,
        pixelInk: 0x8a8a8a,
        surface: 0xffffff,
        surfaceSoft: 0xefefef,
        line: 0xe2e2e2,
        ink: 0x0a0a0a,
        muted: 0x6b6b6b,
        focus: 0x0a0a0a,
        primary: 0x0a0a0a,
        onPrimary: 0xffffff,
        accent: 0x0a0a0a,
        success: 0x0a0a0a,
        warning: 0x7a6234,
      ),
      (Palette.mono, true) => make(
        ground: 0x0a0a0a,
        pixelInk: 0x6b6b6b,
        surface: 0x141414,
        surfaceSoft: 0x1c1c1c,
        line: 0x2c2c2c,
        ink: 0xf5f5f5,
        muted: 0xa3a3a3,
        focus: 0xf5f5f5,
        primary: 0xf5f5f5,
        onPrimary: 0x0a0a0a,
        accent: 0xf5f5f5,
        success: 0xf5f5f5,
        warning: 0xc9b48a,
      ),
    };
  }
}

/// Emphasis, from the strongest surface to none (`LabControlVariant` in the web kit).
enum ControlVariant { filled, tonal, elevated, outlined, text }

/// One emphasis recipe: resting fill, hover, pressed, edge and ink.
class VariantPaint {
  const VariantPaint({
    required this.fill,
    required this.hover,
    required this.pressed,
    required this.edge,
    required this.ink,
  });
  final Color fill, hover, pressed, edge, ink;
}

/// Sizes from `system.css`, multiplied by density and the radius scale where the CSS does.
class SizeTokens {
  const SizeTokens._(this.density, this.radiusScale);
  factory SizeTokens.of(ThemeConfig config) =>
      SizeTokens._(config.density, config.radiusScale);

  final Density density;
  final double radiusScale;

  double get controlHeight => switch (density) {
    Density.comfortable => 44,
    Density.compact => 34,
    Density.thin => 28,
  };

  /// `--lab-row-height`: navigation rows and list-like controls.
  double get rowHeight => switch (density) {
    Density.comfortable => 44,
    Density.compact => 32,
    Density.thin => 26,
  };
  double get controlCompact => switch (density) {
    Density.comfortable => 40,
    Density.compact => 30,
    Density.thin => 24,
  };
  double get controlPadding => switch (density) {
    Density.comfortable => 12,
    Density.compact => 10,
    Density.thin => 8,
  };

  /// `--lab-space-4`: a regular button's side padding.
  double get space4 => switch (density) {
    Density.comfortable => 16,
    Density.compact => 12,
    Density.thin => 10,
  };

  /// A control's label size (`font: 400 14px/20px`, smaller in dense themes).
  double get controlFont => switch (density) {
    Density.comfortable => 14,
    Density.compact => 13,
    Density.thin => 12,
  };
  double get touchTarget => 44;
  double get radiusControl => 18 * radiusScale;
  double get radiusControlCompact => 14 * radiusScale;
  double get radiusGroup => 20 * radiusScale;
  double get radiusPanel => 24 * radiusScale;
  double get radiusGlass => 32 * radiusScale;
  double get radiusSmall => 12 * radiusScale;
}

/// Motion tokens from `system.css`: `--lab-duration-fast`, `--lab-duration-normal`, `--lab-ease`.
abstract final class MotionTokens {
  static const durationFast = Duration(milliseconds: 140);
  static const durationNormal = Duration(milliseconds: 220);
  static const ease = Cubic(0.2, 0.8, 0.2, 1);

  /// `--lab-ease-out` / `--lab-ease-in` from `motion.css`: entrances and exits.
  static const easeOut = Cubic(0.22, 1, 0.36, 1);
  static const easeIn = Cubic(0.55, 0, 0.75, 0.2);
}
