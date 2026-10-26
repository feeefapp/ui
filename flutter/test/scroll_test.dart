import 'dart:convert';
import 'dart:async';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/scroll.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('wash dithering, edge opacities and reserves match the web kit', () {
    for (final wash in fixture['wash'] as List) {
      expect(
        scrollWashLevels(wash['columns'], wash['rows']).toList(),
        wash['levels'],
      );
    }
    for (final e in fixture['edges'] as List) {
      final o = scrollEdgeOpacities(n(e[0]), n(e[1]));
      expect(o.top, closeTo(n(e[2]['top']), 1e-12));
      expect(o.bottom, closeTo(n(e[2]['bottom']), 1e-12));
    }
    for (final r in fixture['reserve'] as List) {
      expect(scrollContentReserve(n(r[0]), n(r[1]), n(r[2])), n(r[3]));
    }
  });

  testWidgets('keyboard focus scrolls a row clear of the floats', (
    tester,
  ) async {
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    addTearDown(
      () => FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.automatic,
    );
    final nodes = [for (var i = 0; i < 30; i++) FocusNode()];
    addTearDown(() {
      for (final node in nodes) {
        node.dispose();
      }
    });
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          height: 300,
          child: ScrollArea(
            label: 'Orders',
            top: const SizedBox(width: 200, height: 46),
            bottom: const SizedBox(width: 200, height: 50),
            child: Column(
              children: [
                for (var i = 0; i < 30; i++)
                  Focus(
                    focusNode: nodes[i],
                    child: SizedBox(height: 40, child: Text('Row $i')),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    final area = tester.getRect(find.byType(ScrollArea));
    nodes[12].requestFocus();
    await tester.pumpAndSettle();
    final row = tester.getRect(find.text('Row 12'));
    // Below the bottom float's reservation: 50 + G + G (the shell gap, 8) from the bottom edge.
    expect(row.bottom, lessThanOrEqualTo(area.bottom - 66 + 0.5));
    nodes[2].requestFocus();
    await tester.pumpAndSettle();
    expect(
      tester.getRect(find.text('Row 2')).top,
      greaterThanOrEqualTo(area.top + 62 - 0.5),
    );
  });

  testWidgets('floats are measured and reserved as content padding', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          height: 300,
          child: ScrollArea(
            label: 'Orders',
            top: const SizedBox(width: 200, height: 46),
            bottom: const SizedBox(width: 200, height: 50),
            child: Column(
              children: [
                for (var i = 0; i < 30; i++)
                  SizedBox(height: 40, child: Text('Row $i')),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    final area = tester.getRect(find.byType(ScrollArea));
    // 46px float + the shell gap G (8) above and below.
    expect(tester.getTopLeft(find.text('Row 0')).dy - area.top, 62);
    await tester.drag(find.byType(ScrollArea), const Offset(0, -5000));
    await tester.pumpAndSettle();
    // At the end, the last row clears the 50px dock and its gaps.
    expect(
      area.bottom - tester.getBottomLeft(find.text('Row 29')).dy,
      closeTo(66, 0.5),
    );
  });

  testWidgets(
    'edge gap and content padding default to the theme\'s shell gap',
    (tester) async {
      await tester.pumpWidget(
        host(
          const SizedBox(
            width: 400,
            height: 300,
            child: ScrollArea(
              label: 'Orders',
              top: SizedBox(width: 200, height: 46),
              child: Text('Row 0'),
            ),
          ),
          config: const ThemeConfig(metrics: Metrics(shellGap: 12)),
        ),
      );
      await tester.pump();
      final area = tester.getRect(find.byType(ScrollArea));
      final row = tester.getTopLeft(find.text('Row 0'));
      expect(row.dy - area.top, 46 + 12 * 2);
      expect(row.dx - area.left, 12);
    },
  );

  test('pull distance, release and loader place match the web kit', () {
    // The same vectors as tests/pull-refresh.test.ts.
    expect(pullDistance(0, 700), 0);
    expect(pullDistance(-20, 700), 0);
    expect(pullDistance(100, 700), closeTo(50.99337748344366, 1e-9));
    expect(pullDistance(130, 700), closeTo(64.87362281270254, 1e-9));
    expect(pullDistance(100, 700, reduced: true), 50);
    expect(pullDistance(1000, 700, reduced: true), pullRefreshThreshold * 1.5);
    expect(pullRelease(63.9), (refresh: false, target: 0.0));
    expect(pullRelease(64), (refresh: true, target: pullRefreshHold));
    expect(pullProgress(32), 0.5);
    expect(pullLoaderTop(pullRefreshHold), 16);
    expect(pixelLoaderCell(0, 1 / 9), 1);
    expect(pixelLoaderCell(3, 1 / 9), 0);
  });

  group('pull to refresh', () {
    Widget area({
      required Future<void> Function() onRefresh,
      RefreshController? controller,
    }) => host(
      SizedBox(
        width: 400,
        height: 600,
        child: ScrollArea(
          label: 'Orders',
          top: const SizedBox(width: 200, height: 44),
          onRefresh: onRefresh,
          refreshController: controller,
          child: Column(
            children: [
              for (var i = 0; i < 30; i++)
                SizedBox(height: 40, child: Text('Row $i')),
            ],
          ),
        ),
      ),
    );

    testWidgets('a touch pull past the threshold refreshes until done', (
      tester,
    ) async {
      final done = Completer<void>();
      var runs = 0;
      await tester.pumpWidget(
        area(
          onRefresh: () {
            runs++;
            return done.future;
          },
        ),
      );
      await tester.pump();
      final top = tester.getTopLeft(find.text('Row 0')).dy;
      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Row 3')),
        kind: PointerDeviceKind.touch,
      );
      for (var i = 0; i < 20; i++) {
        await gesture.moveBy(const Offset(0, 10));
        await tester.pump(const Duration(milliseconds: 16));
      }
      // Mid-pull: the content follows with resistance; the loader shows progress.
      final pulled = tester.getTopLeft(find.text('Row 0')).dy - top;
      expect(pulled, greaterThan(pullRefreshThreshold));
      expect(pulled, lessThan(200));
      expect(find.byType(PixelLoader), findsOneWidget);
      await gesture.up();
      // The loader's wave runs while refreshing, so time passes instead of settling.
      for (var i = 0; i < 60; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(runs, 1);
      // Refreshing: held open at the hold height.
      expect(
        tester.getTopLeft(find.text('Row 0')).dy - top,
        closeTo(pullRefreshHold, 0.5),
      );
      done.complete();
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(find.text('Row 0')).dy, closeTo(top, 0.5));
      expect(find.byType(PixelLoader), findsNothing);
    });

    testWidgets('a short pull springs back without refreshing', (tester) async {
      var runs = 0;
      await tester.pumpWidget(area(onRefresh: () async => runs++));
      await tester.pump();
      final top = tester.getTopLeft(find.text('Row 0')).dy;
      await tester.dragFrom(
        tester.getCenter(find.text('Row 3')),
        const Offset(0, 60),
        kind: PointerDeviceKind.touch,
      );
      await tester.pumpAndSettle();
      expect(runs, 0);
      expect(tester.getTopLeft(find.text('Row 0')).dy, closeTo(top, 0.5));
    });

    testWidgets('a mouse never pulls', (tester) async {
      var runs = 0;
      await tester.pumpWidget(area(onRefresh: () async => runs++));
      await tester.pump();
      await tester.dragFrom(
        tester.getCenter(find.text('Row 3')),
        const Offset(0, 300),
        kind: PointerDeviceKind.mouse,
      );
      await tester.pumpAndSettle();
      expect(runs, 0);
    });

    testWidgets('a controller and the screen reader action refresh too', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      final controller = RefreshController();
      addTearDown(controller.dispose);
      var runs = 0;
      await tester.pumpWidget(
        area(onRefresh: () async => runs++, controller: controller),
      );
      final states = <bool>[];
      controller.addListener(() => states.add(controller.refreshing));
      await controller.refresh();
      await tester.pumpAndSettle();
      expect(runs, 1);
      expect(states, [true, false]);
      final node = tester.getSemantics(find.bySemanticsLabel('Orders'));
      expect(
        node.getSemanticsData().customSemanticsActionIds,
        isNotEmpty,
        reason: 'a Refresh action for screen readers',
      );
      handle.dispose();
    });
  });
}
