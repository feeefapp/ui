import 'dart:math' as math;

import 'package:flutter/foundation.dart' show immutable;
import 'package:flutter/painting.dart';

import 'brand/pixel_noise.dart' show imul32;

/// Seeded avatar fingerprints, the twin of `@feeef.dev/ui/avatar-fingerprint`. Visual identity, not
/// a security hash: the same data always draws the same 16 × 16 pixel sphere on the web and in
/// Flutter (tested against vectors generated from the TypeScript).
///
/// Supported data: `null`, `bool`, `num`, `String`, `DateTime`, `List` / `Iterable` (arrays) and
/// `Map` (objects; keys are compared as strings, so key order never matters). JavaScript's
/// `String.normalize('NFC')` has no Dart equivalent without a Unicode table: strings are hashed as
/// given, so pass NFC text (what keyboards and the web produce) when it contains combining marks.
String avatarKey(Object? data) {
  final seen = <Object>{};
  String serialize(Object? value) {
    if (value is String) return jsonStringify(value);
    if (value == null) return 'null';
    if (value is bool) return '$value';
    if (value is num) return jsNumberToString(value);
    if (value is DateTime) return _isoString(value);
    if (value is! Map && value is! Iterable) {
      throw ArgumentError.value(value, 'data', 'Unsupported avatar data');
    }
    if (seen.any((item) => identical(item, value))) {
      throw ArgumentError('Avatar data must not contain cycles.');
    }
    seen.add(value);
    final String result;
    if (value is Map) {
      final entries = {for (final e in value.entries) '${e.key}': e.value};
      final keys = entries.keys.toList()..sort();
      result =
          '{${keys.map((key) => '${jsonStringify(key)}:${serialize(entries[key])}').join(',')}}';
    } else {
      result = '[${(value as Iterable).map(serialize).join(',')}]';
    }
    seen.removeWhere((item) => identical(item, value));
    return result;
  }

  return serialize(data);
}

/// `JSON.stringify(string)`: quotes, escapes `"` `\` and control characters, and writes lone
/// surrogates as `\udxxx` (well-formed JSON.stringify).
String jsonStringify(String value) {
  final out = StringBuffer('"');
  final units = value.codeUnits;
  String hex(int unit) => '\\u${unit.toRadixString(16).padLeft(4, '0')}';
  for (var i = 0; i < units.length; i++) {
    final unit = units[i];
    switch (unit) {
      case 0x22:
        out.write(r'\"');
      case 0x5c:
        out.write(r'\\');
      case 0x08:
        out.write(r'\b');
      case 0x0c:
        out.write(r'\f');
      case 0x0a:
        out.write(r'\n');
      case 0x0d:
        out.write(r'\r');
      case 0x09:
        out.write(r'\t');
      default:
        if (unit < 0x20) {
          out.write(hex(unit));
        } else if (unit >= 0xd800 && unit <= 0xdbff) {
          final paired =
              i + 1 < units.length &&
              units[i + 1] >= 0xdc00 &&
              units[i + 1] <= 0xdfff;
          if (paired) {
            out.writeCharCode(unit);
            out.writeCharCode(units[++i]);
          } else {
            out.write(hex(unit));
          }
        } else if (unit >= 0xdc00 && unit <= 0xdfff) {
          out.write(hex(unit));
        } else {
          out.writeCharCode(unit);
        }
    }
  }
  out.write('"');
  return out.toString();
}

/// JavaScript's `String(number)`: integers without a decimal point, `-0` as `0`, exponent form
/// from 1e21 and below 1e-6, and the shortest round-trip digits otherwise.
String jsNumberToString(num value) {
  if (value is int) return '$value';
  final v = value.toDouble();
  if (v.isNaN) return 'NaN';
  if (v.isInfinite) return v > 0 ? 'Infinity' : '-Infinity';
  if (v == 0) return '0';
  if (v == v.truncateToDouble() && v.abs() < 1e21) {
    return BigInt.from(v).toString();
  }
  // Dart's double formatting already uses JavaScript's shortest digits and exponent thresholds.
  return v.toString();
}

/// `Date.prototype.toISOString`: UTC, milliseconds, `Z`.
String _isoString(DateTime value) {
  final d = value.toUtc();
  String two(int n) => n.toString().padLeft(2, '0');
  final year = d.year >= 0 && d.year <= 9999
      ? d.year.toString().padLeft(4, '0')
      : '${d.year < 0 ? '-' : '+'}${d.year.abs().toString().padLeft(6, '0')}';
  return '$year-${two(d.month)}-${two(d.day)}T${two(d.hour)}:${two(d.minute)}:'
      '${two(d.second)}.${d.millisecond.toString().padLeft(3, '0')}Z';
}

int _hash(String value, int salt) {
  var state = (2166136261 ^ (salt % 4294967296)) & 0xFFFFFFFF;
  for (final character in value.runes) {
    state = imul32(state ^ character, 16777619);
  }
  state = (state ^ (state >> 16)) & 0xFFFFFFFF;
  return imul32(state, 2246822507);
}

