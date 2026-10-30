import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/containers/sheet.dart';
import 'package:feeef_ui/platform/pointer_shield.dart';
import 'package:feeef_ui/scroll/scroll_area.dart';
import 'package:feeef_ui/primitives/segmented.dart';
import 'package:feeef_ui/primitives/text_field.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

SheetDetent _detent(Object raw) {
  if (raw is num) return SheetDetent.px(raw.toDouble());
  final s = raw as String;
  return switch (s) {
    'peek' => SheetDetent.peek,
    'medium' => SheetDetent.medium,
    'large' => SheetDetent.large,
    'fit' => SheetDetent.fit,
    _ => SheetDetent.percent(double.parse(s.substring(0, s.length - 1))),
  };
}

SheetMetrics _metrics(Map m) => SheetMetrics(
  hostHeight: (m['hostHeight'] as num).toDouble(),
  topInset: (m['topInset'] as num).toDouble(),
  natural: (m['natural'] as num).toDouble(),
  peek: (m['peek'] as num?)?.toDouble(),
);

Rect _rect(Map r) =>
    Rect.fromLTWH(_d(r['x']), _d(r['y']), _d(r['width']), _d(r['height']));

SheetFrameMode _mode(String m) => SheetFrameMode.values.byName(m);

double _d(Object? v) => (v as num).toDouble();

/// A phone-sized screen with an overlay and a toggle that owns the sheet's `open`.
/// The sheet's host: owns `open`, like an app would.
class _Harness {
  bool open = false;
  final changes = <SheetDetent>[];
  late StateSetter set;

  void show(bool value) => set(() => open = value);

