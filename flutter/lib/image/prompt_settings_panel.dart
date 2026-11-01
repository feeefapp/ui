import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart' show GlassContainer;
import '../glass/material.dart' show GlassKind;
import '../glass/member.dart' show GlassMemberBox;
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../primitives/button.dart';
import '../scroll/metrics.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';

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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ObjectFlagProperty<VoidCallback>.has('onClose', onClose))
      ..add(DoubleProperty('maxHeight', maxHeight, defaultValue: null));
  }

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
    // The same glass as the kit's popovers: the thick menu material, carrying text over anything.
    return GlassContainer(
      material: GlassKind.menu,
      interactive: false,
      adaptive: false,
      child: GlassMemberBox(
        radius: radius,
        standalone: (child) => child,
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
                // The scroll area stretches its child to the viewport: measure the controls'
                // own height so the panel can shrink to them.
                child: Align(
                  alignment: Alignment.topCenter,
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('title', title))
      ..add(StringProperty('closeLabel', closeLabel))
      ..add(ObjectFlagProperty<VoidCallback>.has('onClose', onClose));
  }

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
