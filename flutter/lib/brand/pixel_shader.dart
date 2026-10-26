import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
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
/// web canvas, it lays its cells out at CSS resolution (at most 1200px wide) and scales them up.
///
/// It only asks for a frame when a step is due (18 a second, not every display frame), and draws
/// its cells straight into its own layer in a few batched calls: the field never makes the page
/// around it repaint, and on the web it never reads pixels back from the GPU.
class PixelShader extends StatefulWidget {
  const PixelShader({
    super.key,
    this.density = 1.2,
    this.speed = 0.35,
    this.opacity = 1,
  });

  /// Strength of the pixel band, about 0.5 to 1.35 (higher values are capped).
  final double density;

  /// Animation speed multiplier.
  final double speed;

  /// The field's opacity, 0 to 1. Cells never overlap, so this is folded into their colour:
  /// the same look as wrapping the field in [Opacity], without a full-size offscreen layer.
  final double opacity;

  @override
  State<PixelShader> createState() => _PixelShaderState();
}

/// One animation step every 1/18 s, like the web canvas's frame limiter.
const _step = Duration(microseconds: 1000000 ~/ 18);

class _PixelShaderState extends State<PixelShader> {
  Timer? _timer;
  final _watch = Stopwatch();
  double _time = 1.7;
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
    // Still under reduced motion, and paused where tickers are (an offstage route or tab).
    final run =
        !reducedMotionOf(context) && TickerMode.valuesOf(context).enabled;
    if (!run) {
      _timer?.cancel();
      _timer = null;
      _watch.stop();
    } else if (_timer == null) {
      _watch
        ..reset()
        ..start();
      _timer = Timer.periodic(_step, (_) => _tick());
    }
  }

  @override
  void dispose() {
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
    _timer?.cancel();
    _clock.dispose();
    super.dispose();
  }

  void _tick() {
    final dt = _watch.elapsedMicroseconds / 1e6;
    _watch
      ..reset()
      ..start();
    _time += math.min(dt, 0.1) * widget.speed;
    while (_ripples.isNotEmpty && _time - _ripples.first.time > 3) {
      _ripples.removeAt(0);
    }
    _clock.value++;
  }

  void _onPointer(PointerEvent event) {
    if (event is! PointerDownEvent || _timer == null) return;
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
              ink: ink.withValues(
                alpha: ink.a * widget.opacity.clamp(0.0, 1.0),
              ),
              density: widget.density,
            ),
          ),
        );
      },
    );
  }
}

/// Cells near the field's edge fade in over 9% of it; their alpha is kept to this many steps so
/// every step is one draw call.
const _alphaSteps = 16;

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
    if (size.isEmpty || ink.a <= 0) return;
    final scale = math.min(1.0, 1200 / math.max(1, size.width));
    final width = math.max(1, (size.width * scale).round());
    final height = math.max(1, (size.height * scale).round());
    final time = state._time;
    const step = 4;
    final columns = (width + step - 1) ~/ step;
    // The wave's crest only depends on the column.
    final crests = Float64List(columns);
    for (var i = 0; i < columns; i++) {
      final u = i * step / width;
      crests[i] =
          0.48 +
          0.22 * math.sin(u * 7.2 + time) +
          0.11 * math.sin(u * 13.1 - time * 0.63);
    }
    final strength = math.min(1.35, density);
    // Cell centres per alpha step, as (x, y) pairs.
    final points = List.generate(_alphaSteps + 1, (_) => <double>[]);
    final ripples = state._ripples;
    for (var y = 0; y < height; y += step) {
      final v = y / height;
      final row = ((y ~/ step) % 8) * 8;
      for (var i = 0; i < columns; i++) {
        final x = i * step;
        final u = x / width;
        final d = (v - crests[i]) / 0.22;
        final band = math.exp(-d * d);
        final fold = 0.5 + 0.5 * math.sin(u * 11 + v * 5 - time * 0.42);
        var s = band * (0.23 + fold * 0.38) * strength;
        for (final r in ripples) {
          final age = time - r.time;
          final dx = (x - r.x) / width, dy = (y - r.y) / height;
          final w = (math.sqrt(dx * dx + dy * dy) - age * 0.16) / 0.045;
          s += math.exp(-w * w) * math.exp(-age * 2) * 0.35;
        }
        final threshold = (_bayer[row + i % 8] + 0.5) / 64;
        if (s <= threshold) continue;
        final edge = math.min(math.min(u, v), math.min(1 - u, 1 - v));
        final level = (math.min(1.0, edge / 0.09) * _alphaSteps).round();
        if (level == 0) continue;
        points[level]
          ..add(x + 1.5)
          ..add(y + 1.5);
      }
    }
    canvas.save();
    // The cells sit on the CSS-resolution grid, scaled up to the element like the web canvas.
    if (scale != 1) canvas.scale(1 / scale);
    final paint = Paint()
      ..isAntiAlias = false
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.square;
    for (var level = 1; level <= _alphaSteps; level++) {
      final list = points[level];
      if (list.isEmpty) continue;
      paint.color = ink.withValues(alpha: ink.a * level / _alphaSteps);
      canvas.drawRawPoints(
        ui.PointMode.points,
        Float32List.fromList(list),
        paint,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ShaderPainter old) =>
      old.ink != ink || old.density != density;
}
