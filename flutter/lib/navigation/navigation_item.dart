import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../primitives/button.dart';
import '../primitives/square_slot.dart';
import '../primitives/tooltip.dart';
import '../theme.dart';

/// One row of sidebar navigation, the twin of `NavigationItem` in
/// `@feeef.dev/ui/navigation/navigation-item`: a ghost toolbar [Button] as tall as every regular
/// button, with the icon in a [SquareSlot] at the start, the label, and an optional [trailing]
/// slot. In [compact] (rail) mode the item is just the icon's square and the label moves into a
/// tooltip.
class NavigationItem extends StatelessWidget {
  const NavigationItem({
    super.key,
    required this.label,
    required this.icon,
    this.trailing,
    this.href,
    this.onSelect,
    this.active = false,
    required this.compact,
  });

  /// Visible label; also the accessible name and the rail tooltip.
  final String label;

  /// 20px icon, centred in a square as tall as the item.
  final Widget icon;

  /// A badge, count or chevron at the end, centred in a square like the icon. Hidden in the rail.
  final Widget? trailing;

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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(StringProperty('href', href, defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onSelect', onSelect))
      ..add(
        FlagProperty(
          'active',
          value: active,
          ifTrue: 'active',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'compact',
          value: compact,
          ifTrue: 'rail',
          ifFalse: 'expanded',
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final button = Semantics(
      link: href != null,
      linkUrl: href == null ? null : Uri.tryParse(href!),
      child: Button(
        variant: ButtonVariant.ghost,
        appearance: ButtonAppearance.toolbar,
        current: active,
        ariaLabel: label,
        onClick: onSelect,
        alignment: compact ? null : AlignmentDirectional.centerStart,
        children: [
          SquareSlot(child: ExcludeSemantics(child: icon)),
          if (!compact) ...[
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (trailing != null)
              SquareSlot(
                child: IconTheme.merge(
                  data: IconThemeData(color: c.muted),
                  child: DefaultTextStyle.merge(
                    style: TextStyle(
                      color: c.muted,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    child: trailing!,
                  ),
                ),
              ),
          ],
        ],
      ),
    );
    // Selection is the Button's current-page state, flat like an iOS sidebar row (no edge).
    final item = ControlOverrides.merge(
      context,
      pressedEdge: const Color(0x00000000),
      child: button,
    );
    if (!compact) return item;
    // The rail item is just its square, centred in the rail, with the label in a tooltip.
    return Center(
      child: Tooltip(label: label, child: item),
    );
  }
}
