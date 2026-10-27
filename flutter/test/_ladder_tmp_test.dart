import 'dart:io';
import 'dart:ui' as ui;
import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/glass/refraction_filter.dart';
import 'package:flutter/rendering.dart' show RenderRepaintBoundary;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';
import '../../docs/content/components/model-ladder/examples/01-chip.dart' as chip;
import '../../docs/content/components/model-ladder/examples/03-card-with-catalog.dart' as card;

const _fonts = '../../marchant/assets/fonts/ibm_plex_sans_arabic';
final _out = Platform.environment['OUT']!;

void main() {
  setUpAll(() async {
    final loader = FontLoader('packages/feeef_ui/IBM Plex Sans Arabic');
    for (final w in ['Regular', 'Medium', 'SemiBold']) {
      loader.addFont(Future.value(ByteData.sublistView(File('$_fonts/IBMPlexSansArabic-$w.ttf').readAsBytesSync())));
    }
    await loader.load();
  });
  for (final dark in [false, true]) {
    for (final which in ['chip', 'card']) {
      testWidgets('$which ${dark ? 'dark' : 'light'}', (tester) async {
        await tester.runAsync(() async { GlassRefraction.debugProgram = await ui.FragmentProgram.fromAsset('shaders/glass_refraction.frag'); });
        tester.view.physicalSize = const Size(520 * 2, 640 * 2);
        tester.view.devicePixelRatio = 2;
        final key = GlobalKey();
        await tester.pumpWidget(WidgetsApp(color: const Color(0xFF000000), builder: (c, _) => Directionality(textDirection: TextDirection.ltr,
          child: ThemeProvider(brightness: dark ? Brightness.dark : Brightness.light, child: DefaultTextStyle(
            style: const TextStyle(fontFamily: 'packages/feeef_ui/IBM Plex Sans Arabic'),
            child: RepaintBoundary(key: key, child: Builder(builder: (context) => ColoredBox(
              color: ThemeProvider.of(context).colors.ground,
              child: Overlay(initialEntries: [OverlayEntry(builder: (_) => Align(alignment: const Alignment(0, -0.7),
                child: which == 'chip' ? const chip.Chip() : const SizedBox(width: 340, child: card.CardWithCatalog())))]),
            ))))))));
        await tester.pumpAndSettle();
        if (which == 'chip') {
          await tester.tap(find.byType(ModelLadder).first);
          await tester.pumpAndSettle();
        }
        // ignore: avoid_print
        print('EXC ${tester.takeException()}');
        await tester.runAsync(() async {
          final b = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          final img = await b.toImage(pixelRatio: 2);
          final d = await img.toByteData(format: ui.ImageByteFormat.png);
          File('$_out/$which-${dark ? 'dark' : 'light'}.png').writeAsBytesSync(d!.buffer.asUint8List());
        });
      });
    }
  }
}
