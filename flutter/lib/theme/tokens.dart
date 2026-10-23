import 'package:flutter/animation.dart' show Cubic;

import 'dart:ui';

import '../glass/material.dart' show glassTintDefault, clampGlassTint;
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
    required double glassShadowAlpha,
    required double glassShadowAlphaSmall,
    required this.glassGlow,
    required this.controlHighlight,
    required double glassVeil,
    required double glassVeilLarge,
    required this.glassTint,
    this.backdropTone,
  }) : _veil = glassVeil,
       _veilLarge = glassVeilLarge,
       _shadow = glassShadowAlpha,
       _shadowSmall = glassShadowAlphaSmall;

  /// The measured regular material's veil (share of the surface), control-sized and panel glass
  /// (glass/material.dart), and its shadow alphas: the anchors the tint scales.
  final double _veil, _veilLarge, _shadow, _shadowSmall;

  /// `--lab-glass-tint` (ThemeConfig `glassTint`, clamped): 0 clear … 1 tinted.
  final double glassTint;

  /// Set on the neutral tokens glass takes over a contrasting backdrop ([backdrop]).
  final Brightness? backdropTone;

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
  final Color glassEdgeLight, glassEdgeLow, glassGlow, controlHighlight;

  /// `--lab-glass-shadow-color`: the shadow under panel-sized glass, scaled by the tint (clear
  /// glass casts none).
  Color get glassShadowColor => black(glassTint * _shadow);

  /// `--lab-glass-shadow-small`: the lighter shadow under control-sized glass.
  Color get glassShadowSmall => black(glassTint * _shadowSmall);

  /// `--lab-focus-ring-color`: the keyboard focus ring, the focus colour at 65 %.
  Color get focusRing => mixSrgb(focus, 0.65, transparent);

  Color get controlSurface => surface;
  Color get controlBorder => mixSrgb(ink, 0.15, surface);
  // Over a backdrop, glass.css redeclares the control mixes and glass fills.
  Color get controlHover =>
      mixSrgb(ink, backdropTone == null ? 0.05 : 0.06, surface);
  Color get controlPressed =>
      mixSrgb(ink, backdropTone == null ? 0.10 : 0.12, surface);
  Color get controlSelected =>
      mixSrgb(primary, backdropTone == null ? 0.22 : 0.24, surface);

  /// `--lab-glass-fill`: the veil over control-sized glass at the tint.
  Color get glassFill => mixSrgb(surface, glassTint * _veil, transparent);

  /// `--lab-glass-fill-large`: the lighter veil over panel-sized glass at the tint.
  Color get glassFillLarge =>
      mixSrgb(surface, glassTint * _veilLarge, transparent);

  /// The neutral glass and ink for small glass over content of [tone] (glass.css
  /// `[data-glass-backdrop]`): fixed greys rather than the palette's own dark or light theme, the
  /// focus colour becomes the ink. Ground, primary and status colours stay the palette's.
  ColorTokens backdrop(Brightness tone) {
    final dark = tone == Brightness.dark;
    final ink = hex(dark ? 0xf2f5f0 : 0x151a16);
    return ColorTokens._(
      ground: ground,
      pixelInk: pixelInk,
      surface: hex(dark ? 0x1d211e : 0xfbfcfa),
      surfaceSoft: hex(dark ? 0x262b27 : 0xeef1ec),
      line: dark ? white(0.16) : black(0.12),
      ink: ink,
      muted: hex(dark ? 0xb7c0b4 : 0x5d675a),
      focus: ink,
      primary: primary,
      onPrimary: onPrimary,
      accent: accent,
      success: success,
      warning: warning,
      danger: danger,
      onDanger: onDanger,
      glassEdgeLight: white(dark ? 0.13 : 0.62),
      glassEdgeLow: white(dark ? 0.14 : 0.27),
      glassShadowAlpha: dark ? 0.14 : 0.095,
      glassShadowAlphaSmall: dark ? 0.033 : 0.066,
      glassGlow: white(dark ? 0.18 : 0.45),
      controlHighlight: white(dark ? 0.20 : 0.76),
      glassVeil: dark ? 0.75 : 0.87,
      glassVeilLarge: dark ? 0.72 : 0.71,
      glassTint: glassTint,
      backdropTone: tone,
    );
  }

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

  /// The tokens for [palette] in [brightness], with the glass at [glassTint] (ThemeConfig
  /// `glassTint`; the CSS default when omitted).
  static ColorTokens resolve(
    Palette palette,
    Brightness brightness, {
    double glassTint = glassTintDefault,
  }) {
    final tint = clampGlassTint(glassTint);
    final dark = brightness == Brightness.dark;
    final shared = (
      // Glass material fitted to rendered Liquid Glass (glass/material.dart).
      edgeLight: white(dark ? 0.13 : 0.62),
      edgeLow: white(dark ? 0.14 : 0.27),
      shadow: dark ? 0.14 : 0.095,
      shadowSmall: dark ? 0.033 : 0.066,
      veil: dark ? 0.75 : 0.87,
      veilLarge: dark ? 0.72 : 0.71,
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
      glassShadowAlpha: shared.shadow,
      glassShadowAlphaSmall: shared.shadowSmall,
      glassGlow: shared.glow,
      controlHighlight: shared.highlight,
      glassVeil: shared.veil,
      glassVeilLarge: shared.veilLarge,
      glassTint: tint,
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

/// Sizes from `system.css`: the density's defaults (comfortable = iOS 26 controls measured in
/// `research/liquid-glass/CONTROLS-MEASURED.md`; compact and thin one step down each), with
/// [ThemeConfig.metrics] on top, and radii multiplied by the radius scale where the CSS does.
class SizeTokens {
  const SizeTokens._(this.density, this.radiusScale, this.metrics);
  factory SizeTokens.of(ThemeConfig config) =>
      SizeTokens._(config.density, config.radiusScale, config.metrics);

  final Density density;
  final double radiusScale;
  final Metrics metrics;

  double _pick(double comfortable, double compact, double thin) =>
      switch (density) {
        Density.comfortable => comfortable,
        Density.compact => compact,
        Density.thin => thin,
      };

  /// `--lab-control-small`: small buttons.
  double get controlSmall => metrics.controlHeight?.small ?? _pick(30, 26, 22);

  /// `--lab-control-height`: regular buttons.
  double get controlHeight =>
      metrics.controlHeight?.regular ?? _pick(36, 30, 26);

  /// `--lab-control-large`: large buttons.
  double get controlLarge => metrics.controlHeight?.large ?? _pick(52, 36, 30);

  /// `--lab-control-padding-small`: a small text button's side padding.
  double get controlPaddingSmall =>
      metrics.controlPadding?.small ?? _pick(10, 8, 6);

  /// `--lab-control-padding`: a regular text button's side padding.
  double get controlPadding =>
      metrics.controlPadding?.regular ?? _pick(12, 10, 8);

  /// `--lab-control-padding-large`: a large text button's side padding.
  double get controlPaddingLarge =>
      metrics.controlPadding?.large ?? _pick(20, 12, 10);

  /// `--lab-control-font-small`: a small button's label size.
  double get controlFontSmall =>
      metrics.controlFont?.small ?? _pick(15, 13, 12);

  /// `--lab-control-font`: a regular button's label size.
  double get controlFont => metrics.controlFont?.regular ?? _pick(17, 15, 13);

  /// `--lab-control-font-large`: a large button's label size.
  double get controlFontLarge =>
      metrics.controlFont?.large ?? _pick(17, 17, 15);

  /// A control label's whole-pixel line height: `round(size × 1.3)` (17 → 22, 15 → 20).
  static double controlLine(double fontSize) =>
      (fontSize * 1.3).roundToDouble();

  /// `--lab-field-height`: text fields, selects and number fields.
  double get fieldHeight => metrics.fieldHeight?.regular ?? _pick(44, 36, 30);

  /// `--lab-field-height-small`: small fields, as tall as a regular button.
  double get fieldHeightSmall =>
      metrics.fieldHeight?.small ?? _pick(36, 30, 26);

  /// `--lab-row-height`: navigation rows and list-like controls.
  double get rowHeight => metrics.rowHeight ?? _pick(44, 32, 26);

  /// `--lab-menu-row-height`: menu and floating-panel rows.
  double get menuRowHeight => _pick(40, 30, 24);

  /// `--lab-toolbar-item`: a toolbar bubble's outer height.
  double get toolbarItem => metrics.toolbarItem ?? _pick(44, 36, 30);

  /// `--lab-toolbar-control`: a control inside a toolbar bubble (2px padding + 1px border a side).
  double get toolbarControl => toolbarItem - 6;

  /// `--lab-toolbar-gap`: space between toolbar groups.
  double get toolbarGap => metrics.toolbarGap ?? _pick(12, 10, 8);

  /// `--lab-shell-gap`: the workspace shell's one gap (window, top bar, content panel and sidebar
  /// items, and the sidebar's header/footer to its items).
  double get shellGap => metrics.shellGap ?? 8;

  /// `--lab-toolbar-inset`: a floating bar's inset from its panel's sides.
  double get toolbarInset => metrics.toolbarInset ?? _pick(16, 12, 10);

  /// `--lab-segmented-inset`: a segmented control's edge to its pill, and between options.
  double get segmentedInset => metrics.segmentedInset ?? 2;

  /// `--lab-switch-width` × `--lab-switch-height`: a switch track.
  double get switchWidth => metrics.switchSize?.width ?? _pick(63, 54, 45);
  double get switchHeight => metrics.switchSize?.height ?? _pick(28, 24, 20);

  /// `--lab-thumb-width` × `--lab-thumb-height`: the switch thumb and the thin slider's thumb.
  double get thumbWidth => metrics.thumbSize?.width ?? _pick(37, 31, 25);
  double get thumbHeight => metrics.thumbSize?.height ?? _pick(24, 20, 16);

  /// `--lab-slider-track`: the thin slider's rail.
  double get sliderTrack => metrics.sliderTrack ?? _pick(6, 5, 4);

  /// `--lab-list-row-height`: an inset-grouped list row.
  double get listRowHeight => metrics.listRowHeight ?? _pick(54, 44, 36);

  /// `--lab-list-radius`: an inset-grouped list card's corners.
  double get listRadius =>
      (metrics.listRadius ?? _pick(26, 20, 16)) * radiusScale;

  /// `--lab-list-inset`: list rows' side padding, headers and separators.
  double get listInset => metrics.listInset ?? _pick(16, 12, 10);

  /// `--lab-focus-ring-width`: the keyboard focus ring's line.
  double get focusRingWidth => metrics.focusRingWidth ?? 2;

  /// `--lab-focus-ring-offset`: the keyboard focus ring's distance outside the shape.
  double get focusRingOffset => metrics.focusRingOffset ?? 1;

  /// `--lab-space-4`.
  double get space4 => _pick(16, 12, 10);

  double get touchTarget => 44;

  /// `--lab-radius-control`: half a regular control (a capsule).
  double get radiusControl => controlHeight / 2 * radiusScale;

  /// `--lab-radius-control-small`: half a small control.
  double get radiusControlSmall => controlSmall / 2 * radiusScale;
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
