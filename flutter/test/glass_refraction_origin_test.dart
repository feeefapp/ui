import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
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

  testWidgets('control-sized glass keeps its painted rim and never refracts', (
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
    expect(GlassRefraction.debugOriginsOf(root), isEmpty);
  }, skip: !GlassRefraction.supported);
}
