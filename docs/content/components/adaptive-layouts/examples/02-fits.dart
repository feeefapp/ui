import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class ContactActions extends StatefulWidget {
  const ContactActions({super.key});

  @override
  State<ContactActions> createState() => _ContactActionsState();
}

class _ContactActionsState extends State<ContactActions> {
  double _width = 520;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Slider(
          label: 'Width',
          min: 60,
          max: 600,
          value: _width,
          onValueChange: (v) => setState(() => _width = v),
        ),
        _Frame(
          width: _width,
          child: ViewThatFits(
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 8,
                children: [
                  Button(
                    variant: .tonal,
                    onClick: () {},
                    children: const [
                      LucideIcon(LucideIcons.phone),
                      Text('Call customer'),
                    ],
                  ),
                  Button(
                    variant: .tonal,
                    onClick: () {},
                    children: const [
                      LucideIcon(LucideIcons.messageSquare),
                      Text('Send SMS'),
                    ],
                  ),
                  Button(
                    variant: .tonal,
                    onClick: () {},
                    children: const [
                      LucideIcon(LucideIcons.copy),
                      Text('Copy number'),
                    ],
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 8,
                children: [
                  IconButton(
                    variant: .tonal,
                    ariaLabel: 'Call customer',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.phone),
                  ),
                  IconButton(
                    variant: .tonal,
                    ariaLabel: 'Send SMS',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.messageSquare),
                  ),
                  IconButton(
                    variant: .tonal,
                    ariaLabel: 'Copy number',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.copy),
                  ),
                ],
              ),
              IconButton(
                variant: .tonal,
                ariaLabel: 'Contact actions',
                onClick: () {},
                icon: const LucideIcon(LucideIcons.ellipsis),
              ),
            ],
          ),
        ),
      ],
    ),
  );
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
