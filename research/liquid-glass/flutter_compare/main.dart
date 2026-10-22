// The Flutter kit's glass over the LGLab backgrounds on the iOS simulator (Impeller), laid out
// like the iOS reference scenes (../app/layouts.json). The scene is read from `scene.txt` in the
// app's temporary directory (`bg=photo&theme=light&renderer=canvas`), polled like LGLab; the app
// writes `shown.txt` once it has drawn it. tools/flutter_ios_compare.sh builds and drives it.
import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

import 'layouts.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const CompareApp());
}

Uint8List backgroundPixels(String kind, int width, int height) {
  final data = Uint8List(width * height * 4);
  void put(int x, int y, int r, int g, int b) {
    final i = (y * width + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }

  if (kind == 'photo') {
    const blobs = [
      (0.2, 0.15, 0.25, (0.95, 0.45, 0.2)),
      (0.8, 0.25, 0.3, (0.15, 0.55, 0.95)),
      (0.35, 0.55, 0.3, (0.2, 0.8, 0.45)),
      (0.75, 0.7, 0.28, (0.9, 0.2, 0.55)),
      (0.25, 0.88, 0.25, (0.98, 0.85, 0.25)),
      (0.6, 0.45, 0.18, (0.1, 0.1, 0.25)),
    ];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        final u = x / width, v = y / height;
        var r = 0.55 + 0.25 * v, g = 0.65 + 0.15 * v, b = 0.85 - 0.2 * v;
        for (final (cx, cy, s, c) in blobs) {
          final d2 = ((u - cx) * (u - cx) * 0.25 + (v - cy) * (v - cy) * 0.25 * 4.6) / (s * s * 0.25);
          final w = math.exp(-d2 * 2.2);
          r = r * (1 - w) + c.$1 * w;
          g = g * (1 - w) + c.$2 * w;
          b = b * (1 - w) + c.$3 * w;
        }
        put(x, y, math.min(255.0, r * 255).truncate(), math.min(255.0, g * 255).truncate(), math.min(255.0, b * 255).truncate());
      }
    }
  } else if (kind.startsWith('stripes')) {
    final cell = int.tryParse(kind.substring(7)) ?? 6;
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        final on = ((x ~/ cell) % 2 == 0) != ((y ~/ (cell * 8)) % 2 == 0);
        final v = on ? 30 : 225;
        put(x, y, v, v, v);
      }
    }
  } else {
    final value = int.parse(kind.startsWith('flat-') ? kind.substring(5) : '808080', radix: 16);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        put(x, y, (value >> 16) & 255, (value >> 8) & 255, value & 255);
      }
    }
  }
  return data;
}

class CompareApp extends StatefulWidget {
  const CompareApp({super.key});
  @override
  State<CompareApp> createState() => _CompareAppState();
}

class _CompareAppState extends State<CompareApp> {
  Map<String, String> _scene = const {'bg': 'flat-808080'};
  String _last = '';
  ui.Image? _image;
  Timer? _timer;

  File get _sceneFile => File('${Directory.systemTemp.path}/scene.txt');
  File get _shownFile => File('${Directory.systemTemp.path}/shown.txt');

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 100), (_) => _poll());
    _load();
  }

  void _poll() {
    if (!_sceneFile.existsSync()) return;
    final text = _sceneFile.readAsStringSync().trim();
    if (text == _last) return;
    _last = text;
    _scene = Uri.splitQueryString(text);
    _load();
  }

  void _load() {
    final pixels = backgroundPixels(_scene['bg'] ?? 'flat-808080', 1206, 2622);
    ui.decodeImageFromPixels(pixels, 1206, 2622, ui.PixelFormat.rgba8888, (image) {
      if (!mounted) return;
      setState(() => _image = image);
      final shown = _last;
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (shown == _last) _shownFile.writeAsStringSync(shown);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = _scene['theme'] == 'dark';
    final renderer = GlassRenderer.values.byName(_scene['renderer'] ?? 'canvas');
    return WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => ThemeProvider(
        brightness: dark ? Brightness.dark : Brightness.light,
        config: ThemeConfig(palette: Palette.mono, glassRenderer: renderer),
        child: Stack(
          children: [
            if (_image != null)
              Positioned(
                left: 0,
                top: 0,
                width: 402,
                height: 874,
                child: RawImage(image: _image, fit: BoxFit.fill, filterQuality: FilterQuality.none),
              ),
            Positioned(
              left: 0,
              top: 0,
              width: 402,
              height: 874,
              child: GlassContainer(
                light: GlassLightMode.static,
                interactive: false,
                adaptive: false,
                child: Stack(
                  children: [
                    for (final s in shapesA)
                      Positioned(
                        left: s.x,
                        top: s.y,
                        width: s.w,
                        height: s.h,
                        child: GlassGroup(
                          radius: s.kind == 'rect' ? s.r : math.min(s.w, s.h) / 2,
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
    );
  }
}
