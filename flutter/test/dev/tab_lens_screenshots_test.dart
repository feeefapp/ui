// The pressed tab of a phone tab bar (the lens over the selected tab, its count badge on the icon)
// at rest, held and dragged, in light and dark, through Impeller with the refraction shader, over a
// page of rows and over stripes (which show the bend):
// flutter test --enable-impeller test/dev/tab_lens_screenshots_test.dart --dart-define=TAB_LENS_SHOTS=true
// → build/tab-lens-preview/<scheme>-<backdrop>-<rest|held|drag>.png (3x, the phone's bottom 300 px)
import 'dart:io';
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart' hide Tab;
import 'package:feeef_ui/feeef_ui.dart' as kit show Tab;
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart' show ByteData, FontLoader;
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const _enabled = bool.fromEnvironment('TAB_LENS_SHOTS');

/// 1 px lines every 6 px over a flat colour (the research app's lens backdrop).
class _Stripes extends CustomPainter {
  _Stripes(this.ground, this.ink);
  final Color ground, ink;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = ground);
    final line = Paint()..color = ink;
    for (var x = 0.0; x < size.width; x += 6) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 1, size.height), line);
    }
  }

  @override
  bool shouldRepaint(_Stripes old) => old.ground != ground || old.ink != ink;
}

class _Page extends StatelessWidget {
  const _Page({required this.stripes});
  final bool stripes;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    if (stripes) {
      return CustomPaint(
        painter: dark
            ? _Stripes(const Color(0xFF1D2A21), const Color(0xFF4B6A55))
            : _Stripes(const Color(0xFFDFE8DF), const Color(0xFF8AA58F)),
        child: const SizedBox.expand(),
      );
    }
    return ColoredBox(
      color: c.surface,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          for (final name in const [
            'Amina Benali',
            'Yacine Haddad',
            'Sara Meziane',
            'Karim Saidi',
            'Lina Cherif',
            'Omar Belkacem',
            'Nadia Ferhat',
            'Rachid Amrani',
            'Selma Bouzid',
          ])
            Container(
              height: 52,
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: AlignmentDirectional.centerStart,
              decoration: BoxDecoration(
                color: c.ground,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(name, style: TextStyle(color: c.ink, fontSize: 15)),
            ),
        ],
      ),
    );
  }
}

class _Scene extends StatefulWidget {
  const _Scene({
    required this.brightness,
    required this.stripes,
    required this.shot,
  });
  final Brightness brightness;
  final bool stripes;
  final GlobalKey shot;

  @override
  State<_Scene> createState() => _SceneState();
}

class _SceneState extends State<_Scene> {
  String _tab = 'orders';

  @override
  Widget build(BuildContext context) => WidgetsApp(
    color: const Color(0xFF000000),
    builder: (context, _) => Directionality(
      textDirection: TextDirection.ltr,
      child: ThemeProvider(
        config: ThemeConfig.defaults,
        brightness: widget.brightness,
        child: DefaultTextStyle(
          style: const TextStyle(fontFamily: 'IBM Plex Sans Arabic'),
          child: Align(
            alignment: Alignment.topLeft,
            child: RepaintBoundary(
              key: widget.shot,
              child: SizedBox(
                width: 390,
                height: 300,
                child: TabView(
                  value: _tab,
                  onChange: (v) => setState(() => _tab = v),
                  minimize: TabMinimize.never,
                  tabs: [
                    for (final (id, label, icon, badge) in const [
                      ('orders', 'Orders', LucideShoppingBag(), '5'),
                      ('inbox', 'Inbox', LucideMessageSquare(), '3'),
                      ('products', 'Products', LucidePackage(), null),
                      ('settings', 'Settings', LucideSettings(), null),
                    ])
                      kit.Tab(
                        id: id,
                        label: label,
                        icon: icon,
                        badge: badge,
                        content: _Page(stripes: widget.stripes),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() async {
    final loader = FontLoader('IBM Plex Sans Arabic');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        File(
          'fonts/IBMPlexSansArabic-$weight.ttf',
        ).readAsBytes().then(ByteData.sublistView),
      );
    }
    await loader.load();
  });

  testWidgets('tab lens renders', (tester) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    tester.view.physicalSize = const Size(1170, 900);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final out = Directory('build/tab-lens-preview')
      ..createSync(recursive: true);
    for (final brightness in Brightness.values) {
      for (final stripes in [false, true]) {
        final scheme = brightness == Brightness.dark ? 'dark' : 'light';
        final backdrop = stripes ? 'stripes' : 'page';
        final shot = GlobalKey();
        await tester.pumpWidget(
          _Scene(brightness: brightness, stripes: stripes, shot: shot),
        );
        for (var i = 0; i < 25; i++) {
          await tester.pump(const Duration(milliseconds: 20));
        }
        Future<void> capture(String name) async {
          await tester.runAsync(() async {
            final boundary =
                shot.currentContext!.findRenderObject()!
                    as RenderRepaintBoundary;
            final layer = boundary.debugLayer! as OffsetLayer;
            // The whole scene: a cropped capture renders offscreen from the crop's corner, where
            // the refraction shader's window origin no longer lines up.
            final image = await layer.toImage(
              Offset.zero & boundary.size,
              pixelRatio: 3,
            );
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            File(
              '${out.path}/$scheme-$backdrop-$name.png',
            ).writeAsBytesSync(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await capture('rest');
        final tab = tester.getCenter(find.text('Orders').first);
        final press = await tester.startGesture(tab + const Offset(0, -8));
        for (var i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 20));
        }
        await capture('held');
        for (var i = 1; i <= 12; i++) {
          await press.moveTo(tab + Offset(44.0 * i / 12, -8));
          await tester.pump(const Duration(milliseconds: 25));
        }
        for (var i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 20));
        }
        await capture('drag');
        await press.up();
        for (var i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 20));
        }
      }
    }
  }, skip: !_enabled || !GlassRefraction.supported);
}
