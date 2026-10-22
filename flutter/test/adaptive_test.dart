import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/containers/adaptive.dart';
import 'package:feeef_ui/containers/adaptive_model.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget box(double width, [String? label]) => Semantics(
  label: label,
  child: SizedBox(width: width, height: 20),
);

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/containers.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('pickFitting matches the web kit', () {
    for (final r in fixture['fitting'] as List) {
      final widths = [for (final w in r['widths'] as List) n(w)];
      expect(pickFitting(widths, n(r['available'])), r['index'], reason: '$r');
    }
  });

  test('size classes follow the element width', () {
    expect(sizeClassFor(null), SizeClass.regular);
    expect(sizeClassFor(599.9), SizeClass.compact);
    expect(sizeClassFor(600), SizeClass.regular);
    expect(sizeClassFor(300, 320), SizeClass.compact);
  });

  testWidgets('SizeClass.of reads the scope width, not the window', (
    tester,
  ) async {
    late SizeClass seen;
    late double? width;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 420,
          child: SizeClassScope(
            child: Builder(
              builder: (context) {
                seen = SizeClass.of(context);
                width = SizeClassScope.widthOf(context);
                return const SizedBox(height: 10);
              },
            ),
          ),
        ),
      ),
    );
    expect(seen, SizeClass.compact);
    expect(width, 420);
  });

  testWidgets('an adaptive stack is a row while it fits and a column after', (
    tester,
  ) async {
    final axes = <Axis>[];
    Widget scene(double width) => host(
      SizedBox(
        width: width,
        child: AdaptiveStack(
          gap: 10,
          onAxisChange: axes.add,
          children: [box(100), box(120), box(80)],
        ),
      ),
    );
    await tester.pumpWidget(scene(400));
    await tester.pump();
    final stack = tester.renderObject<RenderAdaptiveStack>(
      find.byType(AdaptiveStack),
    );
    expect(stack.axis, Axis.horizontal);
    expect(tester.getSize(find.byType(AdaptiveStack)), const Size(400, 20));
    // 100 + 120 + 80 + 2 × 10 = 320 fits exactly.
    await tester.pumpWidget(scene(320));
    await tester.pump();
    expect(stack.axis, Axis.horizontal);
    await tester.pumpWidget(scene(319));
    await tester.pump();
    expect(stack.axis, Axis.vertical);
    expect(axes, [Axis.vertical]);
    // Each child flies from its row place on a spring (FLIP) before it settles.
    final third = find.byType(SizedBox).at(3);
    final top = tester.getTopLeft(find.byType(AdaptiveStack)).dy;
    expect(tester.getTopLeft(third).dy, isNot(top + 60));
    // Columns stretch every child; height = 3 × 20 + 2 × 10; the third sits at 2 × 30.
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byType(AdaptiveStack)), const Size(319, 80));
    expect(
      tester.getTopLeft(find.byType(SizedBox).at(3)).dy,
      tester.getTopLeft(find.byType(AdaptiveStack)).dy + 60,
    );
  });

  testWidgets('an adaptive stack with a breakpoint switches below it', (
    tester,
  ) async {
    Widget scene(double width) => host(
      SizedBox(
        width: width,
        child: AdaptiveStack(
          breakpoint: 300,
          justify: AdaptiveJustify.between,
          children: [box(50), box(50)],
        ),
      ),
    );
    await tester.pumpWidget(scene(300));
    final stack = tester.renderObject<RenderAdaptiveStack>(
      find.byType(AdaptiveStack),
    );
    expect(stack.axis, Axis.horizontal);
    final left = tester.getTopLeft(find.byType(AdaptiveStack)).dx;
    expect(tester.getTopLeft(find.byType(SizedBox).at(2)).dx, left + 250);
    await tester.pumpWidget(scene(299));
    expect(stack.axis, Axis.vertical);
    await tester.pumpAndSettle();
  });

  testWidgets('ViewThatFits shows the first option that fits', (tester) async {
    Widget scene(double width) => host(
      SizedBox(
        width: width,
        child: ViewThatFits(
          children: [box(300, 'full'), box(160, 'icons'), box(44, 'menu')],
        ),
      ),
    );
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(scene(320));
    final fits = tester.renderObject<RenderViewThatFits>(
      find.byType(ViewThatFits),
    );
    expect(fits.shownIndex, 0);
    expect(find.semantics.byLabel('full'), findsOneWidget);
    expect(find.semantics.byLabel('icons'), findsNothing);
    await tester.pumpWidget(scene(200));
    expect(fits.shownIndex, 1);
    expect(find.semantics.byLabel('icons'), findsOneWidget);
    expect(find.semantics.byLabel('full'), findsNothing);
    await tester.pumpWidget(scene(20));
    expect(fits.shownIndex, 2);
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byType(ViewThatFits)), const Size(20, 20));
    handle.dispose();
  });
}
