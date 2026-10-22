import 'package:flutter/widgets.dart';

import 'glass/container.dart';
import 'primitives/button.dart';
import 'scaffold.dart';
import 'theme.dart';

/// Unpainted toolbar row: [leading] at the start, [trailing] at the end, with the space between
/// them free. Only related controls share a material (put them in ToolbarGroups), and all of them
/// share one glass container. The twin of `Toolbar` in `@feeef.dev/ui/toolbar`.
class Toolbar extends StatelessWidget {
  const Toolbar({
    super.key,
    required this.label,
    required this.leading,
    this.trailing,
  });

  /// Accessible name of the toolbar group.
  final String label;

  /// Start content, usually one or more ToolbarGroups. It may shrink.
  final Widget leading;

  /// End content; keeps its size.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    explicitChildNodes: true,
    label: label,
    child: GlassScope(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        spacing: 12,
        children: [
          Flexible(child: leading),
          ?trailing,
        ],
      ),
    ),
  );
}

/// One glass pill for related toolbar controls. Children should use `appearance: toolbar` and
/// `controlSize: compact`; the group sizes them to the compact height (44px on touch) and gives
/// them its inset corner radius. The twin of `ToolbarGroup` in `@feeef.dev/ui/toolbar`.
class ToolbarGroup extends StatelessWidget {
  const ToolbarGroup({
    super.key,
    required this.label,
    this.glassId,
    this.glassUnion,
    this.glassHidden = false,
    required this.children,
  });

  /// Accessible name of the group.
  final String label;
  final String? glassId, glassUnion;

  /// Leaves the container's glass while keeping its place (`data-glass-hidden`).
  final bool glassHidden;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 600;
    final size = theme.coarsePointer(context) || narrow
        ? 44.0
        : s.controlCompact;
    final radius = (size + 6) / 2 * s.radiusScale;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: GlassGroup(
        glassId: glassId,
        glassUnion: glassUnion,
        glassHidden: glassHidden,
        radius: radius,
        // 2px padding inside the 1px border; at least the control size + 6px tall.
        padding: const EdgeInsets.all(2),
        child: ConstrainedBox(
          // min-block-size: size + 6px, of which border and padding take 6px.
          constraints: BoxConstraints(minHeight: size),
          child: ControlOverrides(
            height: size,
            radius: radius - 2,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: children,
            ),
          ),
        ),
      ),
    );
  }
}
