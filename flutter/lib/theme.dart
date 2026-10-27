import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'performance.dart';
import 'primitives/touch_target.dart';
import 'theme/focus_visible.dart';
import 'theme/tokens.dart';
import 'theme_config.dart';

export 'theme/tokens.dart'
    show ColorTokens, ControlVariant, SizeTokens, VariantPaint;
export 'theme_config.dart';

/// The kit's text font as a package font (`--lab-font` ends in IBM Plex Sans Arabic; Outfit is the
/// brand face). Platform system fonts come first, as in the CSS stack.
const kitFontFamily = 'packages/feeef_ui/IBM Plex Sans Arabic';
const brandFontFamily = 'packages/feeef_ui/Outfit';

/// The resolved theme: config, colours for the current brightness and sizes for the density.
@immutable
class ThemeData {
  ThemeData({
    required this.config,
    required this.brightness,
    ColorTokens? colors,
    PerformanceTier? performance,
  }) : performance =
           performance ??
           resolvePerformance(
             config.performance,
             DeviceTraits.current,
             slow: MeasuredPerformance.slow.value,
           ),
       colors =
           colors ??
           ColorTokens.resolve(
             config.palette,
             brightness,
             glassTint: config.tint,
             primary: config.primary,
           ),
       sizes = SizeTokens.of(config);

  final ThemeConfig config;
  final Brightness brightness;
  final ColorTokens colors;
  final SizeTokens sizes;

  /// The effects tier [config]'s `performance` resolves to on this device ([performanceOf]).
  final PerformanceTier performance;

  /// Touch screens keep 44px targets whatever the density (CSS `pointer: coarse`).
  bool coarsePointer(BuildContext context) => const {
    TargetPlatform.android,
    TargetPlatform.iOS,
    TargetPlatform.fuchsia,
  }.contains(defaultTargetPlatform);

  @override
  bool operator ==(Object other) =>
      other is ThemeData &&
      other.brightness == brightness &&
      other.colors.backdropTone == colors.backdropTone &&
      other.config.palette == config.palette &&
      other.config.primary == config.primary &&
      other.config.density == config.density &&
      other.config.radius == config.radius &&
      other.config.glass == config.glass &&
      other.config.tint == config.tint &&
      other.config.glassBlur == config.glassBlur &&
      other.config.glassRefraction == config.glassRefraction &&
      other.config.refractionStrength == config.refractionStrength &&
      other.config.highlight == config.highlight &&
      other.config.highlightWidth == config.highlightWidth &&
      other.config.glassBarBoost == config.glassBarBoost &&
      other.config.motion == config.motion &&
      other.performance == performance &&
      other.config.metrics == config.metrics;

  @override
  int get hashCode => Object.hash(
    brightness,
    colors.backdropTone,
    config.palette,
    config.primary,
    config.density,
    config.radius,
    config.glass,
    config.tint,
    config.glassBlur,
    config.glassRefraction,
    config.refractionStrength,
    config.highlight,
    config.highlightWidth,
    config.glassBarBoost,
    config.motion,
    performance,
    config.metrics,
  );
}

/// Owns the colour mode and the app theme config, like the web kit's `ThemeProvider`. Put it above
/// the app; read it with [ThemeProvider.of]. [brightness] defaults to the platform's. While mounted,
/// focus highlights follow the web's `:focus-visible` (shown after a key press, hidden after any
/// pointer press; [FocusVisibility]).
class ThemeProvider extends StatelessWidget {
  const ThemeProvider({
    super.key,
    this.config = ThemeConfig.defaults,
    this.brightness,
    this.colors,
    required this.child,
  });

  /// Explicit colour tokens instead of the palette's for [brightness] (adaptive glass passes
  /// [ColorTokens.backdrop]).
  final ColorTokens? colors;

  /// App-level palette, density, radius and glass.
  final ThemeConfig config;

  /// `light` or `dark`; null follows the platform (the web kit's `system` mode).
  final Brightness? brightness;

  final Widget child;

  /// The theme above [context], or null outside every [ThemeProvider].
  static ThemeData? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ThemeScope>()?.data;

  static ThemeData of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<_ThemeScope>();
    assert(scope != null, 'ThemeProvider.of requires a ThemeProvider above it');
    return scope!.data;
  }

  @override
  Widget build(BuildContext context) {
    final mode =
        brightness ??
        MediaQuery.maybePlatformBrightnessOf(context) ??
        Brightness.light;
    // The root provider resolves the touch reach of the controls below it (TouchTarget).
    final Widget content = TouchTargetScope.exists(context)
        ? child
        : TouchTargetScope(child: child);
    // A device measured slow steps `auto` down while the app runs (MeasuredPerformance).
    return ValueListenableBuilder<bool>(
      valueListenable: MeasuredPerformance.slow,
      child: content,
      builder: (context, _, content) {
        final data = ThemeData(
          config: config,
          brightness: mode,
          colors: colors,
        );
        return _ThemeScope(
          data: data,
          child: FocusVisibility(
            child: DefaultTextStyle.merge(
              style: TextStyle(
                color: data.colors.ink,
                fontFamilyFallback: const [kitFontFamily],
              ),
              child: content!,
            ),
          ),
        );
      },
    );
  }
}

class _ThemeScope extends InheritedWidget {
  const _ThemeScope({required this.data, required super.child});
  final ThemeData data;
  @override
  bool updateShouldNotify(_ThemeScope old) => old.data != data;
}

/// The glass style to paint with: the app's [ThemeConfig.glass], or `solid` when the platform asks
/// for more contrast (`MediaQuery.highContrast`, the web kit's `prefers-contrast: more`; the kit
/// then also outlines glass in the ink colour, see [glassHighContrastOf]), or on a device whose
/// effects tier can't afford backdrop filters ([PerformanceTier.backdrop]). Flutter exposes no
/// reduce-transparency setting: apps that read one from the platform pass `GlassStyle.solid`.
GlassStyle glassStyleOf(BuildContext context) =>
    glassHighContrastOf(context) || !performanceOf(context).backdrop
    ? GlassStyle.solid
    : ThemeProvider.of(context).config.glass;

/// True when the platform asks for more contrast: glass turns opaque with an ink outline.
bool glassHighContrastOf(BuildContext context) =>
    MediaQuery.maybeHighContrastOf(context) ?? false;

/// How much the kit animates here: the app's [ThemeConfig.motion] made stricter by the platform's
/// `MediaQuery.disableAnimations` (`full` becomes `reduced`; `none` stays `none`). The twin of the
/// web kit's `motionOf()`. Without a [ThemeProvider] above, only the platform setting counts.
Motion motionOf(BuildContext context) {
  final config =
      context
          .dependOnInheritedWidgetOfExactType<_ThemeScope>()
          ?.data
          .config
          .motion ??
      Motion.full;
  if (config == Motion.none) return Motion.none;
  final platform = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  return config == Motion.reduced || platform ? Motion.reduced : Motion.full;
}

/// True when motion should be reduced: the platform disables animations, or [ThemeConfig.motion]
/// is `reduced` or `none`. Every reduced-motion path in the kit reads this (web:
/// `prefersReducedMotion()`).
bool reducedMotionOf(BuildContext context) => motionOf(context) != Motion.full;
