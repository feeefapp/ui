import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/containers/carousel.dart';
import 'package:feeef_ui/containers/carousel_model.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// 400px wide carousel, slides 0.75 = 300px + 12px gap, so each slide rests 312px apart.
Widget scene({
  int count = 5,
  int? index,
  ValueChanged<int>? onIndexChange,
  CarouselControls controls = CarouselControls.always,
  CarouselAlign align = CarouselAlign.center,
  TextDirection direction = TextDirection.ltr,
}) => host(
  SizedBox(
    width: 400,
    child: Carousel(
      label: 'Featured',
      slideWidth: const SlideWidth.fraction(0.75),
      index: index,
      onIndexChange: onIndexChange,
      controls: controls,
      align: align,
      children: [
        for (var i = 0; i < count; i++)
          SizedBox(height: 120, child: Text('Slide $i')),
      ],
    ),
  ),
  direction: direction,
);

ScrollPosition position(WidgetTester tester) =>
    tester.state<ScrollableState>(find.byType(Scrollable).first).position;

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/containers.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  test('carousel math matches the web kit', () {
    for (final r in fixture['progress'] as List) {
      expect(slideProgressFor(r), closeTo(n(r['value']), 1e-12), reason: '$r');
    }
    for (final r in fixture['centered'] as List) {
      expect(
        centeredIndex([for (final v in r['progress'] as List) n(v)]),
        r['index'],
      );
    }
    final offsets = [for (final v in fixture['offsets'] as List) n(v)];
    for (final r in fixture['flicks'] as List) {
      expect(
        flickTarget(
          n(r['scroll']),
          n(r['velocity']),
          offsets,
          r['current'] as int,
          r['maxSkip'] as int,
        ),
        r['target'],
        reason: '$r',
      );
    }
    for (final r in fixture['effects'] as List) {
      final effect = CarouselEffect.values.byName(r['effect'] as String);
      final fx = slideEffect(effect, n(r['progress']));
      expect(fx.scale, closeTo(n(r['scale']), 1e-12), reason: '$r');
      expect(fx.opacity, closeTo(n(r['opacity']), 1e-12), reason: '$r');
    }
  });

  testWidgets('slides are sized, stretched and centered', (tester) async {
    await tester.pumpWidget(scene());
    await tester.pump();
    final first = find.text('Slide 0');
    expect(
      tester.getSize(
        find.ancestor(of: first, matching: find.byType(SizedBox)).first,
      ),
      const Size(300, 120),
    );
    final frame = tester.getRect(find.byType(Carousel));
    // Centered: (400 − 300) / 2 = 50px of padding before the first slide.
    expect(tester.getTopLeft(first).dx, frame.left + 50);
  });

  testWidgets('arrow keys, Home and End move between slides', (tester) async {
    final seen = <int>[];
    await tester.pumpWidget(scene(onIndexChange: seen.add));
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 312);
    expect(seen.last, 1);
    await tester.sendKeyEvent(LogicalKeyboardKey.end);
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 4 * 312);
    expect(seen.last, 4);
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 0);
    expect(seen.last, 0);
  });

  testWidgets('right-to-left mirrors the arrow keys', (tester) async {
    await tester.pumpWidget(scene(direction: TextDirection.rtl));
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 312);
  });

  testWidgets('a touch fling lands exactly on a slide', (tester) async {
    await tester.pumpWidget(scene());
    await tester.pump();
    await tester.fling(find.text('Slide 0'), const Offset(-200, 0), 1200);
    await tester.pumpAndSettle();
    final pixels = position(tester).pixels;
    expect(pixels % 312, 0);
    expect(pixels, greaterThan(0));
    // A slow drag that stops halfway settles on the nearest slide.
    final gesture = await tester.startGesture(const Offset(400, 300));
    await gesture.moveBy(const Offset(-20, 0));
    await gesture.moveBy(const Offset(-100, 0));
    await tester.pump(const Duration(milliseconds: 500));
    await gesture.up();
    await tester.pumpAndSettle();
    expect(position(tester).pixels % 312, 0);
  });

  testWidgets('a mouse drags the track and its flick snaps', (tester) async {
    await tester.pumpWidget(scene(controls: CarouselControls.never));
    await tester.pump();
    final gesture = await tester.startGesture(
      tester.getCenter(find.text('Slide 0')),
      kind: PointerDeviceKind.mouse,
    );
    for (var i = 0; i < 6; i++) {
      await gesture.moveBy(const Offset(-30, 0));
      await tester.pump(const Duration(milliseconds: 16));
    }
    expect(position(tester).pixels, greaterThan(100));
    await gesture.up();
    await tester.pumpAndSettle();
    final pixels = position(tester).pixels;
    expect(pixels % 312, 0);
    // Never more than three slides from where it started.
    expect(pixels, lessThanOrEqualTo(3 * 312));
  });

  testWidgets('controls, dots and semantics', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(scene());
    await tester.pump();
    expect(find.semantics.byLabel('Featured, slide 1 of 5'), findsOneWidget);
    expect(find.semantics.byLabel(RegExp('^2 of 5')), findsOneWidget);
    // At the first slide only "Next slide" shows.
    expect(find.semantics.byLabel('Previous slide'), findsNothing);
    await tester.tap(find.bySemanticsLabel('Next slide').last);
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 312);
    expect(find.semantics.byLabel('Featured, slide 2 of 5'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Go to slide 5'));
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 4 * 312);
    expect(find.semantics.byLabel('Next slide'), findsNothing);
    handle.dispose();
  });

  testWidgets('a controlled index scrolls to its slide', (tester) async {
    await tester.pumpWidget(scene(index: 2));
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 2 * 312);
    await tester.pumpWidget(scene(index: 3));
    await tester.pumpAndSettle();
    expect(position(tester).pixels, 3 * 312);
  });

  testWidgets('start alignment clamps the last slides to the scroll end', (
    tester,
  ) async {
    await tester.pumpWidget(scene(align: CarouselAlign.start));
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.end);
    await tester.pumpAndSettle();
    // 5 × 300 + 4 × 12 − 400.
    expect(position(tester).pixels, 1148);
  });
}

double slideProgressFor(Map<String, dynamic> r) => slideProgress(
  (r['slideCenter'] as num).toDouble(),
  (r['trackCenter'] as num).toDouble(),
  (r['step'] as num).toDouble(),
);
