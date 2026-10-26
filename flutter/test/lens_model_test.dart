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
    expect(lensTabScale, n(c['lensTabScale']));
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
    // Transparent glass keeps the pill's own box; corners clamp to the shorter side.
    final plain = lensPillShape(rest, 40, 1, false);
    expect(plain.rect, rest);
    expect(plain.radius, 14);
  });
  test('lensInkZoom grows only a tab bar\'s item', () {
    expect(lensInkZoom(1, true), closeTo(lensTabScale, 1e-12));
    expect(lensInkZoom(0.5, true), closeTo(1.1, 1e-12));
    expect(lensInkZoom(0, true), 1);
    expect(lensInkZoom(1, false), 1);
    expect(lensInkZoom(2, true), closeTo(lensTabScale, 1e-12));
  });
  test('lensBend reproduces the web kit\'s measured profiles', () {
    // research/liquid-glass/LENS-MEASURED.md §2, src/glass/refraction.ts lensBend.
    final pill = {
      0.17: 4.3,
      2.17: -1.985588,
      5.0: -4.3,
      10.0: -2.670924,
      20.0: -1.030499,
    };
    final thumb = {0.5: 7.1, 2.0: 4.916396, 4.0: 1.818857, 6.0: 0.282};
    for (final MapEntry(key: d, value: shift) in pill.entries) {
      expect(lensBend(LensKind.pill, d), closeTo(shift, 1e-5), reason: 'd $d');
    }
    for (final MapEntry(key: d, value: shift) in thumb.entries) {
      expect(lensBend(LensKind.thumb, d), closeTo(shift, 1e-5), reason: 'd $d');
    }
    expect(lensBend(LensKind.thumb, 7.5), 0);
    expect(lensBend(LensKind.pill, -1), 0);
  });
  test(
    'the switch thumb bends like a smaller pill and zooms its middle out',
    () {
      // The pill's profile × 0.67: inward at the rim, outward peaking at 2.9 px 5 px in.
      expect(lensBend(LensKind.switchThumb, 5), closeTo(-2.881, 1e-3));
      expect(lensBend(LensKind.switchThumb, 0.2), greaterThan(0));
      expect(lensBend(LensKind.switchThumb, 0.2), closeTo(0.67 * 4, 1e-9));
      for (final d in [0.1, 2.0, 5.0, 12.0]) {
        expect(
          lensBend(LensKind.switchThumb, d),
          closeTo(lensBend(LensKind.pill, d) * lensSwitchScale, 1e-12),
        );
      }
      // The zoom grows with the offset from the centre, along x only; nothing at the centre.
      expect(lensZoom(LensKind.switchThumb, 0, 0), (x: 0.0, y: 0.0));
      expect(lensZoom(LensKind.switchThumb, 10, 8).x, closeTo(0.4, 1e-12));
      expect(lensZoom(LensKind.switchThumb, 20, 8).x, closeTo(0.8, 1e-12));
      expect(lensZoom(LensKind.switchThumb, -20, 8).x, closeTo(-0.8, 1e-12));
      expect(lensZoom(LensKind.switchThumb, 20, 8).y, 0);
      expect(lensZoom(LensKind.pill, 20, 8), (x: 0.0, y: 0.0));
      expect(lensZoom(LensKind.thumb, 20, 8), (x: 0.0, y: 0.0));
    },
  );
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
