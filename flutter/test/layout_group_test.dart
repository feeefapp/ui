import 'package:feeef_ui/physics/layout_group.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// Springs keep scheduling frames until they rest, so pump fixed steps.
Future<void> run(WidgetTester tester, int ms) async {
  for (var t = 0; t < ms; t += 16) {
    await tester.pump(const Duration(milliseconds: 16));
  }
}

Offset drawn(WidgetTester tester, String text) =>
    tester.getTopLeft(find.text(text));

void main() {
  Widget list(List<String> order, {Object? layoutKey, bool keyed = false}) =>
      host(
        SizedBox(
          width: 200,
          child: LayoutGroup(
            layoutKey: keyed ? layoutKey : null,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final id in order)
                  LayoutGroupItem(
                    key: ValueKey(id),
                    layoutId: id,
                    child: SizedBox(height: 40, child: Text(id)),
                  ),
              ],
            ),
          ),
        ),
      );

  testWidgets('items move from their old place to the new one on a spring', (
    tester,
  ) async {
    await tester.pumpWidget(list(['a', 'b', 'c']));
    await tester.pump();
    final a0 = drawn(tester, 'a');
    final c0 = drawn(tester, 'c');
    await tester.pumpWidget(list(['c', 'b', 'a']));
    // First frame after the change: still drawn where they were.
    expect(drawn(tester, 'a').dy, closeTo(a0.dy, 0.01));
    expect(drawn(tester, 'c').dy, closeTo(c0.dy, 0.01));
    await run(tester, 120);
    final mid = drawn(tester, 'a').dy;
    expect(mid, greaterThan(a0.dy));
    expect(mid, lessThan(c0.dy));
    await run(tester, 900);
    expect(drawn(tester, 'a').dy, closeTo(c0.dy, 0.01));
    expect(drawn(tester, 'c').dy, closeTo(a0.dy, 0.01));
  });

  testWidgets('new items fade and scale in', (tester) async {
    await tester.pumpWidget(list(['a']));
    await tester.pump();
    await tester.pumpWidget(list(['a', 'b']));
    await run(tester, 48);
    final layer = tester.layers.whereType<OpacityLayer>();
    expect(layer, isNotEmpty);
    await run(tester, 900);
    expect(tester.layers.whereType<OpacityLayer>(), isEmpty);
  });

  testWidgets('a layoutKey that did not change skips the animation', (
    tester,
  ) async {
    await tester.pumpWidget(list(['a', 'b'], keyed: true, layoutKey: 1));
    await tester.pump();
    final a0 = drawn(tester, 'a');
    await tester.pumpWidget(list(['b', 'a'], keyed: true, layoutKey: 1));
    await tester.pump();
    expect(drawn(tester, 'a').dy, closeTo(a0.dy + 40, 0.01));
  });

  testWidgets('reduced motion moves at once', (tester) async {
    Widget reduced(List<String> order) => MediaQuery(
      data: const MediaQueryData(disableAnimations: true),
      child: list(order),
    );
    await tester.pumpWidget(reduced(['a', 'b']));
    await tester.pump();
    final a0 = drawn(tester, 'a');
    await tester.pumpWidget(reduced(['b', 'a']));
    expect(drawn(tester, 'a').dy, closeTo(a0.dy + 40, 0.01));
  });

  testWidgets('snapshotLayout + animateLayoutFrom work without a group', (
    tester,
  ) async {
    final key = GlobalKey();
    var top = 0.0;
    late StateSetter set;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 200,
          height: 400,
          child: StatefulBuilder(
            builder: (context, setState) {
              set = setState;
              return Stack(
                children: [
                  Positioned(
                    top: top,
                    left: 0,
                    child: LayoutGroupItem(
                      key: key,
                      layoutId: 'x',
                      child: const SizedBox(
                        width: 40,
                        height: 40,
                        child: Text('x'),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
    final start = drawn(tester, 'x');
    final before = snapshotLayout([key]);
    expect(before[key]!.topLeft, start);
    set(() => top = 200);
    animateLayoutFrom(before);
    await tester.pump();
    expect(drawn(tester, 'x').dy, closeTo(start.dy, 0.01));
    await run(tester, 1000);
    expect(drawn(tester, 'x').dy, closeTo(start.dy + 200, 0.01));
  });
}