/// One fingerprint square: top-left corner in the 64 × 64 view box (3 × 3 squares on a 4px grid),
/// its CSS colour and opacity.
typedef FingerprintPixel = ({double x, double y, String color, double opacity});

/// The result of [voiceFingerprint].
@immutable
class VoiceFingerprint {
  const VoiceFingerprint({
    required this.key,
    required this.rotation,
    required this.hue,
    required this.colors,
    required this.pixels,
  });

  /// 32 hex digits: four 32-bit hashes of the data and salt.
  final String key;

  /// Orientation in radians, 0–2π.
  final double rotation;

  /// Base hue in degrees (0–359).
  final int hue;

  /// Five CSS colours, light to dark (`hsl(h s% l%)`), as the web kit returns them.
  final List<String> colors;
  final List<FingerprintPixel> pixels;

  /// View box size.
  final int width = 64, height = 64;

  /// [colors] as Flutter colours.
  List<Color> get palette => [for (final c in colors) cssHslColor(c)];
}

/// The same data and rotation salt always return the same palette, orientation and pixel shading.
VoiceFingerprint voiceFingerprint(Object? data, [int rotationSalt = 0]) {
  final source = '${avatarKey(data)}:$rotationSalt';
  final hashes = [
    for (var salt = 0; salt < 4; salt++) _hash(source, salt * 2654435761),
  ];
  final key = hashes.map((v) => v.toRadixString(16).padLeft(8, '0')).join();
  final rotation = (hashes[1] / 4294967296) * math.pi * 2;
  final hue = hashes[0] % 360;
  final colors = [
    'hsl($hue 38% 91%)',
    'hsl($hue 54% 72%)',
    'hsl($hue 58% 54%)',
    'hsl(${(hue + 28) % 360} 52% 36%)',
    'hsl(${(hue + 42) % 360} 46% 24%)',
  ];
  const threshold = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  final frequency = 2 + (hashes[2] % 3);
  final pixels = <FingerprintPixel>[];
  for (var row = 0; row < 16; row++) {
    for (var column = 0; column < 16; column++) {
      final x = (column - 7.5) / 7.5, y = (row - 7.5) / 7.5;
      final radius = _hypot(x, y);
      final angle = math.atan2(y, x) + rotation;
      final edge = 0.91 + 0.05 * math.sin(angle * 3 + hashes[3] / 1000);
      if (radius > edge) continue;
      final z = math.sqrt(math.max(0, 1 - radius * radius));
      final rotatedX = x * math.cos(rotation) - y * math.sin(rotation);
      final rotatedY = x * math.sin(rotation) + y * math.cos(rotation);
      final light = math.max(
        0.0,
        math.min(1.0, z * 0.72 - x * 0.36 - y * 0.42),
      );
      final ribbon = math.sin(
        rotatedX * frequency * 2.2 + rotatedY * 2.1 + z * 2.4,
      );
      final shade = math.max(
        0.0,
        math.min(1.0, light * 0.68 + (ribbon + 1) * 0.16),
      );
      final dither = threshold[(row % 4) * 4 + (column % 4)] / 16;
      final index = math.max(
        1,
        math.min(4, ((1 - shade) * 4 + dither * 0.65).floor()),
      );
      pixels.add((
        x: column * 4.0,
        y: row * 4.0,
        color: colors[index],
        opacity: 1.0,
      ));
    }
  }
  return VoiceFingerprint(
    key: key,
    rotation: rotation,
    hue: hue,
    colors: colors,
    pixels: pixels,
  );
}

/// `Math.hypot` for two finite values (V8 scales by the larger magnitude).
double _hypot(double x, double y) {
  final a = x.abs(), b = y.abs();
  final m = math.max(a, b);
  if (m == 0) return 0;
  final p = a / m, q = b / m;
  return m * math.sqrt(p * p + q * q);
}

/// Parses `hsl(h s% l%)` (space or comma separated) into a colour; transparent if it can't.
Color cssHslColor(String css) {
  final match = RegExp(
    r'hsla?\(\s*([-\d.]+)(?:deg)?[\s,]+([-\d.]+)%[\s,]+([-\d.]+)%',
  ).firstMatch(css);
  if (match == null) return const Color(0x00000000);
  return hslColor(
    double.parse(match[1]!),
    double.parse(match[2]!) / 100,
    double.parse(match[3]!) / 100,
  );
}

/// CSS `hsl()` to sRGB (hue in degrees, saturation and lightness 0–1).
Color hslColor(double hue, double saturation, double lightness) {
  final h = ((hue % 360) + 360) % 360;
  double f(int n) {
    final k = (n + h / 30) % 12;
    final a = saturation * math.min(lightness, 1 - lightness);
    return lightness - a * math.max(-1, math.min(math.min(k - 3, 9 - k), 1));
  }

  return Color.from(alpha: 1, red: f(0), green: f(8), blue: f(4));
}
