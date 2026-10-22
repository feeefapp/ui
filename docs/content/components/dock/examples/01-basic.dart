import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatelessWidget {
  const Basic({super.key});

  @override
  Widget build(BuildContext context) => _DockDemoHost(
    child: Dock(
      label: 'Order actions',
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order #1048',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          // `.lab-dock-content small`: 11px, muted.
          Text(
            'Confirmed · 4 500 DA',
            style: TextStyle(
              fontSize: 11,
              color: ThemeProvider.of(context).colors.muted,
            ),
          ),
        ],
      ),
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Button(
              variant: .text,
              onClick: () {},
              children: const [
                LucideIcon(LucideIcons.printer),
                Text('Print label'),
              ],
            ),
            Button(
              variant: .filled,
              onClick: () {},
              children: const [
                LucideIcon(LucideIcons.truck),
                Text('Ship order'),
              ],
            ),
          ],
        ),
      ],
    ),
  );
}

/// `.dock-demo-host`: a dashed surface standing in for the dock's host.
class _DockDemoHost extends StatelessWidget {
  const _DockDemoHost({required this.child});
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
        child: child,
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
