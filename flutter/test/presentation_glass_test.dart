import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

// The web twin: tests/presentation-glass.test.ts and tests/glass-member-bounds.test.ts.

Widget _app(Widget child) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => Directionality(
    textDirection: TextDirection.ltr,
    child: ThemeProvider(
      config: ThemeConfig.defaults,
      brightness: Brightness.light,
      child: Overlay(
        initialEntries: [
          OverlayEntry(builder: (context) => Center(child: child)),
        ],
      ),
    ),
  ),
);

PresentationDock _dock() => PresentationDock(
  children: [
    Button(onClick: () {}, children: const [Text('Cancel')]),
    Button(
      variant: ButtonVariant.filled,
      onClick: () {},
      children: const [Text('Save address')],
    ),
  ],
);

/// Every glass container on screen: its cluster bounds and whether its glass springs on its own.
List<(List<Rect>, bool)> _glass(WidgetTester tester) => [
  for (final element in find.byType(GlassContainer).evaluate())
    (
      [for (final path in GlassContainer.debugPathsOf(element)) path.bounds],
      GlassContainer.debugMovingOf(element),
    ),
];

void main() {
  group('glass on a presentation surface', () {
    for (final kind in ['modal', 'pane', 'sheet']) {
      testWidgets(
        '$kind: glass appears at its final shape on the first frame and never springs on its own',
        (tester) async {
          tester.view.physicalSize = Size(kind == 'sheet' ? 390 : 1280, 800);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          var open = false;
          late StateSetter set;
          await tester.pumpWidget(
            _app(
              StatefulBuilder(
                builder: (context, setState) {
                  set = setState;
                  void change(bool value) => setState(() => open = value);
                  return switch (kind) {
                    'modal' => Modal(
                      open: open,
                      onOpenChange: change,
                      label: 'Edit',
                      title: const Text('Edit delivery address'),
                      dock: _dock(),
                      child: const SizedBox(height: 200),
                    ),
                    'pane' => Pane(
                      open: open,
                      onOpenChange: change,
                      label: 'Edit',
                      title: const Text('Edit customer'),
                      dock: _dock(),
                      child: const SizedBox(height: 200),
                    ),
                    _ => Sheet(
                      open: open,
                      onOpenChange: change,
                      label: 'Filters',
                      title: const Text('Filters'),
                      dock: _dock(),
                      child: const SizedBox(height: 300),
                    ),
                  };
                },
              ),
            ),
          );
          set(() => open = true);
          List<(List<Rect>, bool)>? first;
          for (var frame = 0; frame < 40; frame++) {
            await tester.pump(
              frame == 0 ? Duration.zero : const Duration(milliseconds: 16),
            );
            final glass = _glass(tester);
            if (glass.isEmpty) continue;
            first ??= glass;
            for (final (rects, moving) in glass) {
              expect(
                moving,
                isFalse,
                reason: 'frame $frame: no birth or spring',
              );
              expect(rects, isNotEmpty);
            }
            // Container pixels: the surface's transform moves the glass, its shapes stay.
            expect(
              [for (final (rects, _) in glass) rects],
              [for (final (rects, _) in first) rects],
              reason: 'frame $frame',
            );
          }
          expect(first, isNotNull);
          await tester.pumpAndSettle();

          set(() => open = false);
          for (var frame = 0; frame < 60; frame++) {
            await tester.pump(
              frame == 0 ? Duration.zero : const Duration(milliseconds: 16),
            );
            for (final (_, moving) in _glass(tester)) {
              expect(moving, isFalse, reason: 'no leaving spring');
            }
          }
          await tester.pumpAndSettle();
          expect(find.byType(GlassContainer), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }

    for (final kind in ['modal', 'pane']) {
      testWidgets(
        '$kind: the surface paints once and moves as a layer, nothing inside repaints per frame',
        (tester) async {
          tester.view.physicalSize = const Size(1280, 800);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          var open = false;
          late StateSetter set;
          final painter = _CountingPainter();
          await tester.pumpWidget(
            _app(
              StatefulBuilder(
                builder: (context, setState) {
                  set = setState;
                  void change(bool value) => setState(() => open = value);
                  final content = CustomPaint(
                    painter: painter,
                    size: const Size(200, 40),
                  );
                  return kind == 'modal'
                      ? Modal(
                          open: open,
                          onOpenChange: change,
                          label: 'Edit',
                          title: const Text('Edit'),
                          // Floating chrome: outside the scroll view's own repaint boundary.
                          dock: content,
                          child: const SizedBox(height: 120),
                        )
                      : Pane(
                          open: open,
                          onOpenChange: change,
                          label: 'Edit',
                          title: const Text('Edit'),
                          dock: content,
                          child: const SizedBox(height: 120),
                        );
                },
              ),
            ),
          );
          set(() => open = true);
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 16));
          await tester.pump(const Duration(milliseconds: 16));
          final settled = painter.paints;
          expect(settled, greaterThan(0));
          for (var frame = 0; frame < 12; frame++) {
            await tester.pump(const Duration(milliseconds: 16));
          }
          expect(
            painter.paints,
            settled,
            reason: 'twelve motion frames, no repaint of the content',
          );
          // Closing rebuilds it once (its controls change state); the frames of the exit don't.
          set(() => open = false);
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 16));
          final leaving = painter.paints;
          expect(leaving, lessThanOrEqualTo(settled + 1));
          for (var frame = 0; frame < 6; frame++) {
            await tester.pump(const Duration(milliseconds: 16));
          }
          expect(painter.paints, leaving, reason: 'the exit moves the layer');
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'a modal and its glass leave together, exactly when the fade ends',
      (tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        var open = true;
        late StateSetter set;
        await tester.pumpWidget(
          _app(
            StatefulBuilder(
              builder: (context, setState) {
                set = setState;
                return Modal(
                  open: open,
                  onOpenChange: (value) => setState(() => open = value),
                  label: 'Edit',
                  title: const Text('Edit'),
                  dock: _dock(),
                  child: const SizedBox(height: 120),
                );
              },
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(GlassContainer), findsNWidgets(2));
        set(() => open = false);
        await tester.pump();
        double opacity() => tester
            .widget<PopTransition>(find.byType(PopTransition))
            .controller
            .opacity;
        var elapsed = Duration.zero;
        while (find.byType(PopTransition).evaluate().isNotEmpty &&
            opacity() > 0) {
          await tester.pump(const Duration(milliseconds: 8));
          elapsed += const Duration(milliseconds: 8);
          expect(
            elapsed,
            lessThanOrEqualTo(
              PopMotion.fadeOut + const Duration(milliseconds: 24),
            ),
          );
        }
        // The frame after the fade ends, nothing of the dialog (glass included) is drawn.
        await tester.pump(const Duration(milliseconds: 16));
        await tester.pump(const Duration(milliseconds: 16));
        expect(find.byType(PopTransition), findsNothing);
        expect(find.byType(GlassContainer), findsNothing);
      },
    );
  });

  group('easeTo', () {
    testWidgets('ends exactly at its length, from where it is', (tester) async {
      final value = MotionValue(1);
      var done = false;
      value
          .easeTo(
            0,
            const Duration(milliseconds: 200),
            curve: PopMotion.fadeCurve,
          )
          .then((v) => done = v);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(value.get(), inExclusiveRange(0, 0.6));
      // Like a spring, its first frame already moves one frame's worth (1/60 s).
      await tester.pump(const Duration(milliseconds: 60));
      expect(done, isFalse);
      await tester.pump(const Duration(milliseconds: 30));
      await tester.pump();
      expect(value.get(), 0);
      expect(done, isTrue);
      expect(value.isAnimating, isFalse);
    });
  });

  group('glass member bounds (glass/member-bounds.ts)', () {
    const container = Size(600, 60), viewport = Size(1280, 800);
    test('fit, absurd and clamped members', () {
      expect(
        glassMemberRect(
          const Rect.fromLTWH(8, 8, 120, 44),
          container,
          viewport,
          32,
        ),
        const Rect.fromLTWH(8, 8, 120, 44),
      );
      for (final rect in [
        const Rect.fromLTWH(0, 0, double.nan, 44),
        const Rect.fromLTWH(0, 0, double.infinity, 44),
        const Rect.fromLTWH(0, 0, 0, 44),
        const Rect.fromLTWH(0, 0, 300, 200000),
        const Rect.fromLTWH(0, 0, glassMaxSide + 1, 44),
        const Rect.fromLTWH(0, 0, 1280 * 4 + 1, 44),
      ]) {
        expect(glassMemberRect(rect, container, viewport, 32), isNull);
      }
      expect(
        glassMemberRect(
          const Rect.fromLTWH(0, 0, 9000, 40),
          const Size(200000, 40),
          viewport,
          32,
        ),
        isNull,
      );
      // A bubble scrolled partly out of its row keeps its exact shape.
      expect(
        glassMemberRect(
          const Rect.fromLTWH(-100, -10, 900, 200),
          container,
          viewport,
          32,
        ),
        const Rect.fromLTWH(-100, -10, 900, 200),
      );
      expect(
        glassMemberRect(
          const Rect.fromLTWH(-2000, 0, 4000, 44),
          container,
          viewport,
          32,
        ),
        const Rect.fromLTWH(-1280, 0, 3160, 44),
      );
      expect(
        glassMemberRect(
          const Rect.fromLTWH(-1000, 0, 2000, 44),
          container,
          const Size(10, 10),
          32,
        ),
        const Rect.fromLTWH(-32, 0, 664, 44),
      );
      expect(
        glassMemberRect(
          const Rect.fromLTWH(2000, 0, 50, 44),
          container,
          viewport,
          32,
        ),
        isNull,
      );
    });

    testWidgets(
      'a member overflowing by 200,000 px (an error widget in a toolbar search) paints without a giant shape',
      (tester) async {
        tester.view.physicalSize = const Size(800, 600);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(
          _app(
            GlassContainer(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 12,
                children: [
                  const GlassGroup(
                    glassId: 'ok',
                    child: SizedBox(width: 80, height: 38),
                  ),
                  SizedBox(
                    width: 300,
                    height: 44,
                    child: OverflowBox(
                      alignment: Alignment.topCenter,
                      maxHeight: 200000,
                      child: const GlassGroup(
                        glassId: 'broken',
                        child: SizedBox(width: 300, height: 200000),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 16));
        expect(tester.takeException(), isNull);
        final paths = GlassContainer.debugPathsOf(
          tester.element(find.byType(GlassContainer)),
        );
        expect(paths, isNotEmpty, reason: 'the healthy bubble still has glass');
        for (final path in paths) {
          expect(
            path.bounds.height,
            lessThan(200),
            reason: 'never the 200,000 px shape',
          );
          expect(path.bounds.width, lessThan(1000));
        }
      },
    );
  });
}

class _CountingPainter extends CustomPainter {
  int paints = 0;
  @override
  void paint(Canvas canvas, Size size) => paints++;
  @override
  bool shouldRepaint(_CountingPainter old) => false;
}
