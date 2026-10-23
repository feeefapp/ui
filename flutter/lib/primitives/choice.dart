import 'dart:ui' show SemanticsRole;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';
import 'button.dart' show ControlSize;

/// A checkbox with a label, description, error and indeterminate state: the twin of `Checkbox` in
/// `@feeef.dev/ui/primitives/choice`. Clicking the label toggles it. Pass [checked] to control it,
/// or leave it null and set [defaultChecked] for a box that keeps its own state.
class Checkbox extends StatefulWidget {
  const Checkbox({
    super.key,
    this.checked,
    this.defaultChecked = false,
    this.onCheckedChange,
    this.label,
    this.description,
    this.error,
    this.indeterminate = false,
    this.disabled = false,
    this.required = false,
    this.controlSize = ControlSize.regular,
    this.focusNode,
  });

  /// The checked state, for a controlled box. Null keeps the state inside the widget.
  final bool? checked;

  /// The initial state of an uncontrolled box.
  final bool defaultChecked;

  /// Called with the new checked state.
  final ValueChanged<bool>? onCheckedChange;

  /// Visible label next to the mark.
  final Widget? label;

  /// Secondary text under the label.
  final Widget? description;

  /// Error message under the label; marks the control invalid.
  final String? error;

  /// Shows a dash for a partly selected group and reports a mixed state.
  final bool indeterminate;
  final bool disabled;

  /// Adds a marker after the label.
  final bool required;

  /// `regular` or `small`.
  final ControlSize controlSize;
  final FocusNode? focusNode;

  @override
  State<Checkbox> createState() => _CheckboxState();
}

class _CheckboxState extends State<Checkbox> {
  late bool _own = widget.defaultChecked;

  @override
  Widget build(BuildContext context) {
    final controlled = widget.checked != null;
    final checked = widget.checked ?? _own;
    return _Choice(
      radio: false,
      checked: checked,
      indeterminate: widget.indeterminate,
      onToggle: controlled && widget.onCheckedChange == null
          ? null
          : () {
              if (!controlled) setState(() => _own = !checked);
              widget.onCheckedChange?.call(!checked);
            },
      label: widget.label,
      description: widget.description,
      error: widget.error,
      disabled: widget.disabled,
      required: widget.required,
      controlSize: widget.controlSize,
      focusNode: widget.focusNode,
    );
  }
}

/// A single radio with a label and description. Prefer [RadioGroup], which names the set. Like a
/// native radio, selecting it reports `true` through [onCheckedChange]; it never unchecks itself.
class Radio extends StatefulWidget {
  const Radio({
    super.key,
    this.checked,
    this.defaultChecked = false,
    this.onCheckedChange,
    this.label,
    this.description,
    this.error,
    this.disabled = false,
    this.controlSize = ControlSize.regular,
    this.focusNode,
  });

  /// The checked state, for a controlled radio. Null keeps the state inside the widget.
  final bool? checked;

  /// The initial state of an uncontrolled radio.
  final bool defaultChecked;

  /// Called with `true` when the radio is selected.
  final ValueChanged<bool>? onCheckedChange;
  final Widget? label;
  final Widget? description;
  final String? error;
  final bool disabled;
  final ControlSize controlSize;
  final FocusNode? focusNode;

  @override
  State<Radio> createState() => _RadioState();
}

class _RadioState extends State<Radio> {
  late bool _own = widget.defaultChecked;

  @override
  Widget build(BuildContext context) {
    final controlled = widget.checked != null;
    final checked = widget.checked ?? _own;
    return _Choice(
      radio: true,
      checked: checked,
      onToggle: controlled && widget.onCheckedChange == null
          ? null
          : () {
              if (checked) return;
              if (!controlled) setState(() => _own = true);
              widget.onCheckedChange?.call(true);
            },
      label: widget.label,
      description: widget.description,
      error: widget.error,
      disabled: widget.disabled,
      controlSize: widget.controlSize,
      focusNode: widget.focusNode,
    );
  }
}

/// One entry in [RadioGroup]'s options.
class RadioOption {
  const RadioOption({
    required this.value,
    required this.label,
    this.description,
    this.disabled = false,
  });
  final String value;
  final Widget label;
  final Widget? description;
  final bool disabled;
}

/// A labelled set of mutually exclusive choices (the web kit's `RadioGroup`): one Tab stop on the
/// selected option, arrows move and select (mirrored in right-to-left), radio-group semantics.
class RadioGroup extends StatefulWidget {
  const RadioGroup({
    super.key,
    required this.label,
    required this.options,
    this.value,
    this.defaultValue,
    this.onValueChange,
    this.description,
    this.error,
    this.required = false,
    this.controlSize = ControlSize.regular,
  });

  /// The group's question (the legend).
  final String label;
  final List<RadioOption> options;

  /// The selected value, for a controlled group. Null keeps the selection inside the widget.
  final String? value;

