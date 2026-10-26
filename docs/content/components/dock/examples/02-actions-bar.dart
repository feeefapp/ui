import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class WithActionsBar extends StatefulWidget {
  const WithActionsBar({super.key});

  @override
  State<WithActionsBar> createState() => _WithActionsBarState();
}

class _WithActionsBarState extends State<WithActionsBar> {
  double _width = 560;

  @override
  Widget build(BuildContext context) {
    final actions = <Action>[
      CommandAction(
        id: 'delete',
        label: 'Delete',
        icon: const LucideIcon(LucideIcons.trash2),
        destructive: true,
        priority: 0,
        onAction: () {},
      ),
      CommandAction(
        id: 'duplicate',
        label: 'Duplicate',
        icon: const LucideIcon(LucideIcons.copy),
        priority: 1,
        onAction: () {},
      ),
      CommandAction(
        id: 'print',
        label: 'Print label',
        icon: const LucideIcon(LucideIcons.printer),
        priority: 2,
        onAction: () {},
      ),
      CommandAction(
        id: 'ship',
        label: 'Ship order',
        icon: const LucideIcon(LucideIcons.truck),
        variant: .filled,
        priority: 10,
        onAction: () {},
      ),
    ];
    // `.dock-demo-stack`
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Slider(
          label: 'Host width',
          min: 240,
          max: 640,
          step: 10,
          value: _width,
          onValueChange: (value) => setState(() => _width = value),
        ),
        // `.dock-demo-host-narrow`: at most the chosen width, centred.
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: _width),
            child: _DockDemoHost(
              label: 'Host: ${_width.round()}px',
              child: Dock(
                label: 'Order actions',
                content: const Text(
                  'Order #1048',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                children: [
                  ActionsBar(
                    actions: actions,
                    label: 'Order actions',
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
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
