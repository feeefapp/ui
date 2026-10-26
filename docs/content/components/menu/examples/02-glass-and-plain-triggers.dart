import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

/// Over a busy backdrop: the toolbar button's menu is born out of its glass and merges back into
/// it; the plain button in content has no glass, so its menu grows out of a droplet at its centre.
class GlassAndPlainTriggersExample extends StatelessWidget {
  const GlassAndPlainTriggersExample({super.key});

  static List<Action> _actions() => [
    CommandAction(
      id: 'copy',
      label: 'Copy tracking number',
      icon: const LucideIcon(LucideIcons.copy),
      onAction: () {},
    ),
    CommandAction(
      id: 'print',
      label: 'Print shipping label',
      icon: const LucideIcon(LucideIcons.printer),
      onAction: () {},
    ),
    CommandAction(
      id: 'cancel',
      label: 'Cancel order',
      icon: const LucideIcon(LucideIcons.trash2),
      destructive: true,
      onAction: () {},
    ),
  ];

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: SizedBox(
      height: 340,
      child: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _Backdrop())),
          const Positioned(
            left: 16,
            right: 16,
            top: 70,
            child: Text(
              'Order #10482 · Yalidine · Confirmed · 4 200 DA · Oran → Alger',
              style: TextStyle(
                fontSize: 28,
                height: 1.1,
                fontWeight: FontWeight.w800,
                color: Color(0xFF10130F),
              ),
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: GlassScope(
              child: ToolbarGroup(
                label: 'Order',
                children: [
                  ActionsMenuAnchor(
                    label: 'Order actions',
                    actions: _actions(),
                    builder: (open) => IconButton(
                      appearance: ButtonAppearance.toolbar,
                      ariaLabel: 'Order actions',
                      onClick: open ?? () {},
                      icon: const LucideIcon(LucideIcons.ellipsis),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 140,
            bottom: 150,
            child: ActionsMenuAnchor(
              label: 'Sort',
              actions: _actions(),
              builder: (open) => Button(
                variant: ButtonVariant.tonal,
                onClick: open ?? () {},
                children: const [
                  LucideIcon(LucideIcons.arrowDownUp),
                  Text('Sort'),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// Stripes over a colour wheel, so the menu's material shows what it does.
class _Backdrop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const SweepGradient(
          center: Alignment(-0.4, -0.2),
          colors: [
            Color(0xFFEF6C3B),
            Color(0xFFF2C14E),
            Color(0xFF3FA36B),
            Color(0xFF2F6FDF),
            Color(0xFF9B4FD1),
            Color(0xFFEF6C3B),
          ],
        ).createShader(rect),
    );
    final stripe = Paint()..color = const Color(0x59FFFFFF);
    canvas.rotate(-25 * math.pi / 180);
    for (var x = -size.height; x < size.width * 1.5; x += 26) {
      canvas.drawRect(Rect.fromLTWH(x, -size.height, 10, size.height * 3), stripe);
    }
  }

  @override
  bool shouldRepaint(_Backdrop old) => false;
}
