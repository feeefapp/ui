/// What Flutter DevTools sees of the kit. Outside release builds the first [ThemeProvider] to build
/// registers service extensions under `ext.feeef_ui.*` (read by the kit's DevTools panel,
/// `extension/devtools`, or by hand from DevTools' VM tools): the themes in the tree with every
/// resolved token, the device traits and effects tier, and overrides for palette, brightness,
/// density, glass, motion and performance that every [ThemeProvider] applies at once. The kit's
/// expensive work shows on the Performance page as `feeef_ui:` timeline events ([kitTimeline]),
/// and what it decides on its own (a device measured slow) is logged under `feeef_ui.*`
/// ([kitLog]). Release builds register nothing and skip both.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../glass/refraction_filter.dart' show glassCapabilities;
import '../performance.dart';
import '../theme.dart';

/// Theme options forced on every [ThemeProvider] while debugging (DevTools sets them through
/// `ext.feeef_ui.setThemeOverride`). Null fields keep each provider's own value. [brightness]
/// applies to root providers and to nested ones that follow the platform; a nested provider with
/// its own brightness (a dark island) keeps it.
@immutable
class ThemeOverride with Diagnosticable {
  const ThemeOverride({
    this.brightness,
    this.palette,
    this.primary,
    this.density,
    this.radius,
    this.glass,
    this.glassTint,
    this.glassBlur,
    this.glassRefraction,
    this.motion,
    this.performance,
  });

  final Brightness? brightness;
  final Palette? palette;
  final Color? primary;
  final Density? density;
  final double? radius;
  final GlassStyle? glass;
  final double? glassTint;
  final bool? glassBlur;
  final bool? glassRefraction;
  final Motion? motion;
  final Performance? performance;

  /// Nothing overridden.
  // ignore: diagnostic_describe_all_properties
  bool get isEmpty => toJson().isEmpty;

  /// [config] with the overridden options replaced.
  ThemeConfig apply(ThemeConfig config) => config.copyWith(
    palette: palette,
    primary: primary ?? config.primary,
    density: density,
    radius: radius,
    glass: glass,
    glassTint: glassTint,
    glassBlur: glassBlur,
    glassRefraction: glassRefraction,
    motion: motion,
    performance: performance,
  );

  /// The overridden options, by name (enums by name, colours as `#rrggbb`).
  Map<String, Object> toJson() => {
    'brightness': ?brightness?.name,
    'palette': ?palette?.name,
    if (primary case final primary?) 'primary': colorHex(primary),
    'density': ?density?.name,
    'radius': ?radius,
    'glass': ?glass?.name,
    'glassTint': ?glassTint,
    'glassBlur': ?glassBlur,
    'glassRefraction': ?glassRefraction,
    'motion': ?motion?.name,
    'performance': ?performance?.name,
  };

  /// Reads service extension parameters: the keys of [toJson]; an empty value drops that key.
  /// Throws [FormatException] on an unknown value.
  factory ThemeOverride.fromParameters(Map<String, String> params) {
    String? read(String key) {
      final value = params[key]?.trim();
      return value == null || value.isEmpty ? null : value;
    }

    T? choose<T extends Enum>(String key, List<T> values) {
      final value = read(key);
      if (value == null) return null;
      for (final option in values) {
        if (option.name == value) return option;
      }
      throw FormatException('Unknown $key "$value"');
    }

    double? number(String key) {
      final value = read(key);
      if (value == null) return null;
      return double.tryParse(value) ??
          (throw FormatException('$key must be a number, got "$value"'));
    }

    bool? flag(String key) => switch (read(key)) {
      null => null,
      'true' => true,
      'false' => false,
      final value => throw FormatException(
        '$key must be true or false, got "$value"',
      ),
    };

    Color? colour(String key) {
      final value = read(key);
      if (value == null) return null;
      final digits = value.startsWith('#') ? value.substring(1) : value;
      final rgb = digits.length == 6 ? int.tryParse(digits, radix: 16) : null;
      if (rgb == null) {
        throw FormatException('$key must be #rrggbb, got "$value"');
      }
      return Color(0xff000000 | rgb);
    }

    return ThemeOverride(
      brightness: choose('brightness', Brightness.values),
      palette: choose('palette', Palette.values),
      primary: colour('primary'),
      density: choose('density', Density.values),
      radius: number('radius'),
      glass: choose('glass', GlassStyle.values),
      glassTint: number('glassTint'),
      glassBlur: flag('glassBlur'),
      glassRefraction: flag('glassRefraction'),
      motion: choose('motion', Motion.values),
      performance: choose('performance', Performance.values),
    );
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        EnumProperty<Brightness>('brightness', brightness, defaultValue: null),
      )
      ..add(EnumProperty<Palette>('palette', palette, defaultValue: null))
      ..add(ColorProperty('primary', primary, defaultValue: null))
      ..add(EnumProperty<Density>('density', density, defaultValue: null))
      ..add(DoubleProperty('radius', radius, defaultValue: null))
      ..add(EnumProperty<GlassStyle>('glass', glass, defaultValue: null))
      ..add(DoubleProperty('glassTint', glassTint, defaultValue: null))
      ..add(
        DiagnosticsProperty<bool>('glassBlur', glassBlur, defaultValue: null),
      )
      ..add(
        DiagnosticsProperty<bool>(
          'glassRefraction',
          glassRefraction,
          defaultValue: null,
        ),
      )
      ..add(EnumProperty<Motion>('motion', motion, defaultValue: null))
      ..add(
        EnumProperty<Performance>(
          'performance',
          performance,
          defaultValue: null,
        ),
      );
  }
}

