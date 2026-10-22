import 'dart:ui' show SemanticsRole;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';

/// One choice of a segmented control.
class SegmentOption<T> {
  const SegmentOption({
    required this.value,
    required this.label,
    this.icon,
    this.disabled = false,
  });

  /// Value reported to `onChange`.
  final T value;

  /// Visible text and accessible name.
  final String label;

  /// Decorative icon before the label.
  final Widget? icon;

  /// Skipped by the keyboard and not clickable.
  final bool disabled;
}

/// `grouped` draws its own glass container; `plain` sits directly on an existing surface.
enum SegmentedAppearance { grouped, plain }

/// A single choice among two to five short options, shown side by side: the Flutter twin of
/// `SegmentedControl` in `@feeef.dev/ui/primitives/segmented`. Radio semantics, one Tab stop,
/// arrow keys move and select (mirrored in right-to-left), Home and End jump to the ends.
class SegmentedControl<T> extends StatefulWidget {
  const SegmentedControl({
    super.key,
    required this.value,
    required this.onChange,
    required this.options,
    required this.label,
    this.disabled = false,
    this.appearance = SegmentedAppearance.grouped,
  });

  /// The selected option's value.
  final T value;

  /// Called with the chosen value on click and on every arrow, Home or End key press.
  final ValueChanged<T> onChange;

  /// Choices, in display order.
  final List<SegmentOption<T>> options;

  /// Accessible name of the radio group.
  final String label;

  /// Disables every option.
  final bool disabled;

  final SegmentedAppearance appearance;

  @override
  State<SegmentedControl<T>> createState() => _SegmentedControlState<T>();
}

class _SegmentedControlState<T> extends State<SegmentedControl<T>> {
  final _nodes = <int, FocusNode>{};

  FocusNode _node(int index) => _nodes.putIfAbsent(index, FocusNode.new);

  @override
  void dispose() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  List<int> get _enabled => [
    for (var i = 0; i < widget.options.length; i++)
      if (!widget.disabled && !widget.options[i].disabled) i,
  ];

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final enabled = _enabled;
    if (enabled.isEmpty) return KeyEventResult.ignored;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final key = event.logicalKey;
    final current = enabled.indexWhere(
      (i) => widget.options[i].value == widget.value,
    );
    int? next;
    if (key == LogicalKeyboardKey.home) {
      next = enabled.first;
    } else if (key == LogicalKeyboardKey.end) {
      next = enabled.last;
    } else {
      final delta = switch (key) {
        LogicalKeyboardKey.arrowRight => rtl ? -1 : 1,
        LogicalKeyboardKey.arrowLeft => rtl ? 1 : -1,
        LogicalKeyboardKey.arrowDown => 1,
        LogicalKeyboardKey.arrowUp => -1,
        _ => 0,
      };
      if (delta == 0) return KeyEventResult.ignored;
      next =
          enabled[((current < 0 ? 0 : current) + delta + enabled.length) %
              enabled.length];
    }
    widget.onChange(widget.options[next].value);
    _node(next).requestFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final grouped = widget.appearance == SegmentedAppearance.grouped;
    final enabled = _enabled;
    final tabIndex = enabled.any((i) => widget.options[i].value == widget.value)
        ? widget.options.indexWhere((o) => o.value == widget.value)
        : (enabled.isEmpty ? -1 : enabled.first);
    final optionHeight = theme.coarsePointer(context) ? 44.0 : s.controlCompact;

    final options = Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (var i = 0; i < widget.options.length; i++)
          _Segment(
            option: widget.options[i],
            selected: widget.options[i].value == widget.value,
            disabled: widget.disabled || widget.options[i].disabled,
            focusNode: _node(i),
            tabbable: i == tabIndex,
            height: optionHeight,
            padding: s.controlPadding,
            radius: s.radiusControlCompact,
            // 15px, but the dense themes' control size wins in the CSS (higher specificity).
            fontSize: s.density == Density.comfortable ? 15 : s.controlFont,
            onSelect: () => widget.onChange(widget.options[i].value),
          ),
      ],
    );

    return Semantics(
      container: true,
      role: SemanticsRole.radioGroup,
      label: widget.label,
      enabled: !widget.disabled,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: _onKey,
        child: grouped
            ? CustomPaint(
                painter: _GroupPainter(
                  fill: c.glassFill,
                  edge: c.line,
                  highlight: c.glassEdgeLow,
                  radius: s.radiusGroup,
                ),
                // 4px padding inside the group's 1px border.
                child: Padding(
                  padding: const EdgeInsets.all(5),
                  child: options,
                ),
              )
            : options,
      ),
    );
  }
}

class _Segment<T> extends StatefulWidget {
  const _Segment({
    required this.option,
    required this.selected,
    required this.disabled,
    required this.focusNode,
    required this.tabbable,
    required this.height,
    required this.padding,
    required this.radius,
    required this.fontSize,
    required this.onSelect,
  });

