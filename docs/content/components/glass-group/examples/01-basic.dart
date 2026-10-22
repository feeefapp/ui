import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatelessWidget {
  const Basic({super.key});

  @override
  Widget build(BuildContext context) => _GlassDemoBackdrop(
    child: GlassGroup(
      label: 'Zoom',
      padding: const EdgeInsets.all(4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            controlSize: .compact,
            ariaLabel: 'Zoom out',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.minus),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            controlSize: .compact,
            ariaLabel: 'Reset zoom',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.rotateCcw),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            controlSize: .compact,
            ariaLabel: 'Zoom in',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.plus),
          ),
        ],
      ),
    ),
  );
}

/// `.glass-demo-backdrop`: two soft colour discs over diagonal stripes, so the glass has
/// something to show through.
class _GlassDemoBackdrop extends StatelessWidget {
  const _GlassDemoBackdrop({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 220),
      decoration: BoxDecoration(
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: CustomPaint(
          painter: _BackdropPainter(
            stripe: c.surface,
            stripeSoft: c.surfaceSoft,
            primary: c.primary,
            accent: c.accent,
          ),
          child: Padding(
            padding: const EdgeInsets.all(23),
            child: Center(widthFactor: 1, heightFactor: 1, child: child),
          ),
        ),
      ),
    );
  }
}

class _BackdropPainter extends CustomPainter {
  _BackdropPainter({
    required this.stripe,
    required this.stripeSoft,
    required this.primary,
    required this.accent,
  });
  final Color stripe, stripeSoft, primary, accent;

  @override
  void paint(Canvas canvas, Size size) {
    // The painted box is the border box (the CSS background runs under the 1px border).
    final box = (Offset.zero & size).inflate(1);
    // repeating-linear-gradient(45deg, surface 0 14px, surface-soft 14px 28px).
    const d = 0.7071067811865476;
    final length = box.width * d + box.height * d;
    final start = box.center - Offset(d, -d) * (length / 2);
    canvas.drawRect(
      box,
      Paint()
        ..shader = ui.Gradient.linear(
          start,
          start + const Offset(d, -d) * 28,
          [stripe, stripe, stripeSoft, stripeSoft],
          [0, 0.5, 0.5, 1],
          TileMode.repeated,
        ),
    );
    // radial-gradient(circle at x y, color 0 a%, transparent b%): percentages of the distance to
    // the farthest corner.
    void disc(double fx, double fy, Color color, double solid, double edge) {
      final center = Offset(
        box.left + box.width * fx,
        box.top + box.height * fy,
      );
      final far = [
        box.topLeft,
        box.topRight,
        box.bottomLeft,
        box.bottomRight,
      ].map((p) => (p - center).distance).reduce(math.max);
      canvas.drawRect(
        box,
        Paint()
          ..shader = ui.Gradient.radial(
            center,
            far * edge,
            [color, color, color.withValues(alpha: 0)],
            [0, solid / edge, 1],
          ),
      );
    }

    disc(0.75, 0.65, accent.withValues(alpha: 0.5), 0.22, 0.23);
    disc(0.2, 0.3, primary.withValues(alpha: 0.45), 0.18, 0.19);
  }

  @override
  bool shouldRepaint(_BackdropPainter old) =>
      old.stripe != stripe ||
      old.stripeSoft != stripeSoft ||
      old.primary != primary ||
      old.accent != accent;
}
