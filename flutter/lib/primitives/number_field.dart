import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';
import '../theme/tokens.dart';
import 'button.dart';
import 'number_field_core.dart';
import 'text_field.dart' show FieldFormMember;

/// A Blender-style number field: the twin of `NumberField` in
/// `@feeef.dev/ui/primitives/number-field`. Drag anywhere on it to scrub the value (Shift for
/// precision), click without dragging to type, use arrows, Page Up/Down, Home/End or Backspace
/// (reset) from the keyboard. Typed values accept `+ - * /`, parentheses and `%`.
class NumberField extends StatefulWidget {
  const NumberField({
    super.key,
    required this.label,
    this.value,
    this.defaultValue,
    this.onValueChange,
    this.onValueCommit,
    this.min,
    this.max,
    this.step = 1,
    this.unit,
    this.format,
    this.fill,
    this.steppers = true,
    this.variant = ControlVariant.elevated,
    this.controlSize = ControlSize.regular,
    this.disabled = false,
    this.name,
    this.focusNode,
  });

  /// Name the value is submitted under in a [FieldForm] (a plain number, like the web hidden
  /// input).
  final String? name;

  /// Shown inside the field at the start; also the accessible name.
  final String label;

  /// Current value (controlled).
  final double? value;

  /// Initial value when uncontrolled, and the value Backspace resets to.
  final double? defaultValue;

  /// Called on every change: each drag move, step and typed commit.
  final ValueChanged<double>? onValueChange;

  /// Called once a change is final: drag release, step, typed commit.
  final ValueChanged<double>? onValueCommit;

  /// Bounds; with both, the field shows a fill and its width maps to the full range.
  final double? min, max;

  /// Snap interval; also sets the displayed decimals.
  final double step;

  /// Text after the value, e.g. `DA` or `%`.
  final String? unit;

  /// Display text for the value.
  final String Function(double value)? format;

  /// Shows the range fill. Defaults to true when both bounds are set.
  final bool? fill;

  /// Shows ‹ › steppers at the ends (on hover and focus).
  final bool steppers;
  final ControlVariant variant;
  final ControlSize controlSize;
  final bool disabled;
  final FocusNode? focusNode;

  @override
  State<NumberField> createState() => _NumberFieldState();
}

/// Groups thousands with commas and shows [decimals] places (`Intl.NumberFormat('en')`).
String formatNumber(double value, int decimals) {
  final fixed = value.abs().toStringAsFixed(decimals);
  final parts = fixed.split('.');
  final whole = parts[0];
  final grouped = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) grouped.write(',');
    grouped.write(whole[i]);
  }
  final sign = value < 0 && double.parse(fixed) != 0 ? '-' : '';
  return '$sign$grouped${parts.length > 1 ? '.${parts[1]}' : ''}';
}

