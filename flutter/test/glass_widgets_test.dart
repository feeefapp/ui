import 'package:feeef_ui/feeef_ui.dart';

import 'dart:ui' as ui;

import 'package:flutter/gestures.dart'
    show GestureBinding, PointerDeviceKind, PointerHoverEvent;
import 'package:flutter/rendering.dart'
    show BackdropFilterLayer, RenderRepaintBoundary;
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

Widget bubble(String id, {double width = 80}) => GlassGroup(
  glassId: id,
  child: SizedBox(width: width, height: 38),
);

// Dispatch while the removed subtree is inactive, before end-of-frame disposal.
// A mounted check alone cannot protect global pointer callbacks in this window.
class _PointerOnDeactivate extends StatelessWidget {
  const _PointerOnDeactivate({required this.child});

  final Widget child;

  @override
  StatelessElement createElement() => _PointerOnDeactivateElement(this);

  @override
  Widget build(BuildContext context) => child;
}

class _PointerOnDeactivateElement extends StatelessElement {
  _PointerOnDeactivateElement(super.widget);

  @override
  void deactivateChild(Element child) {
    super.deactivateChild(child);
    GestureBinding.instance.pointerRouter.route(
      const PointerHoverEvent(position: Offset(20, 20)),
    );
  }
}

void main() {
  testWidgets(
    'glass ignores pointers while inactive and survives reparenting',
    (tester) async {
      final key = GlobalKey();
      Widget tree(bool moved) => host(
        Row(
          children: [
            _PointerOnDeactivate(
              child: moved
                  ? const SizedBox.shrink()
                  : GlassContainer(key: key, child: bubble('lifecycle')),
            ),
            if (moved) GlassContainer(key: key, child: bubble('lifecycle')),
          ],
        ),
      );

      await tester.pumpWidget(tree(false));
      await tester.pump();
      final state = key.currentState;
      await tester.pumpWidget(tree(true));
      expect(tester.takeException(), isNull);
      expect(key.currentState, same(state));
      await tester.pump();
      final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: const Offset(20, 20));
      await mouse.moveTo(const Offset(40, 20));
      await tester.pump();
      expect(tester.takeException(), isNull);
      await mouse.removePointer();
      await tester.pumpWidget(host(const SizedBox.shrink()));
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  for (final brightness in Brightness.values) {
    testWidgets(
      'original rim fades directionally across a straight edge: $brightness',
      (tester) async {
        final boundary = GlobalKey();
        await tester.pumpWidget(
          host(
            ThemeProvider(
              config: const ThemeConfig(glass: GlassStyle.transparent),
              brightness: brightness,
              child: Center(
                child: RepaintBoundary(
                  key: boundary,
                  child: const GlassGroup(
                    radius: 0,
                    child: SizedBox(width: 158, height: 42),
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
          int red(int x, int y) => bytes.getUint8((y * image.width + x) * 4);
          // The original diagonal rim is bright at the lit end and fades along the top edge.
          // A normal-based symmetric rim or uniform border paints both samples alike.
          expect(red(4, 0), greaterThan(red(154, 0) + 8));
          image.dispose();
        });
      },
    );
  }
  for (final brightness in Brightness.values) {
    for (final style in GlassStyle.values) {
      testWidgets(
        'glass has a visible border without reflections: $brightness $style',
        (tester) async {
          final boundary = GlobalKey();
          await tester.pumpWidget(
            host(
              ThemeProvider(
                config: ThemeConfig(glass: style, glassHighlight: 0),
                brightness: brightness,
                child: ColoredBox(
                  color: brightness == Brightness.light
                      ? const Color(0xffeeeeee)
                      : const Color(0xff222222),
                  child: Center(
                    child: RepaintBoundary(
                      key: boundary,
                      child: const GlassGroup(
                        radius: 0,
                        child: SizedBox(width: 158, height: 42),
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
              for (var c = 0; c < 3; c++)
                bytes.getUint8((y * image.width + 80) * 4 + c),
            ];
            // With no reflective rim, only the theme line can define these inside edges.
            expect(pixel(0), isNot(pixel(3)));
            expect(pixel(image.height - 1), isNot(pixel(image.height - 4)));
            image.dispose();
          });
        },
      );
    }
  }

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
                    // A lone bubble: the only bubble of its own container.
                    child: const GlassGroup(
                      radius: 22,
                      child: SizedBox(width: 158, height: 42),
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

  testWidgets('a lone bubble is the only bubble of its own container', (
    tester,
  ) async {
    await tester.pumpWidget(host(Center(child: bubble('lone'))));
    await tester.pump();
    // One container, created by the bubble itself; inside a container it adds none.
    expect(find.byType(GlassContainer), findsOneWidget);
    await tester.pumpWidget(
      host(Center(child: GlassContainer(child: bubble('row')))),
    );
    await tester.pump();
    expect(find.byType(GlassContainer), findsOneWidget);
  });

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
    // Three apart bubbles per container, each with its backdrop (the hairline is painted, not
    // filtered), all sharing one backdrop read per container.
    expect(keys, hasLength(6));
    expect(keys, everyElement(isNotNull));
    expect(keys.toSet(), hasLength(2));
  });

  testWidgets('large and compact glass both draw the exterior hairline', (
    tester,
  ) async {
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
    // One backdrop for each shape; the exterior hairline is painted over it, not filtered.
    expect(tester.layers.whereType<BackdropFilterLayer>(), hasLength(2));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'wide vertical toolbar keeps one rim before and after its width changes',
    (tester) async {
      late StateSetter update;
      var width = 90.0;
      await tester.pumpWidget(
        host(
          GlassContainer(
            child: StatefulBuilder(
              builder: (context, set) {
                update = set;
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 40,
                  children: [
                    const GlassGroup(child: SizedBox(width: 160, height: 180)),
                    ToolbarGroup(
                      label: 'Zoom',
                      axis: Axis.vertical,
                      children: [SizedBox(width: width, height: 180)],
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );
      await tester.pump();
      // Each shape: its backdrop, nothing more (the hairline is painted).
      expect(tester.layers.whereType<BackdropFilterLayer>(), hasLength(2));
      update(() => width = 120);
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(tester.layers.whereType<BackdropFilterLayer>(), hasLength(2));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 1));
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

  testWidgets(
    'a bubble paints in its own layer; out of the glass it paints with the container, keeping its state',
    (tester) async {
      Widget page({required bool squeezed}) => host(
        Center(
          child: GlassContainer(
            child: GlassHidden(
              hidden: squeezed,
              child: const GlassGroup(
                glassId: 'title',
                child: SizedBox(width: 120, height: 38, child: _Keep()),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(page(squeezed: false));
      await tester.pump();
      final layer = find.descendant(
        of: find.byType(GlassGroup),
        matching: find.byType(RepaintBoundary),
      );
      expect(layer, findsOneWidget);
      final state = tester.state<_KeepState>(find.byType(_Keep));
      state.count = 3;
      await tester.pumpWidget(page(squeezed: true));
      await tester.pump();
      expect(layer, findsNothing);
      expect(tester.state<_KeepState>(find.byType(_Keep)), same(state));
      await tester.pumpWidget(page(squeezed: false));
      await tester.pump();
      expect(layer, findsOneWidget);
      expect(tester.state<_KeepState>(find.byType(_Keep)), same(state));
      expect(state.count, 3);
    },
  );

  testWidgets(
    'the light turns in steps: a far pointer repaints the glass only now and then',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        host(
          const Center(
            child: GlassContainer(
              child: GlassGroup(
                glassId: 'a',
                child: SizedBox(width: 160, height: 44),
              ),
            ),
          ),
          config: const ThemeConfig(performance: Performance.full),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      var turns = 0;
      GlassContainer.debugLightOf(find.byType(GlassContainer).evaluate().single)
          .addListener(() => turns++);
      final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: const Offset(0, 60));
      await tester.pump();
      turns = 0;
      // 400 moves along the top edge, 340 px above the glass.
      for (var x = 0; x <= 1200; x += 3) {
        await mouse.moveTo(Offset(x.toDouble(), 60));
        await tester.pump();
      }
      final far = turns;
      expect(far, greaterThan(0));
      expect(far, lessThan(60));
      turns = 0;
      // The same sweep 30 px below the glass turns it far more often.
      for (var x = 0; x <= 1200; x += 3) {
        await mouse.moveTo(Offset(x.toDouble(), 452));
        await tester.pump();
      }
      expect(turns, greaterThan(far));
      expect(turns, lessThan(400));
      await mouse.removePointer();
    },
  );
  testWidgets(
    'the hairline is painted just outside the outline, no backdrop pass',
    (tester) async {
      final boundary = GlobalKey();
      await tester.pumpWidget(
        host(
          Center(
            child: RepaintBoundary(
              key: boundary,
              // The white sits inside the captured layer: the pixels around the glass are it.
              child: const ColoredBox(
                color: Color(0xFFFFFFFF),
                child: Padding(
                  padding: EdgeInsets.all(8),
                  child: GlassGroup(
                    radius: 22,
                    child: SizedBox(width: 158, height: 42),
                  ),
                ),
              ),
            ),
          ),
          config: const ThemeConfig(performance: Performance.full),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      // One backdrop pass: the material's. The hairline costs none.
      expect(tester.layers.whereType<BackdropFilterLayer>(), hasLength(1));
      await tester.runAsync(() async {
        final render =
            boundary.currentContext!.findRenderObject()
                as RenderRepaintBoundary;
        final image = await render.toImage();
        final bytes = (await image.toByteData(
          format: ui.ImageByteFormat.rawRgba,
        ))!;
        int red(int x, int y) => bytes.getUint8((y * image.width + x) * 4);
        // Far outside: white but for the faint glass shadow. Just outside the left edge (ring
        // and sliver) and just above the top edge (ring only): darkened by the hairline.
        expect(red(2, 29), greaterThanOrEqualTo(250));
        expect(red(87, 2), greaterThanOrEqualTo(250));
        expect(red(7, 29), lessThan(235));
        // Regular light at the pole integrates 0.43 × 0.23 × (0.75 / 2)
        // over the exterior pixel, yielding about 246 on white before the shadow.
        expect(red(87, 7), lessThanOrEqualTo(247));
        expect(red(7, 29), lessThan(red(87, 7)));
        image.dispose();
      });
    },
  );
}

/// A widget whose state must survive its bubble leaving and rejoining the glass.
class _Keep extends StatefulWidget {
  const _Keep();
  @override
  State<_Keep> createState() => _KeepState();
}

class _KeepState extends State<_Keep> {
  int count = 0;
  @override
  Widget build(BuildContext context) => const SizedBox.expand();
}
