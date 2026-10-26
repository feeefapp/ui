// The Flutter kit's glass over the iOS 27 Figma reference layouts (../compare/figma27.ts, same
// shapes and backdrops), for Flutter web in headless Chrome: `?layout=figma-sheet|figma-sizes
// &theme=light|dark&renderer=regular|clear`. Sets the document title to `ready` once drawn.
// tools/figma27_flutter.sh builds it; tools/figma27_kit.mjs captures it.
import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

void main() => runApp(const FigmaCompareApp());

class FigmaShape {
  const FigmaShape(this.x, this.y, this.w, this.h, this.r);
  final double x, y, w, h, r;
}

const _sheetBg = [255, 235, 128, 26, 0];

({double width, double height, List<FigmaShape> shapes}) figmaLayout(
  String name,
) {
  if (name == 'figma-sizes') {
    return (
      width: 1400,
      height: 660,
      shapes: [
        for (var row = 0; row < 2; row++)
          for (var col = 0; col < 4; col++) ...[
            FigmaShape(col * 350 + 90, row * 330 + 20, 160, 44, 22),
            FigmaShape(col * 350 + 20, row * 330 + 100, 300, 200, 100),
          ],
      ],
    );
  }
  return (
    width: 640,
    height: 510,
    shapes: [
      for (var row = 0; row < 4; row++)
        for (var col = 0; col < 5; col++)
          FigmaShape(
            col * 130 + 60 - (row == 3 ? 33 : 24),
            row * 130 + 60 - (row == 3 ? 33 : 24),
            row == 3 ? 66 : 48,
            row == 3 ? 66 : 48,
            row == 3 ? 33 : 24,
          ),
    ],
  );
}

class _Backdrop extends CustomPainter {
  _Backdrop(this.name);
  final String name;

  Color _grey(int v) => Color.fromARGB(255, v, v, v);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = _grey(128));
    if (name == 'figma-sizes') {
      const bgs = [0xFFFFFFFF, 0xFFEBEBEB, 0, 0xFF1A1A1A];
      for (var row = 0; row < 2; row++) {
        for (var col = 0; col < 4; col++) {
          final tile = Rect.fromLTWH(col * 350, row * 330, 340, 320);
          final paint = Paint();
          if (bgs[col] == 0) {
            paint.shader = const LinearGradient(
              colors: [Color(0xFFC0D2F3), Color(0xFFFADBB3)],
            ).createShader(tile);
          } else {
            paint.color = Color(bgs[col]);
          }
          canvas.drawRect(tile, paint);
          final ink = Paint()..color = _grey(bgs[col] == 0xFF1A1A1A ? 255 : 0);
          canvas.drawRect(Rect.fromLTWH(tile.left, tile.top + 40, 340, 4), ink);
          canvas.drawRect(Rect.fromLTWH(tile.left, tile.top + 198, 340, 4), ink);
        }
      }
      return;
    }
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 5; col++) {
        final v = _sheetBg[col];
        final tile = Rect.fromLTWH(col * 130, row * 130, 120, 120);
        canvas.drawRect(tile, Paint()..color = _grey(v));
        canvas.drawRect(
          Rect.fromLTWH(tile.left, tile.top + 57, 120, 6),
          Paint()..color = _grey(v >= 200 ? 0 : 255),
        );
      }
    }
  }

  @override
  bool shouldRepaint(_Backdrop old) => old.name != name;
}

class FigmaCompareApp extends StatefulWidget {
  const FigmaCompareApp({super.key});
  @override
  State<FigmaCompareApp> createState() => _FigmaCompareAppState();
}

class _FigmaCompareAppState extends State<FigmaCompareApp> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1500), () {
      SystemChrome.setApplicationSwitcherDescription(
        const ApplicationSwitcherDescription(label: 'ready'),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final q = Uri.base.queryParameters;
    final name = q['layout'] ?? 'figma-sheet';
    final layout = figmaLayout(name);
    final dark = q['theme'] == 'dark';
    final clear = q['renderer'] == 'clear';
    final config = clear
        ? const ThemeConfig(
            palette: Palette.mono,
            glassTint: 0,
            glassBlur: false,
            // Settled glass only: no materialize spring still running at capture time.
            motion: Motion.none,
          )
        : const ThemeConfig(
            palette: Palette.mono,
            glassTint: 1,
            glassBlur: true,
            motion: Motion.none,
          );
    return WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => ThemeProvider(
        brightness: dark ? Brightness.dark : Brightness.light,
        config: config,
        child: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: layout.width,
            height: layout.height,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(painter: _Backdrop(name)),
                ),
                Positioned.fill(
                  child: GlassContainer(
                    light: GlassLightMode.static,
                    interactive: false,
                    adaptive: false,
                    child: Stack(
                      children: [
                        for (final s in layout.shapes)
                          Positioned(
                            left: s.x,
                            top: s.y,
                            width: s.w,
                            height: s.h,
                            child: GlassGroup(
                              radius: s.r,
                              child: const SizedBox.expand(),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
