import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class SplitMerge extends StatefulWidget {
  const SplitMerge({super.key});

  @override
  State<SplitMerge> createState() => _SplitMergeState();
}

class _SplitMergeState extends State<SplitMerge> {
  bool _split = false;

  Widget _icon(String label, LucideIconData icon) => IconButton(
    variant: .text,
    appearance: .toolbar,
    ariaLabel: label,
    onClick: () {},
    icon: LucideIcon(icon),
  );

  @override
  Widget build(BuildContext context) {
    final share = _icon('Share', LucideIcons.share2);
    final copy = _icon('Duplicate', LucideIcons.copy);
    final remove = _icon('Delete', LucideIcons.trash2);
    return _GlassStage(
      children: [
        GlassContainer(
          child: _glassRow(
            _split
                ? [
                    ToolbarGroup(
                      label: 'Share',
                      glassId: 'share',
                      children: [share, copy],
                    ),
                    ToolbarGroup(
                      label: 'Delete',
                      glassId: 'delete',
                      children: [remove],
                    ),
                  ]
                : [
                    ToolbarGroup(
                      label: 'Order actions',
                      glassId: 'actions',
                      children: [share, copy, remove],
                    ),
                  ],
          ),
        ),
        SegmentedControl<bool>(
          label: 'Delete action',
          value: _split,
          onChange: (value) => setState(() => _split = value),
          options: const [
            SegmentOption(value: false, label: 'One bubble'),
            SegmentOption(value: true, label: 'Delete on its own'),
          ],
        ),
      ],
    );
  }
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