  final SegmentOption<T> option;
  final bool selected, disabled, tabbable;
  final FocusNode focusNode;
  final double height, padding, radius, fontSize;
  final VoidCallback onSelect;

  @override
  State<_Segment<T>> createState() => _SegmentState<T>();
}

/// One option: the web kit's ghost toolbar button with `.lab-segmented-option` geometry
/// (compact height, `--lab-control-padding` sides, compact radius, 15/20 text; selected = primary).
class _SegmentState<T> extends State<_Segment<T>> {
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final selected = widget.selected;
    final ink = selected ? c.onPrimary : c.muted;
    final fill = selected
        ? c.primary
        : _down && !widget.disabled
        ? c.controlPressed
        : _hovered && !widget.disabled
        ? c.controlHover
        : transparent;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      label: widget.option.label,
      enabled: !widget.disabled,
      excludeSemantics: true,
      // Only the selected option is a Tab stop; arrows reach the others (radio group pattern).
      child: ExcludeFocusTraversal(
        excluding: !widget.tabbable,
        child: FocusableActionDetector(
          focusNode: widget.focusNode,
          enabled: !widget.disabled,
          descendantsAreFocusable: false,
          mouseCursor: widget.disabled
              ? SystemMouseCursors.forbidden
              : SystemMouseCursors.click,
          onShowHoverHighlight: (value) => setState(() => _hovered = value),
          onShowFocusHighlight: (value) =>
              setState(() => _focusVisible = value),
          actions: {
            ActivateIntent: CallbackAction<ActivateIntent>(
              onInvoke: (_) => widget.onSelect(),
            ),
          },
          child: Builder(
            builder: (context) => GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapDown: widget.disabled
                  ? null
                  : (_) => setState(() => _down = true),
              onTapUp: widget.disabled
                  ? null
                  : (_) => setState(() => _down = false),
              onTapCancel: widget.disabled
                  ? null
                  : () => setState(() => _down = false),
              onTap: widget.disabled ? null : widget.onSelect,
              child: AnimatedOpacity(
                opacity: widget.disabled ? 0.42 : 1,
                duration: const Duration(milliseconds: 140),
                child: TweenAnimationBuilder<Color?>(
                  tween: ColorTween(end: fill),
                  duration: const Duration(milliseconds: 140),
                  curve: const Cubic(0.2, 0.8, 0.2, 1),
                  builder: (context, color, child) => DecoratedBox(
                    decoration: ShapeDecoration(
                      color: color,
                      shape: SuperellipseBorder(
                        radius: widget.radius,
                        side: _focusVisible
                            ? BorderSide(color: c.focus, width: 2)
                            : BorderSide.none,
                      ),
                    ),
                    child: child,
                  ),
                  child: SizedBox(
                    height: widget.height,
                    child: Padding(
                      padding: EdgeInsetsDirectional.symmetric(
                        // Options are border-box buttons with a 1px border.
                        horizontal: widget.padding + 1,
                      ),
                      child: IconTheme.merge(
                        data: IconThemeData(size: 18, color: ink),
                        child: DefaultTextStyle.merge(
                          style: TextStyle(
                            fontSize: widget.fontSize,
                            height: 20 / widget.fontSize,
                            leadingDistribution: TextLeadingDistribution.even,
                            color: ink,
                          ),
                          maxLines: 1,
                          softWrap: false,
                          child: CssBaseline(
                            lineHeight: 20,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              spacing: 6,
                              children: [
                                if (widget.option.icon != null)
                                  widget.option.icon!,
                                Text(widget.option.label),
                              ],
                            ),
                          ),
                        ),
                      ),
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

/// `.lab-segmented`: glass fill, 1px line edge, `--lab-glass-light` (a light top edge).
class _GroupPainter extends CustomPainter {
  _GroupPainter({
    required this.fill,
    required this.edge,
    required this.highlight,
    required this.radius,
  });
  final Color fill, edge, highlight;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    canvas.drawPath(shape, Paint()..color = fill);
    // CSS inset shadows live inside the 1px border (the padding box).
    final inner = superellipsePath(rect, radii, inset: 1);
    canvas.save();
    canvas.clipPath(inner);
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, 1)),
      ),
      Paint()..color = highlight,
    );
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, -1)),
      ),
      Paint()..color = const Color.from(alpha: 0.06, red: 0, green: 0, blue: 0),
    );
    canvas.restore();
    canvas.drawPath(
      superellipsePath(rect, radii, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = edge,
    );
  }

  @override
  bool shouldRepaint(_GroupPainter old) =>
      old.fill != fill ||
      old.edge != edge ||
      old.radius != radius ||
      old.highlight != highlight;
}
