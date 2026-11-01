import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../ambient_loop.dart';
import '../devtools/devtools.dart';
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
/// 15 fps, presses send ripples through it, and reduced motion draws one still frame. Like the
/// web canvas, it lays its cells out at CSS resolution (at most 1200px wide) and scales them up.
///
/// It only asks for a frame when a step is due (15 a second on the kit's shared ambient beat,
/// not every display frame) and paints in its own layer, so the page around it never repaints. The field is computed per pixel by a
/// fragment shader (`shaders/pixel_field.frag`); until that has loaded, the same cells are drawn
/// on the CPU in a few batched calls.
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('density', density, defaultValue: 1.2))
      ..add(DoubleProperty('speed', speed, defaultValue: 0.35))
      ..add(DoubleProperty('opacity', opacity, defaultValue: 1));
  }

  @override
  State<PixelShader> createState() => _PixelShaderState();
}

class _PixelShaderState extends State<PixelShader>
    with SingleTickerProviderStateMixin {
  /// The field steps 15 times a second on the kit's ambient beat (shared with every other
  /// ambient loop on the web), like the web canvas's frame limiter.
  late final _loop = AmbientLoop(
    vsync: this,
    period: const Duration(hours: 1),
    maxFps: 15,
  )..addListener(_tick);
  Duration _last = Duration.zero;
  double _time = 1.7;
  final _ripples = <({double x, double y, double time})>[];
  Size _size = Size.zero;

  /// The GPU field once its program has loaded; until then (and where it can't load) the cells
  /// are drawn on the CPU.
  ui.FragmentShader? _shader;

  static Future<ui.FragmentProgram>? _program;

  @override
  void initState() {
    super.initState();
    GestureBinding.instance.pointerRouter.addGlobalRoute(_onPointer);
    (_program ??= ui.FragmentProgram.fromAsset(
          'packages/feeef_ui/shaders/pixel_field.frag',
        ))
        .then((program) {
          if (mounted) setState(() => _shader = program.fragmentShader());
        })
        .catchError((Object error, StackTrace stack) {
          kitLog(
            'pixel_field',
            'Pixel field shader failed to load; drawing cells on the CPU',
            level: 900,
            error: error,
            stackTrace: stack,
          );
        });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Still under reduced motion, on devices that keep ambient motion still, and where tickers
    // are muted (an offstage route or tab).
    _loop.run(AmbientLoop.allowed(context));
  }

  @override
  void dispose() {
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
    _loop.dispose();
    _shader?.dispose();
    super.dispose();
  }

  void _tick() {
    final now = _loop.elapsed;
    final dt = (now - _last).inMicroseconds / 1e6;
    _last = now;
    _time += math.min(dt, 0.1) * widget.speed;
    while (_ripples.isNotEmpty && _time - _ripples.first.time > 3) {
      _ripples.removeAt(0);
    }
  }

  void _onPointer(PointerEvent event) {
    if (event is! PointerDownEvent || !_loop.running) return;
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
              repaint: _loop,
              state: this,
              ink: ink.withValues(
                alpha: ink.a * widget.opacity.clamp(0.0, 1.0),
              ),
              density: widget.density,
              shader: _shader,
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
    required this.shader,
  }) : super(repaint: repaint);
  final _PixelShaderState state;
  final Color ink;
  final double density;
  final ui.FragmentShader? shader;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty || ink.a <= 0) return;
    final scale = math.min(1.0, 1200 / math.max(1, size.width));
    final width = math.max(1, (size.width * scale).round());
    final height = math.max(1, (size.height * scale).round());
    final time = state._time;
    final gpu = shader;
    if (gpu != null) {
      // The same field computed per pixel on the GPU (shaders/pixel_field.frag).
      var i = 0;
      void set(double value) => gpu.setFloat(i++, value);
      set(size.width);
      set(size.height);
      set(width.toDouble());
      set(height.toDouble());
      set(time);
      set(math.min(1.35, density));
      set(ink.r);
      set(ink.g);
      set(ink.b);
      set(ink.a);
      final ripples = state._ripples;
      set(ripples.length.toDouble());
      for (var r = 0; r < 8; r++) {
        final ripple = r < ripples.length ? ripples[r] : null;
        set(ripple?.x ?? 0);
        set(ripple?.y ?? 0);
        set(ripple?.time ?? 0);
        set(0);
      }
      canvas.drawRect(Offset.zero & size, Paint()..shader = gpu);
      return;
    }
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
      old.ink != ink || old.density != density || old.shader != shader;
}