  /// The initially selected value of an uncontrolled group.
  final String? defaultValue;
  final ValueChanged<String>? onValueChange;
  final Widget? description;
  final String? error;
  final bool required;
  final ControlSize controlSize;

  @override
  State<RadioGroup> createState() => _RadioGroupState();
}

class _RadioGroupState extends State<RadioGroup> {
  late String? _own = widget.defaultValue;
  String? get _value => widget.value ?? _own;
  bool get _interactive => widget.value == null || widget.onValueChange != null;

  void _select(String value) {
    if (widget.value == null) setState(() => _own = value);
    widget.onValueChange?.call(value);
  }

  final _nodes = <int, FocusNode>{};
  FocusNode _node(int i) => _nodes.putIfAbsent(i, FocusNode.new);

  @override
  void dispose() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final enabled = [
      for (var i = 0; i < widget.options.length; i++)
        if (!widget.options[i].disabled) i,
    ];
    if (enabled.isEmpty || !_interactive) {
      return KeyEventResult.ignored;
    }
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final delta = switch (event.logicalKey) {
      LogicalKeyboardKey.arrowDown => 1,
      LogicalKeyboardKey.arrowUp => -1,
      LogicalKeyboardKey.arrowRight => rtl ? -1 : 1,
      LogicalKeyboardKey.arrowLeft => rtl ? 1 : -1,
      _ => 0,
    };
    if (delta == 0) return KeyEventResult.ignored;
    final current = enabled.indexWhere(
      (i) => widget.options[i].value == _value,
    );
    final next =
        enabled[((current < 0 ? 0 : current) + delta + enabled.length) %
            enabled.length];
    _select(widget.options[next].value);
    _node(next).requestFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final selected = widget.options.indexWhere(
      (o) => o.value == _value && !o.disabled,
    );
    final tabIndex = selected >= 0
        ? selected
        : widget.options.indexWhere((o) => !o.disabled);
    return Semantics(
      container: true,
      role: SemanticsRole.radioGroup,
      label: widget.label,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: _onKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // The legend inherits the surrounding text size (the page's in the web kit), weight 500.
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: ExcludeSemantics(
                child: DefaultTextStyle.merge(
                  style: TextStyle(fontWeight: FontWeight.w500, color: c.ink),
                  child: Text(
                    widget.required ? '${widget.label} *' : widget.label,
                  ),
                ),
              ),
            ),
            if (widget.description != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: _css(
                  widget.description!,
                  size: 12,
                  lineHeight: 18,
                  color: c.muted,
                ),
              ),
            for (var i = 0; i < widget.options.length; i++)
              ExcludeFocusTraversal(
                excluding: i != tabIndex,
                child: _Choice(
                  radio: true,
                  checked: widget.options[i].value == _value,
                  onToggle: !_interactive
                      ? null
                      : () => _select(widget.options[i].value),
                  label: widget.options[i].label,
                  description: widget.options[i].description,
                  disabled: widget.options[i].disabled,
                  invalid: widget.error != null,
                  controlSize: widget.controlSize,
                  focusNode: _node(i),
                ),
              ),
            // `.lab-radio-group > p` keeps its 6px bottom margin inside the fieldset.
            if (widget.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: _css(
                  Text(widget.error!),
                  size: 12,
                  lineHeight: 18,
                  color: c.danger,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Text in a CSS line box: size, line height, weight, colour, on the browser's baseline.
Widget _css(
  Widget child, {
  required double size,
  required double lineHeight,
  FontWeight weight = FontWeight.w400,
  required Color color,
}) => DefaultTextStyle.merge(
  style: TextStyle(
    fontSize: size,
    height: lineHeight / size,
    leadingDistribution: TextLeadingDistribution.even,
    fontWeight: weight,
    color: color,
  ),
  child: CssBaseline(lineHeight: lineHeight, child: child),
);

class _Choice extends StatefulWidget {
  const _Choice({
    required this.radio,
    required this.checked,
    required this.onToggle,
    this.indeterminate = false,
    this.label,
    this.description,
    this.error,
    this.disabled = false,
    this.required = false,
    this.invalid = false,
    this.controlSize = ControlSize.regular,
    this.focusNode,
  });

  final bool radio, checked, indeterminate, disabled, required, invalid;
  final VoidCallback? onToggle;
  final Widget? label, description;
  final String? error;
  final ControlSize controlSize;
  final FocusNode? focusNode;

  @override
  State<_Choice> createState() => _ChoiceState();
}

/// `.lab-choice`: the label row (44px, 6/10 padding, 10px gap, control radius, 4% hover) with the
/// mark (20px, 1.5px muted border, 7px superellipse or round) and its check, dash or dot.
class _ChoiceState extends State<_Choice> {
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final compact = widget.controlSize == ControlSize.small;
    final enabled = !widget.disabled && widget.onToggle != null;
    final on = widget.checked || (!widget.radio && widget.indeterminate);
    final invalid = widget.invalid || widget.error != null;
    final markSize = compact ? 18.0 : 20.0;
    final markRadius = (compact ? 6.0 : 7.0) * s.radiusScale;
    final minHeight = theme.coarsePointer(context)
        ? 44.0
        : (compact ? s.controlSmall : s.controlHeight);
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final spring = reduced ? Duration.zero : const Duration(milliseconds: 320);

    final Color markFill;
    final Color markEdge;
    if (widget.radio) {
      markFill = c.surface;
      markEdge = invalid ? c.danger : (on ? c.focus : c.muted);
    } else {
      markFill = on ? c.primary : c.surface;
      markEdge = invalid ? c.danger : (on ? c.primary : c.muted);
    }

    final glyph = widget.radio
        ? SizedBox.square(
            dimension: 10,
            child: DecoratedBox(
              decoration: BoxDecoration(color: c.focus, shape: BoxShape.circle),
            ),
          )
        : (widget.indeterminate
              ? const LucideMinus(size: 14, strokeWidth: 2.5)
              : const LucideCheck(size: 14, strokeWidth: 2.5));

    final mark = AnimatedScale(
      scale: _down && enabled && !reduced ? 0.9 : 1,
      duration: reduced ? Duration.zero : const Duration(milliseconds: 280),
      curve: const Cubic(0.22, 1.5, 0.36, 1),
      child: TweenAnimationBuilder<Color?>(
        tween: ColorTween(end: markFill),
        duration: reduced ? Duration.zero : const Duration(milliseconds: 140),
        builder: (context, fill, child) => DecoratedBox(
          decoration: ShapeDecoration(
            color: fill,
            shape: widget.radio
                ? CircleBorder(side: BorderSide(color: markEdge, width: 1.5))
                : SuperellipseBorder(
                    radius: markRadius,
                    side: BorderSide(color: markEdge, width: 1.5),
                  ),
          ),
          child: child,
        ),
        child: SizedBox.square(
          dimension: markSize,
          child: Center(
            child: IconTheme.merge(
              data: IconThemeData(color: c.onPrimary),
              child: AnimatedOpacity(
                opacity: on ? 1 : 0,
                duration: reduced
                    ? Duration.zero
                    : const Duration(milliseconds: 100),
                child: AnimatedScale(
                  scale: on ? 1 : 0.4,
                  duration: spring,
                  curve: const Cubic(0.2, 1.6, 0.3, 1),
                  child: glyph,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final copy =
        (widget.label != null ||
            widget.description != null ||
            widget.error != null)
        ? Flexible(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 2,
              children: [
                if (widget.label != null)
                  _css(
                    widget.required && !widget.radio
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [widget.label!, const Text(' *')],
                          )
                        : widget.label!,
                    size: 14,
                    lineHeight: 20,
                    color: c.ink,
                  ),
                if (widget.description != null)
                  _css(
                    widget.description!,
                    size: 12,
                    lineHeight: 18,
                    color: c.muted,
                  ),
                if (widget.error != null)
                  _css(
                    Text(widget.error!),
                    size: 12,
                    lineHeight: 18,
                    color: c.danger,
                  ),
              ],
            ),
          )
        : null;

    final row = ConstrainedBox(
      constraints: BoxConstraints(minHeight: minHeight, minWidth: 44),
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: (_hovered || _focusVisible) && enabled
              ? mixSrgb(c.ink, 0.04, transparent)
              : transparent,
          shape: SuperellipseBorder(radius: s.radiusControl),
        ),
        child: Padding(
          padding: compact
              ? const EdgeInsets.symmetric(horizontal: 8, vertical: 4)
              : const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: compact ? 8 : 10,
            children: [
              // Keyboard focus hugs the mark.
              FocusRing(
                visible: _focusVisible,
                radius: widget.radio ? markSize / 2 : markRadius,
                child: mark,
              ),
              ?copy,
            ],
          ),
        ),
      ),
    );

    return Semantics(
      checked: widget.indeterminate ? null : widget.checked,
      mixed: !widget.radio && widget.indeterminate ? true : null,
      inMutuallyExclusiveGroup: widget.radio,
      enabled: enabled,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        enabled: enabled,
        mouseCursor: enabled
            ? SystemMouseCursors.click
            : SystemMouseCursors.forbidden,
        onShowHoverHighlight: (v) => setState(() => _hovered = v),
        onShowFocusHighlight: (v) => setState(() => _focusVisible = v),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.onToggle?.call(),
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: enabled ? (_) => setState(() => _down = true) : null,
          onTapUp: enabled ? (_) => setState(() => _down = false) : null,
          onTapCancel: enabled ? () => setState(() => _down = false) : null,
          onTap: enabled ? widget.onToggle : null,
          child: Opacity(opacity: widget.disabled ? 0.5 : 1, child: row),
        ),
      ),
    );
  }
}
