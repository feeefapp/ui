import 'dart:async';

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';
import '../menu/anchored_panel.dart';

/// Which side of its target a [Tooltip] opens on.
enum TooltipSide { top, right, bottom, left }

/// A short label shown next to its target after hovering it for a moment (700ms) or when it takes
/// keyboard focus: the kit's tooltip surface (`.lab-navigation-tooltip`: surface, 1px line, small
/// radius, glass shadow, 13/20 text). Decorative for assistive technology: the target carries the
/// name itself.
class Tooltip extends StatefulWidget {
  const Tooltip({
    super.key,
    required this.label,
    this.side = TooltipSide.right,
    this.offset = 8,
    this.enabled = true,
    required this.child,
  });

  final String label;
  final TooltipSide side;

  /// Gap between the target and the tooltip.
  final double offset;
  final bool enabled;
  final Widget child;

  @override
  State<Tooltip> createState() => _TooltipState();
}

class _TooltipState extends State<Tooltip> {
  bool _open = false;
  Timer? _delay;

  void _show({bool now = false}) {
    if (!widget.enabled) return;
    _delay?.cancel();
    if (now) {
      setState(() => _open = true);
      return;
    }
    _delay = Timer(const Duration(milliseconds: 700), () {
      if (mounted) setState(() => _open = true);
    });
  }

  void _hide() {
    _delay?.cancel();
    if (_open) setState(() => _open = false);
  }

  @override
  void dispose() {
    _delay?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // `right` is the reading end: it opens on the left in RTL, like the rail it labels.
    final side = switch (widget.side) {
      TooltipSide.right => PanelSide.end,
      TooltipSide.left => PanelSide.start,
      TooltipSide.top => PanelSide.top,
      TooltipSide.bottom => PanelSide.bottom,
    };
    // Kept inside the app's bounds like every floating panel; flips when there is no room.
    return AnchoredPanel(
      open: _open,
      side: side,
      sideOffset: widget.offset,
      panel: (context) => IgnorePointer(
        child: ExcludeSemantics(child: _TooltipSurface(label: widget.label)),
      ),
      child: MouseRegion(
        onEnter: (_) => _show(),
        onExit: (_) => _hide(),
        child: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onFocusChange: (focused) {
            final keyboard =
                FocusManager.instance.highlightMode ==
                FocusHighlightMode.traditional;
            focused && keyboard ? _show(now: true) : _hide();
          },
          child: Listener(onPointerDown: (_) => _hide(), child: widget.child),
        ),
      ),
    );
  }
}

class _TooltipSurface extends StatelessWidget {
  const _TooltipSurface({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = theme.sizes.radiusSmall;
    return CustomPaint(
      painter: _TooltipPainter(
        fill: c.surface,
        line: c.line,
        shadow: glassShadowColor(theme.brightness),
        radius: radius,
      ),
      child: Padding(
        // 8px 12px inside the 1px border.
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        child: DefaultTextStyle(
          style: DefaultTextStyle.of(context).style.copyWith(
            fontSize: 13,
            height: 20 / 13,
            leadingDistribution: TextLeadingDistribution.even,
            color: c.ink,
            fontWeight: FontWeight.w400,
          ),
          child: CssBaseline(lineHeight: 20, child: Text(label)),
        ),
      ),
    );
  }
}

class _TooltipPainter extends CustomPainter {
  _TooltipPainter({
    required this.fill,
    required this.line,
    required this.shadow,
    required this.radius,
  });
  final Color fill, line, shadow;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = [radius, radius, radius, radius];
    // --lab-glass-shadow: 0 8px 24px -14px.
    final spread = rect.deflate(14);
    if (!spread.isEmpty) {
      canvas.drawPath(
        superellipsePath(spread, [
          for (final v in r) (v - 14).clamp(0, v),
        ]).shift(const Offset(0, 8)),
        Paint()
          ..color = shadow
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
      );
    }
    canvas.drawPath(superellipsePath(rect, r), Paint()..color = fill);
    canvas.drawPath(
      superellipsePath(rect, r, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = line,
    );
  }

  @override
  bool shouldRepaint(_TooltipPainter old) =>
      old.fill != fill || old.line != line || old.radius != radius;
}
