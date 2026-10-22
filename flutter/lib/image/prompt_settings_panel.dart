import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../primitives/button.dart';
import '../scroll/metrics.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';
import '../theme/light_edge.dart';
import '../theme/surfaces.dart';

const _edgeGap = 12.0;
const _contentPadding = 12.0;

/// The image composer's output settings (`.lab-pc-panel`): the twin of `PromptSettingsPanel` in
/// `@feeef.dev/ui/image/prompt-settings-panel`. A header with the title and a close button floats
/// over a scroll area; the panel hugs its contents until [maxHeight] (the room the popover has)
/// requires scrolling.
class PromptSettingsPanel extends StatefulWidget {
  const PromptSettingsPanel({
    super.key,
    required this.onClose,
    this.maxHeight,
    required this.children,
  });

  /// Called by the panel's close button.
  final VoidCallback onClose;

  /// The most height the panel may take (the popover's available height). Null: 420px, or 70% of
  /// the screen when that is less.
  final double? maxHeight;

  /// The settings controls, 14px apart.
  final List<Widget> children;

  @override
  State<PromptSettingsPanel> createState() => _PromptSettingsPanelState();
}

class _PromptSettingsPanelState extends State<PromptSettingsPanel> {
  double? _content;
  double _header = 0;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final t = I18n.of(context).t;
    final screen = MediaQuery.maybeSizeOf(context) ?? const Size(800, 700);
    // height: min(var(--lab-pc-settings-height, 420px), 70dvh, available height).
    final measured = _content == null
        ? 420.0
        : _content! +
              scrollContentReserve(_header, _edgeGap, _contentPadding) +
              _contentPadding +
              2;
    final height = math.min(
      math.min(measured, screen.height * 0.7),
      widget.maxHeight ?? 420,
    );
    final width = math.min(360.0, screen.width - 24);
    const radius = 22.0;
    return CustomPaint(
      painter: _PanelPainter(
        radius: radius,
        fill: c.surface,
        line: c.line,
        edgeLight: c.glassEdgeLight,
        edgeLow: c.glassEdgeLow,
        shadow: glassShadowColor(theme.brightness),
      ),
      foregroundPainter: _RimPainter(radius, c.glassEdgeLight, c.glassEdgeLow),
      child: ClipPath(
        clipper: _Clipper(radius),
        child: SizedBox(
          width: width,
          height: height,
          child: Padding(
            padding: const EdgeInsets.all(1),
            child: ScrollArea(
              label: t('lab.imgcomposer.outputSettings'),
              edgeGap: _edgeGap,
              contentPadding: _contentPadding,
              surface: c.surface,
              radius: radius,
              top: SizeReporter(
                onSize: (size) {
                  if (mounted && size.height != _header) {
                    setState(() => _header = size.height);
                  }
                },
                child: _Header(
                  title: t('lab.imgcomposer.outputSettings'),
                  closeLabel: t('lab.imgcomposer.closeSettings'),
                  onClose: widget.onClose,
                ),
              ),
              child: SizeReporter(
                onSize: (size) {
                  if (mounted && size.height != _content) {
                    setState(() => _content = size.height);
                  }
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 14,
                  children: widget.children,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-pc-panel-head`: the title and the close button on the panel surface.
class _Header extends StatelessWidget {
  const _Header({
    required this.title,
    required this.closeLabel,
    required this.onClose,
  });
  final String title, closeLabel;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        shape: SuperellipseBorder(radius: theme.sizes.radiusControl),
      ),
      child: Padding(
        padding: const EdgeInsetsDirectional.only(start: 8),
        child: Row(
          spacing: 12,
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            IconButton(
              variant: ButtonVariant.ghost,
              appearance: ButtonAppearance.toolbar,
              ariaLabel: closeLabel,
              onClick: onClose,
              icon: const LucideIcon(LucideIcons.x),
            ),
          ],
        ),
      ),
    );
  }
}

class _Clipper extends CustomClipper<Path> {
  _Clipper(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_Clipper old) => old.radius != radius;
}

/// `.lab-pc-panel.lab-light-edge`: opaque surface, line border, glass light and shadow, rim.
class _PanelPainter extends CustomPainter {
  _PanelPainter({
    required this.radius,
    required this.fill,
    required this.line,
    required this.edgeLight,
    required this.edgeLow,
    required this.shadow,
  });
  final double radius;
  final Color fill, line, edgeLight, edgeLow, shadow;

  @override
  void paint(Canvas canvas, Size size) {
    paintFloatingSurface(
      canvas,
      size,
      radius,
      fill: fill,
      line: line,
      edgeLow: edgeLow,
      shadow: shadow,
    );
  }

  @override
  bool shouldRepaint(_PanelPainter old) =>
      old.radius != radius || old.fill != fill || old.line != line;
}

class _RimPainter extends CustomPainter {
  _RimPainter(this.radius, this.light, this.low);
  final double radius;
  final Color light, low;
  @override
  void paint(Canvas canvas, Size size) =>
      paintLightEdge(canvas, size, radius, light: light, low: low);
  @override
  bool shouldRepaint(_RimPainter old) =>
      old.radius != radius || old.light != light || old.low != low;
}
