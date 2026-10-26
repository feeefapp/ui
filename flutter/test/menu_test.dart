import 'dart:convert';
import 'dart:math' as math;
import 'dart:io';
import 'dart:ui' show PointerDeviceKind;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/transitions.dart';
import 'package:flutter/services.dart' show LogicalKeyboardKey;
import 'package:flutter/widgets.dart' hide Action;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// A small app (320 × 260) in the middle of an 800 × 600 window: panels must stay inside it, not
/// just inside the window.
const _app = Size(320, 260);

Widget _frame(Widget child, {TextDirection direction = TextDirection.ltr}) =>
    host(
      SizedBox.fromSize(
        size: _app,
        child: FloatingBoundary(child: child),
      ),
      direction: direction,
    );

Rect _bounds(WidgetTester tester) =>
    tester.getRect(find.byType(FloatingBoundary));

void _expectInside(WidgetTester tester, Finder panel, {double padding = 12}) {
  final bounds = _bounds(tester).deflate(padding - 0.01);
  final rect = tester.getRect(panel);
  expect(
    bounds.contains(rect.topLeft) && bounds.contains(rect.bottomRight),
    isTrue,
    reason: '$rect is not inside $bounds',
  );
}

Future<void> _settle(WidgetTester tester, [int steps = 14]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// Places [trigger] at [alignment] inside the app.
Widget _at(Alignment alignment, Widget trigger) =>
    Align(alignment: alignment, child: trigger);

const _corners = {
  'top left': Alignment.topLeft,
  'top right': Alignment.topRight,
  'bottom left': Alignment.bottomLeft,
  'bottom right': Alignment.bottomRight,
  'left': Alignment.centerLeft,
  'right': Alignment.centerRight,
  'top': Alignment.topCenter,
  'bottom': Alignment.bottomCenter,
};

List<CommandAction> _actions(int n) => [
  for (var i = 0; i < n; i++)
    CommandAction(id: 'a$i', label: 'Action number $i', onAction: () {}),
];

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/menu.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();
  Rect box(Object? v) {
    final m = v! as Map<String, dynamic>;
    return Rect.fromLTWH(n(m['x']), n(m['y']), n(m['width']), n(m['height']));
  }

  Rect? maybeBox(Object? v) => v == null ? null : box(v);

  void expectContent(MenuContentFrame actual, Object? expected) {
    final e = expected! as Map<String, dynamic>;
    expect(actual.opacity, closeTo(n(e['opacity']), 1e-9));
    expect(actual.blur, closeTo(n(e['blur']), 1e-9));
    expect(actual.settled, e['settled']);
  }

  void expectRect(Rect actual, Object? expected) {
    final e = box(expected);
    expect(actual.left, closeTo(e.left, 1e-9));
    expect(actual.top, closeTo(e.top, 1e-9));
    expect(actual.width, closeTo(e.width, 1e-9));
    expect(actual.height, closeTo(e.height, 1e-9));
  }

  group('menu motion matches the web kit', () {
    test('springs', () {
      const named = {'menu': Springs.menu, 'menuDismiss': Springs.menuDismiss};
      for (final entry in fixture['springs'] as List) {
        final at = solveSpring(named[entry['name']]!, 0, 1);
        for (final s in entry['samples'] as List) {
          expect(at(n(s[0])).position, closeTo(n(s[1]), 1e-9));
          expect(at(n(s[0])).velocity, closeTo(n(s[2]), 1e-9));
        }
      }
      expect(glassOriginSprings.grow, Springs.menu);
      expect(glassOriginSprings.absorb, Springs.menuDismiss);
    });

    test('rows opening and closing, in every motion setting', () {
      final m = fixture['midway'] as Map<String, dynamic>;
      final midway = MenuContentFrame(
        opacity: n(m['opacity']),
        blur: n(m['blur']),
        settled: m['settled'] as bool,
      );
      for (final c in fixture['content'] as List) {
        final motion = Motion.values.byName(c['motion'] as String);
        for (final f in c['open'] as List) {
          expectContent(
            menuContentOpenFrame(n(f['t']), motion: motion),
            f['frame'],
          );
        }
        for (final f in c['close'] as List) {
          expectContent(
            menuContentCloseFrame(n(f['t']), midway, motion: motion),
            f['frame'],
          );
        }
      }
      expect(menuCloseDuration(Motion.none), 0);
      expect(
        menuCloseDuration(Motion.reduced),
        closeTo(MenuMorph.fadeOut, 1e-9),
      );
      expect(menuCloseDuration(), MenuMorph.closeEnd);
    });

    test('the glass is born out of its origin and returns into it', () {
      for (final c in fixture['origin'] as List) {
        expectRect(
          glassOrigin(box(c['origin']), maybeBox(c['glass'])),
          c['rect'],
        );
      }
      const button = Rect.fromLTWH(206, 0, 44, 44);
      const menu = Rect.fromLTWH(0, 0, 250, 209);
      final born = planGlassTransition(
        {'other': button.translate(94, 0)},
        {'other': button.translate(94, 0), 'menu': menu},
        8,
        {'menu': button},
      );
      final birth = born.births.single as GlassGrow;
      final expected = (fixture['plan']['birth']['births'] as List).single;
      expect(birth.id, expected['id']);
      expect(birth.source, expected['source']);
      expectRect(birth.from, expected['from']);
      final gone = planGlassTransition({'menu': menu}, {}, 8, {'menu': button});
      final death = gone.deaths.single as GlassAbsorb;
      expect(death.target, glassOriginId);
      expectRect(
        death.into,
        (fixture['plan']['death']['deaths'] as List).single['into'],
      );
    });

    test('menu material', () {
      final m = fixture['material'] as Map<String, dynamic>;
      expect(glassMenuVeil, n(m['menu']['veil']));
      expect(glassMenuBlur, n(m['menu']['blur']));
      expect(glassMenuShadow.dy, n(m['menu']['shadow']['dy']));
      expect(glassMenuShadow.blur, n(m['menu']['shadow']['blur']));
      expect(glassMenuShadow.inset, n(m['menu']['shadow']['inset']));
      expect(glassMenuShadow.alpha, n(m['menu']['shadow']['alpha']));
      for (final dark in [false, true]) {
        final e = m[dark ? 'dark' : 'light'] as Map<String, dynamic>;
        final a = glassMenuMaterial(dark: dark);
        expect(a.veil, closeTo(n(e['veil']), 1e-9));
        expect(a.saturate, closeTo(n(e['saturate']), 1e-9));
        expect(a.gain, closeTo(n(e['gain']), 1e-9));
        expect(a.offset, closeTo(n(e['offset']), 1e-9));
      }
      for (final b in m['blur'] as List) {
        expect(
          glassKindBlur(GlassKind.menu, n(b[0]), 0.5, blurOn: false),
          closeTo(n(b[1]), 1e-9),
        );
      }
    });

    test('alignment', () {
      for (final a in fixture['align'] as List) {
        expect(
          menuAlign(
            a['toolbar'] as bool,
            n(a['center']),
            n(a['left']),
            n(a['right']),
            rtl: a['rtl'] as bool,
          ).name,
          a['align'],
        );
      }
    });
  });

  group('menu glass', () {
    Finder menuGlass() => find.byWidgetPredicate(
      (w) => w is GlassContainer && w.material == GlassKind.menu,
    );

    Rect glassRect(WidgetTester tester) {
      final element = tester.element(menuGlass());
      final paths = GlassContainer.debugPathsOf(element);
      final origin = tester.getTopLeft(menuGlass());
      final shape = paths.single.shapes.single;
      return Rect.fromLTWH(
        shape.x,
        shape.y,
        shape.width,
        shape.height,
      ).shift(origin);
    }

    Widget toolbarMenu() => _frame(
      _at(
        Alignment.topRight,
        GlassScope(
          child: ToolbarGroup(
            label: 'Order',
            children: [
              ActionsMenuAnchor(
                label: 'Order actions',
                actions: _actions(3),
                builder: (open) => IconButton(
                  appearance: ButtonAppearance.toolbar,
                  ariaLabel: 'Order actions',
                  onClick: open ?? () {},
                  icon: const LucideEllipsis(),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    testWidgets(
      'is one container shape born out of the trigger glass, flying back into it',
      (tester) async {
        await tester.pumpWidget(toolbarMenu());
        await _settle(tester);
        final bubble = tester.getRect(find.byType(ToolbarGroup));
        await tester.tap(find.bySemanticsLabel('Order actions'));
        await tester.pump();
        // The first frame after the menu is measured: no spring time has passed yet.
        await tester.pump(Duration.zero);
        // Born out of the toolbar bubble that hugs the button.
        final born = glassRect(tester);
        // It springs from the bubble toward the menu, which lines up with the bubble's top-right.
        expect(
          (born.topRight - bubble.topRight).distance,
          lessThan(1.5),
          reason: 'born $born, bubble $bubble',
        );
        expect(born.width, lessThan(bubble.width * 1.5));
        await _settle(tester);
        final menu = tester.getRect(find.byType(MenuSurface));
        final open = glassRect(tester);
        expect(
          open.left,
          closeTo(menu.left, 0.5),
          reason: 'open $open menu $menu',
        );
        expect(open.width, closeTo(menu.width, 0.5));
        // Rows are inside their glass, the trigger hidden under it.
        expect(find.text('Action number 0'), findsOneWidget);
        // Closing: the glass flies back into the button, then the menu leaves.
        await tester.tapAt(_bounds(tester).bottomLeft + const Offset(4, -4));
        await tester.pump();
        for (var i = 0; i < 6; i++) {
          await tester.pump(const Duration(milliseconds: 16));
        }
        final back = glassRect(tester);
        expect(back.width, lessThan(open.width));
        await _settle(tester);
        expect(menuGlass(), findsNothing);
      },
    );

    testWidgets(
      'a plain trigger births its menu from a droplet at its centre',
      (tester) async {
        await tester.pumpWidget(
          _frame(
            _at(
              Alignment.center,
              ActionsMenuAnchor(
                label: 'Sort',
                actions: _actions(3),
                builder: (open) => Button(
                  variant: ButtonVariant.tonal,
                  onClick: open ?? () {},
                  children: const [Text('Sort')],
                ),
              ),
            ),
          ),
        );
        final button = tester.getRect(find.byType(Button));
        await tester.tap(find.byType(Button));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 16));
        final born = glassRect(tester);
        expect((born.center - button.center).distance, lessThan(6));
        expect(born.width, lessThan(glassOriginSeed * 3));
      },
    );

    testWidgets('reduced motion shows the glass in place', (tester) async {
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: toolbarMenu(),
        ),
      );
      await tester.tap(find.bySemanticsLabel('Order actions'));
      await tester.pump();
      // The first frame after the menu is measured: no spring time has passed yet.
      await tester.pump(Duration.zero);
      final menu = tester.getRect(find.byType(MenuSurface));
      expect(glassRect(tester).width, closeTo(menu.width, 0.5));
      await tester.pumpWidget(const SizedBox());
      await _settle(tester);
    });
  });

  group('placeAnchoredPanel', () {
    const bounds = Rect.fromLTWH(12, 12, 296, 236);

    test('opens below, flips above when there is no room, shifts inside', () {
      final below = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(20, 20, 40, 40),
        size: const Size(120, 100),
        sideOffset: 8,
      );
      expect(below.side, PanelSide.bottom);
      expect(below.rect.top, 68);
      // Centred on the trigger would cross the left edge: shifted to it.
      expect(below.rect.left, 12);

      final above = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(200, 200, 40, 40),
        size: const Size(120, 100),
        sideOffset: 8,
      );
      expect(above.side, PanelSide.top);
      expect(above.rect.bottom, 192);
      expect(above.rect.right, lessThanOrEqualTo(bounds.right));
    });

    test('a covering panel lines up with the trigger edge it grows from', () {
      final down = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(200, 20, 44, 44),
        size: const Size(150, 120),
        cover: true,
        align: PanelAlign.end,
      );
      expect(down.rect.top, 20);
      expect(down.rect.right, 244);
      final up = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(100, 190, 44, 44),
        size: const Size(150, 120),
        cover: true,
      );
      expect(up.side, PanelSide.top);
      expect(up.rect.bottom, 234);
    });

    test('logical sides and alignment mirror in RTL', () {
      final ltr = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(100, 100, 40, 30),
        size: const Size(80, 40),
        side: PanelSide.end,
        align: PanelAlign.start,
        sideOffset: 4,
      );
      expect(ltr.rect.left, 144);
      expect(ltr.rect.top, 100);
      final rtl = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(100, 100, 40, 30),
        size: const Size(80, 40),
        side: PanelSide.end,
        align: PanelAlign.start,
        sideOffset: 4,
        direction: TextDirection.rtl,
      );
      expect(rtl.rect.right, 96);
      // An end panel with no room on its side flips to the start.
      final flipped = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(250, 100, 40, 30),
        size: const Size(80, 40),
        side: PanelSide.end,
        sideOffset: 4,
      );
      expect(flipped.side, PanelSide.start);
      expect(flipped.rect.right, 246);
    });

    test('a side panel that fits neither side drops below, never squeezed', () {
      // A 250-wide submenu beside a row of a menu that fills most of the bounds.
      const row = Rect.fromLTWH(22, 60, 230, 42);
      for (final dir in TextDirection.values) {
        final rtl = dir == TextDirection.rtl;
        final anchor = rtl ? const Rect.fromLTWH(68, 60, 230, 42) : row;
        final p = placeAnchoredPanel(
          bounds: bounds,
          anchor: anchor,
          size: const Size(250, 120),
          side: PanelSide.end,
          align: PanelAlign.start,
          sideOffset: 4,
          direction: dir,
        );
        expect(p.side, PanelSide.bottom);
        expect(p.rect.width, 250);
        expect(p.rect.top, anchor.bottom);
        // Lined up with the row's start edge, shifted inside.
        if (rtl) {
          expect(p.rect.right, anchor.right);
        } else {
          expect(p.rect.left, anchor.left);
        }
        expect(p.rect.left, greaterThanOrEqualTo(bounds.left));
        expect(p.rect.right, lessThanOrEqualTo(bounds.right));
      }
      // When one side fits, it still opens beside (flipped if needed).
      final beside = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(200, 60, 100, 42),
        size: const Size(150, 120),
        side: PanelSide.end,
        sideOffset: 4,
      );
      expect(beside.side, PanelSide.start);
      expect(beside.rect.right, 196);
    });

    test('room caps the extent; bigger panels keep their start', () {
      expect(
        panelMaxExtent(
          bounds,
          const Rect.fromLTWH(20, 30, 40, 40),
          PanelSide.bottom,
        ),
        248 - 70,
      );
      final huge = placeAnchoredPanel(
        bounds: bounds,
        anchor: const Rect.fromLTWH(20, 30, 40, 40),
        size: const Size(400, 400),
      );
      expect(huge.rect.topLeft, const Offset(12, 12));
    });
  });

  group('every kit popup stays inside its app', () {
    for (final MapEntry(key: where, value: alignment) in _corners.entries) {
      testWidgets('an actions menu opened at the $where', (tester) async {
        await tester.pumpWidget(
          _frame(
            _at(
              alignment,
              ActionsMenuAnchor(
                label: 'Order actions',
                actions: _actions(7),
                builder: (open) => IconButton(
                  variant: .text,
                  ariaLabel: 'Order actions',
                  onClick: open ?? () {},
                  icon: const LucideIcon(LucideIcons.ellipsis),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.byType(IconButton));
        await _settle(tester);
        expect(find.byType(MenuSurface), findsOneWidget);
        _expectInside(tester, find.byType(MenuSurface));
      });

      testWidgets('a popover opened at the $where', (tester) async {
        await tester.pumpWidget(
          _frame(
            _at(
              alignment,
              Popover(
                label: 'Note',
                sideOffset: 8,
                collisionPadding: 12,
                width: 220,
                trigger: (context, toggle, open) => GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: toggle,
                  child: const SizedBox(
                    key: Key('trigger'),
                    width: 60,
                    height: 40,
                  ),
                ),
                content: (context, close) =>
                    const SizedBox(height: 140, child: Text('panel')),
              ),
            ),
          ),
        );
        await tester.tap(find.byKey(const Key('trigger')));
        await _settle(tester, 2);
        _expectInside(tester, find.byType(PopoverSurface));
      });

      testWidgets('a select opened at the $where', (tester) async {
        await tester.pumpWidget(
          _frame(
            _at(
              alignment,
              SizedBox(
                width: 140,
                child: Select(
                  ariaLabel: 'Wilaya',
                  value: 'alger',
                  onValueChange: (_) {},
                  children: [
                    for (final w in [
                      'Alger',
                      'Oran',
                      'Blida',
                      'Sétif',
                      'Annaba',
                    ])
                      Option(value: w.toLowerCase(), child: Text(w)),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.byType(Select));
        await _settle(tester);
        _expectInside(tester, find.byType(MenuSurface));
      });

      testWidgets('a tooltip shown at the $where', (tester) async {
        await tester.pumpWidget(
          _frame(
            _at(
              alignment,
              const Tooltip(
                label: 'A rather long tooltip label',
                child: SizedBox(width: 40, height: 40),
              ),
            ),
          ),
        );
        final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await mouse.moveTo(tester.getCenter(find.byType(Tooltip)));
        await tester.pump(const Duration(milliseconds: 800));
        await tester.pump();
        final label = find.text('A rather long tooltip label');
        expect(label, findsOneWidget);
        _expectInside(tester, label);
        await mouse.removePointer();
      });
    }
  });

  testWidgets('the menu covers its trigger, hides it, and flies back into it', (
    tester,
  ) async {
    await tester.pumpWidget(
      _frame(
        _at(
          Alignment.topCenter,
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: ActionsMenuAnchor(
              label: 'Order actions',
              actions: _actions(3),
              builder: (open) => IconButton(
                variant: .text,
                ariaLabel: 'Order actions',
                onClick: open ?? () {},
                icon: const LucideIcon(LucideIcons.ellipsis),
              ),
            ),
          ),
        ),
      ),
    );
    final trigger = tester.getRect(find.byType(IconButton));
    double triggerOpacity() => tester
        .widget<AnimatedOpacity>(
          find.ancestor(
            of: find.byType(IconButton),
            matching: find.byType(AnimatedOpacity),
          ),
        )
        .opacity;

    await tester.tap(find.byType(IconButton));
    await _settle(tester);
    final menu = tester.getRect(find.byType(MenuSurface));
    // Covers the trigger, top-aligned, centred (an in-content trigger), at least 250 wide.
    expect(menu.top, closeTo(trigger.top, 0.5));
    expect(menu.center.dx, closeTo(trigger.center.dx, 0.5));
    expect(menu.width, greaterThanOrEqualTo(250));
    expect(triggerOpacity(), 0);

    await tester.tap(find.text('Action number 1'));
    await tester.pump(const Duration(milliseconds: 100));
    // Mid-flight: still mounted while it flies back.
    expect(find.byType(MenuSurface), findsOneWidget);
    await _settle(tester);
    expect(find.byType(MenuSurface), findsNothing);
    expect(triggerOpacity(), 1);
  });

  testWidgets(
    'a toolbar menu lines up with the trigger edge nearest its side',
    (tester) async {
      for (final dir in TextDirection.values) {
        await tester.pumpWidget(
          _frame(
            _at(
              Alignment.topRight,
              ActionsBar(
                label: 'Tools',
                actions: [
                  for (var i = 0; i < 8; i++)
                    CommandAction(
                      id: 't$i',
                      label: 'Tool $i',
                      priority: i.toDouble(),
                      onAction: () {},
                    ),
                ],
              ),
            ),
            direction: dir,
          ),
        );
        await tester.pumpAndSettle();
        final more = find.bySemanticsLabel('More actions');
        final trigger = tester.getRect(more.first);
        await tester.tap(more.first);
        await _settle(tester);
        final menu = tester.getRect(find.byType(MenuSurface));
        // The menu lines up with the trigger's edge on the side of the app it sits on (or the
        // bounds' padded edge when the trigger sits in the padding).
        final bounds = _bounds(tester).deflate(12);
        if (trigger.center.dx < _bounds(tester).center.dx) {
          expect(menu.left, closeTo(math.max(trigger.left, bounds.left), 0.5));
        } else {
          expect(
            menu.right,
            closeTo(math.min(trigger.right, bounds.right), 0.5),
          );
        }
        _expectInside(tester, find.byType(MenuSurface));
        await tester.tapAt(_bounds(tester).bottomLeft + const Offset(4, -4));
        await _settle(tester);
      }
    },
  );

  testWidgets('an open panel follows its trigger when the page scrolls', (
    tester,
  ) async {
    final controller = ScrollController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      _frame(
        ListView(
          controller: controller,
          children: [
            const SizedBox(height: 60),
            Center(
              child: Popover(
                label: 'Note',
                sideOffset: 8,
                width: 160,
                trigger: (context, toggle, open) => GestureDetector(
                  onTap: toggle,
                  child: const SizedBox(
                    width: 60,
                    height: 30,
                    child: Text('open'),
                  ),
                ),
                content: (context, close) =>
                    const SizedBox(height: 40, child: Text('panel')),
              ),
            ),
            const SizedBox(height: 600),
          ],
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await _settle(tester, 2);
    final before = tester.getRect(find.byType(PopoverSurface));
    controller.jumpTo(20);
    await tester.pump();
    final after = tester.getRect(find.byType(PopoverSurface));
    expect(after.top, closeTo(before.top - 20, 0.5));
    expect(
      after.top,
      closeTo(tester.getRect(find.text('open')).bottom + 8, 0.5),
    );
  });

  testWidgets('reduced motion: the menu crossfades in place', (tester) async {
    await tester.pumpWidget(
      _frame(
        Builder(
          builder: (context) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: _at(
              Alignment.center,
              ActionsMenuAnchor(
                label: 'Order actions',
                actions: _actions(2),
                builder: (open) => IconButton(
                  variant: .text,
                  ariaLabel: 'Order actions',
                  onClick: open ?? () {},
                  icon: const LucideIcon(LucideIcons.ellipsis),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byType(IconButton));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.byType(MenuSurface), findsOneWidget);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.escape);
    await _settle(tester, 4);
    expect(find.byType(MenuSurface), findsNothing);
  });

  group('narrow windows (390 px)', () {
    Future<Rect> phone(
      WidgetTester tester,
      Alignment alignment,
      Widget trigger, {
      TextDirection direction = TextDirection.ltr,
    }) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 390,
            height: 844,
            child: FloatingBoundary(
              child: Align(
                alignment: alignment,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: trigger,
                ),
              ),
            ),
          ),
          direction: direction,
        ),
      );
      return _bounds(tester);
    }

    Widget menuButton({
      required List<Action> actions,
      bool cover = true,
      PanelSide side = PanelSide.bottom,
      Size size = const Size(44, 44),
    }) => ActionsMenuAnchor(
      label: 'Order actions',
      actions: actions,
      cover: cover,
      side: side,
      builder: (open) => GestureDetector(
        key: const Key('trigger'),
        behavior: HitTestBehavior.opaque,
        onTap: open,
        child: SizedBox.fromSize(size: size),
      ),
    );

    final nested = <Action>[
      CommandAction(
        id: 'print',
        label: 'Print shipping label',
        icon: const LucideIcon(LucideIcons.printer),
        onAction: () {},
      ),
      GroupAction(
        id: 'courier',
        label: 'Send with',
        icon: const LucideIcon(LucideIcons.truck),
        actions: [
          for (final c in ['Yalidine', 'ZR Express', 'Maystro'])
            CommandAction(id: c, label: c, onAction: () {}),
          GroupAction(
            id: 'more',
            label: 'More couriers',
            actions: [
              for (final c in ['Ecotrack', 'Noest Express'])
                CommandAction(id: c, label: c, onAction: () {}),
            ],
          ),
        ],
      ),
    ];

    for (final direction in TextDirection.values) {
      for (final MapEntry(key: where, value: alignment) in {
        'top-left': Alignment.topLeft,
        'top-right': Alignment.topRight,
      }.entries) {
        testWidgets(
          'submenus keep their width at the $where (${direction.name})',
          (tester) async {
            final bounds = await phone(
              tester,
              alignment,
              menuButton(actions: nested),
              direction: direction,
            );
            final minWidth = math.min(250.0, bounds.width - 24);
            await tester.tap(find.byKey(const Key('trigger')));
            await _settle(tester);
            await tester.tap(find.text('Send with'));
            await _settle(tester);
            expect(find.byType(MenuSurface), findsNWidgets(2));
            final sub = find.byType(MenuSurface).last;
            expect(tester.getSize(sub).width, greaterThanOrEqualTo(minWidth));
            _expectInside(tester, sub);
            // One line per label, not one letter per line.
            expect(
              tester.getSize(find.text('ZR Express')).height,
              lessThan(30),
            );

            await tester.tap(find.text('More couriers'));
            await _settle(tester);
            expect(find.byType(MenuSurface), findsNWidgets(3));
            final third = find.byType(MenuSurface).last;
            expect(tester.getSize(third).width, greaterThanOrEqualTo(minWidth));
            _expectInside(tester, third);
            expect(tester.takeException(), isNull);
          },
        );
      }

      testWidgets('the submenu chevron points to the inline end '
          '(${direction.name})', (tester) async {
        await phone(
          tester,
          Alignment.center,
          menuButton(actions: nested),
          direction: direction,
        );
        await tester.tap(find.byKey(const Key('trigger')));
        await _settle(tester);
        final flip = tester.widget<Transform>(
          find
              .ancestor(
                of: find.byType(LucideChevronRight),
                matching: find.byType(Transform),
              )
              .first,
        );
        expect(
          flip.transform.storage[0],
          direction == TextDirection.rtl ? -1 : 1,
        );
      });

      testWidgets('cover: false opens beside a rail item on its side '
          '(${direction.name})', (tester) async {
        final rtl = direction == TextDirection.rtl;
        await phone(
          tester,
          rtl ? Alignment.centerRight : Alignment.centerLeft,
          menuButton(
            actions: _actions(3),
            cover: false,
            side: PanelSide.end,
            size: const Size(66, 66),
          ),
          direction: direction,
        );
        final trigger = tester.getRect(find.byKey(const Key('trigger')));
        await tester.tap(find.byKey(const Key('trigger')));
        await _settle(tester);
        final menu = tester.getRect(find.byType(MenuSurface));
        if (rtl) {
          expect(menu.right, closeTo(trigger.left - 4, 0.5));
        } else {
          expect(menu.left, closeTo(trigger.right + 4, 0.5));
        }
        // Lined up with the item's top; the item stays visible.
        expect(menu.top, closeTo(trigger.top, 0.5));
        expect(
          tester
              .widget<AnimatedOpacity>(
                find.ancestor(
                  of: find.byKey(const Key('trigger')),
                  matching: find.byType(AnimatedOpacity),
                ),
              )
              .opacity,
          1,
        );
        _expectInside(tester, find.byType(MenuSurface));
      });
    }

    for (final withIcon in [false, true]) {
      testWidgets(
        withIcon
            ? 'one row with an icon: every row keeps the icon slot'
            : 'no row with an icon: no row reserves the icon slot',
        (tester) async {
          await phone(
            tester,
            Alignment.center,
            menuButton(
              actions: [
                ..._actions(2),
                CommandAction(
                  id: 'print',
                  label: 'Print',
                  icon: withIcon ? const LucideIcon(LucideIcons.printer) : null,
                  onAction: () {},
                ),
              ],
            ),
          );
          await tester.tap(find.byKey(const Key('trigger')));
          await _settle(tester);
          const tokens = MenuTokens.comfortable;
          final menu = tester.getRect(find.byType(MenuSurface));
          final inset =
              tester.getRect(find.text('Action number 0')).left - menu.left;
          // The glass inset + row padding, plus the 18 px slot and its 12 px gap with an icon.
          expect(
            inset,
            closeTo(tokens.inset + tokens.rowInline + (withIcon ? 30 : 0), 0.5),
          );
        },
      );
    }

    test('menuHasLeading', () {
      expect(menuHasLeading(_actions(2), const {}), isFalse);
      expect(menuHasLeading(_actions(2), {'a1'}), isTrue);
      expect(
        menuHasLeading([
          ToggleAction(
            id: 't',
            label: 'Urgent',
            checked: false,
            onCheckedChange: (_) {},
          ),
        ], const {}),
        isTrue,
      );
    });
  });
}
