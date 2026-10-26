import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart' show BackdropFilterLayer;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  Future<List<String>> lensFilters(
    WidgetTester tester,
    GlassStyle glass,
  ) async {
    await tester.pumpWidget(
      host(
        const SizedBox(
          width: 200,
          height: 80,
          child: Stack(
            children: [
              Positioned.fill(
                child: GlassLens(
                  rect: Rect.fromLTWH(20, 10, 120, 50),
                  radius: 25,
                  lens: 1,
                  magnify: lensMagnify,
                ),
              ),
            ],
          ),
        ),
        config: ThemeConfig(glass: glass),
      ),
    );
    return [
      for (final layer in tester.layers.whereType<BackdropFilterLayer>())
        layer.filter.toString(),
    ];
  }

  testWidgets('solid glass shows no lens', (tester) async {
    expect(await lensFilters(tester, GlassStyle.solid), isEmpty);
  });

  testWidgets('transparent lenses are plain clear glass, never bent', (
    tester,
  ) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    final filters = await lensFilters(tester, GlassStyle.transparent);
    // The clear material plus the hairline's ring and slivers.
    expect(filters, hasLength(3));
    expect(filters.where((f) => f.contains('shader')), isEmpty);
  });

  testWidgets('liquid lenses bend and magnify on Impeller', (tester) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    final filters = await lensFilters(tester, GlassStyle.liquid);
    expect(filters.where((f) => f.contains('shader')), hasLength(1));
  }, skip: !GlassRefraction.supported);
}
