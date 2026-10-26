import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart' show BackdropFilterLayer;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  Widget lensHost(GlassStyle glass, {LensKind kind = LensKind.pill}) => host(
    SizedBox(
      width: 200,
      height: 80,
      child: Stack(
        children: [
          Positioned.fill(
            child: GlassLens(
              kind: kind,
              rect: const Rect.fromLTWH(20, 10, 120, 44),
              radius: 22,
              lens: 1,
            ),
          ),
        ],
      ),
    ),
    config: ThemeConfig(glass: glass),
  );

  Future<List<String>> lensFilters(
    WidgetTester tester,
    GlassStyle glass, {
    LensKind kind = LensKind.pill,
  }) async {
    await tester.pumpWidget(lensHost(glass, kind: kind));
    return [
      for (final layer in tester.layers.whereType<BackdropFilterLayer>())
        layer.filter.toString(),
    ];
  }

  Future<void> loadShader(WidgetTester tester) => tester.runAsync(() async {
    GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
      'shaders/glass_refraction.frag',
    );
  });

  testWidgets('solid glass shows no lens', (tester) async {
    expect(await lensFilters(tester, GlassStyle.solid), isEmpty);
    expect(
      find.descendant(
        of: find.byType(GlassLens),
        matching: find.byType(CustomPaint),
      ),
      findsNothing,
    );
  });

  testWidgets('transparent lenses are clear: no blur, tint, hairline or bend', (
    tester,
  ) async {
    await loadShader(tester);
    for (final kind in LensKind.values) {
      expect(
        await lensFilters(tester, GlassStyle.transparent, kind: kind),
        isEmpty,
      );
      // The material (veil, shade, rim, shadow) is painted over the backdrop.
      expect(
        find.descendant(
          of: find.byType(GlassLens),
          matching: find.byType(CustomPaint),
        ),
        findsOneWidget,
      );
    }
  });

  testWidgets('liquid lenses only bend, on Impeller', (tester) async {
    await loadShader(tester);
    for (final kind in LensKind.values) {
      final filters = await lensFilters(tester, GlassStyle.liquid, kind: kind);
      // The bend alone: no colour or blur pass before it.
      expect(filters, hasLength(1));
      expect(filters.single, contains('shader'));
    }
  }, skip: !GlassRefraction.supported);
}
