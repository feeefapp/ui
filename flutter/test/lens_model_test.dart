import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Rect;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter_test/flutter_test.dart';

/// The web kit's glass lens model (`src/primitives/lens-model.ts`) and its Dart twin agree on every
/// vector in fixtures/lens.json (written by tool/generate_lens_fixture.ts).
void main() {
  final fixture = jsonDecode(
    File('test/fixtures/lens.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v! as num).toDouble();

  test('constants', () {
    final c = fixture['constants'] as Map<String, dynamic>;
    expect(lensThumbScale, n(c['lensThumbScale']));
    expect(lensStretchTime, n(c['lensStretchTime']));
    expect(switchOverdrag, n(c['switchOverdrag']));
    expect(switchDeceleration, n(c['switchDeceleration']));
    expect(switchSlopMouse, n(c['switchSlopMouse']));
    expect(switchSlopTouch, n(c['switchSlopTouch']));
    expect(contentPressScale, n(c['contentPressScale']));
    expect(lensPillLiftX, n(c['lensPillLiftX']));
    expect(lensPillLiftY, n(c['lensPillLiftY']));
    expect(lensLabelScale, n(c['lensLabelScale']));
  });
  test('lensPillShape lifts a liquid pill from its rest size', () {
    // iOS 26.2: the 96 × 28 segment pill becomes a 120 × 44 lens, centred.
    const rest = Rect.fromLTWH(53, 184, 96, 28);
    final full = lensPillShape(rest, 14, 1, true);
    expect(full.rect, const Rect.fromLTWH(41, 176, 120, 44));
    expect(full.radius, 22);
    final half = lensPillShape(rest, 14, 0.5, true);
    expect(half.rect, const Rect.fromLTWH(47, 180, 108, 36));
    expect(half.radius, 18);
    // A lens that can't bend keeps the pill's own box; corners clamp to the shorter side.
    final plain = lensPillShape(rest, 40, 1, false);
    expect(plain.rect, rest);
    expect(plain.radius, 14);
  });
  test('lensInkZoom grows the selected option under the lens', () {
    expect(lensInkZoom(0), 1);
    expect(lensInkZoom(1), closeTo(lensLabelScale, 1e-12));
    expect(lensInkZoom(0.5), closeTo(1.1, 1e-12));
    expect(lensInkZoom(2), closeTo(lensLabelScale, 1e-12));
  });
  test('lensBend matches the web kit on every vector', () {
    for (final row in fixture['pillBend'] as List<dynamic>) {
      final v = (row as List<dynamic>).map(n).toList();
      expect(
        lensBend(LensKind.pill, v[0], gap: v[1]),
        closeTo(v[2], 1e-6),
        reason: 'pill d ${v[0]} gap ${v[1]}',
      );
    }
    for (final (key, kind) in [
      ('switchBend', LensKind.switchThumb),
      ('thumbBend', LensKind.thumb),
    ]) {
      for (final row in fixture[key] as List<dynamic>) {
        final v = (row as List<dynamic>).map(n).toList();
        expect(lensBend(kind, v[0]), closeTo(v[1], 1e-6), reason: '$key ${v[0]}');
      }
    }
    expect(lensBend(LensKind.pill, -1, gap: 8), 0);
  });
  test('the pill rim only ever shows what lies inside its rest pill', () {
    for (final gap in [0.0, 4.0, 8.0, 12.0]) {
      var last = double.negativeInfinity;
      for (var d = 0.0; d <= 40; d += 0.25) {
        final shown = d + lensBend(LensKind.pill, d, gap: gap);
        expect(shown, greaterThanOrEqualTo(gap + lensPillMargin - 1e-9));
        expect(shown, greaterThanOrEqualTo(last - 1e-9), reason: 'no fold');
        last = shown;
      }
    }
  });
  test('an option grows by how much of it the pill covers', () {
    for (final row in fixture['coverage'] as List<dynamic>) {
      final v = (row as List<dynamic>).map(n).toList();
      expect(lensCoverage(v[0], v[1], v[2], v[3]), closeTo(v[4], 1e-6));
    }
    for (final row in fixture['inkZoom'] as List<dynamic>) {
      final v = (row as List<dynamic>).map(n).toList();
      expect(lensInkZoom(v[0], v[1]), closeTo(v[2], 1e-6));
    }
  });
  test('the switch thumb zooms its middle out', () {
    expect(lensZoom(LensKind.switchThumb, 0, 0), (x: 0.0, y: 0.0));
    expect(lensZoom(LensKind.switchThumb, 10, 8).x, closeTo(0.4, 1e-12));
    expect(lensZoom(LensKind.switchThumb, -20, 8).x, closeTo(-0.8, 1e-12));
    expect(lensZoom(LensKind.switchThumb, 20, 8).y, 0);
    expect(lensZoom(LensKind.pill, 20, 8), (x: 0.0, y: 0.0));
    expect(lensZoom(LensKind.thumb, 20, 8), (x: 0.0, y: 0.0));
  });
  test('only the slider thumb softens its band', () {
    expect(lensSoftBlur, 2);
    expect(lensSoftWeight(LensKind.thumb, 0), 1);
    expect(lensSoftWeight(LensKind.thumb, 1), closeTo(0.8, 1e-12));
    expect(lensSoftWeight(LensKind.thumb, 2.5), closeTo(0.5, 1e-12));
    expect(lensSoftWeight(LensKind.thumb, 5), 0);
    expect(lensSoftWeight(LensKind.thumb, 8), 0);
    expect(lensSoftWeight(LensKind.thumb, -1), 0);
    expect(lensSoftWeight(LensKind.pill, 0), 0);
    expect(lensSoftWeight(LensKind.switchThumb, 0), 0);
  });
  test('lensMaterial eases the measured material in', () {
    final pill = lensMaterial(kind: LensKind.pill, lens: 1, dark: false);
    expect(pill.veil, 0);
    expect(pill.shade, (top: 0.105, middle: 0.035));
    expect(pill.band, (top: 0.27, side: 0.27, bottom: 0.27));
    expect(pill.edge, (top: 0.45, side: 0.45, bottom: 0.45));
    expect(pill.shadow, lensShadowAlpha);
    final pillDark = lensMaterial(kind: LensKind.pill, lens: 1, dark: true);
    expect(pillDark.band, (top: 0.2, side: 0.2, bottom: 0.2));
    expect(pillDark.edge, (top: 1.0, side: 1.0, bottom: 1.0));
    final thumb = lensMaterial(kind: LensKind.thumb, lens: 1, dark: false);
    expect(thumb.veil, 0.09);
    expect(thumb.shade, (top: 0.14, middle: 0.04));
    expect(thumb.band, (top: 0.0, side: 0.25, bottom: 0.08));
    expect(thumb.edge, (top: 0.0, side: 0.3, bottom: 0.1));
    expect(thumb.line, (inner: 0.35, outer: 0.23, bottom: 0.0));
    final thumbDark = lensMaterial(kind: LensKind.thumb, lens: 1, dark: true);
    expect(thumbDark.band, (top: 0.0, side: 0.15, bottom: 0.15));
    expect(thumbDark.edge, (top: 0.0, side: 0.18, bottom: 0.18));
    expect(thumbDark.line, (inner: 0.24, outer: 0.31, bottom: 0.0));
    expect(pill.line, (inner: 0.0, outer: 0.0, bottom: 0.0));
    for (final dark in [false, true]) {
      final s = lensMaterial(kind: LensKind.switchThumb, lens: 1, dark: dark);
      expect(s.veil, 0.09);
      expect(s.shade, (top: 0.14, middle: 0.04));
      expect(s.band, (top: 0.2, side: 0.2, bottom: 0.3));
      expect(s.edge, (top: 0.25, side: 0.25, bottom: 0.45));
      expect(s.line, (inner: dark ? 0.5 : 0.55, outer: 0.0, bottom: 0.6));
    }
    final half = lensMaterial(kind: LensKind.thumb, lens: 0.5, dark: false);
    expect(half.veil, closeTo(0.045, 1e-12));
    expect(half.shadow, closeTo(0.065, 1e-12));
    expect(lensMaterial(kind: LensKind.pill, lens: 0, dark: false).shadow, 0);
  });
  test('lensStretch', () {
    for (final v in fixture['stretch'] as List) {
      expect(lensStretch(n(v[0])), closeTo(n(v[1]), 1e-5), reason: 'v ${v[0]}');
    }
  });
  test('switchDragPosition', () {
    for (final v in fixture['dragPosition'] as List) {
      expect(
        switchDragPosition(n(v[0]), n(v[1]), n(v[2])),
        closeTo(n(v[3]), 1e-5),
        reason: 'start ${v[0]} dx ${v[1]} travel ${v[2]}',
      );
    }
  });
  test('switchSnap', () {
    for (final v in fixture['snap'] as List) {
      expect(
        switchSnap(n(v[0]), n(v[1])),
        n(v[2]),
        reason: 'position ${v[0]} velocity ${v[1]}',
      );
    }
  });
  test('touchOutset', () {
    for (final v in fixture['outset'] as List) {
      expect(
        touchOutset(n(v[0]), n(v[1])),
        closeTo(n(v[2]), 1e-9),
        reason: 'size ${v[0]} target ${v[1]}',
      );
    }
  });
}