  Widget app({
    List<SheetDetent> detents = const [SheetDetent.large],
    bool reduced = false,
    Motion motion = Motion.full,
  }) => host(
    config: ThemeConfig(motion: motion),
    Builder(
      builder: (context) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
        child: Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => StatefulBuilder(
                builder: (context, setState) {
                  set = setState;
                  return SheetBackdrop(
                    child: Sheet(
                      open: open,
                      onOpenChange: (value) => setState(() => open = value),
                      label: 'Filters',
                      // No header: the geometry below is the body's alone.
                      showClose: false,
                      detents: detents,
                      onDetentChange: changes.add,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (var i = 0; i < 3; i++)
                            SizedBox(height: 40, child: Text('Row $i')),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

double _sheetTop(WidgetTester tester) =>
    tester.getTopLeft(find.text('Row 0')).dy;

void main() {
  group('sheet model matches the TypeScript', () {
    final fixture = jsonDecode(
      File('test/fixtures/sheet.json').readAsStringSync(),
    );

    test('detentHeight', () {
      for (final r in fixture['detentHeight'] as List) {
        expect(
          detentHeight(_detent(r['detent']), _metrics(r['metrics'])),
          closeTo(_d(r['height']), 1e-9),
          reason: '$r',
        );
      }
    });

    test('wheelHeight: free above the lowest height, half speed below it', () {
      expect(wheelHeight(500, 60, 400, 790, true), 560);
      expect(wheelHeight(780, 60, 400, 790, true), 790);
      expect(wheelHeight(500, -60, 400, 790, true), 440);
      expect(wheelHeight(420, -60, 400, 790, true), 380);
      expect(wheelHeight(380, -60, 400, 790, true), 350);
      expect(wheelHeight(10, -60, 400, 790, true), 0);
      expect(wheelHeight(420, -60, 400, 790, false), 400);
      expect(wheelDismisses(350, 400), isFalse);
      expect(wheelDismisses(336, 400), isTrue);
      expect(wheelDismisses(60, 100), isTrue);
      expect(wheelDismisses(70, 100), isFalse);
    });

    test('drag, release and dim', () {
      for (final s in fixture['sets'] as List) {
        final detents = [for (final d in s['detents'] as List) _detent(d)];
        final m = _metrics(s['metrics']);
        final heights = detentHeights(detents, m);
        expect(heights, [for (final h in s['heights'] as List) _d(h)]);
        for (final r in s['drag'] as List) {
          expect(
            dragHeight(_d(r['raw']), heights, m.hostHeight, r['dismissible']),
            closeTo(_d(r['height']), 1e-9),
            reason: '$r',
          );
        }
        for (final r in s['release'] as List) {
          final got = releaseTarget(
            _d(r['visible']),
            _d(r['velocity']),
            heights,
            r['dismissible'],
          );
          expect(got.height, closeTo(_d(r['height']), 1e-9), reason: '$r');
          expect(got.index, r['index'], reason: '$r');
          expect(got.dismiss, r['dismiss'], reason: '$r');
        }
        for (final r in s['dim'] as List) {
          expect(
            sheetDim(_d(r['visible']), heights),
            closeTo(_d(r['dim']), 1e-9),
          );
        }
        final large = detentHeight(SheetDetent.large, m);
        for (final r in s['undimmed'] as List) {
          expect(
            sheetDim(_d(r['visible']), heights, _d(r['undimmed']), large),
            closeTo(_d(r['dim']), 1e-9),
            reason: '$r',
          );
        }
        for (final r in s['frame'] as List) {
          final f = sheetFrame(
            _d(r['visible']),
            heights: heights,
            large: large,
            inset: 8,
            radius: 32,
            mode: _mode(r['mode']),
          );
          expect(f.expansion, closeTo(_d(r['expansion']), 1e-9), reason: '$r');
          expect(f.gap, closeTo(_d(r['gap']), 1e-9), reason: '$r');
          expect(
            f.bottomRadius,
            closeTo(_d(r['bottomRadius']), 1e-9),
            reason: '$r',
          );
          expect(f.solid, closeTo(_d(r['solid']), 1e-9), reason: '$r');
        }
        for (final r in s['focus'] as List) {
          final raw = r['focusDetent'];
          expect(
            focusRaise(
              detents,
              heights,
              r['index'],
              raw == null || raw == 'default' ? null : _detent(raw),
              raise: raw != null,
            ),
            r['raise'],
            reason: '$r',
          );
        }
      }
    });

    test('morph', () {
      for (final r in fixture['morph'] as List) {
        final f = sheetMorphFrame(
          _d(r['p']),
          _rect(r['panel']),
          _rect(r['source']),
          _d(r['sourceRadius']),
          32,
        );
        // The web kit rounds these to 0.01 px for CSS.
        expect(f.dx, closeTo(_d(r['dx']), 0.006), reason: '$r');
        expect(f.dy, closeTo(_d(r['dy']), 0.006), reason: '$r');
        expect(f.side, closeTo(_d(r['side']), 0.006), reason: '$r');
        expect(f.bottom, closeTo(_d(r['bottom']), 0.006), reason: '$r');
        expect(f.radius, closeTo(_d(r['radius']), 0.006), reason: '$r');
        expect(f.content, closeTo(_d(r['content']), 1e-9), reason: '$r');
      }
    });

    test('free release, scroll handoff and content fling', () {
      for (final r in fixture['free'] as List) {
        final heights = [for (final h in r['heights'] as List) _d(h)];
        final got = freeTarget(
          _d(r['visible']),
          _d(r['velocity']),
          heights,
          r['dismissible'],
        );
        expect(got.height, closeTo(_d(r['height']), 1e-9), reason: '$r');
        expect(got.dismiss, r['dismiss'], reason: '$r');
        expect(nearestDetent(_d(r['visible']), heights), r['nearest']);
      }
      for (final r in fixture['scroll'] as List) {
        final out = sheetScrollStep(
          (raw: _d(r['raw']), scroll: _d(r['scroll'])),
          _d(r['delta']),
          _d(r['max']),
          _d(r['scrollMax']),
        );
        expect(out.raw, closeTo(_d(r['out']['raw']), 1e-9), reason: '$r');
        expect(out.scroll, closeTo(_d(r['out']['scroll']), 1e-9), reason: '$r');
      }
      for (final r in fixture['fling'] as List) {
        final out = flingStep(120, _d(r['velocity']), _d(r['ms']));
        expect(out.scroll, closeTo(_d(r['scroll']), 1e-6), reason: '$r');
        expect(out.velocity, closeTo(_d(r['velocity_']), 1e-6), reason: '$r');
      }
    });

    test('recede', () {
      for (final r in fixture['recede'] as List) {
        expect(
          sheetRecede(_d(r['visible']), _d(r['large'])),
          closeTo(_d(r['recede']), 1e-9),
          reason: '$r',
        );
      }
    });
  });

  group('sheet model cases (tests/containers.test.ts)', () {
    const m = SheetMetrics(hostHeight: 800, topInset: 10, natural: 320);

    test('peek is the measured header, with a fallback', () {
      expect(
        detentHeight(
          SheetDetent.peek,
          const SheetMetrics(
            hostHeight: 800,
            topInset: 10,
            natural: 320,
            peek: 84,
          ),
        ),
        84,
      );
      expect(detentHeight(SheetDetent.peek, m), 72);
    });

    test('background interaction: no dim up to the undimmed detent', () {
      const heights = [84.0, 400.0, 790.0];
      expect(sheetDim(84, heights, 84, 790), 0);
      expect(sheetDim(400, heights, 84, 790), 1);
      expect(sheetDim(242, heights, 84, 790), 0.5);
      // Undimmed through medium: dims only between medium and large.
      expect(sheetDim(400, heights, 400, 790), 0);
      expect(sheetDim(790, heights, 400, 790), 1);
      // Undimmed at the top detent: never dims.
      expect(sheetDim(790, heights, 790, 790), 0);
    });

    test(
      'floating frame: inset glass low, edges and opaque at full height',
      () {
        SheetFrame at(double v, [SheetFrameMode mode = SheetFrameMode.float]) =>
            sheetFrame(
              v,
              heights: const [84, 400, 790],
              large: 790,
              inset: 8,
              radius: 32,
              mode: mode,
            );
        expect(at(84), (
          expansion: 0.0,
          gap: 8.0,
          bottomRadius: 32.0,
          solid: 0.0,
        ));
        final mid = at(400);
        expect(mid.gap, inExclusiveRange(0, 8), reason: 'medium sits closer');
        expect(mid.solid, 0, reason: 'medium is still glass');
        expect(at(790), (
          expansion: 1.0,
          gap: 0.0,
          bottomRadius: 0.0,
          solid: 1.0,
        ));
        var last = double.infinity;
        for (var v = 84.0; v <= 790; v += 20) {
          expect(at(v).gap, lessThanOrEqualTo(last + 1e-9));
          last = at(v).gap;
        }
        // Below the lowest detent (dragging away) it keeps the floating look.
        expect(at(20).gap, 8);
        expect(at(400, SheetFrameMode.attached), (
          expansion: 1.0,
          gap: 0.0,
          bottomRadius: 0.0,
          solid: 1.0,
        ));
        expect(at(790, SheetFrameMode.card), (
          expansion: 0.0,
          gap: 8.0,
          bottomRadius: 32.0,
          solid: 0.0,
        ));
      },
    );

    test('morph: clipped to the source over it at 0, the panel at 1', () {
      const panel = Rect.fromLTWH(0, 400, 390, 400);
      const source = Rect.fromLTWH(300, 50, 80, 40);
      final start = sheetMorphFrame(0, panel, source, 20, 32);
      expect((start.dx, start.dy), (145.0, -350.0));
      expect((start.side, start.bottom, start.radius), (155.0, 360.0, 20.0));
      expect(start.content, 0);
      final end = sheetMorphFrame(1, panel, source, 20, 32);
      expect((end.dx, end.dy, end.side, end.bottom), (0.0, 0.0, 0.0, 0.0));
      expect((end.radius, end.content), (32.0, 1.0));
      // A capsule radius larger than half the source is clamped to it.
      expect(sheetMorphFrame(0, panel, source, 999, 32).radius, 20);
    });

    test('a focused field raises a peek sheet to its top detent', () {
      const detents = [SheetDetent.peek, SheetDetent.medium, SheetDetent.large];
      const heights = [84.0, 400.0, 790.0];
      expect(focusRaise(detents, heights, 0, null), 2);
      expect(focusRaise(detents, heights, 1, null), null);
      expect(focusRaise(detents, heights, 0, SheetDetent.medium), 1);
      expect(focusRaise(detents, heights, 2, SheetDetent.medium), null);
      expect(focusRaise(detents, heights, 0, null, raise: false), null);
    });
  });

  testWidgets('opens to its detent, Escape and the scrim close it', (
    tester,
  ) async {
    _phone(tester);
    final h = _Harness();
    await tester.pumpWidget(h.app());
    expect(find.text('Row 0'), findsNothing);

    h.show(true);
    await tester.pumpAndSettle();
    expect(find.text('Row 0'), findsOneWidget);
    // Large = 800 - (10 + 0 safe area); the content starts below the shell gap G (8) of padding.
    expect(_sheetTop(tester), closeTo(10 + 8, 0.5));
    expect(find.bySemanticsLabel('Filters'), findsWidgets);
    // A full-height modal sheet makes the page behind recede fully: down 10px, scaled to 94%.
    final page = tester.widget<Transform>(
      find
          .descendant(
            of: find.byType(SheetBackdrop),
            matching: find.byType(Transform),
          )
          .first,
    );
    expect(page.transform.storage[0], closeTo(0.94, 1e-9));
    expect(page.transform.storage[5], closeTo(0.94, 1e-9));
    expect(page.transform.getTranslation().y, closeTo(10, 1e-9));

    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pump();
    expect(h.open, isFalse);
    await tester.pumpAndSettle();
    expect(find.text('Row 0'), findsNothing);

    h.show(true);
    await tester.pumpAndSettle();
    // The scrim above the sheet (the top 10px) dismisses.
    await tester.tapAt(const Offset(200, 4));
    await tester.pump();
    expect(h.open, isFalse);
    await tester.pumpAndSettle();
    expect(find.text('Row 0'), findsNothing);
  });

  testWidgets('a drag snaps to the nearest detent and a flick dismisses', (
    tester,
  ) async {
    _phone(tester);
    final h = _Harness()..open = true;
    await tester.pumpWidget(
      h.app(detents: const [SheetDetent.medium, SheetDetent.large]),
    );
    await tester.pumpAndSettle();
    // Medium = 400px: grabber row (20) + padding (G, 8) above the first row.
    expect(_sheetTop(tester), closeTo(400 + 8 + 8, 0.5));

    // A slow drag up past the middle lands on large.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, -300),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large]);
    expect(_sheetTop(tester), closeTo(10 + 8 + 8, 0.5));

    // A small slow drag down settles back on large.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, 60),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large]);
    expect(_sheetTop(tester), closeTo(26, 0.5));

    // A slow drag down to near the middle lands on medium.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, 380),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large, SheetDetent.medium]);
    expect(_sheetTop(tester), closeTo(416, 0.5));

    // A flick down from medium dismisses.
    await tester.fling(find.text('Row 1'), const Offset(0, 300), 2000);
    await tester.pump();
    expect(h.open, isFalse);
    await tester.pumpAndSettle();
    expect(find.text('Row 0'), findsNothing);
  });

  testWidgets('the grabber is a button that cycles heights', (tester) async {
    _phone(tester);
    final handle = tester.ensureSemantics();
    final h = _Harness()..open = true;
    await tester.pumpWidget(
      h.app(detents: const [SheetDetent.medium, SheetDetent.large]),
    );
    await tester.pumpAndSettle();
    const label = 'Drag to resize, or press to change the height';
    final grabber = find.bySemanticsLabel(label);
    expect(grabber, findsOneWidget);
    expect(
      tester.getSemantics(grabber),
      matchesSemantics(
        label: label,
        isButton: true,
        isFocusable: true,
        hasTapAction: true,
        hasFocusAction: true,
        hasIncreaseAction: true,
        hasDecreaseAction: true,
      ),
    );
    await tester.tap(grabber);
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large]);
    expect(_sheetTop(tester), closeTo(26, 0.5));
    // Cycling wraps around to the lowest detent.
    await tester.tap(grabber);
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large, SheetDetent.medium]);
    handle.dispose();
  });

  testWidgets('the wheel keeps pulling past the lowest height and closes', (
    tester,
  ) async {
    _phone(tester);
    final h = _Harness()..open = true;
    await tester.pumpWidget(
      h.app(detents: const [SheetDetent.medium, SheetDetent.large]),
    );
    await tester.pumpAndSettle();
    final at = tester.getCenter(find.text('Row 1'));
    final mouse = TestPointer(1, PointerDeviceKind.mouse);
    Future<void> wheel(double dy) async {
      await tester.sendEventToBinding(mouse.hover(at));
      await tester.sendEventToBinding(mouse.scroll(Offset(0, dy)));
      await tester.pump(const Duration(milliseconds: 16));
    }

    // A small pull below medium springs back.
    await wheel(-40);
    expect(_sheetTop(tester), closeTo(416 + 20, 0.5), reason: 'half speed');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
    expect(h.open, isTrue);
    expect(_sheetTop(tester), closeTo(416, 0.5));
    // A longer one closes it.
    for (var i = 0; i < 4; i++) {
      await wheel(-40);
    }
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
    expect(h.open, isFalse);
  });

  testWidgets('reduced motion jumps to the detent and fades out', (
    tester,
  ) async {
    _phone(tester);
    final h = _Harness();
    await tester.pumpWidget(h.app(reduced: true));
    h.show(true);
    // Measured, then placed: no spring frames in between.
    for (var i = 0; i < 4; i++) {
      await tester.pump();
    }
    expect(_sheetTop(tester), closeTo(18, 0.5));
    expect(tester.hasRunningAnimations, isFalse);

    h.show(false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Row 0'), findsOneWidget, reason: 'still fading');
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump();
    expect(find.text('Row 0'), findsNothing);
  });

  testWidgets('motion none closes at once, without the reduced fade', (
    tester,
  ) async {
    _phone(tester);
    final h = _Harness();
    await tester.pumpWidget(h.app(motion: Motion.none));
    h.show(true);
    for (var i = 0; i < 4; i++) {
      await tester.pump();
    }
    expect(find.text('Row 0'), findsOneWidget);
    h.show(false);
    await tester.pump();
    await tester.pump();
    expect(find.text('Row 0'), findsNothing);
    expect(tester.hasRunningAnimations, isFalse);
  });

  testWidgets('wide screens present a centered dialog', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    var open = true;
    await tester.pumpWidget(
      host(
        Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => StatefulBuilder(
                builder: (context, setState) => Sheet(
                  open: open,
                  onOpenChange: (v) => setState(() => open = v),
                  label: 'Details',
                  showClose: false,
                  child: const SizedBox(height: 200, child: Text('Body')),
                ),
              ),
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    final body = tester.getRect(find.text('Body'));
    // 560 wide, centered: content starts at (1200 - 560) / 2 + G (8).
    expect(body.left, closeTo(320 + 8, 0.5));
    // Natural height 8 + 200 + 8 = 216, centered vertically.
    expect(body.top, closeTo((900 - 216) / 2 + 8, 0.5));
    await tester.tapAt(const Offset(10, 10));
    await tester.pump();
    expect(open, isFalse);
    await tester.pumpAndSettle();
    expect(find.text('Body'), findsNothing);
  });

  group('iOS 26 sheet', () {
    /// A page that counts taps, under a sheet rendered in place.
    Widget page({
      required Widget Function(StateSetter set) sheet,
      Widget? extra,
      Size size = const Size(390, 800),
    }) => host(
      SizedBox(
        width: size.width,
        height: size.height,
        // An overlay, as an app has: text fields put their selection handles in it.
        child: Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => StatefulBuilder(
                builder: (context, set) => Stack(
                  children: [
                    Positioned.fill(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => pageTaps++,
                        child: const SizedBox.expand(),
                      ),
                    ),
                    ?extra,
                    Positioned.fill(child: sheet(set)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );

    setUp(() => pageTaps = 0);

    Rect surface(WidgetTester tester) => tester.getRect(
      find
          .descendant(
            of: find.byType(Sheet),
            matching: find.byWidgetPredicate(
              (w) => w.runtimeType == SheetSurface,
            ),
          )
          .first,
    );

    testWidgets('floats inset on glass at medium, edge to edge at large', (
      tester,
    ) async {
      _phone(tester);
      var detent = SheetDetent.medium;
      double? expansion;
      await tester.pumpWidget(
        page(
          sheet: (set) => Sheet(
            label: 'Places',
            container: true,
            showClose: false,
            detents: const [SheetDetent.medium, SheetDetent.large],
            detent: detent,
            onDetentChange: (d) => set(() => detent = d),
            child: Builder(
              builder: (context) {
                final scope = SheetScope.of(context)!;
                return ValueListenableBuilder<double>(
                  valueListenable: scope.expansion,
                  builder: (context, value, _) {
                    expansion = value;
                    return Text('at ${scope.detent}');
                  },
                );
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // Medium: the lowest partial detent keeps the full gap (G = 8) on the sides and bottom.
      expect(surface(tester), const Rect.fromLTRB(8, 400, 382, 792));
      expect(find.text('at medium'), findsOneWidget);
      expect(expansion, 0);

      await tester.tap(find.bySemanticsLabel(RegExp('Drag to resize')));
      await tester.pumpAndSettle();
      expect(detent, SheetDetent.large);
      // Large: the gap is closed; the content column keeps its inset.
      expect(surface(tester), const Rect.fromLTRB(0, 10, 390, 800));
      expect(find.text('at large'), findsOneWidget);
      expect(expansion, 1);
      expect(tester.getTopLeft(find.text('at large')).dx, greaterThan(8));
    });

    testWidgets('reports its visible height for chrome riding on top', (
      tester,
    ) async {
      _phone(tester);
      var detent = SheetDetent.medium;
      final heights = <double>[];
      await tester.pumpWidget(
        page(
          sheet: (set) => Sheet(
            label: 'Places',
            container: true,
            showClose: false,
            detents: const [SheetDetent.medium, SheetDetent.large],
            detent: detent,
            onDetentChange: (d) => set(() => detent = d),
            onHeightChange: heights.add,
            child: const Text('places'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // Medium: the sheet's top edge sits 400 px above the host's bottom (800 − 400).
      expect(heights.last, 400);
      await tester.tap(find.bySemanticsLabel(RegExp('Drag to resize')));
      await tester.pumpAndSettle();
      expect(heights.last, 790);
      // It reports every frame of the move, not just where it lands.
      expect(heights.where((h) => h > 400 && h < 790), isNotEmpty);
    });

    testWidgets(
      'background interaction: the page works at peek, the dim lowers it',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.peek;
        await tester.pumpWidget(
          page(
            sheet: (set) => Sheet(
              label: 'Deliveries',
              container: true,
              detents: const [
                SheetDetent.peek,
                SheetDetent.medium,
                SheetDetent.large,
              ],
              detent: detent,
              onDetentChange: (d) => set(() => detent = d),
              dismissible: false,
              backgroundInteraction: SheetDetent.medium,
              header: const SizedBox(
                height: 48,
                child: TextField(hint: 'Search'),
              ),
              child: const SizedBox(height: 900, child: Text('Results')),
            ),
          ),
        );
        await tester.pumpAndSettle();
        // Peek = grabber band 8 + float offset 8 + header 48 + gap 8 + column gap 8.
        expect(surface(tester).top, closeTo(800 - 80, 0.5));
        await tester.tapAt(const Offset(200, 300));
        expect(pageTaps, 1, reason: 'the page stays usable at peek');

        // Focusing the search raises a peek sheet to its top detent.
        await tester.tap(find.byType(EditableText));
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large);
        // Above medium the page dims and a tap on it lowers the sheet to medium.
        await tester.tapAt(const Offset(200, 4));
        await tester.pumpAndSettle();
        expect(pageTaps, 1);
        expect(detent, SheetDetent.medium);
        await tester.tapAt(const Offset(200, 300));
        expect(pageTaps, 2, reason: 'no dim at medium');
      },
    );

    testWidgets('grows out of its source and flies back into it', (
      tester,
    ) async {
      _phone(tester);
      final source = GlobalKey();
      var open = false;
      double sourceOpacity() => tester
          .widget<Opacity>(
            find
                .descendant(
                  of: find.byType(SheetSource),
                  matching: find.byType(Opacity),
                )
                .first,
          )
          .opacity;
      await tester.pumpWidget(
        page(
          extra: Positioned(
            left: 150,
            bottom: 40,
            child: SheetSource(
              key: source,
              child: const SizedBox(width: 90, height: 44, child: Text('New')),
            ),
          ),
          sheet: (set) => Sheet(
            open: open,
            onOpenChange: (v) => set(() => open = v),
            label: 'New stop',
            container: true,
            source: source,
            showClose: false,
            detents: const [SheetDetent.medium, SheetDetent.large],
            child: const Text('Stop form'),
          ),
        ),
      );
      final state = tester.state(find.byType(StatefulBuilder)) as dynamic;
      state.setState(() => open = true);
      // Mounted, measured, then the morph starts.
      for (var i = 0; i < 4; i++) {
        await tester.pump();
      }
      await tester.pump(const Duration(milliseconds: 60));
      // Mid-morph: the panel is clipped near the source, which is hidden.
      expect(sourceOpacity(), 0);
      final clip = tester.widget<ClipPath>(
        find
            .descendant(
              of: find.byType(Sheet),
              matching: find.byWidgetPredicate(
                (w) =>
                    w is ClipPath &&
                    w.clipper.runtimeType.toString() == '_InsetClipper',
              ),
            )
            .first,
      );
      expect(clip, isNotNull);
      await tester.pumpAndSettle();
      expect(sourceOpacity(), 1);
      expect(surface(tester), const Rect.fromLTRB(8, 400, 382, 792));

      state.setState(() => open = false);
      await tester.pump();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 120));
      expect(sourceOpacity(), 0, reason: 'covered while it lands');
      await tester.pumpAndSettle();
      expect(sourceOpacity(), 1);
      expect(find.text('Stop form'), findsNothing);
    });

    testWidgets('regular: card floats at the leading edge on wide screens', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1024, 768);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        page(
          size: const Size(1024, 768),
          sheet: (set) => Sheet(
            label: 'Hubs',
            container: true,
            modal: false,
            dismissible: false,
            regular: SheetRegular.card,
            detents: const [
              SheetDetent.peek,
              SheetDetent.medium,
              SheetDetent.large,
            ],
            defaultDetent: SheetDetent.large,
            child: Builder(
              builder: (context) =>
                  Text('${SheetScope.of(context)!.presentation}'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // 380 wide + the gap on both sides; still floating at full height.
      expect(surface(tester), const Rect.fromLTRB(8, 10, 388, 760));
      expect(find.text('SheetPresentation.card'), findsOneWidget);
      // The page beside the card stays usable.
      await tester.tapAt(const Offset(700, 300));
      expect(pageTaps, 1);
    });

    /// A Maps-like sheet: peek · medium · large, a search field header, a long list.
    Widget maps(
      StateSetter set, {
      required SheetDetent detent,
      required ValueChanged<SheetDetent> onDetent,
      bool raiseOnFocus = true,
    }) => Sheet(
      label: 'Deliveries',
      container: true,
      detents: const [SheetDetent.peek, SheetDetent.medium, SheetDetent.large],
      detent: detent,
      onDetentChange: (d) => set(() => onDetent(d)),
      dismissible: false,
      backgroundInteraction: SheetDetent.medium,
      raiseOnFocus: raiseOnFocus,
      header: const SizedBox(
        key: ValueKey('header'),
        height: 48,
        child: TextField(hint: 'Search'),
      ),
      child: Column(
        children: [
          for (var i = 0; i < 30; i++)
            SizedBox(height: 44, child: Text('Place $i')),
        ],
      ),
    );

    dynamic surfaceWidget(WidgetTester tester) => tester.widget(
      find.byWidgetPredicate((w) => w.runtimeType == SheetSurface).first,
    );

    testWidgets(
      'the surface follows the finger 1:1 and matches the model on every frame',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.peek;
        await tester.pumpWidget(
          page(
            sheet: (set) =>
                maps(set, detent: detent, onDetent: (d) => detent = d),
          ),
        );
        await tester.pumpAndSettle();
        const heights = [80.0, 400.0, 790.0];
        final start = 800 - surface(tester).top;
        expect(start, closeTo(80, 0.5));
        final headerWidth = tester
            .getSize(find.byKey(const ValueKey('header')))
            .width;
        final gesture = await tester.startGesture(
          tester.getCenter(find.bySemanticsLabel(RegExp('Drag to resize'))),
        );
        // The recognizer decides after 4px; from then on the sheet is under the finger.
        await gesture.moveBy(const Offset(0, -5));
        await tester.pump(const Duration(milliseconds: 16));
        final from = 800 - surface(tester).top;
        var last = -1.0;
        for (var i = 1; i <= 34; i++) {
          await gesture.moveBy(const Offset(0, -20));
          await tester.pump(const Duration(milliseconds: 16));
          final rect = surface(tester);
          final frame = sheetFrame(
            from + 20 * i,
            heights: heights,
            large: 790,
            inset: 8,
            radius: 32,
            mode: SheetFrameMode.float,
          );
          final v = 800 - rect.top;
          expect(v, closeTo(from + 20 * i, 0.01), reason: 'step $i: 1:1');
          expect(rect.left, closeTo(frame.gap, 0.01), reason: 'step $i gap');
          expect(800 - rect.bottom, closeTo(frame.gap, 0.01));
          final painted = surfaceWidget(tester);
          expect(
            (painted.radii as List<double>)[2],
            closeTo(frame.bottomRadius, 0.01),
          );
          expect(painted.solid as double, closeTo(frame.solid, 0.01));
          // The content never relayouts sideways while the surface closes its gap.
          expect(
            tester.getSize(find.byKey(const ValueKey('header'))).width,
            headerWidth,
          );
          expect(frame.expansion, greaterThanOrEqualTo(last));
          last = frame.expansion;
        }
        await gesture.up();
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large);
      },
    );

    testWidgets(
      'a slow nudge settles back; flicks project to the far detents',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.peek;
        await tester.pumpWidget(
          page(
            sheet: (set) =>
                maps(set, detent: detent, onDetent: (d) => detent = d),
          ),
        );
        await tester.pumpAndSettle();
        final grabber = find.bySemanticsLabel(RegExp('Drag to resize'));
        await tester.timedDrag(
          grabber,
          const Offset(0, -60),
          const Duration(milliseconds: 900),
        );
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.peek);
        expect(800 - surface(tester).top, closeTo(80, 0.5));

        // projectMomentum: ~390 px + 5 px/ms × 99 ≈ 885 px, nearest to large. A 2500 px/s flick
        // released near 290 px projects to ~540 px and lands on medium, as on the web.
        await tester.flingFrom(
          tester.getCenter(grabber),
          const Offset(0, -300),
          5000,
        );
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large, reason: 'a hard flick passes medium');

        await tester.flingFrom(
          tester.getCenter(grabber),
          const Offset(0, 300),
          5000,
        );
        await tester.pumpAndSettle();
        expect(
          detent,
          SheetDetent.peek,
          reason: 'not dismissible: it lands at peek',
        );
        expect(find.text('Place 0'), findsOneWidget);
      },
    );

    testWidgets('the page under a peek sheet keeps its own drags', (
      tester,
    ) async {
      _phone(tester);
      var detent = SheetDetent.peek;
      var pans = 0.0;
      await tester.pumpWidget(
        page(
          extra: Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onVerticalDragUpdate: (d) => pans += d.delta.dy,
            ),
          ),
          sheet: (set) =>
              maps(set, detent: detent, onDetent: (d) => detent = d),
        ),
      );
      await tester.pumpAndSettle();
      await tester.dragFrom(const Offset(200, 300), const Offset(0, -150));
      await tester.pumpAndSettle();
      expect(pans, lessThan(-100), reason: 'the map got the drag');
      expect(detent, SheetDetent.peek);
      expect(800 - surface(tester).top, closeTo(80, 0.5));
    });

    testWidgets(
      'focus raises a peek sheet, Escape lowers it to the undimmed detent',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.peek;
        await tester.pumpWidget(
          page(
            sheet: (set) =>
                maps(set, detent: detent, onDetent: (d) => detent = d),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byType(EditableText));
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large);
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.medium);
        expect(800 - surface(tester).top, closeTo(400, 0.5));
      },
    );

    testWidgets('raiseOnFocus: false keeps a peek sheet at peek', (
      tester,
    ) async {
      _phone(tester);
      var detent = SheetDetent.peek;
      await tester.pumpWidget(
        page(
          sheet: (set) => maps(
            set,
            detent: detent,
            onDetent: (d) => detent = d,
            raiseOnFocus: false,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(EditableText));
      await tester.pumpAndSettle();
      expect(detent, SheetDetent.peek);
    });

    testWidgets('content moves the sheet through SheetScope.setDetent', (
      tester,
    ) async {
      _phone(tester);
      final changes = <SheetDetent>[];
      await tester.pumpWidget(
        page(
          sheet: (set) => Sheet(
            label: 'Places',
            container: true,
            showClose: false,
            detents: const [SheetDetent.medium, SheetDetent.large],
            onDetentChange: changes.add,
            child: Builder(
              builder: (context) => GestureDetector(
                onTap: () =>
                    SheetScope.of(context)!.setDetent(SheetDetent.large),
                child: const SizedBox(height: 40, child: Text('Expand')),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Expand'));
      await tester.pumpAndSettle();
      expect(changes, [SheetDetent.large]);
      expect(surface(tester), const Rect.fromLTRB(0, 10, 390, 800));
    });

    Widget morphPage(
      GlobalKey source,
      bool Function() open,
      ValueChanged<bool> change,
    ) => page(
      extra: Positioned(
        left: 150,
        bottom: 40,
        child: SheetSource(
          key: source,
          child: const SizedBox(width: 90, height: 44, child: Text('New')),
        ),
      ),
      sheet: (set) => Sheet(
        open: open(),
        onOpenChange: (v) => set(() => change(v)),
        label: 'New stop',
        container: true,
        source: source,
        showClose: false,
        detents: const [SheetDetent.medium, SheetDetent.large],
        child: const Text('Stop form'),
      ),
    );

    double sourceOpacity(WidgetTester tester) => tester
        .widget<Opacity>(
          find
              .descendant(
                of: find.byType(SheetSource),
                matching: find.byType(Opacity),
              )
              .first,
        )
        .opacity;

    Finder morphClip() => find.byWidgetPredicate(
      (w) =>
          w is ClipPath && w.clipper.runtimeType.toString() == '_InsetClipper',
    );

    testWidgets(
      'dragged away, it slides down instead of flying back into its source',
      (tester) async {
        _phone(tester);
        final source = GlobalKey();
        var open = true;
        await tester.pumpWidget(morphPage(source, () => open, (v) => open = v));
        await tester.pumpAndSettle();
        expect(sourceOpacity(tester), 1);
        await tester.flingFrom(
          tester.getCenter(find.text('Stop form')),
          const Offset(0, 250),
          2500,
        );
        await tester.pump();
        expect(open, isFalse);
        for (var i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 16));
          expect(morphClip(), findsNothing, reason: 'frame $i: no morph');
          expect(sourceOpacity(tester), 1, reason: 'frame $i: source stays');
        }
        await tester.pumpAndSettle();
        expect(find.text('Stop form'), findsNothing);
      },
    );

    testWidgets('reduced motion never morphs or hides the source', (
      tester,
    ) async {
      _phone(tester);
      final source = GlobalKey();
      var open = false;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: morphPage(source, () => open, (v) => open = v),
        ),
      );
      final state = tester.state(find.byType(StatefulBuilder).first) as dynamic;
      state.setState(() => open = true);
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 16));
        expect(morphClip(), findsNothing);
        expect(sourceOpacity(tester), 1);
      }
      expect(surface(tester), const Rect.fromLTRB(8, 400, 382, 792));
    });

    testWidgets('a card sits at the leading edge in right-to-left too', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1024, 768);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        host(
          direction: TextDirection.rtl,
          SizedBox(
            width: 1024,
            height: 768,
            child: Stack(
              children: [
                Positioned.fill(
                  child: Sheet(
                    label: 'Hubs',
                    container: true,
                    modal: false,
                    dismissible: false,
                    regular: SheetRegular.card,
                    detents: const [SheetDetent.medium, SheetDetent.large],
                    child: const Text('Nearby'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        surface(tester),
        const Rect.fromLTRB(1024 - 388, 384, 1024 - 8, 760),
      );
    });

    /// A free sheet: peek … fit, with [rows] rows of 44 px.
    Widget free(
      StateSetter set, {
      required int rows,
      bool snap = false,
      List<SheetDetent> detents = const [SheetDetent.peek, SheetDetent.fit],
      ValueChanged<SheetDetent>? onDetent,
    }) => Sheet(
      label: 'Route',
      container: true,
      detents: detents,
      snap: snap,
      modal: false,
      dismissible: false,
      onDetentChange: onDetent,
      header: const SizedBox(
        key: ValueKey('header'),
        height: 48,
        child: TextField(hint: 'Search'),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows; i++)
            SizedBox(height: 44, child: Text('Stop $i')),
        ],
      ),
    );

    ScrollPosition contentScroll(WidgetTester tester) => tester
        .state<ScrollableState>(
          find
              .descendant(
                of: find.byType(Sheet),
                matching: find.byType(Scrollable),
              )
              .first,
        )
        .position;

    double visible(WidgetTester tester) => 800 - surface(tester).top;

    testWidgets('snap: false rests wherever it is let go, between its bounds', (
      tester,
    ) async {
      _phone(tester);
      final reported = <SheetDetent>[];
      await tester.pumpWidget(
        page(sheet: (set) => free(set, rows: 30, onDetent: reported.add)),
      );
      await tester.pumpAndSettle();
      expect(visible(tester), closeTo(80, 0.5));
      final grabber = find.bySemanticsLabel(RegExp('Drag to resize'));
      await tester.timedDrag(
        grabber,
        const Offset(0, -250),
        const Duration(milliseconds: 1200),
      );
      await tester.pumpAndSettle();
      final rest = visible(tester);
      // Wherever it was let go (plus the release's own momentum), not at peek or fit.
      expect(rest, inInclusiveRange(80 + 230, 80 + 300), reason: 'no snap');
      // Nearest detent reported: peek (80) vs fit (790).
      expect(reported, isEmpty);
      await tester.timedDrag(
        grabber,
        const Offset(0, -300),
        const Duration(milliseconds: 1200),
      );
      await tester.pumpAndSettle();
      expect(visible(tester), greaterThan(rest + 280));
      expect(reported, [SheetDetent.fit]);
      // A hard flick still stops at the highest detent.
      await tester.flingFrom(
        tester.getCenter(grabber),
        const Offset(0, -300),
        5000,
      );
      await tester.pumpAndSettle();
      expect(visible(tester), closeTo(790, 0.5));
    });

    testWidgets(
      'one gesture over the content grows the sheet, then scrolls; back down in reverse',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.medium;
        await tester.pumpWidget(
          page(
            sheet: (set) => free(
              set,
              rows: 40,
              snap: true,
              detents: const [SheetDetent.medium, SheetDetent.large],
              onDetent: (d) => set(() => detent = d),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(visible(tester), closeTo(400, 0.5));
        final gesture = await tester.startGesture(
          tester.getCenter(find.text('Stop 3')),
        );
        for (var i = 0; i < 70; i++) {
          await gesture.moveBy(const Offset(0, -10));
          await tester.pump(const Duration(milliseconds: 16));
        }
        // 700 px up: 390 grew the sheet to large, the rest scrolled the list.
        expect(visible(tester), closeTo(790, 0.5));
        final scrolled = contentScroll(tester).pixels;
        expect(scrolled, greaterThan(250));
        for (var i = 0; i < 60; i++) {
          await gesture.moveBy(const Offset(0, 10));
          await tester.pump(const Duration(milliseconds: 16));
        }
        // 600 px down: the list went back to its top first, then the sheet came down.
        expect(contentScroll(tester).pixels, 0);
        expect(visible(tester), closeTo(790 - (600 - scrolled), 25));
        await gesture.up();
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.medium);
        expect(visible(tester), closeTo(400, 0.5));
      },
    );

    testWidgets(
      'a flick down from a scrolled list hands its leftover speed to the sheet',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.large;
        await tester.pumpWidget(
          page(
            sheet: (set) => Sheet(
              label: 'Route',
              container: true,
              detents: const [SheetDetent.medium, SheetDetent.large],
              detent: detent,
              onDetentChange: (d) => set(() => detent = d),
              showClose: false,
              child: Column(
                children: [
                  for (var i = 0; i < 40; i++)
                    SizedBox(height: 44, child: Text('Stop $i')),
                ],
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        contentScroll(tester).jumpTo(120);
        await tester.pump();
        await tester.flingFrom(
          tester.getCenter(find.text('Stop 6')),
          const Offset(0, 160),
          4000,
        );
        await tester.pumpAndSettle();
        expect(contentScroll(tester).pixels, 0);
        expect(
          detent,
          SheetDetent.medium,
          reason: 'the flick carried on into the sheet',
        );
      },
    );

    testWidgets(
      'the wheel grows the sheet before scrolling, and scrolls back before shrinking',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.medium;
        await tester.pumpWidget(
          page(
            sheet: (set) => free(
              set,
              rows: 40,
              snap: true,
              detents: const [SheetDetent.medium, SheetDetent.large],
              onDetent: (d) => set(() => detent = d),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final at = tester.getCenter(find.text('Stop 2'));
        final mouse = TestPointer(1, PointerDeviceKind.mouse);
        Future<void> wheel(double dy) async {
          await tester.sendEventToBinding(mouse.hover(at));
          await tester.sendEventToBinding(mouse.scroll(Offset(0, dy)));
          await tester.pump(const Duration(milliseconds: 16));
        }

        for (var i = 0; i < 3; i++) {
          await wheel(60);
        }
        expect(visible(tester), closeTo(580, 0.5), reason: 'grows first');
        expect(contentScroll(tester).pixels, 0);
        for (var i = 0; i < 10; i++) {
          await wheel(60);
        }
        expect(visible(tester), closeTo(790, 0.5));
        expect(
          contentScroll(tester).pixels,
          greaterThan(100),
          reason: 'then scrolls',
        );
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large);
        for (var i = 0; i < 12; i++) {
          await wheel(-60);
        }
        expect(contentScroll(tester).pixels, 0, reason: 'scrolls back first');
        expect(visible(tester), lessThan(790));
        // A snapping sheet settles on a detent once the wheel stops.
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pumpAndSettle();
        expect(visible(tester), anyOf(closeTo(400, 0.5), closeTo(790, 0.5)));
      },
    );

    testWidgets('fit follows its content with a spring', (tester) async {
      _phone(tester);
      var rows = 3;
      late StateSetter setRows;
      await tester.pumpWidget(
        page(
          sheet: (set) {
            setRows = set;
            return free(
              set,
              rows: rows,
              snap: true,
              detents: const [SheetDetent.fit],
            );
          },
        ),
      );
      await tester.pumpAndSettle();
      final short = visible(tester);
      setRows(() => rows = 6);
      // Measured, then on its way: the first frame that moved is not yet at the new height.
      double? moving;
      for (var i = 0; i < 30 && moving == null; i++) {
        await tester.pump(const Duration(milliseconds: 16));
        if ((visible(tester) - short).abs() > 0.5) moving = visible(tester);
      }
      await tester.pumpAndSettle();
      final tall = visible(tester);
      expect(tall - short, closeTo(3 * 44, 1));
      expect(
        moving,
        inExclusiveRange(short, tall - 1),
        reason: 'it springs, it does not jump',
      );
    });

    testWidgets(
      'a finger drags the sheet from an unfocused field; a mouse does not',
      (tester) async {
        _phone(tester);
        await tester.pumpWidget(page(sheet: (set) => free(set, rows: 30)));
        await tester.pumpAndSettle();
        final field = tester.getCenter(find.byType(EditableText));
        final mouse = await tester.startGesture(
          field,
          kind: PointerDeviceKind.mouse,
        );
        for (var i = 0; i < 20; i++) {
          await mouse.moveBy(const Offset(0, -10));
          await tester.pump(const Duration(milliseconds: 40));
        }
        // The mouse never drags the sheet (it selects text; focusing the field raises a peek sheet
        // to its top on its own, which is not following the pointer 1:1).
        expect(visible(tester), isNot(inInclusiveRange(80 + 150, 80 + 250)));
        await mouse.up();
        await tester.pumpAndSettle();
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        final before = visible(tester);
        // A finger on the unfocused field drags the sheet (down from where focus raised it).
        await tester.timedDragFrom(
          tester.getCenter(find.byType(EditableText)),
          const Offset(0, 300),
          const Duration(milliseconds: 1000),
        );
        await tester.pumpAndSettle();
        expect(visible(tester), lessThan(before - 200));
      },
    );

    testWidgets(
      'builder: a ScrollArea inside takes the sheet scroll, a nested one keeps its own',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.medium;
        final inner = ScrollController();
        addTearDown(inner.dispose);
        await tester.pumpWidget(
          page(
            sheet: (set) => Sheet(
              label: 'Inspector',
              container: true,
              detents: const [SheetDetent.medium, SheetDetent.large],
              detent: detent,
              onDetentChange: (d) => set(() => detent = d),
              showClose: false,
              title: const Text('Inspector'),
              builder: (context, controller) => ScrollArea(
                label: 'Properties',
                child: Column(
                  children: [
                    SizedBox(
                      height: 120,
                      child: ScrollArea(
                        label: 'Nested',
                        controller: inner,
                        child: Column(
                          children: [
                            for (var i = 0; i < 10; i++)
                              SizedBox(height: 40, child: Text('Inner $i')),
                          ],
                        ),
                      ),
                    ),
                    for (var i = 0; i < 40; i++)
                      SizedBox(height: 44, child: Text('Prop $i')),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(visible(tester), closeTo(400, 0.5));
        final outer = tester
            .state<ScrollableState>(
              find
                  .ancestor(
                    of: find.text('Prop 3'),
                    matching: find.byType(Scrollable),
                  )
                  .first,
            )
            .position;
        final gesture = await tester.startGesture(
          tester.getCenter(find.text('Prop 3')),
        );
        for (var i = 0; i < 60; i++) {
          await gesture.moveBy(const Offset(0, -10));
          await tester.pump(const Duration(milliseconds: 16));
        }
        await gesture.up();
        await tester.pumpAndSettle();
        // 600 px: 390 grew the sheet, the rest scrolled the properties.
        expect(detent, SheetDetent.large);
        expect(outer.pixels, greaterThan(100));
        expect(inner.hasClients, isTrue);
        expect(
          inner.position,
          isNot(same(outer)),
          reason: 'the nested area keeps its own',
        );
      },
    );

    testWidgets('SheetGrabber cycles from taps and arrow keys', (tester) async {
      var up = 0, down = 0;
      await tester.pumpWidget(
        host(SheetGrabber(onNext: () => up++, onPrevious: () => down++)),
      );
      await tester.tap(find.byType(SheetGrabber));
      expect(up, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      expect((up, down), (2, 1));
    });

    testWidgets(
      'PointerShield.retain counts views and settles between frames',
      (tester) async {
        expect(PointerShield.active.value, 0);
        final release = PointerShield.retain();
        expect(PointerShield.active.value, 1);
        release();
        release();
        expect(
          PointerShield.active.value,
          0,
          reason: 'a second release does nothing',
        );
        // Outside the web a shield is its child alone.
        await tester.pumpWidget(
          host(const PointerShield(child: Text('Chrome'))),
        );
        expect(find.byType(Stack), findsNothing);
      },
    );

    testWidgets(
      'a vertical drag that starts on a segmented control moves the sheet',
      (tester) async {
        _phone(tester);
        var detent = SheetDetent.medium;
        var choice = 'a';
        await tester.pumpWidget(
          page(
            sheet: (set) => Sheet(
              label: 'Route',
              container: true,
              detents: const [SheetDetent.medium, SheetDetent.large],
              detent: detent,
              onDetentChange: (d) => set(() => detent = d),
              showClose: false,
              child: Column(
                children: [
                  SegmentedControl<String>(
                    label: 'Stops',
                    value: choice,
                    onChange: (v) => set(() => choice = v),
                    options: const [
                      SegmentOption(value: 'a', label: 'Three'),
                      SegmentOption(value: 'b', label: 'Six'),
                    ],
                  ),
                  for (var i = 0; i < 30; i++)
                    SizedBox(height: 44, child: Text('Stop $i')),
                ],
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(visible(tester), closeTo(400, 0.5));
        await tester.timedDragFrom(
          tester.getCenter(find.byType(SegmentedControl<String>)),
          const Offset(0, -320),
          const Duration(milliseconds: 900),
        );
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.large);
        expect(choice, 'a', reason: 'the drag was not a choice');
        await tester.timedDragFrom(
          tester.getCenter(find.byType(SegmentedControl<String>)),
          const Offset(0, 320),
          const Duration(milliseconds: 900),
        );
        await tester.pumpAndSettle();
        expect(detent, SheetDetent.medium);
      },
    );
  });
}

var pageTaps = 0;
