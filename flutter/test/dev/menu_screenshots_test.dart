// Renders the menu over a busy backdrop (closed, being born, mid-morph, open, flying back) in light
// and dark, through Impeller with the refraction shader:
// flutter test --enable-impeller test/dev/menu_screenshots_test.dart --dart-define=MENU_SHOTS=true
// → build/menu-preview/<label>-<scheme>-<trigger>-<phase>.png (MENU_LABEL, default "new").
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart' show FontLoader, ByteData;
import 'package:flutter/widgets.dart' hide Action;
import 'package:flutter_test/flutter_test.dart';

const _enabled = bool.fromEnvironment('MENU_SHOTS');
const _label = String.fromEnvironment('MENU_LABEL', defaultValue: 'new');

class _Backdrop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = SweepGradient(
          center: const Alignment(-0.4, -0.2),
          colors: const [
            Color(0xFFEF6C3B),
            Color(0xFFF2C14E),
            Color(0xFF3FA36B),
            Color(0xFF2F6FDF),
            Color(0xFF9B4FD1),
            Color(0xFFEF6C3B),
          ],
        ).createShader(rect),
    );
    final stripe = Paint()..color = const Color(0x59FFFFFF);
    canvas.save();
    canvas.rotate(-25 * math.pi / 180);
    for (var x = -size.height; x < size.width * 1.5; x += 26) {
      canvas.drawRect(
        Rect.fromLTWH(x, -size.height, 10, size.height * 3),
        stripe,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_Backdrop old) => false;
}

List<Action> _actions() => [
  CommandAction(
    id: 'copy',
    label: 'Copy tracking number',
    icon: const LucideCopy(),
    onAction: () {},
  ),
  CommandAction(
    id: 'print',
    label: 'Print shipping label',
    icon: const LucidePrinter(),
    onAction: () {},
  ),
  CommandAction(
    id: 'cancel',
    label: 'Cancel order',
    icon: const LucideTrash2(),
    destructive: true,
    onAction: () {},
  ),
];

Widget _scene(Brightness brightness, GlobalKey shot) => WidgetsApp(
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
            child: SizedBox(
              width: 560,
              height: 420,
              child: FloatingBoundary(
                child: Stack(
                  children: [
                    Positioned.fill(child: CustomPaint(painter: _Backdrop())),
                    const Positioned(
                      left: 16,
                      right: 16,
                      top: 70,
                      child: Text(
                        'Order #10482 · Yalidine · Confirmed · 4 200 DA · Oran → Alger',
                        style: TextStyle(
                          fontSize: 28,
                          height: 1.1,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF10130F),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 16,
                      right: 16,
                      child: GlassScope(
                        child: ToolbarGroup(
                          label: 'Order',
                          children: [
                            ActionsMenuAnchor(
                              label: 'Order actions',
                              actions: _actions(),
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
                    Positioned(
                      left: 140,
                      top: 190,
                      child: ActionsMenuAnchor(
                        label: 'Sort',
                        actions: _actions(),
                        builder: (open) => Button(
                          variant: ButtonVariant.tonal,
                          onClick: open ?? () {},
                          children: const [LucideArrowDownUp(), Text('Sort')],
                        ),
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

  testWidgets('menu renders', (tester) async {
    await tester.runAsync(() async {
      GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset(
        'shaders/glass_refraction.frag',
      );
    });
    tester.view.physicalSize = const Size(1120, 840);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final out = Directory('build/menu-preview')..createSync(recursive: true);
    for (final brightness in Brightness.values) {
      final scheme = brightness == Brightness.dark ? 'dark' : 'light';
      final shot = GlobalKey();
      await tester.pumpWidget(_scene(brightness, shot));
      await tester.pump(const Duration(milliseconds: 400));
      Future<void> capture(String name) async {
        await tester.runAsync(() async {
          final boundary =
              shot.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          // The glass notifies after the frame it painted: read the boundary's last painted layer.
          final layer = boundary.debugLayer! as OffsetLayer;
          final image = await layer.toImage(
            Offset.zero & boundary.size,
            pixelRatio: 2,
          );
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          File('${out.path}/$_label-$scheme-$name.png')
              .writeAsBytesSync(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }

      Future<void> frames(int ms) async {
        for (var t = 0; t < ms; t += 16) {
          await tester.pump(const Duration(milliseconds: 16));
        }
      }

      await capture('closed');
      for (final (trigger, tag) in [
        (find.bySemanticsLabel('Order actions'), 'toolbar'),
        (find.text('Sort'), 'plain'),
      ]) {
        await tester.tap(trigger.first);
        await tester.pump();
        await frames(32);
        await capture('$tag-early');
        await frames(48);
        await capture('$tag-mid');
        for (var i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        await capture('$tag-open');
        await tester.tapAt(
          tester.getTopLeft(find.byKey(shot)) + const Offset(8, 410),
        );
        await tester.pump();
        await frames(112);
        await capture('$tag-closing');
        for (var i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
      }
    }
  }, skip: !_enabled || !GlassRefraction.supported);
}
