import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';

enum NoticeTone { info, success, warning, danger }

/// Inline guidance with a directional accent stripe, optional heading and rich body.
class Notice extends StatelessWidget {
  const Notice({
    super.key,
    this.tone = NoticeTone.info,
    this.title,
    this.icon,
    this.showIcon = true,
    this.liveRegion = false,
    required this.child,
  });

  final NoticeTone tone;
  final Widget? title, icon;
  final Widget child;
  final bool showIcon, liveRegion;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<NoticeTone>('tone', tone))
      ..add(DiagnosticsProperty<bool>('showIcon', showIcon))
      ..add(DiagnosticsProperty<bool>('liveRegion', liveRegion));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final (accent, glyph) = switch (tone) {
      NoticeTone.info => (c.primary, const LucideInfo(size: 16)),
      NoticeTone.success => (c.success, const LucideCheck(size: 16)),
      NoticeTone.warning => (c.warning, const LucideTriangleAlert(size: 16)),
      NoticeTone.danger => (c.danger, const LucideCircleAlert(size: 16)),
    };
    final pad = theme.sizes.shellGap + 10;
    final label = title;
    Widget line(Widget content) => Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showIcon)
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 6, top: 2),
            child: ExcludeSemantics(
              child: IconTheme.merge(
                data: IconThemeData(color: accent),
                child: icon ?? glyph,
              ),
            ),
          ),
        Expanded(child: content),
      ],
    );
    return Semantics(
      liveRegion: liveRegion,
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: mixSrgb(c.surfaceSoft, 0.55, c.surface),
          shape: SuperellipseBorder(radius: theme.sizes.radiusPanel),
        ),
        child: Padding(
          padding: EdgeInsets.all(pad),
          child: Stack(
            children: [
              PositionedDirectional(
                start: 0,
                top: 0,
                bottom: 0,
                width: 4,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsetsDirectional.only(start: pad + 4),
                child: DefaultTextStyle.merge(
                  style: TextStyle(color: c.ink),
                  child: label == null
                      ? line(child)
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            line(
                              DefaultTextStyle.merge(
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                                child: label,
                              ),
                            ),
                            const SizedBox(height: 8),
                            child,
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
