import 'package:flutter/widgets.dart';

import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../primitives/tooltip.dart';
import '../theme.dart';

/// One row of sidebar navigation: icon and label, the twin of `NavigationItem` in
/// `@feeef.dev/ui/navigation/navigation-item`. In [compact] (rail) mode only the icon shows and
/// the label moves into a tooltip.
class NavigationItem extends StatelessWidget {
  const NavigationItem({
    super.key,
    required this.label,
    required this.icon,
    this.href,
    this.onSelect,
    this.active = false,
    required this.compact,
  });

  /// Visible label; also the accessible name and the rail tooltip.
  final String label;

  /// 20px icon.
  final Widget icon;

  /// The item's destination. With it the item is announced as a link to [href] (the web kit
  /// renders an `<a href>`); route on [onSelect], since Flutter has no browser navigation.
  final String? href;

  /// Called on activation (route, or close a drawer).
  final VoidCallback? onSelect;

  /// Marks the current page and paints it selected.
  final bool active;

  /// Icon-only rail mode with a tooltip label.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final item = ControlOverrides.merge(
      context,
      height: s.rowHeight,
      radius: s.radiusControlCompact,
      // aria-current="page": the selected fill, no edge.
      pressedFill: c.controlSelected,
      pressedEdge: const Color(0x00000000),
      child: SizedBox(
        width: compact ? s.rowHeight : double.infinity,
        child: Semantics(
          selected: active,
          link: href != null,
          linkUrl: href == null ? null : Uri.tryParse(href!),
          child: Button(
            variant: ButtonVariant.ghost,
            appearance: ButtonAppearance.toolbar,
            pressed: active ? true : null,
            ariaLabel: label,
            onClick: onSelect,
            padding: compact
                ? EdgeInsetsDirectional.zero
                : const EdgeInsetsDirectional.symmetric(horizontal: 8),
            gap: 8,
            alignment: compact
                ? AlignmentDirectional.center
                : AlignmentDirectional.centerStart,
            children: [
              IconTheme.merge(
                data: const IconThemeData(size: 20),
                child: LucideStroke(width: 1.75, child: icon),
              ),
              if (!compact)
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    return Tooltip(label: label, enabled: compact, child: item);
  }
}
