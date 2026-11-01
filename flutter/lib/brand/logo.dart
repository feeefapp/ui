import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:path_parsing/path_parsing.dart';

import '../theme.dart';

/// Brand ink of the wordmark's first stroke (`--lab-brand-1`): Feeef green on the `lab` palette,
/// the ink on `mono`.
Color brandColor1(ThemeData theme) => theme.config.palette == Palette.mono
    ? theme.colors.ink
    : const Color(0xFF72CE5D);

/// Brand ink of the wordmark's second stroke (`--lab-brand-2`).
Color brandColor2(ThemeData theme) => theme.config.palette == Palette.mono
    ? theme.colors.ink
    : const Color(0xFF86E672);

/// Which ink a wordmark stroke takes.
enum LogoInk { brand1, brand2, current }

/// One stroke of the static wordmark: SVG path data, ink and dash length (`stroke-dasharray`).
typedef LogoStroke = ({String d, LogoInk ink, double dash});

/// View box of the static wordmark (`0 0 1018.97 242.96`).
const logoViewBox = Size(1018.97, 242.96);

/// Stroke width of every wordmark stroke, in view box units.
const logoStrokeWidth = 43.0;

/// The seven strokes of `brand/logo.tsx`, in drawing order: the green F, three Es and the last F.
const List<LogoStroke> logoStrokes = [
  (
    d: 'M128.91,21.51h-33.3c-17.02,0-32.7,5.74-45.21,15.39-17.57,13.55-28.9,34.82-28.9,58.72v19.31h0v106.53h0',
    ink: LogoInk.brand1,
    dash: 279.06,
  ),
  (
    d: 'M21.5,221.46h0c0-10.73,2.28-20.93,6.39-30.14,4.78-10.72,12.03-20.1,21.03-27.41,12.74-10.35,28.99-16.55,46.69-16.55h33.3',
    ink: LogoInk.brand2,
    dash: 429.14,
  ),
  (
    d: 'M255.33,147.34h43.34c34.75,0,62.92-28.17,62.92-62.92h0c0-34.75-28.17-62.92-62.92-62.92h-36.65c-40.93,0-74.11,33.18-74.11,74.11v51.73h0c0,40.93,33.18,74.11,74.11,74.11h33.3',
    ink: LogoInk.current,
    dash: 595,
  ),
  (
    d: 'M487.95,147.34h43.34c34.75,0,62.92-28.17,62.92-62.92h0c0-34.75-28.17-62.92-62.92-62.92h-36.65c-40.93,0-74.11,33.18-74.11,74.11v51.73h0c0,40.93,33.18,74.11,74.11,74.11h33.3',
    ink: LogoInk.current,
    dash: 595,
  ),
  (
    d: 'M720.28,147.34h43.34c34.75,0,62.92-28.17,62.92-62.92h0c0-34.75-28.17-62.92-62.92-62.92h-36.65c-40.93,0-74.11,33.18-74.11,74.11v51.73h0c0,40.93,33.18,74.11,74.11,74.11h33.3',
    ink: LogoInk.current,
    dash: 595,
  ),
  (
    d: 'M997.47,21.51h-33.3c-17.02,0-32.7,5.74-45.21,15.39-17.57,13.55-28.9,34.82-28.9,58.72v19.31h0v106.53h0',
    ink: LogoInk.current,
    dash: 279.06,
  ),
  (
    d: 'M890.06,221.46h0c0-10.73,2.28-20.93,6.39-30.14,4.78-10.72,12.03-20.1,21.03-27.41,12.74-10.35,28.99-16.55,46.69-16.55h33.3',
    ink: LogoInk.current,
    dash: 429.14,
  ),
];

/// SVG path data as a Flutter [Path].
Path svgPath(String d) {
  final path = Path();
  writeSvgPathDataToPath(d, _PathProxy(path));
  return path;
}