class _NumberFieldState extends State<NumberField>
    with FieldFormMember<NumberField> {
  late double _local;
  String? _editing;
  bool _dragging = false, _hovered = false, _focusVisible = false;
  late final FocusNode _ownFocus = FocusNode();
  final _inputFocus = FocusNode();
  final _controller = TextEditingController();
  ({double x, double value, double width, bool moved, double slop})? _drag;

  FocusNode get _focus => widget.focusNode ?? _ownFocus;
  double get _step => widget.step.isFinite && widget.step > 0 ? widget.step : 1;
  NumberFieldBounds get _bounds =>
      NumberFieldBounds(min: widget.min, max: widget.max, step: _step);
  double get _value =>
      widget.value == null ? _local : clampNumber(widget.value!, _bounds);
  bool get _rtl => Directionality.of(context) == TextDirection.rtl;

  @override
  void initState() {
    super.initState();
    _local = clampNumber(widget.defaultValue ?? widget.min ?? 0, _bounds);
    _inputFocus.addListener(() {
      if (!_inputFocus.hasFocus && _editing != null) _finish(true);
    });
  }

  @override
  void dispose() {
    _ownFocus.dispose();
    _inputFocus.dispose();
    _controller.dispose();
    super.dispose();
  }

  /// The latest value this field reported, ahead of a controlling parent's rebuild.
  double? _latest;

  double _set(double next, bool commit) {
    final clamped = clampNumber(next, _bounds);
    _latest = clamped;
    final changed = clamped != _value;
    if (widget.value == null) setState(() => _local = clamped);
    if (changed) widget.onValueChange?.call(clamped);
    if (commit) widget.onValueCommit?.call(clamped);
    return clamped;
  }

  @override
  String? get formName => widget.name;
  @override
  String get formValue {
    final value = _value;
    // JavaScript's String(number): no trailing `.0`.
    return value == value.roundToDouble() && value.abs() < 1e15
        ? value.toInt().toString()
        : value.toString();
  }

  @override
  bool validateForSubmit() => true;

  @override
  void resetField() {
    final initial = widget.defaultValue ?? widget.min ?? 0;
    if (widget.value == null) {
      setState(() => _local = clampNumber(initial, _bounds));
    } else {
      widget.onValueChange?.call(clampNumber(initial, _bounds));
    }
  }

  @override
  void focusField() => _focus.requestFocus();

  void _startEditing([String? initial]) {
    if (widget.disabled) return;
    final text = initial ?? _value.toStringAsFixed(stepDecimals(_step));
    _controller.value = TextEditingValue(
      text: text,
      selection: text.length > 1
          ? TextSelection(baseOffset: 0, extentOffset: text.length)
          : TextSelection.collapsed(offset: text.length),
    );
    setState(() => _editing = text);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _inputFocus.requestFocus(),
    );
  }

  void _finish(bool commit) {
    if (_editing == null) return;
    final parsed = commit ? parseNumberExpression(_controller.text) : null;
    setState(() => _editing = null);
    if (parsed != null) _set(parsed, true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (widget.disabled || _editing != null) return KeyEventResult.ignored;
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    final name = switch (key) {
      LogicalKeyboardKey.arrowUp => 'ArrowUp',
      LogicalKeyboardKey.arrowDown => 'ArrowDown',
      LogicalKeyboardKey.arrowLeft => 'ArrowLeft',
      LogicalKeyboardKey.arrowRight => 'ArrowRight',
      LogicalKeyboardKey.pageUp => 'PageUp',
      LogicalKeyboardKey.pageDown => 'PageDown',
      LogicalKeyboardKey.home => 'Home',
      LogicalKeyboardKey.end => 'End',
      _ => '',
    };
    final next = keyValue(name, _value, _bounds, rtl: _rtl);
    if (next != null) {
      _set(next, true);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.f2) {
      _startEditing();
      return KeyEventResult.handled;
    }
    if ((key == LogicalKeyboardKey.backspace ||
            key == LogicalKeyboardKey.delete) &&
        widget.defaultValue != null) {
      _set(widget.defaultValue!, true);
      return KeyEventResult.handled;
    }
    final character = event.character;
    final keys = HardwareKeyboard.instance;
    if (character != null &&
        RegExp(r'^[\d.,\-+(٠-٩]$').hasMatch(character) &&
        !keys.isMetaPressed &&
        !keys.isControlPressed &&
        !keys.isAltPressed) {
      _startEditing(character);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final paint = c.variant(widget.variant);
    // Field heights: it sits in forms next to text fields.
    final small = widget.controlSize == ControlSize.small;
    final base = small ? s.fieldHeightSmall : s.fieldHeight;
    final height = theme.coarsePointer(context) && base < s.touchTarget
        ? s.touchTarget
        : base;
    final radius = small ? s.radiusControlSmall : s.radiusControl;
    final pad = small ? 12.0 : 14.0;
    final value = _value;
    final decimals = stepDecimals(_step);
    final display = widget.format?.call(value) ?? formatNumber(value, decimals);
    final bounded = isBounded(_bounds);
    final fraction = (widget.fill ?? bounded)
        ? fillFraction(value, _bounds)
        : null;
    final editing = _editing != null;
    final active = !widget.disabled && !editing;
    final fill = _dragging
        ? paint.pressed
        : ((_hovered || _focusVisible) && active ? paint.hover : paint.fill);
    final showSteppers =
        (_hovered || _focusVisible || theme.coarsePointer(context)) &&
        !_dragging;

    Widget stepper(bool up) {
      final blocked =
          widget.disabled ||
          (up
              ? (widget.max != null && value >= widget.max!)
              : (widget.min != null && value <= widget.min!));
      return ExcludeFocus(
        child: AnimatedOpacity(
          opacity: showSteppers ? 1 : 0,
          duration: MotionTokens.durationFast,
          curve: MotionTokens.ease,
          child: SizedBox(
            width: 28,
            height: double.infinity,
            child: Semantics(
              button: true,
              label: '${up ? 'Increase' : 'Decrease'} ${widget.label}',
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: blocked
                    ? null
                    : () => _set(value + (up ? _step : -_step), true),
                child: Opacity(
                  opacity: blocked ? 0.42 : 1,
                  child: Center(
                    child: Transform.flip(
                      flipX: _rtl,
                      child: up
                          ? LucideChevronRight(size: 16, color: c.focus)
                          : LucideChevronLeft(size: 16, color: c.focus),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final textStyle = TextStyle(
      fontSize: small ? 13 : 14,
      height: 20 / (small ? 13 : 14),
      leadingDistribution: TextLeadingDistribution.even,
      color: paint.ink,
    );
    final content = editing
        ? Padding(
            padding: EdgeInsets.symmetric(horizontal: pad),
            child: CssBaseline(
              lineHeight: 20,
              child: EditableText(
                controller: _controller,
                focusNode: _inputFocus,
                style: DefaultTextStyle.of(context).style
                    .merge(textStyle)
                    .copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                textAlign: TextAlign.end,
                cursorColor: c.focus,
                backgroundCursorColor: c.muted,
                cursorWidth: 1,
                selectionColor: mixSrgb(c.focus, 0.28, const Color(0x00000000)),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                ),
                onSubmitted: (_) => _finish(true),
                onChanged: (text) => _editing = text,
              ),
            ),
          )
        : Padding(
            padding: EdgeInsets.symmetric(
              horizontal: widget.steppers ? 2 : pad,
            ),
            child: CssBaseline(
              lineHeight: 20,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                spacing: 12,
                children: [
                  Expanded(
                    child: Text(
                      widget.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: c.muted),
                    ),
                  ),
                  Text.rich(
                    TextSpan(
                      text: display,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                      children: [
                        if (widget.unit != null)
                          TextSpan(
                            text: '⁠ ${widget.unit}',
                            style: TextStyle(
                              color: c.muted,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                      ],
                    ),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          );

    Widget field = CustomPaint(
      painter: ControlSurfacePainter(
        fill: fill,
        edge: editing ? c.focus : paint.edge,
        // Editing reads as a field: its own edge thickens inward, no outer ring.
        edgeWidth: editing ? FocusRingStyle.of(context).width : 1,
        radius: radius,
        raised:
            widget.variant == ControlVariant.elevated ||
            widget.variant == ControlVariant.filled,
        highlight: c.controlHighlight,
        depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
        focus: _focusVisible && !editing ? FocusRingStyle.of(context) : null,
      ),
      child: ClipPath(
        clipper: ShapeBorderClipper(shape: SuperellipseBorder(radius: radius)),
        child: SizedBox(
          height: height,
          child: Stack(
            children: [
              if (fraction != null)
                Positioned.fill(
                  child: FractionallySizedBox(
                    alignment: AlignmentDirectional.centerStart,
                    widthFactor: fraction,
                    child: Opacity(
                      opacity: editing ? 0.35 : 1,
                      child: ColoredBox(
                        color: mixSrgb(
                          c.primary,
                          0.32,
                          const Color(0x00000000),
                        ),
                      ),
                    ),
                  ),
                ),
              Positioned.fill(
                child: Padding(
                  // The 1px border.
                  padding: const EdgeInsets.all(1),
                  child: DefaultTextStyle.merge(
                    style: textStyle,
                    child: Row(
                      children: [
                        if (widget.steppers && !editing) stepper(false),
                        Expanded(child: Center(child: content)),
                        if (widget.steppers && !editing) stepper(true),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    field = Opacity(opacity: widget.disabled ? 0.5 : 1, child: field);
    return Semantics(
      slider: bounded && !editing,
      textField: editing,
      label: widget.label,
      value: editing
          ? null
          : (widget.unit != null ? '$display ${widget.unit}' : display),
      increasedValue: formatNumber(
        clampNumber(value + _step, _bounds),
        decimals,
      ),
      decreasedValue: formatNumber(
        clampNumber(value - _step, _bounds),
        decimals,
      ),
      onIncrease: active ? () => _set(value + _step, true) : null,
      onDecrease: active ? () => _set(value - _step, true) : null,
      enabled: !widget.disabled,
      child: Focus(
        focusNode: _focus,
        canRequestFocus: !widget.disabled && !editing,
        skipTraversal: editing,
        onKeyEvent: _onKey,
        onFocusChange: (focused) => setState(
          () => _focusVisible =
              focused &&
              FocusManager.instance.highlightMode ==
                  FocusHighlightMode.traditional,
        ),
        child: MouseRegion(
          cursor: widget.disabled
              ? SystemMouseCursors.forbidden
              : (editing
                    ? SystemMouseCursors.text
                    : SystemMouseCursors.resizeLeftRight),
          onEnter: (_) => setState(() => _hovered = true),
          onExit: (_) => setState(() => _hovered = false),
          child: Listener(
            onPointerDown: (event) {
              if (widget.disabled ||
                  editing ||
                  event.buttons != kPrimaryButton) {
                return;
              }
              final box = context.findRenderObject() as RenderBox;
              _drag = (
                x: event.position.dx,
                value: value,
                width: box.size.width,
                moved: false,
                slop: event.kind == PointerDeviceKind.touch ? 6 : 3,
              );
            },
            onPointerMove: (event) {
              final d = _drag;
              if (d == null) return;
              final dx = event.position.dx - d.x;
              if (!d.moved) {
                if (dx.abs() < d.slop) return;
                // Start scrubbing from here, so crossing the threshold never jumps.
                _drag = (
                  x: event.position.dx,
                  value: d.value,
                  width: d.width,
                  moved: true,
                  slop: d.slop,
                );
                setState(() => _dragging = true);
                return;
              }
              _set(
                dragValue(
                  _bounds,
                  startValue: d.value,
                  dx: dx,
                  width: d.width,
                  fine: HardwareKeyboard.instance.isShiftPressed,
                  rtl: _rtl,
                ),
                false,
              );
            },
            onPointerUp: (event) {
              final d = _drag;
              _drag = null;
              if (d == null) return;
              if (d.moved) {
                setState(() => _dragging = false);
                widget.onValueCommit?.call(_latest ?? _value);
              } else {
                // A press on a stepper steps; anywhere else starts typing.
                final box = context.findRenderObject() as RenderBox;
                final local = box.globalToLocal(event.position);
                final onStepper =
                    widget.steppers &&
                    (local.dx < 29 || local.dx > box.size.width - 29);
                if (!onStepper) _startEditing();
              }
            },
            onPointerCancel: (_) {
              final d = _drag;
              _drag = null;
              if (d?.moved ?? false) setState(() => _dragging = false);
            },
            child: field,
          ),
        ),
      ),
    );
  }
}
