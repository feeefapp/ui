import 'dart:convert';
import 'dart:math' as math;
import 'dart:io';
import 'dart:ui' show PointerDeviceKind;

import 'package:feeef_ui/feeef_ui.dart';
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

  MenuMorphFrame frameOf(Object? v) {
    final m = v! as Map<String, dynamic>;
    return MenuMorphFrame(
      box: box(m['box']),
      radius: n(m['radius']),
      contentOpacity: n(m['contentOpacity']),
      contentBlur: n(m['contentBlur']),
      materialOpacity: n(m['materialOpacity']),
      settled: m['settled'] as bool,
    );
  }

  void expectFrame(MenuMorphFrame actual, Object? expected) {
    final e = frameOf(expected);
    expect(actual.box.left, closeTo(e.box.left, 1e-9));
    expect(actual.box.top, closeTo(e.box.top, 1e-9));
    expect(actual.box.width, closeTo(e.box.width, 1e-9));
    expect(actual.box.height, closeTo(e.box.height, 1e-9));
    expect(actual.radius, closeTo(e.radius, 1e-9));
    expect(actual.contentOpacity, closeTo(e.contentOpacity, 1e-9));
    expect(actual.contentBlur, closeTo(e.contentBlur, 1e-9));
    expect(actual.materialOpacity, closeTo(e.materialOpacity, 1e-9));
    expect(actual.settled, e.settled);
  }

  group('menu morph matches the web kit', () {
    test('springs', () {
      const named = {'menu': Springs.menu, 'menuDismiss': Springs.menuDismiss};
      for (final entry in fixture['springs'] as List) {
        final at = solveSpring(named[entry['name']]!, 0, 1);
        for (final s in entry['samples'] as List) {
          expect(at(n(s[0])).position, closeTo(n(s[1]), 1e-9));
          expect(at(n(s[0])).velocity, closeTo(n(s[2]), 1e-9));
        }
      }
    });

    test('opening frames', () {
      for (final c in fixture['open'] as List) {
        for (final f in c['frames'] as List) {
          expectFrame(
            menuOpenFrame(
              n(f['t']),
              box(c['from']),
              n(c['fromRadius']),
              box(c['to']),
              n(c['toRadius']),
            ),
            f['frame'],
          );
        }
      }
    });

    test('closing frames, from rest and from midway', () {
      for (final c in fixture['close'] as List) {
        final rest = menuRestFrame(box(c['to']), n(c['toRadius']));
        for (final f in c['fromRest'] as List) {
          expectFrame(
            menuCloseFrame(n(f['t']), rest, box(c['from']), n(c['fromRadius'])),
            f['frame'],
          );
        }
        final midway = frameOf(c['fromMidway']['start']);
        for (final f in c['fromMidway']['frames'] as List) {
          expectFrame(
            menuCloseFrame(
              n(f['t']),
              midway,
              box(c['from']),
              n(c['fromRadius']),
            ),
            f['frame'],
          );
        }
      }
    });

    test('reduced-motion fades and alignment', () {
      const menu = Rect.fromLTWH(0, 0, 250, 209);
      for (final f in fixture['fade'] as List) {
        expectFrame(
          menuFadeFrame(n(f['t']), f['opening'] as bool, menu, 32.7),
          f['frame'],
        );
      }
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

    test(
      'measured shape: 2–4 % width overshoot near 0.22 s, settled by 0.45 s',
      () {
        const menu = Rect.fromLTWH(0, 0, 250, 209);
        const button = Rect.fromLTWH(83.5, 0, 83, 54);
        var peak = 0.0;
        for (var t = 0.0; t < 0.6; t += 1 / 240) {
          final w = menuOpenFrame(t, button, 27, menu, 32.7).box.width;
          if (w > peak) peak = w;
        }
        expect((peak - 250) / 250, inInclusiveRange(0.015, 0.04));
        expect(
          menuOpenFrame(0.45, button, 27, menu, 32.7).box.width,
          closeTo(250, 1),
        );
      },
    );
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
}
