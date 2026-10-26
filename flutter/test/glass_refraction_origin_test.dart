import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart' show BackdropFilterLayer;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

// Needs Impeller's shader filters: `flutter test --enable-impeller`.
void main() {
  testWidgets(
    'the refraction follows glass that an ancestor moves without repainting it',
    (tester) async {
      await tester.runAsync(() async {
        GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
          'shaders/glass_refraction.frag',
        );
      });
      final x = ValueNotifier(0.0);
      // A route sliding in: the transform moves a repaint boundary, the glass never repaints.
      await tester.pumpWidget(
        host(
          ValueListenableBuilder<double>(
            valueListenable: x,
            builder: (context, value, child) =>
                Transform.translate(offset: Offset(value, 0), child: child),
            child: RepaintBoundary(
              child: GlassScope(
                child: GlassGroup(child: SizedBox(width: 200, height: 120)),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final root = tester.element(find.byType(GlassScope));
      expect(GlassRefraction.debugOriginsOf(root), isNotEmpty);
      x.value = 40;
      await tester.pump();
      await tester.pump();
      for (final origin in GlassRefraction.debugOriginsOf(root)) {
        expect(origin.painted, origin.actual);
      }
    },
    skip: !GlassRefraction.supported,
  );

  testWidgets('toolbar glass refracts from where it actually sits', (
    tester,
  ) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    await tester.pumpWidget(
      host(
        GlassScope(
          child: ToolbarGroup(
            label: 'Navigation',
            children: [
              IconButton(
                appearance: ButtonAppearance.toolbar,
                ariaLabel: 'Back',
                onClick: () {},
                icon: const LucideChevronLeft(),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final root = tester.element(find.byType(GlassScope));
    final origins = GlassRefraction.debugOriginsOf(root);
    expect(origins, isNotEmpty);
    for (final origin in origins) {
      expect(origin.painted, origin.actual);
    }
    // The bend is its own plain shader pass: composed with the blur, Impeller may count its
    // fragments from the clip's corner and draw a second, offset rim inside the real one.
    final shaders = [
      for (final layer in tester.layers.whereType<BackdropFilterLayer>())
        if (layer.filter.toString().contains('shader')) layer.filter.toString(),
    ];
    expect(shaders, isNotEmpty);
    for (final filter in shaders) {
      expect(filter, isNot(contains('compose')));
    }
  }, skip: !GlassRefraction.supported);
}
