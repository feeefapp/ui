import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Align;

class Align extends StatelessWidget {
  const Align({super.key});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 16,
    children: [
      for (final align in DockAlign.values)
        _DockDemoHost(
          label: 'align="${align.name}"',
          child: Dock(
            label: 'Delivery actions, ${align.name}',
            align: align,
            content: const Text('3 parcels'),
            children: [
              Button(
                variant: .tonal,
                onClick: () {},
                children: const [Text('Call courier')],
              ),
            ],
          ),
        ),
    ],
  );
}

/// `.dock-demo-host`: a dashed surface standing in for the dock's host.
class _DockDemoHost extends StatelessWidget {
  const _DockDemoHost({this.label, required this.child});

  /// `data-label`: a caption above the dock.
  final String? label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return CustomPaint(
      foregroundPainter: _DashedBorder(
        color: c.ink.withValues(alpha: 0.25),
        radius: theme.sizes.radiusPanel,
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 25, horizontal: 13),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
        ),
        child: label == null
            ? child
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      label!,
                      style: TextStyle(color: c.muted, fontSize: 12),
                    ),
                  ),
                  child,
                ],
              ),
      ),
    );
  }
}

class _DashedBorder extends CustomPainter {
  _DashedBorder({required this.color, required this.radius});
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(
      (Offset.zero & size).deflate(0.5),
      Radius.circular(radius - 0.5),
    );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final metric in (Path()..addRRect(rrect)).computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 6) {
        canvas.drawPath(metric.extractPath(d, d + 3), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) =>
      old.color != color || old.radius != radius;
}
