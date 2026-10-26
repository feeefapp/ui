// Renders the selection (a segmented control in a glass toolbar and a tab view's tab bar) over a
// busy backdrop, at rest and mid-drag, in light and dark, through Impeller with the refraction
// shader:
// flutter test --enable-impeller test/dev/selection_screenshots_test.dart --dart-define=SELECTION_SHOTS=true
// → build/selection-preview/<scheme>-<rest|drag>.png
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart' hide Tab;
import 'package:feeef_ui/feeef_ui.dart' as kit show Tab;
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart' show FontLoader, ByteData;
import 'package:flutter/widgets.dart' hide Action;
import 'package:flutter_test/flutter_test.dart';

const _enabled = bool.fromEnvironment('SELECTION_SHOTS');

class _Backdrop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          colors: [
            Color(0xFFEF6C3B),
            Color(0xFFF2C14E),
            Color(0xFF3FA36B),
            Color(0xFF2F6FDF),
            Color(0xFF9B4FD1),
          ],
        ).createShader(rect),
    );
    final stripe = Paint()..color = const Color(0x8C000000);
    for (var x = 0.0; x < size.width; x += 14) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 2, size.height), stripe);
    }
    final band = Paint()..color = const Color(0x59FFFFFF);
    canvas.save();
    canvas.rotate(-25 * math.pi / 180);
    for (var x = -size.height; x < size.width * 1.5; x += 60) {
      canvas.drawRect(
        Rect.fromLTWH(x, -size.height, 18, size.height * 3),
        band,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_Backdrop old) => false;
}

class _Scene extends StatefulWidget {
  const _Scene({required this.brightness, required this.shot});
  final Brightness brightness;
  final GlobalKey shot;

  @override
  State<_Scene> createState() => _SceneState();
}

class _SceneState extends State<_Scene> {
  String _view = 'list';
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
          child: Center(
            child: RepaintBoundary(
              key: widget.shot,
              child: SizedBox(
                width: 420,
                height: 420,
                child: Stack(
                  children: [
                    Positioned.fill(child: CustomPaint(painter: _Backdrop())),
                    Positioned(
                      left: 24,
                      top: 24,
                      child: GlassScope(
                        child: ToolbarGroup(
                          label: 'View',
                          children: [
                            SegmentedControl<String>(
                              label: 'View',
                              value: _view,
                              onChange: (v) => setState(() => _view = v),
                              options: const [
                                SegmentOption(
                                  value: 'list',
                                  label: 'List',
                                  icon: LucideList(),
                                ),
                                SegmentOption(
                                  value: 'board',
                                  label: 'Board',
                                  icon: LucideColumns3(),
                                ),
                                SegmentOption(
                                  value: 'grid',
                                  label: 'Grid',
                                  icon: LucideLayoutGrid(),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 110,
                      bottom: 0,
                      child: TabView(
                        value: _tab,
                        onChange: (v) => setState(() => _tab = v),
                        minimize: TabMinimize.never,
                        tabs: [
                          for (final (id, label, icon) in const [
                            ('orders', 'Orders', LucideShoppingBag()),
                            ('inbox', 'Inbox', LucideMessageSquare()),
                            ('products', 'Products', LucidePackage()),
                            ('settings', 'Settings', LucideSettings()),
                          ])
                            kit.Tab(
                              id: id,
                              label: label,
                              icon: icon,
                              content: CustomPaint(
                                painter: _Backdrop(),
                                child: const SizedBox.expand(),
                              ),
                            ),
                        ],
                      ),
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
        File('fonts/IBMPlexSansArabic-$weight.ttf')
            .readAsBytes()
            .then(ByteData.sublistView),
      );
    }
    await loader.load();
  });

  testWidgets('selection renders', (tester) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    tester.view.physicalSize = const Size(840, 840);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final out = Directory('build/selection-preview')
      ..createSync(recursive: true);
    for (final brightness in Brightness.values) {
      final scheme = brightness == Brightness.dark ? 'dark' : 'light';
      final shot = GlobalKey();
      await tester.pumpWidget(_Scene(brightness: brightness, shot: shot));
      for (var i = 0; i < 25; i++) {
        await tester.pump(const Duration(milliseconds: 20));
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

      await capture('rest');
      // Press the selected segment and the selected tab, and drag both halfway to the next option.
      final segment = tester.getCenter(find.text('List').first);
      final tab = tester.getCenter(find.text('Orders').first);
      final a = await tester.startGesture(segment, pointer: 1);
      final b = await tester.startGesture(tab, pointer: 2);
      for (var i = 1; i <= 12; i++) {
        await a.moveTo(segment + Offset(40.0 * i / 12, 0));
        await b.moveTo(tab + Offset(48.0 * i / 12, 0));
        await tester.pump(const Duration(milliseconds: 25));
      }
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 20));
      }
      await capture('drag');
      await a.up();
      await b.up();
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 20));
      }
    }
  }, skip: !_enabled || !GlassRefraction.supported);
}
