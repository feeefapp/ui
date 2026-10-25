import 'package:feeef_ui/feeef_ui.dart';

import 'dart:ui' as ui;

import 'package:flutter/rendering.dart'
    show BackdropFilterLayer, RenderRepaintBoundary;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget bubble(String id, {double width = 80}) => GlassGroup(
  glassId: id,
  child: SizedBox(width: width, height: 38),
);

void main() {
  for (final brightness in [Brightness.light, Brightness.dark]) {
    testWidgets(
      'standalone compact glass has no inset contour in $brightness',
      (tester) async {
        final boundary = GlobalKey();
        await tester.pumpWidget(
          host(
            ThemeProvider(
              config: const ThemeConfig(),
              brightness: brightness,
              child: ColoredBox(
                color: const Color(0xff203828),
                child: Center(
                  child: RepaintBoundary(
                    key: boundary,
                    child: const GlassSurface(
                      radius: 22,
                      child: SizedBox(width: 160, height: 44),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.runAsync(() async {
          final render =
              boundary.currentContext!.findRenderObject()
                  as RenderRepaintBoundary;
          final image = await render.toImage();
          final bytes = (await image.toByteData(
            format: ui.ImageByteFormat.rawRgba,
          ))!;
          List<int> pixel(int y) => [
            for (var c = 0; c < 4; c++)
              bytes.getUint8((y * image.width + 80) * 4 + c),
          ];
          // Below the one-pixel outer rim the material is continuous: no second inset line.
          expect(pixel(1), pixel(3));
          expect(pixel(42), pixel(40));
          image.dispose();
        });
      },
    );
  }

  testWidgets(
    'a container draws close bubbles as one shape and far ones apart',
    (tester) async {
      Widget scene(double gap) => host(
        GlassContainer(
          spacing: 16,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: gap,
            children: [bubble('a'), bubble('b')],
          ),
        ),
      );
      await tester.pumpWidget(scene(6));
      await tester.pump();
      final painter = find.descendant(
        of: find.byType(GlassContainer),
        matching: find.byType(CustomPaint),
      );
      expect(painter, findsWidgets);
      expect(tester.takeException(), isNull);
      // Bubbles keep their own layout: 80 + 2px border each.
      expect(tester.getSize(find.byType(GlassGroup).first), const Size(82, 40));
    },
  );

  testWidgets('every cluster of a container shares one backdrop read', (
    tester,
  ) async {
    Widget container() => GlassContainer(
      spacing: 8,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 40,
        children: [bubble('a'), bubble('b'), bubble('c')],
      ),
    );
    await tester.pumpWidget(
      host(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [container(), container()],
        ),
      ),
    );
    await tester.pump();
    final keys = [
      for (final layer in tester.layers.whereType<BackdropFilterLayer>())
        layer.backdropKey,
    ];
    // Compact controls paint one rim, without separate exterior hairline bands.
    // Three apart bubbles per container, sharing one backdrop read per container.
    expect(keys, hasLength(6));
    expect(keys, everyElement(isNotNull));
    expect(keys.toSet(), hasLength(2));
  });

  testWidgets(
    'large glass keeps its hairline while compact toolbar glass has one rim',
    (tester) async {
      await tester.pumpWidget(
        host(
          GlassContainer(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const GlassGroup(child: SizedBox(width: 160, height: 100)),
                const SizedBox(height: 40),
                bubble('compact'),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      // One backdrop for each shape, plus two exterior bands only on the large panel.
      expect(tester.layers.whereType<BackdropFilterLayer>(), hasLength(4));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('a bubble that moves springs its glass and carries its content', (
    tester,
  ) async {
    var gap = 10.0;
    late StateSetter set;
    await tester.pumpWidget(
      host(
        GlassContainer(
          child: StatefulBuilder(
            builder: (context, setState) {
              set = setState;
              return Row(
                mainAxisSize: MainAxisSize.min,
                spacing: gap,
                children: [bubble('a'), bubble('b')],
              );
            },
          ),
        ),
      ),
    );
    // Past the container's first 300ms, changes animate.
    await tester.pump(const Duration(milliseconds: 400));
    set(() => gap = 60);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 16));
    // Mid-spring the content of the moving bubble still rides with its glass (a translation).
    final moving = tester.widgetList<Transform>(
      find.descendant(
        of: find.byType(GlassGroup).last,
        matching: find.byType(Transform),
      ),
    );
    expect(moving.any((t) => t.transform.getTranslation().x != 0), isTrue);
    await tester.pumpAndSettle();
    final settled = tester.widgetList<Transform>(
      find.descendant(
        of: find.byType(GlassGroup).last,
        matching: find.byType(Transform),
      ),
    );
    expect(settled.every((t) => t.transform.getTranslation().x == 0), isTrue);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('toolbar groups size their controls and name themselves', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 500,
          child: Toolbar(
            label: 'Editor',
            leading: ToolbarGroup(
              label: 'Format',
              children: [
                IconButton(
                  appearance: ButtonAppearance.toolbar,
                  ariaLabel: 'Bold',
                  onClick: () {},
                  icon: const LucideBold(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.bySemanticsLabel('Format'), findsOneWidget);
    expect(find.bySemanticsLabel('Editor'), findsOneWidget);
    // The 44px toolbar item: a 38px control + 2px padding + 1px border on each side.
    expect(tester.getSize(find.byType(GlassGroup)).height, 44);
    expect(tester.getSize(find.byType(IconButton)), const Size(38, 38));
    handle.dispose();
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets(
    'glass in a clipped scroll view is cut to it and follows its scroll',
    (tester) async {
      final controller = ScrollController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        host(
          GlassContainer(
            child: ClipRect(
              child: SizedBox(
                width: 200,
                child: SingleChildScrollView(
                  controller: controller,
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    spacing: 12,
                    children: [
                      for (var i = 0; i < 5; i++)
                        ToolbarGroup(
                          label: 'Group $i',
                          glassId: 'g$i',
                          children: const [SizedBox(width: 80, height: 38)],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      final container = tester.element(find.byType(GlassContainer));
      final strip = Offset.zero & const Size(200, 44);

      void expectCutToStrip(int visible) {
        final paths = GlassContainer.debugPathsOf(container);
        // Only the groups with a visible part paint glass; the rest contribute nothing.
        expect(paths, hasLength(visible));
        for (final path in paths) {
          expect(path.clip, isNotNull);
          expect(path.clip!.left, moreOrLessEquals(strip.left));
          expect(path.clip!.right, moreOrLessEquals(strip.right));
          final painted = path.visiblePath.getBounds();
          expect(painted.left, greaterThanOrEqualTo(strip.left - 0.01));
          expect(painted.right, lessThanOrEqualTo(strip.right + 0.01));
        }
      }

      // 86px groups 12px apart: 0–86, 98–184 and 196–282 (cut at 200) show.
      expectCutToStrip(3);
      final third = GlassContainer.debugPathsOf(container).last;
      expect(third.bounds.left, moreOrLessEquals(196));
      expect(third.visiblePath.getBounds().right, moreOrLessEquals(200));

      // Past the container's first 300ms, layout changes spring; a scroll must not.
      await tester.pump(const Duration(milliseconds: 400));
      controller.jumpTo(250);
      await tester.pump();
      // Now 196–282, 294–380 and 392–478 sit at -54–32, 44–130 and 142–228: the first two
      // groups are gone, the glass moved with the content on the same frame.
      expectCutToStrip(3);
      final lefts = [
        for (final path in GlassContainer.debugPathsOf(container))
          path.bounds.left,
      ]..sort();
      expect(lefts[0], moreOrLessEquals(-54));
      expect(lefts[1], moreOrLessEquals(44));
      expect(lefts[2], moreOrLessEquals(142));
      await tester.pumpAndSettle();
      expectCutToStrip(3);
      expect(tester.takeException(), isNull);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.macOS),
  );

  testWidgets('GlassBar raises the tint to the bar floor and turns blur on', (
    tester,
  ) async {
    double? inside;
    bool? blur;
    Widget probe() => Builder(
      builder: (context) {
        inside = ThemeProvider.of(context).colors.glassTint;
        blur = ThemeProvider.of(context).config.glassBlur;
        return const SizedBox();
      },
    );
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: ThemeProvider(child: GlassBar(child: probe())),
      ),
    );
    expect(inside, glassBarTint);
    expect(blur, isTrue);
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: ThemeProvider(
          config: const ThemeConfig(glassTint: 1),
          child: GlassBar(child: probe()),
        ),
      ),
    );
    expect(inside, 1);
  });
}
