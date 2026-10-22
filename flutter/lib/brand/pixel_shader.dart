import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';

const _bayer = [
  0,
  32,
  8,
  40,
  2,
  34,
  10,
  42,
  48,
  16,
  56,
  24,
  50,
  18,
  58,
  26,
  12,
  44,
  4,
  36,
  14,
  46,
  6,
  38,
  60, //
  28,
  52,
  20,
  62,
  30,
  54,
  22,
  3,
  35,
  11,
  43,
  1,
  33,
  9,
  41,
  51,
  19,
  59,
  27,
  49,
  17,
  57,
  25,
  15,
  47,
  7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/// An animated, transparent pixel field painted with ordered (8×8 Bayer) dithering in the theme's
/// pixel ink: the twin of `PixelShader` in `@feeef.dev/ui/pixel-art`. A wave band drifts at up to
/// 18 fps, presses send ripples through it, and reduced motion draws one still frame. Like the
/// web canvas, it renders at CSS resolution (at most 1200px wide) and is scaled up smoothly.
class PixelShader extends StatefulWidget {
  const PixelShader({super.key, this.density = 1.2, this.speed = 0.35});

  /// Strength of the pixel band, about 0.5 to 1.35 (higher values are capped).
  final double density;

  /// Animation speed multiplier.
  final double speed;

  @override
  State<PixelShader> createState() => _PixelShaderState();
}

class _PixelShaderState extends State<PixelShader>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  double _time = 1.7;
  Duration _last = Duration.zero;
  final _ripples = <({double x, double y, double time})>[];
  final _clock = ValueNotifier<int>(0);
  Size _size = Size.zero;

  @override
  void initState() {
    super.initState();
    GestureBinding.instance.pointerRouter.addGlobalRoute(_onPointer);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still) {
      _ticker.stop();
    } else if (!_ticker.isActive) {
      _last = Duration.zero;
      _ticker.start();
    }
  }

  @override
  void dispose() {
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
    _ticker.dispose();
    _clock.dispose();
    super.dispose();
  }

  void _tick(Duration elapsed) {
    final dt = (elapsed - _last).inMicroseconds / 1e6;
    if (dt < 1 / 18) return;
    _time += math.min(dt, 0.1) * widget.speed;
    _last = elapsed;
    while (_ripples.isNotEmpty && _time - _ripples.first.time > 3) {
      _ripples.removeAt(0);
    }
    _clock.value++;
  }

  void _onPointer(PointerEvent event) {
    if (event is! PointerDownEvent || !_ticker.isActive) return;
    final box = context.findRenderObject() as RenderBox?;
    if (box == null || !box.attached || _size.isEmpty) return;
    final local = box.globalToLocal(event.position);
    final scale = math.min(1.0, 1200 / math.max(1, _size.width));
    _ripples.add((x: local.dx * scale, y: local.dy * scale, time: _time));
    if (_ripples.length > 8) _ripples.removeAt(0);
  }

  @override
  Widget build(BuildContext context) {
    final ink = ThemeProvider.of(context).colors.pixelInk;
    return LayoutBuilder(
      builder: (context, constraints) {
        _size = constraints.biggest;
        return RepaintBoundary(
          child: CustomPaint(
            size: Size.infinite,
            painter: _ShaderPainter(
              repaint: _clock,
              state: this,
              ink: ink,
              density: widget.density,
            ),
          ),
        );
      },
    );
  }
}

class _ShaderPainter extends CustomPainter {
  _ShaderPainter({
    required Listenable repaint,
    required this.state,
    required this.ink,
    required this.density,
  }) : super(repaint: repaint);
  final _PixelShaderState state;
  final Color ink;
  final double density;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final scale = math.min(1.0, 1200 / math.max(1, size.width));
    final width = math.max(1, (size.width * scale).round());
    final height = math.max(1, (size.height * scale).round());
    final recorder = ui.PictureRecorder();
    final c = Canvas(recorder);
    final paint = Paint()..isAntiAlias = false;
    final time = state._time;
    const step = 4;
    for (var y = 0; y < height; y += step) {
      for (var x = 0; x < width; x += step) {
        final u = x / width, v = y / height;
        final crest =
            0.48 +
            0.22 * math.sin(u * 7.2 + time) +
            0.11 * math.sin(u * 13.1 - time * 0.63);
        final band = math.exp(-math.pow((v - crest) / 0.22, 2));
        final fold = 0.5 + 0.5 * math.sin(u * 11 + v * 5 - time * 0.42);
        var strength = band * (0.23 + fold * 0.38) * math.min(1.35, density);
        for (final r in state._ripples) {
          final age = time - r.time;
          final dx = (x - r.x) / width, dy = (y - r.y) / height;
          final distance = math.sqrt(dx * dx + dy * dy);
          strength +=
              math.exp(-math.pow((distance - age * 0.16) / 0.045, 2)) *
              math.exp(-age * 2) *
              0.35;
        }
        final threshold =
            (_bayer[((y ~/ step) % 8) * 8 + (x ~/ step) % 8] + 0.5) / 64;
        if (strength <= threshold) continue;
        final edge = [u, v, 1 - u, 1 - v].reduce(math.min);
        paint.color = ink.withValues(alpha: ink.a * math.min(1, edge / 0.09));
        c.drawRect(Rect.fromLTWH(x.toDouble(), y.toDouble(), 3, 3), paint);
      }
    }
    final image = recorder.endRecording().toImageSync(width, height);
    // The canvas bitmap is stretched to the element, smoothly, like an unstyled <canvas>.
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      Offset.zero & size,
      Paint()..filterQuality = FilterQuality.low,
    );
    image.dispose();
  }

  @override
  bool shouldRepaint(_ShaderPainter old) =>
      old.ink != ink || old.density != density;
}
