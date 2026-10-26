import 'dart:ui' show TextDirection;

/// Pure i18n helpers, the twin of `@feeef.dev/ui/i18n-core`: languages, direction, an ICU
/// message formatter (arguments, `plural`, `select`, `number`, apostrophe quoting) and key lookup.
class Language {
  const Language(this.code, this.name, this.direction);
  final String code, name;
  final TextDirection direction;
}

/// Built-in languages, in the order the switcher shows them.
const languages = [
  Language('ar', 'العربية', TextDirection.rtl),
  Language('fr', 'Français', TextDirection.ltr),
  Language('en', 'English', TextDirection.ltr),
];

const _rtlBases = {'ar', 'fa', 'he', 'ur'};

/// `rtl` for Arabic, Persian, Hebrew and Urdu (any region subtag), otherwise `ltr`.
TextDirection directionFor(String locale) =>
    _rtlBases.contains(locale.split(RegExp('[-_]')).first.toLowerCase())
    ? TextDirection.rtl
    : TextDirection.ltr;

/// CLDR plural category of [n] in [locale] (en, fr and ar rules; other locales use en's).
String pluralCategory(num n, String locale) {
  final base = locale.split(RegExp('[-_]')).first.toLowerCase();
  final integer = n == n.truncate();
  switch (base) {
    case 'ar':
      if (!integer) return 'other';
      final i = n.toInt(), mod = i % 100;
      if (i == 0) return 'zero';
      if (i == 1) return 'one';
      if (i == 2) return 'two';
      if (mod >= 3 && mod <= 10) return 'few';
      if (mod >= 11 && mod <= 99) return 'many';
      return 'other';
    case 'fr':
      return n >= 0 && n < 2 ? 'one' : 'other';
    default:
      return n == 1 && integer ? 'one' : 'other';
  }
}

/// A number as `Intl.NumberFormat(locale)` writes it: grouped thousands, up to 3 decimals.
String formatLocaleNumber(num n, String locale) {
  final base = locale.split(RegExp('[-_]')).first.toLowerCase();
  final group = base == 'fr' ? ' ' : ',';
  final decimal = base == 'fr' ? ',' : '.';
  var text = n.abs().toStringAsFixed(3);
  text = text.replaceFirst(RegExp(r'\.?0+$'), '');
  final parts = text.split('.');
  final whole = parts[0];
  final out = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) out.write(group);
    out.write(whole[i]);
  }
  if (parts.length > 1) out.write('$decimal${parts[1]}');
  return out.toString();
}

class _Parser {
  _Parser(this.text, this.locale, this.params);
  final String text, locale;
  final Map<String, Object> params;
  int i = 0;

  /// Reads until a closing brace at this level (or the end at the top level).
  String message({num? pound, bool nested = false}) {
    final out = StringBuffer();
    while (i < text.length) {
      final ch = text[i];
      if (ch == '}') {
        if (!nested) throw const FormatException('unexpected }');
        return out.toString();
      }
      if (ch == '{') {
        i++;
        out.write(argument());
        continue;
      }
      if (ch == '#' && pound != null) {
        out.write(formatLocaleNumber(pound, locale));
        i++;
        continue;
      }
      if (ch == "'") {
        // '' is an apostrophe; 'x…' quotes syntax characters until the next lone quote.
        if (i + 1 < text.length && text[i + 1] == "'") {
          out.write("'");
          i += 2;
          continue;
        }
        if (i + 1 < text.length && '{}#|'.contains(text[i + 1])) {
          final end = text.indexOf("'", i + 1);
          if (end < 0) throw const FormatException('unterminated quote');
          out.write(text.substring(i + 1, end));
          i = end + 1;
          continue;
        }
      }
      out.write(ch);
      i++;
    }
    if (nested) throw const FormatException('unterminated {');
    return out.toString();
  }

  String _word() {
    while (i < text.length && text[i] == ' ') {
      i++;
    }
    final start = i;
    while (i < text.length && !' ,{}'.contains(text[i])) {
      i++;
    }
    final word = text.substring(start, i);
    while (i < text.length && text[i] == ' ') {
      i++;
    }
    return word;
  }

  String argument() {
    final name = _word();
    if (name.isEmpty) throw const FormatException('empty argument');
    final value = params[name];
    if (i < text.length && text[i] == '}') {
      i++;
      if (value == null) throw FormatException('missing $name');
      return value is num ? formatLocaleNumber(value, locale) : '$value';
    }
    if (text[i] != ',') throw const FormatException('expected ,');
    i++;
    final type = _word();
    if (type == 'number') {
      if (i < text.length && text[i] == ',') {
        i++;
        _word();
      }
      if (text[i] != '}') throw const FormatException('expected }');
      i++;
      return formatLocaleNumber(value as num, locale);
    }
    if (type != 'plural' && type != 'select') {
      throw FormatException('type $type');
    }
    if (text[i] != ',') throw const FormatException('expected ,');
    i++;
    final options = <String, String>{};
    String? chosen;
    final n = type == 'plural' ? value as num : null;
    final key = type == 'plural' ? pluralCategory(n!, locale) : '$value';
    while (true) {
      final selector = _word();
      if (selector.isEmpty) break;
      if (text[i] != '{') throw const FormatException('expected {');
      i++;
      final body = message(pound: n, nested: true);
      i++; // the closing brace
      options[selector] = body;
      if (n != null &&
          selector == '=${n is int || n == n.truncate() ? n.toInt() : n}') {
        chosen ??= body;
      }
      if (i < text.length && text[i] == '}') break;
    }
    if (i >= text.length || text[i] != '}') {
      throw const FormatException('expected }');
    }
    i++;
    final result = chosen ?? options[key] ?? options['other'];
    if (result == null) throw const FormatException('no other');
    return result;
  }
}

/// Formats one ICU message; falls back to the raw pattern on any error.
String formatMessage(
  String message,
  String locale, [
  Map<String, Object>? params,
]) {
  if (!message.contains('{') && !message.contains("'")) return message;
  try {
    return _Parser(message, locale, params ?? const {}).message();
  } catch (_) {
    return message;
  }
}

/// Resolves [key] in a flat translations map; the key itself when unknown.
String translate(
  Map<String, String> translations,
  String locale,
  String key, [
  Map<String, Object>? params,
]) {
  final message = translations[key];
  return message == null ? key : formatMessage(message, locale, params);
}

/// Flattens nested lab JSON (`{voice: {title: …}}`) into `lab.voice.title` keys.
Map<String, String> flattenTranslations(
  Map<String, Object?> nested, [
  String prefix = 'lab',
]) {
  final out = <String, String>{};
  void walk(Object? value, String path) {
    if (value is String) {
      out[path] = value;
    } else if (value is Map) {
      for (final MapEntry(:key, :value) in value.entries) {
        walk(value, '$path.$key');
      }
    }
  }

  walk(nested, prefix);
  return out;
}
