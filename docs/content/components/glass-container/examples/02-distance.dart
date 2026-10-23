import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Distance extends StatefulWidget {
  const Distance({super.key});

  @override
  State<Distance> createState() => _DistanceState();
}

class _DistanceState extends State<Distance> {
  double _gap = 28;
  bool _playing = false;

  @override
  Widget build(BuildContext context) => _GlassStage(
    children: [
      GlassContainer(
        spacing: 20,
        child: _glassRow(gap: _gap, [
          ToolbarGroup(
            label: 'Previous',
            children: [
              IconButton(
                variant: .text,
                appearance: .toolbar,
                ariaLabel: 'Previous take',
                onClick: () {},
                icon: const LucideIcon(LucideIcons.skipBack),
              ),
            ],
          ),
          ToolbarGroup(
            label: 'Playback',
            children: [
              IconButton(
                variant: .text,
                appearance: .toolbar,
                ariaLabel: _playing ? 'Pause' : 'Play',
                onClick: () => setState(() => _playing = !_playing),
                icon: LucideIcon(
                  _playing ? LucideIcons.pause : LucideIcons.play,
                ),
              ),
            ],
          ),
          ToolbarGroup(
            label: 'Next',
            children: [
              IconButton(
                variant: .text,
                appearance: .toolbar,
                ariaLabel: 'Next take',
                onClick: () {},
                icon: const LucideIcon(LucideIcons.skipForward),
              ),
            ],
          ),
        ]),
      ),
      // `.glass-controls`: up to 420px.
      SizedBox(
        width: 420,
        child: Slider(
          label: 'Gap between bubbles',
          min: 0,
          max: 48,
          value: _gap,
          onValueChange: (value) => setState(() => _gap = value),
        ),
      ),
    ],
  );
}

/// `.glass-row`: bubbles centred in a wrapping row.
Widget _glassRow(List<Widget> children, {double gap = 12}) => Wrap(
  spacing: gap,
  runSpacing: gap,
  alignment: WrapAlignment.center,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: children,
);

/// `.glass-stage`: a landscape (sky, a dark ridge, sand and a sun), so the glass has something
/// to show through. Children stack with 16px gaps, centred.
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
    // `.glass-stage-source`, bottom layer first: the sky-to-sand landscape.
    void linear(double degrees, List<Color> colors, List<double> stops) {
      // CSS angles: 0deg points up, clockwise; the line spans the box's projection on it.
      final a = degrees * math.pi / 180;
      final dir = Offset(math.sin(a), -math.cos(a));
      final half =
          (box.width * math.sin(a).abs() + box.height * math.cos(a).abs()) / 2;
      canvas.drawRect(
        box,
        Paint()
          ..shader = ui.Gradient.linear(
            box.center - dir * half,
            box.center + dir * half,
            colors,
            stops,
          ),
      );
    }

    linear(
      180,
      const [
        Color(0xFF7DBAD2),
        Color(0xFFD8E4D9),
        Color(0xFF81B1B0),
        Color(0xFFD6BC91),
        Color(0xFFAE8B61),
      ],
      const [0, 0.48, 0.68, 0.69, 1],
    );
    linear(
      165,
      const [
        Color(0x00183F46),
        Color(0xFF183F46),
        Color(0xFF31595B),
        Color(0x0031595B),
      ],
      const [0.38, 0.384, 0.56, 0.564],
    );
    // radial-gradient(ellipse at 78% 18%, #fff6d4 0%, transparent 26%): a farthest-corner
    // ellipse, √2 × the farthest side on each axis.
    final sun = Offset(
      box.left + box.width * 0.78,
      box.top + box.height * 0.18,
    );
    final rx = math.sqrt2 * box.width * 0.78;
    final ry = math.sqrt2 * box.height * 0.82;
    canvas.save();
    canvas.translate(sun.dx, sun.dy);
    canvas.scale(1, ry / rx);
    canvas.drawRect(
      Rect.fromCenter(center: Offset.zero, width: rx * 4, height: rx * 4),
      Paint()
        ..shader = ui.Gradient.radial(
          Offset.zero,
          rx,
          const [Color(0xFFFFF6D4), Color(0x00FFF6D4)],
          const [0, 0.26],
        ),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_BackdropPainter old) =>
      old.stripe != stripe ||
      old.stripeSoft != stripeSoft ||
      old.primary != primary ||
      old.accent != accent;
}