/// The kit's DevTools hooks. Apps need no setup: [ThemeProvider] calls [ensureRegistered].
abstract final class KitDevTools {
  /// Service extension names start with this.
  static const prefix = 'ext.feeef_ui';

  /// The event DevTools receives (`developer.postEvent`) whenever the override or the measured
  /// tier changes.
  static const stateChangedEvent = 'feeef_ui:stateChanged';

  /// The override every [ThemeProvider] applies; always null in release builds.
  static final ValueNotifier<ThemeOverride?> themeOverride = ValueNotifier(
    null,
  );

  static bool _registered = false;

  /// Registers the `ext.feeef_ui.*` service extensions once (nothing in release builds):
  ///
  /// * `getState`: device traits, effects tier, glass capabilities, the override and every
  ///   theme in the tree with its resolved config, colours and sizes.
  /// * `setThemeOverride`: any of [ThemeOverride.toJson]'s keys; `clear=true` drops the override
  ///   first. Answers with the new state.
  /// * `setMeasuredSlow`: `value=true` steps `auto` themes down to light as a slow device would;
  ///   `false` forgets a measured slow device ([MeasuredPerformance.forget]).
  static void ensureRegistered() {
    if (kReleaseMode || _registered) return;
    _registered = true;
    _register('getState', (_) => state());
    _register('setThemeOverride', (params) async {
      // Keys sent replace the current override's (an empty value drops one); others stay.
      final options = {
        if (params['clear'] != 'true')
          for (final MapEntry(:key, :value)
              in themeOverride.value?.toJson().entries ??
                  <MapEntry<String, Object>>[])
            key: '$value',
        for (final MapEntry(:key, :value) in params.entries)
          if (key != 'clear' && !key.startsWith('isolate')) key: value,
      };
      final next = ThemeOverride.fromParameters(options);
      themeOverride.value = next.isEmpty ? null : next;
      await _rebuilt();
      return state();
    });
    _register('setMeasuredSlow', (params) async {
      if (params['value'] == 'true') {
        MeasuredPerformance.slow.value = true;
      } else {
        MeasuredPerformance.forget();
      }
      await _rebuilt();
      return state();
    });
    themeOverride.addListener(_changed);
    MeasuredPerformance.slow.addListener(_changed);
  }

  static void _register(
    String method,
    FutureOr<Map<String, Object?>> Function(Map<String, String> params) handler,
  ) {
    developer.registerExtension('$prefix.$method', (_, params) async {
      try {
        return developer.ServiceExtensionResponse.result(
          jsonEncode(await handler(params)),
        );
      } on FormatException catch (error) {
        return developer.ServiceExtensionResponse.error(
          developer.ServiceExtensionResponse.invalidParams,
          error.message,
        );
      }
    });
  }

  static void _changed() {
    kitLog('devtools', 'State changed: ${jsonEncode(_summary())}');
    // Only while a tool listens (DevTools' panel); nothing to wait for otherwise.
    if (!developer.extensionStreamHasListener) return;
    _rebuilt().then((_) => developer.postEvent(stateChangedEvent, _summary()));
  }

