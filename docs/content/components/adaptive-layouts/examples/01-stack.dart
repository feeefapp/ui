import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class StatsStack extends StatefulWidget {
  const StatsStack({super.key});

  @override
  State<StatsStack> createState() => _StatsStackState();
}

class _StatsStackState extends State<StatsStack> {
  double _width = 640;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Slider(
          label: 'Width',
          min: 260,
          max: 720,
          value: _width,
          onValueChange: (v) => setState(() => _width = v),
        ),
        _Frame(
          width: _width,
          child: const AdaptiveStack(
            align: .stretch,
            children: [
              AdaptiveFlex(
                child: _Stat(label: 'To confirm', value: '24'),
              ),
              AdaptiveFlex(
                child: _Stat(label: 'Shipped today', value: '61'),
              ),
              AdaptiveFlex(
                child: _Stat(label: 'Cash to collect', value: '184 500 DA'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// `.ad-stat`: a label over a big tabular number.
class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Container(
      constraints: const BoxConstraints(minWidth: 120),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(theme.sizes.radiusControl),
        color: Color.lerp(c.surface, c.ink, 0.04),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 2,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: c.muted)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}

/// `.ad-frame`: a dashed box [width] px wide (never wider than the stage), 14px inside.
class _Frame extends StatelessWidget {
  const _Frame({required this.width, required this.child});
  final double width;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: CustomPaint(
        painter: _DashedBorder(theme.colors.line, theme.sizes.radiusGroup),
        child: Container(
          width: width,
          padding: const EdgeInsets.all(15),
          child: child,
        ),
      ),
    );
  }
}

/// A 1px dashed CSS border (3px dashes) around a rounded box.
class _DashedBorder extends CustomPainter {
  const _DashedBorder(this.color, this.radius);
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(0.5),
          Radius.circular(radius - 0.5),
        ),
      );
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 6) {
        canvas.drawPath(metric.extractPath(d, d + 3), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) =>
      old.color != color || old.radius != radius;
}
