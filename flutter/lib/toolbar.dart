import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'glass/container.dart';
import 'physics/layout_group.dart';
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('label', label));
  }

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    explicitChildNodes: true,
    label: label,
    child: GlassScope(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        // --lab-toolbar-gap (the shell gap G by default) between groups.
        spacing: ThemeProvider.of(context).sizes.toolbarGap,
        children: [
          Flexible(child: leading),
          ?trailing,
        ],
      ),
    ),
  );
}

/// One glass pill for related toolbar controls, [SizeTokens.toolbarItem] tall (44, the iOS bar
/// item; at least 44 on touch). Children should use `appearance: toolbar` and the regular size;
/// the group sizes them to [SizeTokens.toolbarControl] and gives them its inset corner radius. The twin of `ToolbarGroup` in `@feeef.dev/ui/toolbar`.
/// The axis [ToolbarGroup]s take when they don't set one: the twin of `ToolbarOrientationContext`.
/// A collapsed sidebar (the scaffold's rail) provides [Axis.vertical], so its bottom groups stack
/// their controls in a column that fits.
class ToolbarOrientation extends InheritedWidget {
  const ToolbarOrientation({
    super.key,
    required this.axis,
    required super.child,
  });

  final Axis axis;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(EnumProperty<Axis>('axis', axis));
  }

  /// The surrounding axis, or null when none is provided (groups are then horizontal).
  static Axis? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ToolbarOrientation>()?.axis;

  @override
  bool updateShouldNotify(ToolbarOrientation old) => old.axis != axis;
}

class ToolbarGroup extends StatelessWidget {
  const ToolbarGroup({
    super.key,
    required this.label,
    this.axis,
    this.glassId,
    this.glassUnion,
    this.glassHidden = false,
    this.glassMotion = GlassMotion.spring,
    required this.children,
  });

  /// Accessible name of the group.
  final String label;

  /// Lay the controls out in a row or a column. Default: the surrounding [ToolbarOrientation].
  final Axis? axis;
  final String? glassId, glassUnion;

  /// How its glass follows a size change (`follow` for groups that animate their own size).
  final GlassMotion glassMotion;

  /// Leaves the container's glass while keeping its place (`data-glass-hidden`).
  final bool glassHidden;
  final List<Widget> children;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(EnumProperty<Axis>('axis', axis, defaultValue: null))
      ..add(StringProperty('glassId', glassId, defaultValue: null))
      ..add(StringProperty('glassUnion', glassUnion, defaultValue: null))
      ..add(
        FlagProperty(
          'glassHidden',
          value: glassHidden,
          ifTrue: 'glass hidden',
          defaultValue: false,
        ),
      )
      ..add(
        EnumProperty<GlassMotion>(
          'glassMotion',
          glassMotion,
          defaultValue: GlassMotion.spring,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    // The bubble is toolbarItem tall (44, the iOS bar item); on touch at least the 44px target,
    // since the bubble is what a finger hits. Controls fill it inside 2px padding + 1px border.
    final item = theme.coarsePointer(context) && s.toolbarItem < s.touchTarget
        ? s.touchTarget
        : s.toolbarItem;
    final size = item - 6;
    final radius = item / 2 * s.radiusScale;
    final inherited = ToolbarOrientation.maybeOf(context);
    final direction = axis ?? inherited ?? Axis.horizontal;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: GlassGroup(
        singleRim: true,
        glassId: glassId,
        glassUnion: glassUnion,
        glassHidden: glassHidden,
        glassMotion: glassMotion,
        radius: radius,
        // 2px padding inside the 1px border; at least the control size + 6px tall.
        padding: const EdgeInsets.all(2),
        child: ConstrainedBox(
          // min-block-size: size + 6px, of which border and padding take 6px (min-inline-size
          // when vertical).
          constraints: direction == Axis.horizontal
              ? BoxConstraints(minHeight: size)
              : BoxConstraints(minWidth: size),
          child: ControlOverrides(
            height: size,
            radius: radius - 2,
            touchTarget: size,
            child: Flex(
              direction: direction,
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              // Where an orientation is provided (the sidebar's bottom slot, inside a
              // LayoutGroup), each control is a layout item, so it travels between its place in
              // the row and in the column. Flexible children keep their flex.
              children: inherited == null
                  ? children
                  : [
                      for (final (i, child) in children.indexed)
                        if (child case Flexible(:final flex, :final fit))
                          Flexible(
                            flex: flex,
                            fit: fit,
                            child: LayoutGroupItem(
                              layoutId: (label, i),
                              child: child.child,
                            ),
                          )
                        else
                          LayoutGroupItem(layoutId: (label, i), child: child),
                    ],
            ),
          ),
        ),
      ),
    );
  }
}