  /// Waits for the providers to rebuild with the change. While DevTools has the focus the app is
  /// often hidden, and Flutter makes no frames for a hidden app, so this forces one (giving up
  /// after a second).
  static Future<void> _rebuilt() {
    final scheduler = SchedulerBinding.instance;
    scheduler.scheduleForcedFrame();
    return scheduler.endOfFrame.timeout(
      const Duration(seconds: 1),
      onTimeout: () {},
    );
  }

  static Map<String, Object?> _summary() => {
    'override': themeOverride.value?.toJson(),
    'measuredSlow': MeasuredPerformance.slow.value,
  };

  /// What `ext.feeef_ui.getState` answers.
  static Map<String, Object?> state() {
    final traits = DeviceTraits.current;
    final capabilities = glassCapabilities();
    final root = WidgetsBinding.instance.rootElement;
    return {
      ..._summary(),
      'device': {
        'web': traits.web,
        'cores': traits.cores,
        'memoryGb': traits.memoryGb,
        'threaded': traits.threaded,
        'softwareGpu': traits.softwareGpu,
      },
      'autoTier': resolvePerformance(
        Performance.auto,
        traits,
        slow: MeasuredPerformance.slow.value,
      ).name,
      'capabilities': {
        'refraction': capabilities.refraction,
        'backdropBlur': capabilities.backdropBlur,
      },
      'themes': [
        if (root != null)
          for (final theme in debugThemesInTree(root))
            {
              'depth': theme.depth,
              'creator': theme.creator,
              'brightness': theme.data.brightness.name,
              'performance': theme.data.performance.name,
              'config': describeDiagnostics(theme.data.config),
              'colors': describeDiagnostics(theme.data.colors),
              'sizes': describeDiagnostics(theme.data.sizes),
            },
      ],
    };
  }
}

/// Runs [body] as a `feeef_ui: <name>` event on the DevTools timeline (Performance page). Release
/// builds just run it.
T kitTimeline<T>(
  String name,
  T Function() body, {
  Map<String, Object?>? arguments,
}) {
  if (kReleaseMode) return body();
  return developer.Timeline.timeSync(
    'feeef_ui: $name',
    body,
    arguments: arguments,
  );
}

/// Logs [message] to DevTools' Logging page under `feeef_ui.<area>`. Release builds log nothing.
void kitLog(
  String area,
  String message, {
  int level = 800,
  Object? error,
  StackTrace? stackTrace,
}) {
  if (kReleaseMode) return;
  developer.log(
    message,
    name: 'feeef_ui.$area',
    level: level,
    error: error,
    stackTrace: stackTrace,
  );
}

/// A diagnosticable's properties as JSON: colours as `#rrggbb` (`#rrggbbaa` when translucent),
/// enums by name, numbers and flags as they are, anything else as its description. Properties
/// left at their default are listed under `defaults` so a panel can grey them.
Map<String, Object?> describeDiagnostics(Diagnosticable value) {
  final values = <String, Object?>{};
  final defaults = <String>[];
  for (final property in value.toDiagnosticsNode().getProperties()) {
    final name = property.name;
    if (name == null || property is! DiagnosticsProperty) continue;
    final raw = property.value;
    values[name] = switch (raw) {
      null => null,
      Color() => colorHex(raw),
      Enum() => raw.name,
      num() || bool() || String() => raw,
      Diagnosticable() => {
        for (final MapEntry(:key, :value) in describeDiagnostics(raw).entries)
          if (key != 'defaults' && value != null) key: value,
      },
      _ => property.toDescription(),
    };
    if (property.isFiltered(DiagnosticLevel.info)) defaults.add(name);
  }
  return {...values, if (defaults.isNotEmpty) 'defaults': defaults};
}

/// `#rrggbb`, or `#rrggbbaa` when [color] is translucent.
String colorHex(Color color) {
  String byte(double channel) =>
      (channel * 255).round().clamp(0, 255).toRadixString(16).padLeft(2, '0');
  final rgb = '#${byte(color.r)}${byte(color.g)}${byte(color.b)}';
  return color.a >= 1 ? rgb : '$rgb${byte(color.a)}';
}
