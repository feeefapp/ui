// Renders the sheet over a pretend map (peek, medium, large, growing out of its button, the iPad
// card) in light and dark, through Impeller:
// flutter test --enable-impeller test/dev/sheet_screenshots_test.dart --dart-define=SHEET_SHOTS=true
// → build/sheet-preview/<scheme>-<case>.png.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart' show FontLoader, ByteData;
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const _enabled = bool.fromEnvironment('SHEET_SHOTS');

class _Map extends CustomPainter {
  const _Map(this.dark);
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    Color c(int light, int night) => Color(dark ? night : light);
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = c(0xFFECE6DB, 0xFF22252B),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.85, h * 0.08),
        width: w * 0.72,
        height: h * 0.48,
      ),
      Paint()..color = c(0xFF8EC5FF, 0xFF1F3C5C),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.18, h * 0.62),
        width: w * 0.36,
        height: h * 0.26,
      ),
      Paint()..color = c(0xFFA8DCA0, 0xFF2B4A2B),
    );
    final street = Paint()..color = c(0xE6FFFFFF, 0xE6393D45);
    for (var y = 46.0; y < h; y += 50) {
      canvas.drawRect(Rect.fromLTWH(0, y, w, 4), street);
    }
    for (var x = 58.0; x < w; x += 62) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 4, h), street);
    }
    canvas.drawLine(
      Offset(0, h * 0.78),
      Offset(w, h * 0.22),
      Paint()
        ..color = c(0xFFFFD479, 0xFF8A6A1E)
        ..strokeWidth = 12,
    );
    for (final (x, y) in const [
      (0.22, 0.18),
      (0.64, 0.30),
      (0.40, 0.46),
      (0.78, 0.58),
    ]) {
      final p = Offset(w * x, h * y);
      canvas.drawCircle(p, 9, Paint()..color = const Color(0xFFFFFFFF));
      canvas.drawCircle(p, 6, Paint()..color = const Color(0xFFE5484D));
    }
  }

  @override
  bool shouldRepaint(_Map old) => old.dark != dark;
}

Widget _rows() => Column(
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    ListSection(
      header: const Text('Today’s route'),
      children: [
        for (final (title, subtitle) in const [
          ('Warehouse, Bab Ezzouar', '12 orders to pick up'),
          ('Yalidine hub, Hussein Dey', 'Drop-off until 17:00'),
          ('Customer · Amina B.', 'Cité 2068 Logements, Bt 12'),
          ('Customer · Yacine K.', 'Rue Didouche Mourad 41'),
          ('Customer · Sara M.', 'Kouba, near the market'),
          ('Customer · Nadir H.', 'El Biar, Bd Bougara'),
          ('Customer · Lina R.', 'Bir Mourad Raïs'),
        ])
          ListRow(
            leading: const LucideIcon(LucideIcons.mapPin, size: 18),
            title: Text(title),
            subtitle: Text(subtitle),
            onClick: () {},
          ),
      ],
    ),
  ],
);

Widget _search(String hint) => Padding(
  padding: const EdgeInsets.symmetric(horizontal: 4),
  child: TextField(
    variant: ControlVariant.tonal,
    placeholder: hint,
    ariaLabel: hint,
    leadingIcon: const LucideIcon(LucideIcons.search, size: 18),
  ),
);

Widget _app(Brightness brightness, GlobalKey shot, Size size, Widget child) =>
    WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => Directionality(
        textDirection: TextDirection.ltr,
        child: ThemeProvider(
          config: ThemeConfig.defaults,
          brightness: brightness,
          child: DefaultTextStyle(
            style: const TextStyle(fontFamily: 'IBM Plex Sans Arabic'),
            child: Center(
              child: RepaintBoundary(
                key: shot,
                child: SizedBox.fromSize(
                  size: size,
                  child: FloatingBoundary(
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _Map(brightness == Brightness.dark),
                          ),
                        ),
                        Positioned.fill(child: child),
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

  testWidgets('sheet renders', (tester) async {
    tester.view.physicalSize = const Size(1640, 1520);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final out = Directory('build/sheet-preview')..createSync(recursive: true);

    for (final brightness in Brightness.values) {
      final scheme = brightness == Brightness.dark ? 'dark' : 'light';
      final shot = GlobalKey();
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

      Future<void> settle() async {
        for (var i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
      }

      // Maps: peek, medium, large.
      for (final detent in const [
        SheetDetent.peek,
        SheetDetent.medium,
        SheetDetent.large,
      ]) {
        await tester.pumpWidget(
          _app(
            brightness,
            shot,
            const Size(390, 760),
            Sheet(
              key: const ValueKey('maps'),
              label: 'Deliveries',
              container: true,
              detents: const [
                SheetDetent.peek,
                SheetDetent.medium,
                SheetDetent.large,
              ],
              detent: detent,
              dismissible: false,
              backgroundInteraction: SheetDetent.medium,
              header: _search('Search deliveries'),
              child: _rows(),
            ),
          ),
        );
        await settle();
        await capture('maps-$detent');
      }

      // Morph out of a toolbar button.
      final button = GlobalKey();
      var open = false;
      late StateSetter set;
      await tester.pumpWidget(
        _app(
          brightness,
          shot,
          const Size(390, 760),
          StatefulBuilder(
            builder: (context, setState) {
              set = setState;
              return Stack(
                children: [
                  Positioned(
                    left: 12,
                    right: 12,
                    bottom: 24,
                    child: Center(
                      child: GlassScope(
                        child: ToolbarGroup(
                          label: 'Map actions',
                          children: [
                            SheetSource(
                              key: button,
                              child: Button(
                                variant: ButtonVariant.text,
                                appearance: ButtonAppearance.toolbar,
                                onClick: () => setState(() => open = true),
                                children: const [
                                  LucideIcon(LucideIcons.plus, size: 18),
                                  Text('New stop'),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: Sheet(
                      open: open,
                      onOpenChange: (v) => setState(() => open = v),
                      label: 'New stop',
                      title: const Text('New stop'),
                      container: true,
                      source: button,
                      detents: const [SheetDetent.medium, SheetDetent.large],
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 16,
                        children: [
                          TextField(hint: 'Customer', defaultValue: 'Amina B.'),
                          TextField(
                            hint: 'Address',
                            defaultValue: 'Cité 2068 Logements, Bt 12',
                          ),
                          TextField(hint: 'Note for the driver'),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      );
      await settle();
      await capture('morph-closed');
      set(() => open = true);
      for (var i = 0; i < 4; i++) {
        await tester.pump();
      }
      await tester.pump(const Duration(milliseconds: 80));
      await capture('morph-early');
      await tester.pump(const Duration(milliseconds: 100));
      await capture('morph-mid');
      await settle();
      await capture('morph-open');
      set(() => open = false);
      for (var i = 0; i < 3; i++) {
        await tester.pump();
      }
      await tester.pump(const Duration(milliseconds: 150));
      await capture('morph-closing');
      await settle();

      // iPad card.
      await tester.pumpWidget(
        _app(
          brightness,
          shot,
          const Size(820, 640),
          Sheet(
            label: 'Hubs',
            container: true,
            detents: const [
              SheetDetent.peek,
              SheetDetent.medium,
              SheetDetent.large,
            ],
            defaultDetent: SheetDetent.medium,
            dismissible: false,
            modal: false,
            regular: SheetRegular.card,
            header: _search('Search hubs'),
            child: _rows(),
          ),
        ),
      );
      await settle();
      await capture('card');
    }
  }, skip: !_enabled);
}
