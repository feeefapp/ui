// Renders the docs' maps sheet (04-maps) exactly as the web parity script does, over the web's own
// map screenshot, and writes the geometry and 2× pixels for a pixel-to-pixel comparison:
// flutter test --enable-impeller test/dev/sheet_parity_test.dart \
//   --dart-define=SHEET_PARITY=/path/to/web  (the folder with <scheme>-map.png from the web script)
// → build/sheet-parity/<scheme>-<case>.png + <scheme>-maps.json.
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart' show FontLoader, ByteData;
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const _web = String.fromEnvironment('SHEET_PARITY');

const _places = [
  (LucideIcons.store, 'Warehouse, Bab Ezzouar', '12 orders to pick up'),
  (LucideIcons.truck, 'Yalidine hub, Hussein Dey', 'Drop-off until 17:00'),
  (LucideIcons.house, 'Customer · Amina B.', 'Cité 2068 Logements, Bt 12'),
  (LucideIcons.mapPin, 'Customer · Yacine K.', 'Rue Didouche Mourad 41'),
  (LucideIcons.mapPin, 'Customer · Sara M.', 'Kouba, near the market'),
  (LucideIcons.mapPin, 'Customer · Nadir H.', 'El Biar, Bd Bougara'),
];

final _header = GlobalKey();

Widget _sheet() => Sheet(
  label: 'Deliveries',
  container: true,
  detents: const [SheetDetent.peek, SheetDetent.medium, SheetDetent.large],
  dismissible: false,
  backgroundInteraction: SheetDetent.medium,
  header: Padding(
    key: _header,
    padding: const EdgeInsets.symmetric(horizontal: 4),
    child: const TextField(
      variant: ControlVariant.tonal,
      placeholder: 'Search deliveries',
      ariaLabel: 'Search deliveries',
      leadingIcon: LucideIcon(LucideIcons.search, size: 18),
    ),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      ListSection(
        header: const Text('Today’s route'),
        children: [
          for (final (icon, title, subtitle) in _places)
            ListRow(
              leading: LucideIcon(icon, size: 18),
              title: Text(title),
              subtitle: Text(subtitle),
              onClick: () {},
            ),
        ],
      ),
      ListSection(
        header: const Text('Recent'),
        footer: const Text(
          'Drag up for the full list; the map stays usable below medium.',
        ),
        children: [
          for (final (icon, title, _) in _places.take(4))
            ListRow(
              leading: LucideIcon(icon, size: 18),
              title: Text(title),
              subtitle: const Text('Yesterday'),
              onClick: () {},
            ),
        ],
      ),
    ],
  ),
);

Widget _app(Brightness brightness, GlobalKey shot, ui.Image map) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => Directionality(
    textDirection: TextDirection.ltr,
    child: ThemeProvider(
      config: ThemeConfig.defaults,
      brightness: brightness,
      child: DefaultTextStyle(
        style: const TextStyle(fontFamily: 'IBM Plex Sans Arabic'),
        child: Align(
          alignment: Alignment.topLeft,
          child: RepaintBoundary(
            key: shot,
            child: SizedBox(
              width: 390,
              height: 760,
              child: FloatingBoundary(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: RawImage(image: map, scale: 2, fit: BoxFit.fill),
                    ),
                    Positioned.fill(child: _sheet()),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
);

Map<String, Object?> _rect(Rect r) => {
  'x': r.left,
  'y': r.top,
  'w': r.width,
  'h': r.height,
};

Map<String, Object?> _measure(WidgetTester tester, Offset origin) {
  final surfaceFinder = find.byWidgetPredicate(
    (w) => w.runtimeType == SheetSurface,
  );
  final surface = tester.widget(surfaceFinder.first) as dynamic;
  final scrim = find.byWidgetPredicate(
    (w) => w is Opacity && w.child is ColoredBox,
  );
  Rect rel(Finder f) => tester.getRect(f).shift(-origin);
  final row = find
      .ancestor(
        of: find.text('Warehouse, Bab Ezzouar').first,
        matching: find.byType(ListRow),
      )
      .first;
  return {
    'surface': _rect(rel(surfaceFinder.first)),
    'header': _rect(rel(find.byKey(_header))),
    'firstRow': _rect(rel(row)),
    'bottomRadius': (surface.radii as List<double>)[2],
    'topRadius': (surface.radii as List<double>)[0],
    'solid': surface.solid as double,
    'scrim': scrim.evaluate().isEmpty
        ? null
        : (tester.widget<Opacity>(scrim.first)).opacity,
  };
}

void main() {
  setUpAll(() async {
    final loader = FontLoader('IBM Plex Sans Arabic');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        File('fonts/IBMPlexSansArabic-$weight.ttf')
            .readAsBytes()
            .then(ByteData.sublistView),
      );
    }
    await loader.load();
  });

  testWidgets('sheet parity', (tester) async {
    tester.view.physicalSize = const Size(780, 1520);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final out = Directory('build/sheet-parity')..createSync(recursive: true);

    for (final brightness in Brightness.values) {
      final scheme = brightness == Brightness.dark ? 'dark' : 'light';
      final map = (await tester.runAsync(() async {
        final codec = await ui.instantiateImageCodec(
          File('$_web/$scheme-map.png').readAsBytesSync(),
        );
        return (await codec.getNextFrame()).image;
      }))!;
      final shot = GlobalKey();
      await tester.pumpWidget(_app(brightness, shot, map));
      Future<void> settle() async {
        for (var i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
      }

      Future<void> capture(String name) async {
        await tester.runAsync(() async {
          final boundary =
              shot.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          final layer = boundary.debugLayer! as OffsetLayer;
          final image = await layer.toImage(
            Offset.zero & boundary.size,
            pixelRatio: 2,
          );
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          File('${out.path}/$scheme-$name.png')
              .writeAsBytesSync(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }

      await settle();
      final origin = tester.getTopLeft(find.byKey(shot));
      final result = <String, Object?>{};
      final grabber = find.bySemanticsLabel(RegExp('Drag to resize'));
      for (final name in ['peek', 'medium', 'large']) {
        result[name] = _measure(tester, origin);
        await capture(name);
        await tester.tap(grabber);
        await settle();
      }
      // Back at peek: drag the grabber up and hold at the same visible heights as the web run.
      final drag = <Map<String, Object?>>[];
      final gesture = await tester.startGesture(tester.getCenter(grabber));
      // Past the recognizer's 4px decision, as a finger would be.
      await gesture.moveBy(const Offset(0, -6));
      await tester.pump(const Duration(milliseconds: 16));
      for (final target in [200, 300, 400, 500, 600, 700, 750]) {
        final top = (_measure(tester, origin)['surface'] as Map)['y'] as double;
        final dy = target - (760 - top);
        for (var i = 0; i < 10; i++) {
          await gesture.moveBy(Offset(0, -dy / 10));
          await tester.pump(const Duration(milliseconds: 16));
        }
        await tester.pump(const Duration(milliseconds: 300));
        final m = _measure(tester, origin);
        m['visible'] = 760 - ((m['surface'] as Map)['y'] as double);
        drag.add(m);
        await capture('drag-$target');
      }
      await gesture.up();
      await settle();
      result['drag'] = drag;
      File('${out.path}/$scheme-maps.json')
          .writeAsStringSync(const JsonEncoder.withIndent(' ').convert(result));
      map.dispose();
    }
  }, skip: _web.isEmpty);
}
