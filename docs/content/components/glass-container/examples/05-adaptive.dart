import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

enum _Backdrop { photo, page }

class Adaptive extends StatefulWidget {
  const Adaptive({super.key});

  @override
  State<Adaptive> createState() => _AdaptiveState();
}

class _AdaptiveState extends State<Adaptive> {
  _Backdrop _backdrop = .photo;

  Widget _icon(String label, LucideIconData icon) => IconButton(
    variant: .text,
    appearance: .toolbar,
    controlSize: .compact,
    ariaLabel: label,
    onClick: () {},
    icon: LucideIcon(icon),
  );

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    final photo = _backdrop == _Backdrop.photo;
    final glass = GlassContainer(
      child: _glassRow([
        ToolbarGroup(label: 'Close', children: [_icon('Close', LucideIcons.x)]),
        ToolbarGroup(
          label: 'Photo actions',
          children: [
            _icon('Save', LucideIcons.heart),
            _icon('Share', LucideIcons.share2),
          ],
        ),
      ]),
    );
    return _GlassStage(
      children: [
        Container(
          width: 420,
          constraints: const BoxConstraints(minHeight: 120),
          alignment: Alignment.center,
          // `.glass-photo` (a dark photo stand-in) or `.glass-page`.
          decoration: photo
              ? BoxDecoration(borderRadius: radius)
              : BoxDecoration(
                  color: c.surface,
                  border: Border.all(color: c.line),
                  borderRadius: radius,
                ),
          child: photo
              ? CustomPaint(
                  painter: _PhotoPainter(theme.sizes.radiusPanel),
                  child: SizedBox(
                    width: 420,
                    height: 120,
                    child: Center(
                      child: GlassBackdrop(tone: .dark, child: glass),
                    ),
                  ),
                )
              : glass,
        ),
        SegmentedControl<_Backdrop>(
          label: 'Behind the glass',
          value: _backdrop,
          onChange: (value) => setState(() => _backdrop = value),
          options: const [
            SegmentOption(value: .photo, label: 'Dark photo'),
            SegmentOption(value: .page, label: 'Page'),
          ],
        ),
      ],
    );
  }
}

/// `.glass-photo`: a warm glow over a dark blue-black gradient.
class _PhotoPainter extends CustomPainter {
  const _PhotoPainter(this.radius);
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final box = Offset.zero & size;
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(box, Radius.circular(radius)));
    // linear-gradient(160deg, #1b2a3a, #0c1218 70%).
    final angle = 160 * math.pi / 180;
    final dir = Offset(math.sin(angle), -math.cos(angle));
    final length =
        (size.width * math.sin(angle)).abs() +
        (size.height * math.cos(angle)).abs();
    final start = box.center - dir * (length / 2);
    canvas.drawRect(
      box,
      Paint()
        ..shader = ui.Gradient.linear(
          start,
          start + dir * length,
          const [Color(0xFF1B2A3A), Color(0xFF0C1218), Color(0xFF0C1218)],
          const [0, 0.7, 1],
        ),
    );
    // radial-gradient(circle at 70% 30%, rgb(255 190 120 / 55%), transparent 40%).
    final center = Offset(size.width * 0.7, size.height * 0.3);
    final far = [
      box.topLeft,
      box.topRight,
      box.bottomLeft,
      box.bottomRight,
    ].map((p) => (p - center).distance).reduce(math.max);
    canvas.drawRect(
      box,
      Paint()
        ..shader = ui.Gradient.radial(center, far * 0.4, const [
          Color(0x8CFFBE78),
          Color(0x00FFBE78),
        ]),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PhotoPainter old) => old.radius != radius;
}

/// `.glass-row`: bubbles centred in a wrapping row.
Widget _glassRow(List<Widget> children, {double gap = 12}) => Wrap(
  spacing: gap,
  runSpacing: gap,
  alignment: WrapAlignment.center,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: children,
);

/// `.glass-stage`: two soft colour discs over diagonal stripes, so the glass has something to
/// show through. Children stack with 16px gaps, centred.
class _GlassStage extends StatelessWidget {
  const _GlassStage({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 200),
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              // Grid rows share the spare height; each item is centred in its row.
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              spacing: 16,
              children: children,
            ),
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

    disc(0.8, 0.7, accent.withValues(alpha: 0.55), 0.2, 0.21);
    disc(0.18, 0.3, primary.withValues(alpha: 0.5), 0.16, 0.17);
  }

  @override
  bool shouldRepaint(_BackdropPainter old) =>
      old.stripe != stripe ||
      old.stripeSoft != stripeSoft ||
      old.primary != primary ||
      old.accent != accent;
}
