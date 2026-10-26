import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:feeef_ui/avatar_fingerprint.dart';
import 'package:feeef_ui/brand/animated_logo.dart';
import 'package:feeef_ui/brand/logo.dart';
import 'package:feeef_ui/pixel_art.dart';
import 'package:flutter_test/flutter_test.dart';

/// Vectors from the web kit: `npx tsx flutter/tool/generate_brand_fixture.ts` (from ui/).
final _fixture = jsonDecode(
  File('test/fixtures/brand.json').readAsStringSync(),
) as Map<String, dynamic>;

Object? _revive(Object? value) {
  if (value is List) return [for (final v in value) _revive(v)];
  if (value is Map<String, dynamic>) {
    if (value[r'$date'] is String) {
      return DateTime.parse(value[r'$date'] as String);
    }
    return {for (final e in value.entries) e.key: _revive(e.value)};
  }
  return value;
}

double _n(Object? v) => (v as num).toDouble();

void main() {
  group('avatar fingerprint', () {
    test('numbers format like JavaScript String(number)', () {
      for (final raw in _fixture['numbers'] as List) {
        final c = raw as Map<String, dynamic>;
        expect(jsNumberToString(c['value'] as num), c['js'], reason: '$c');
      }
      expect(jsNumberToString(-0.0), '0');
      expect(jsNumberToString(double.nan), 'NaN');
      expect(jsNumberToString(double.infinity), 'Infinity');
      expect(jsNumberToString(5.0), '5');
    });

    for (final raw in _fixture['avatar'] as List) {
      final c = raw as Map<String, dynamic>;
      test('${jsonEncode(c['data'])} with salt ${c['salt']}', () {
        final data = _revive(c['data']);
        expect(avatarKey(data), c['avatarKey']);
        final print = voiceFingerprint(data, c['salt'] as int);
        expect(print.key, c['key']);
        expect(print.rotation, closeTo(_n(c['rotation']), 1e-9));
        expect(print.colors, c['colors']);
        final pixels = c['pixels'] as List;
        expect(print.pixels.length, pixels.length);
        for (var i = 0; i < pixels.length; i++) {
          final p = pixels[i] as List;
          expect(print.pixels[i].x, _n(p[0]));
          expect(print.pixels[i].y, _n(p[1]));
          expect(print.pixels[i].color, print.colors[p[2] as int]);
          expect(print.pixels[i].opacity, _n(p[3]));
        }
      });
    }

    test('key order is irrelevant and cycles are rejected', () {
      expect(avatarKey({'b': 1, 'a': 2}), avatarKey({'a': 2, 'b': 1}));
      final cycle = <String, Object?>{};
      cycle['self'] = cycle;
      expect(() => avatarKey(cycle), throwsArgumentError);
      expect(() => avatarKey(Object()), throwsArgumentError);
    });

    test('hsl colours convert like CSS', () {
      expect(cssHslColor('hsl(120 100% 50%)'), const Color(0xFF00FF00));
      expect(cssHslColor('hsl(0 0% 100%)'), const Color(0xFFFFFFFF));
      final c = cssHslColor('hsl(209 54% 72%)');
      // Chrome: rgb(145, 185, 222).
      expect((c.r * 255).round(), 145);
      expect((c.g * 255).round(), 185);
      expect((c.b * 255).round(), 222);
    });
  });

  group('pixel artwork', () {
    for (final raw in _fixture['artwork'] as List) {
      final c = raw as Map<String, dynamic>;
      test('${c['variant']} "${c['seed']}" matches square for square', () {
        final art = artworkPixels(
          PixelVariant.values.byName(c['variant'] as String),
          c['seed'] as String,
        );
        expect(art.width, c['width']);
        expect(art.height, c['height']);
        final pixels = c['pixels'] as List;
        expect(art.pixels.length, pixels.length);
        for (var i = 0; i < pixels.length; i++) {
          final e = pixels[i] as Map<String, dynamic>;
          expect(art.pixels[i].x, _n(e['x']));
          expect(art.pixels[i].y, _n(e['y']));
          expect(art.pixels[i].opacity, closeTo(_n(e['opacity']), 1e-12));
          final fill = e['fill'] as String?;
          expect(
            art.pixels[i].color,
            fill == null ? isNull : cssHslColor(fill),
          );
        }
      });
    }
  });

  group('wordmark', () {
    test('static strokes match brand/logo.tsx', () {
      final logo = _fixture['logo'] as Map<String, dynamic>;
      expect(logo['viewBox'], '0 0 ${logoViewBox.width} ${logoViewBox.height}');
      final strokes = logo['strokes'] as List;
      expect(logoStrokes.length, strokes.length);
      for (var i = 0; i < strokes.length; i++) {
        final s = strokes[i] as Map<String, dynamic>;
        expect(logoStrokes[i].d, s['d']);
        expect(logoStrokes[i].ink.name, s['ink']);
        expect(logoStrokes[i].dash, _n(s['dash']));
        expect(logoStrokeWidth, _n(s['width']));
      }
    });

    test('dashes split a path like stroke-dasharray', () {
      final line = Path()
        ..moveTo(0, 0)
        ..lineTo(100, 0);
      final dashed = dashedPath(line, 30);
      final lengths = [for (final m in dashed.computeMetrics()) m.length];
      expect(lengths, [closeTo(30, 1e-4), closeTo(30, 1e-4)]);
      final shifted = dashedPath(line, 30, 15);
      expect(
        [for (final m in shifted.computeMetrics()) m.length],
        [closeTo(15, 1e-4), closeTo(30, 1e-4)],
      );
      // The E stroke (595.57 long) ends just past its 595 dash: one dash, the tail cut.
      final e = dashedPath(svgPath(logoStrokes[2].d), 595);
      expect(e.computeMetrics().length, 1);
    });

    test('animated SVG markup is the web string, character for character', () {
      final animated = _fixture['animatedLogo'] as Map<String, dynamic>;
      expect(foAnimatedLogoSvg, animated['svg']);
    });

    test('animated timeline matches the SMIL animations in document order', () {
      final animated = _fixture['animatedLogo'] as Map<String, dynamic>;
      final defs = animated['animations'] as List;
      final timeline = foAnimatedLogoTimeline;
      expect(timeline.length, defs.length);
      for (var i = 0; i < defs.length; i++) {
        final d = defs[i] as Map<String, dynamic>;
        final a = timeline[i];
        expect(switch (a.attribute) {
          LogoAttribute.transform => 'transform',
          LogoAttribute.strokeWidth => 'stroke-width',
          LogoAttribute.strokeDashoffset => 'stroke-dashoffset',
        }, d['attribute']);
        expect(a.from, [for (final v in d['from'] as List) _n(v)]);
        expect(a.to, [for (final v in d['to'] as List) _n(v)]);
        expect(a.begin, _n(d['begin']));
        expect(a.dur, _n(d['dur']));
        final s = [for (final v in d['spline'] as List) _n(v)];
        expect([a.spline.x1, a.spline.y1, a.spline.x2, a.spline.y2], s);
      }
      expect(foAnimatedLogoDuration, closeTo(3.033, 1e-12));
    });

    test('animated frames match to 1e-9', () {
      final animated = _fixture['animatedLogo'] as Map<String, dynamic>;
      final timeline = foAnimatedLogoTimeline;
      for (final raw in animated['frames'] as List) {
        final f = raw as Map<String, dynamic>;
        final time = _n(f['time']);
        final values = f['values'] as List;
        for (var i = 0; i < values.length; i++) {
          final actual = timeline[i].valueAt(time);
          if (values[i] == null) {
            expect(actual, timeline[i].base);
            continue;
          }
          final expected = values[i] as List;
          for (var k = 0; k < expected.length; k++) {
            expect(
              actual[k],
              closeTo(_n(expected[k]), 1e-9),
              reason: 'animation $i at $time',
            );
          }
        }
      }
    });

    test('the first F starts below its resting place', () {
      final f = foAnimatedLogoLetters.first.move;
      expect(f.valueAt(-1), [-434.279, 0.326]);
      expect(f.valueAt(0), [-434.279, 100.326]);
      expect(f.valueAt(5), [-434.279, -99.649]);
    });
  });
}
