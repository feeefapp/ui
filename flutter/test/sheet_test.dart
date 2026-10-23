import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/containers/sheet.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

SheetDetent _detent(Object raw) {
  if (raw is num) return SheetDetent.px(raw.toDouble());
  final s = raw as String;
  return switch (s) {
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
);

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
    expect(_sheetTop(tester), closeTo(400 + 20 + 8, 0.5));

    // A slow drag up past the middle lands on large.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, -300),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large]);
    expect(_sheetTop(tester), closeTo(10 + 20 + 8, 0.5));

    // A small slow drag down settles back on large.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, 60),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large]);
    expect(_sheetTop(tester), closeTo(38, 0.5));

    // A slow drag down to near the middle lands on medium.
    await tester.timedDrag(
      find.text('Row 1'),
      const Offset(0, 380),
      const Duration(milliseconds: 900),
    );
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large, SheetDetent.medium]);
    expect(_sheetTop(tester), closeTo(428, 0.5));

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
    expect(_sheetTop(tester), closeTo(38, 0.5));
    // Cycling wraps around to the lowest detent.
    await tester.tap(grabber);
    await tester.pumpAndSettle();
    expect(h.changes, [SheetDetent.large, SheetDetent.medium]);
    handle.dispose();
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
}
