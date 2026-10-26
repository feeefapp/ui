import 'package:flutter/widgets.dart';

import 'i18n/i18n.dart';
import 'icons/lucide.dart';
import 'motion.dart';
import 'primitives/button.dart';
import 'theme.dart';

/// Colour mode: `system` follows the platform's brightness and updates when it changes.
enum ThemeMode { system, light, dark }

/// What [ThemeModeProvider.of] returns: the twin of `useTheme()` in `@feeef.dev/ui/theme`.
@immutable
class ThemeModeState {
  const ThemeModeState({
    required this.mode,
    required this.resolvedMode,
    required this.setMode,
  });

  /// `system`, `light` or `dark`.
  final ThemeMode mode;

  /// The brightness in use: [mode], or the platform's for `system`.
  final Brightness resolvedMode;

  /// Changes the mode and calls `onModeChange`.
  final ValueChanged<ThemeMode> setMode;

  @override
  bool operator ==(Object other) =>
      other is ThemeModeState &&
      other.mode == mode &&
      other.resolvedMode == resolvedMode;

  @override
  int get hashCode => Object.hash(mode, resolvedMode);
}

/// Owns the colour mode and renders a [ThemeProvider] with the resolved brightness: the part of the
/// web kit's `ThemeProvider` that stores `system | light | dark`. Persist the mode yourself with
/// [onModeChange] (the web kit writes it to the `preferences` service under `feeef-lab-theme`) and
/// pass it back as [initialMode].
class ThemeModeProvider extends StatefulWidget {
  const ThemeModeProvider({
    super.key,
    this.initialMode = ThemeMode.system,
    this.config = ThemeConfig.defaults,
    this.onModeChange,
    required this.child,
  });

  /// Mode used at first. Default: `system`.
  final ThemeMode initialMode;

  /// App-level palette, density, radius and glass.
  final ThemeConfig config;

  /// Called after the mode changes.
  final ValueChanged<ThemeMode>? onModeChange;
  final Widget child;

  /// The nearest provider's mode. Throws outside one, like `useTheme()`.
  static ThemeModeState of(BuildContext context) {
    final state = maybeOf(context);
    if (state == null) {
      throw FlutterError('ThemeModeProvider.of requires a ThemeModeProvider');
    }
    return state;
  }

  /// The nearest provider's mode, or null.
  static ThemeModeState? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ModeScope>()?.state;

  @override
  State<ThemeModeProvider> createState() => _ThemeModeProviderState();
}

class _ThemeModeProviderState extends State<ThemeModeProvider> {
  late ThemeMode _mode = widget.initialMode;

  void _set(ThemeMode mode) {
    if (mode == _mode) return;
    setState(() => _mode = mode);
    widget.onModeChange?.call(mode);
  }

  @override
  Widget build(BuildContext context) {
    final resolved = switch (_mode) {
      ThemeMode.light => Brightness.light,
      ThemeMode.dark => Brightness.dark,
      ThemeMode.system =>
        MediaQuery.maybePlatformBrightnessOf(context) ?? Brightness.light,
    };
    return _ModeScope(
      state: ThemeModeState(mode: _mode, resolvedMode: resolved, setMode: _set),
      child: ThemeProvider(
        config: widget.config,
        brightness: resolved,
        child: widget.child,
      ),
    );
  }
}

class _ModeScope extends InheritedWidget {
  const _ModeScope({required this.state, required super.child});
  final ThemeModeState state;
  @override
  bool updateShouldNotify(_ModeScope old) => old.state != state;
}

/// The mode a click on [ThemeSwitch] moves to: system → light → dark → system.
ThemeMode nextThemeMode(ThemeMode mode) => switch (mode) {
  ThemeMode.system => ThemeMode.light,
  ThemeMode.light => ThemeMode.dark,
  ThemeMode.dark => ThemeMode.system,
};

/// Icon button that cycles system → light → dark → system: the twin of `ThemeSwitch` in
/// `@feeef.dev/ui/theme`. Its label comes from `lab.common.themeSwitchTo`; the icon (monitor,
/// sun, moon) cross-fades. Needs a [ThemeModeProvider] above it.
class ThemeSwitch extends StatelessWidget {
  const ThemeSwitch({super.key});

  @override
  Widget build(BuildContext context) {
    final t = I18n.of(context).t;
    final state = ThemeModeProvider.of(context);
    final next = nextThemeMode(state.mode);
    final Widget icon = switch (state.mode) {
      ThemeMode.system => const LucideMonitor(size: 20),
      ThemeMode.dark => const LucideMoon(size: 20),
      ThemeMode.light => const LucideSun(size: 20),
    };
    return IconButton(
      variant: ButtonVariant.ghost,
      appearance: ButtonAppearance.toolbar,
      controlSize: ControlSize.icon,
      ariaLabel: t('lab.common.themeSwitchTo', {
        'mode': state.mode.name,
        'next': next.name,
      }),
      onClick: () => state.setMode(next),
      icon: Swap(swapKey: state.mode.name, child: icon),
    );
  }
}
