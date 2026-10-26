import 'package:flutter/widgets.dart';

import 'i18n_core.dart';
import 'messages.g.dart';

/// Locale, direction and `t()` for the kit's strings: the value of `useI18n()` in the web kit.
@immutable
class I18n {
  const I18n._(
    this.locale,
    this.direction,
    this.availableLocales,
    this._messages,
    this._onLocale,
  );

  /// Active locale code.
  final String locale;
  final TextDirection direction;

  /// Locales the host serves.
  final List<String> availableLocales;
  final Map<String, String> _messages;
  final ValueChanged<String>? _onLocale;

  /// Translates [key] with ICU [params]; the key itself when no string exists.
  String t(String key, [Map<String, Object>? params]) =>
      translate(_messages, locale, key, params);

  /// Asks the host to switch to [code]; ignores unknown or current locales.
  void setLocale(String code) {
    if (code == locale || !availableLocales.contains(code)) return;
    _onLocale?.call(code);
  }

  /// Without a provider: the built-in English strings, left to right.
  static final fallback = I18n._(
    'en',
    TextDirection.ltr,
    [for (final l in languages) l.code],
    uiMessages['en']!,
    null,
  );

  /// The nearest provider's i18n, or [fallback].
  static I18n of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_I18nScope>()?.i18n ??
      fallback;
}

/// Gives its subtree a locale, its direction and translations (host strings over the kit's
/// built-in ones): the twin of `I18nProvider` in `@feeef.dev/ui/i18n`.
class I18nProvider extends StatelessWidget {
  const I18nProvider({
    super.key,
    this.locale = 'ar',
    this.direction,
    this.availableLocales,
    this.translations = const {},
    this.onLocaleChange,
    required this.child,
  });

  /// Active locale code, e.g. `en`, `ar`, `fr`.
  final String locale;

  /// Text direction; derived from [locale] when null.
  final TextDirection? direction;

  /// Locales the language switcher offers; every built-in language when null.
  final List<String>? availableLocales;

  /// Flat `{ "lab.…": "ICU message" }` map, merged over the kit's built-in strings for [locale].
  final Map<String, String> translations;

  /// Called by `I18n.setLocale`; the host reloads its strings for the new locale.
  final ValueChanged<String>? onLocaleChange;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final base = locale.split(RegExp('[-_]')).first;
    final messages = {...?uiMessages[base], ...translations};
    final dir = direction ?? directionFor(locale);
    return _I18nScope(
      i18n: I18n._(
        locale,
        dir,
        availableLocales ?? [for (final l in languages) l.code],
        messages,
        onLocaleChange,
      ),
      child: Directionality(textDirection: dir, child: child),
    );
  }
}

class _I18nScope extends InheritedWidget {
  const _I18nScope({required this.i18n, required super.child});
  final I18n i18n;
  @override
  bool updateShouldNotify(_I18nScope old) =>
      old.i18n.locale != i18n.locale ||
      old.i18n.direction != i18n.direction ||
      !identical(old.i18n._messages, i18n._messages);
}