class _PathProxy extends PathProxy {
  _PathProxy(this.path);
  final Path path;
  @override
  void close() => path.close();
  @override
  void cubicTo(
    double x1,
    double y1,
    double x2,
    double y2,
    double x3,
    double y3,
  ) => path.cubicTo(x1, y1, x2, y2, x3, y3);
  @override
  void lineTo(double x, double y) => path.lineTo(x, y);
  @override
  void moveTo(double x, double y) => path.moveTo(x, y);
}

/// The dashes of [path] for an SVG `stroke-dasharray: dash` (dash and gap both [dash] long),
/// shifted by `stroke-dashoffset` [offset].
Path dashedPath(Path path, double dash, [double offset = 0]) {
  if (!(dash > 0)) return path;
  final out = Path();
  for (final metric in path.computeMetrics()) {
    // Phase of the pattern (period 2 × dash) at the start of the contour.
    var start = -(offset % (2 * dash));
    while (start < metric.length) {
      final from = math.max(0.0, start);
      final to = math.min(metric.length, start + dash);
      // A zero-length dash still draws its round caps, as in SVG.
      if (to >= from && start + dash > 0) {
        out.addPath(metric.extractPath(from, to), Offset.zero);
      }
      start += 2 * dash;
    }
  }
  return out;
}

/// The view box → box transform of `preserveAspectRatio="xMidYMid meet"`.
Matrix4 viewBoxTransform(Size viewBox, Size box) {
  final scale = math.min(
    box.width / viewBox.width,
    box.height / viewBox.height,
  );
  return Matrix4.identity()
    ..translateByDouble(
      (box.width - viewBox.width * scale) / 2,
      (box.height - viewBox.height * scale) / 2,
      0,
      1,
    )
    ..scaleByDouble(scale, scale, 1, 1);
}

/// The canonical static feeef wordmark: the twin of `FoAnimatedLogo` in `@feeef.dev/ui/brand/logo`
/// (the name is the web kit's; it is the still mark). It keeps its geometry and brand colours: the
/// first F is green (`--lab-brand-1`/`-2`), the rest takes the current text colour. Decorative;
/// label the link or button around it.
class FoAnimatedLogo extends StatelessWidget {
  const FoAnimatedLogo({super.key, this.width = 120, this.height = 32});

  /// Box width; the mark is centred and scaled to fit (default 120).
  final double width;

  /// Box height (default 32).
  final double height;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('width', width, defaultValue: 120))
      ..add(DoubleProperty('height', height, defaultValue: 32));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final current =
        DefaultTextStyle.of(context).style.color ?? theme.colors.ink;
    return ExcludeSemantics(
      child: SizedBox(
        width: width,
        height: height,
        child: CustomPaint(
          painter: _LogoPainter(
            brand1: brandColor1(theme),
            brand2: brandColor2(theme),
            current: current,
          ),
        ),
      ),
    );
  }
}

final _strokePaths = [
  for (final s in logoStrokes) dashedPath(svgPath(s.d), s.dash),
];

class _LogoPainter extends CustomPainter {
  _LogoPainter({
    required this.brand1,
    required this.brand2,
    required this.current,
  });
  final Color brand1, brand2, current;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.transform(viewBoxTransform(logoViewBox, size).storage);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = logoStrokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (var i = 0; i < logoStrokes.length; i++) {
      paint.color = switch (logoStrokes[i].ink) {
        LogoInk.brand1 => brand1,
        LogoInk.brand2 => brand2,
        LogoInk.current => current,
      };
      canvas.drawPath(_strokePaths[i], paint);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LogoPainter old) =>
      old.brand1 != brand1 || old.brand2 != brand2 || old.current != current;
}

/// Draws [path] stroked like the wordmark (round caps and joins).
void paintLogoStroke(Canvas canvas, Path path, Color color, double width) {
  if (width <= 0) return;
  canvas.drawPath(
    path,
    ui.Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = color,
  );
}
