import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/surfaces.dart';
import 'touch_target.dart';

/// How a [Chip] uses its [Chip.color].
enum ChipVariant {
  /// Solid [Chip.color] with readable ink ([readableTextOn]): a status.
  filled,

  /// A soft tint of [Chip.color] with a matching edge and ink: a flag or a set value.
  tonal,

  /// No fill, a [Chip.color] edge and the theme's ink: a tag, or a neutral action.
  outlined,
}

/// A compact capsule for a status, a tag or a small action in a dense row (an order's status,
/// its tags, "+ Tag"). Small control height (30px comfortable), 12px medium label, optional
/// [leading] mark. With no [label] it is a square icon chip.
///
/// [onPressed] null makes it a passive label: no hover, no focus, no button semantics, and no
/// dimming (use it for read-only rows). Hover and press swap the fill instantly
/// (animation_level: 0).
class Chip extends StatefulWidget {
  const Chip({
    super.key,
    this.variant = ChipVariant.outlined,
    this.color,
    this.leading,
    this.label,
    this.onPressed,
    this.semanticLabel,
  }) : assert(leading != null || label != null, 'A chip needs content');

  final ChipVariant variant;

  /// The accent. Null: the primary for [ChipVariant.filled] and [ChipVariant.tonal], the
  /// control border for [ChipVariant.outlined].
  final Color? color;

  /// An icon, dot or logo before the label (or alone). Icons take the chip's ink at 14px.
  final Widget? leading;

  /// One line; ends in an ellipsis when the row is too narrow.
  final String? label;

  final VoidCallback? onPressed;

  /// Accessible name when there is no [label] (an icon chip) or it needs more context.
  final String? semanticLabel;

  /// The ink a [ChipVariant.filled] chip of [color] writes in, for leading images that need it.
  static Color filledInk(Color color) => readableTextOn(color);

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        EnumProperty<ChipVariant>(
          'variant',
          variant,
          defaultValue: ChipVariant.outlined,
        ),
      )
      ..add(ColorProperty('color', color, defaultValue: null))
      ..add(StringProperty('label', label, defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onPressed', onPressed))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: null));
  }

  @override
  State<Chip> createState() => _ChipState();
}

/// Fill, edge and ink of one chip state.
typedef _ChipPaint = ({Color fill, Color edge, Color ink});

class _ChipState extends State<Chip> {
  bool _hovered = false;
  bool _down = false;
  bool _focused = false;

  static const _fontSize = 12.0;
  static const _lineHeight = 16.0;
  static const _iconSize = 14.0;

  _ChipPaint _paint(ColorTokens c) {
    switch (widget.variant) {
      case ChipVariant.filled:
        final fill = widget.color ?? c.primary;
        return (fill: fill, edge: transparent, ink: readableTextOn(fill));
      case ChipVariant.tonal:
        final accent = widget.color ?? c.primary;
        return (
          fill: mixSrgb(accent, 0.12, c.surface),
          edge: mixSrgb(accent, 0.55, c.surface),
          ink: mixSrgb(accent, 0.75, c.ink),
        );
      case ChipVariant.outlined:
        return (
          fill: transparent,
          edge: widget.color ?? c.controlBorder,
          ink: c.ink,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final rest = _paint(theme.colors);
    final interactive = widget.onPressed != null;

    // Hover and press darken the rest fill with the ink, like the kit's control hover mixes.
    final fill = !interactive
        ? rest.fill
        : _down
        ? mixSrgb(rest.ink, 0.12, rest.fill)
        : _hovered || _focused
        ? mixSrgb(rest.ink, 0.06, rest.fill)
        : rest.fill;

    final height = s.controlSmall;
    final radius = height / 2 * s.radiusScale;
    final iconOnly = widget.label == null;
    final padding = iconOnly
        ? EdgeInsetsDirectional.zero
        : EdgeInsetsDirectional.only(
            start: widget.leading != null ? 8 : 10,
            end: 10,
          );

    Widget chip = DecoratedBox(
      decoration: ShapeDecoration(
        color: fill,
        shape: SuperellipseBorder(
          radius: radius,
          side: BorderSide(color: rest.edge),
        ),
      ),
      child: SizedBox(
        height: height,
        width: iconOnly ? height : null,
        child: Padding(
          padding: padding,
          child: IconTheme.merge(
            data: IconThemeData(size: _iconSize, color: rest.ink),
            child: LucideStroke(
              width: 1.75,
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  fontSize: _fontSize,
                  height: _lineHeight / _fontSize,
                  leadingDistribution: TextLeadingDistribution.even,
                  fontWeight: FontWeight.w500,
                  color: rest.ink,
                ),
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  spacing: 4,
                  children: [
                    ?widget.leading,
                    if (widget.label case final label?)
                      Flexible(child: Text(label)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    if (!interactive) {
      return Semantics(
        container: true,
        label: widget.semanticLabel,
        child: chip,
      );
    }

    chip = FocusRing(visible: _focused, radius: radius, child: chip);
    return Semantics(
      container: true,
      button: true,
      label: widget.semanticLabel,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hovered = v),
        onShowFocusHighlight: (v) => setState(() => _focused = v),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.onPressed?.call(),
          ),
        },
        child: TouchTarget(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapDown: (_) => setState(() => _down = true),
            onTapUp: (_) => setState(() => _down = false),
            onTapCancel: () => setState(() => _down = false),
            onTap: widget.onPressed,
            child: chip,
          ),
        ),
      ),
    );
  }
}
