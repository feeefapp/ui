import 'dart:ui' as ui show BoxHeightStyle, ClipOp;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'button.dart' show ControlSize;

/// Where the floated hint rests: on the border (`outlined`) or inside the field above the value.
enum FieldLabelStyle { inside, outlined }

/// When validation errors appear: after the first blur, on every change, or only when asked.
enum ValidationMode { blur, change, submit }

/// A synchronous check on the value: an actionable error, or null when it is valid.
typedef InputValidator = String? Function(String value);

/// The field frame on its own: surface, floating hint, icons, affixes, supporting text and
/// counter. It paints and labels; the child control owns editing, selection and validation. The
/// twin of `FieldShell` in `@feeef.dev/ui/primitives/field-shell`.
class FieldShell extends StatefulWidget {
  const FieldShell({
    super.key,
    this.label,
    this.hint,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.variant = ControlVariant.outlined,
    this.controlSize = ControlSize.regular,
    this.disabled = false,
    this.required = false,
    this.invalid = false,
    this.populated = false,
    this.alwaysFloat = false,
    this.counter,
    this.minLines = 1,
    this.frameBuilder,
    required this.child,
  });

  /// The field's name. It sits inside the empty field and floats up on focus or with a value.
  final String? hint;
  final String? label;
  final FieldLabelStyle labelStyle;

  /// Decorative icon at the start of the field. Hidden from assistive technology.
  final Widget? leadingIcon;

  /// Content at the start of the field, after the icon: a prefix such as `+213` or a currency.
  final Widget? leading;

  /// Content at the end of the field: a unit, a clear button or another small action.
  final Widget? trailing;

  /// Help text under the field. Replaced by [error] while there is one.
  final Widget? supportingText;

  /// Error message under the field. Any non-empty value marks the field invalid.
  final String? error;
  final ControlVariant variant;

  /// Field height: `regular` (44px) or `compact` (40px).
  final ControlSize controlSize;
  final bool disabled, required, invalid;

  /// Keeps the hint floated: the control holds a value.
  final bool populated;

  /// Always floats the hint, for controls that always show content (dates, colors).
  final bool alwaysFloat;

  /// Content at the end of the supporting line, such as a character count.
  final Widget? counter;

  /// Lines of the control (textarea rows); the frame grows by one line height per line.
  final int minLines;

  /// Wraps the frame (surface, adornments and hint, not the supporting line), for example to make
  /// the whole frame a hit target of the control.
  final Widget Function(BuildContext context, Widget frame)? frameBuilder;

  /// The control, laid out inside the frame's padding.
  final Widget child;

  @override
  State<FieldShell> createState() => _FieldShellState();
}

class _FieldShellState extends State<FieldShell> {
  bool _focused = false;
  final _leadingKey = GlobalKey();
  final _trailingKey = GlobalKey();
  double _leadingWidth = 0, _trailingWidth = 0;

  void _measure(_) {
    if (!mounted) return;
    double width(GlobalKey key) =>
        (key.currentContext?.findRenderObject() as RenderBox?)?.size.width ?? 0;
    final leading = width(_leadingKey), trailing = width(_trailingKey);
    if (leading != _leadingWidth || trailing != _trailingWidth) {
      setState(() {
        _leadingWidth = leading;
        _trailingWidth = trailing;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback(_measure);
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final dense = s.density != Density.comfortable;
    final compact = widget.controlSize == ControlSize.compact;
    final coarse = theme.coarsePointer(context);
    final paint = c.variant(widget.variant);
    final filled = widget.variant == ControlVariant.filled;
    final labelInk = filled ? c.onPrimary : c.muted;
    final invalid = (widget.error?.isNotEmpty ?? false) || widget.invalid;
    final hint = widget.hint ?? widget.label;
    final hasLabel = hint != null;

    // text-field.css: sizes per control size, density and label style.
    final touchCompact = compact && coarse;
    final height = touchCompact
        ? s.touchTarget
        : compact
        ? s.controlCompact
        : s.controlHeight;
    final font = switch (s.density) {
      Density.comfortable => 16.0,
      Density.compact => 14.0,
      Density.thin => 13.0,
    };
    final line = s.density == Density.thin ? 18.0 : 20.0;
    // Outlined labels, label-less fields and dense inside labels center the value.
    final insideLabel =
        widget.labelStyle == FieldLabelStyle.inside && hasLabel && !dense;
    final centered = ((height - line - 2) / 2).clamp(0.0, double.infinity);
    final padTop = insideLabel
        ? (compact && !touchCompact ? 14.0 : 17.0)
        : centered;
    final padBottom = insideLabel
        ? (compact && !touchCompact ? 4.0 : 5.0)
        : centered;
    final borderLabel =
        widget.labelStyle == FieldLabelStyle.outlined ||
        (widget.labelStyle == FieldLabelStyle.inside && dense);
    // The resting hint sits where one line of value sits: centred at every size and density.
    final restTop = (height - line) / 2;
    final floatTop = borderLabel
        ? -6.0
        : (compact && !touchCompact ? 3.0 : 4.0);
    final floatFont = borderLabel
        ? (widget.labelStyle == FieldLabelStyle.inside ? 11.0 : 12.0)
        : 10.0;
    final floatLine = borderLabel
        ? (widget.labelStyle == FieldLabelStyle.inside ? 12.0 : 14.0)
        : 12.0;
    final floated = widget.populated || widget.alwaysFloat || _focused;
    final labelText = hint == null
        ? null
        : (widget.required ? '$hint *' : hint);
    // A hint floated onto the border cuts a notch in the edge (a fieldset legend), not a patch.
    double? notchWidth;
    if (labelText != null && borderLabel && floated) {
      final base = DefaultTextStyle.of(context).style;
      final painter = TextPainter(
        text: TextSpan(
          text: labelText,
          style: TextStyle(
            fontFamily: base.fontFamily,
            fontFamilyFallback: base.fontFamilyFallback,
            fontSize: floatFont,
            height: floatLine / floatFont,
          ),
        ),
        maxLines: 1,
        textDirection: Directionality.of(context),
      )..layout();
      notchWidth = painter.width + 8;
      painter.dispose();
    }
    final radius = compact ? s.radiusControlCompact : s.radiusControl;
    final insetStart = (widget.leadingIcon != null || widget.leading != null)
        ? _leadingWidth + 24
        : 12.0;
    final insetEnd = widget.trailing != null ? _trailingWidth + 24 : 12.0;
    final ink = paint.ink;
    final edge = invalid
        ? c.danger
        : _focused
        ? c.focus
        : paint.edge;
    final labelColor = invalid
        ? c.danger
        : _focused
        ? (filled ? c.onPrimary : c.focus)
        : labelInk;
    final frameHeight = height + (widget.minLines - 1) * line;

    Widget frame = CustomPaint(
      painter: _FieldPainter(
        fill: paint.fill,
        edge: edge,
        radius: radius,
        ring: _focused ? (invalid ? c.danger : c.focus) : null,
        raised: widget.variant == ControlVariant.elevated && !_focused,
        highlight: c.controlHighlight,
        depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
        notch: notchWidth == null
            ? null
            : (start: insetStart - 4, width: notchWidth),
        rtl: Directionality.of(context) == TextDirection.rtl,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: frameHeight),
        child: Padding(
          // 1px border plus the CSS padding.
          padding: EdgeInsetsDirectional.fromSTEB(
            1 + insetStart,
            1 + padTop,
            1 + insetEnd,
            1 + padBottom,
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(
              fontSize: font,
              height: line / font,
              leadingDistribution: TextLeadingDistribution.even,
              color: ink,
            ),
            child: widget.child,
          ),
        ),
      ),
    );

    // Affixes inherit the surrounding text (the page's, in the web kit), only recoloured.
    final adornment = TextStyle(color: labelInk);
    frame = Stack(
      clipBehavior: Clip.none,
      children: [
        frame,
        if (widget.leadingIcon != null || widget.leading != null)
          PositionedDirectional(
            start: 12,
            top: 0,
            bottom: 0,
            child: IgnorePointer(
              child: Center(
                child: DefaultTextStyle.merge(
                  style: adornment,
                  child: IconTheme.merge(
                    data: IconThemeData(size: 20, color: labelInk),
                    child: Row(
                      key: _leadingKey,
                      mainAxisSize: MainAxisSize.min,
                      spacing: 12,
                      children: [
                        if (widget.leadingIcon != null)
                          ExcludeSemantics(child: widget.leadingIcon!),
                        if (widget.leading != null) widget.leading!,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        if (widget.trailing != null)
          PositionedDirectional(
            end: 12,
            top: 0,
            bottom: 0,
            child: Center(
              child: DefaultTextStyle.merge(
                style: adornment,
                child: IconTheme.merge(
                  data: IconThemeData(size: 20, color: labelInk),
                  child: Row(
                    key: _trailingKey,
                    mainAxisSize: MainAxisSize.min,
                    spacing: 4,
                    children: [widget.trailing!],
                  ),
                ),
              ),
            ),
          ),
        if (labelText != null)
          _FloatingLabel(
            text: labelText,
            floated: floated,
            restFont: font,
            restLine: line,
            restTop: restTop,
            floatTop: floatTop,
            floatFont: floatFont,
            floatLine: floatLine,
            start: borderLabel ? insetStart - 4 : insetStart,
            end: borderLabel ? null : insetEnd,
            padded: borderLabel,
            color: labelColor,
          ),
      ],
    );

    if (widget.frameBuilder != null) {
      frame = widget.frameBuilder!(context, frame);
    }
    final message = (widget.error?.isNotEmpty ?? false)
        ? Text(widget.error!)
        : widget.supportingText;
    final details = message == null && widget.counter == null
        ? null
        : Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 5, 16, 0),
            child: DefaultTextStyle.merge(
              style: TextStyle(
                fontSize: 12,
                height: 18 / 12,
                leadingDistribution: TextLeadingDistribution.even,
                color: invalid ? c.danger : c.muted,
              ),
              child: CssBaseline(
                lineHeight: 18,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 12,
                  children: [
                    Expanded(
                      child: Semantics(
                        liveRegion: true,
                        child: message ?? const SizedBox.shrink(),
                      ),
                    ),
                    if (widget.counter != null) widget.counter!,
                  ],
                ),
              ),
            ),
          );

    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (focused) => setState(() => _focused = focused),
      child: AnimatedOpacity(
        opacity: widget.disabled ? 0.5 : 1,
        duration: Duration.zero,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [frame, ?details],
        ),
      ),
    );
  }
}

/// The hint: inside the empty field, floated above the value (inside) or onto the border
/// (outlined, on a patch of the label surface), easing over 140ms like the CSS transition.
class _FloatingLabel extends StatelessWidget {
  const _FloatingLabel({
    required this.text,
    required this.floated,
    required this.restFont,
    required this.restLine,
    required this.restTop,
    required this.floatTop,
    required this.floatFont,
    required this.floatLine,
    required this.start,
    required this.end,
    required this.padded,
    required this.color,
  });
  final String text;
  final bool floated, padded;

  /// The resting hint reads like the value: the field's font and line height.
  final double restFont, restLine;
  final double restTop, floatTop, floatFont, floatLine, start;
  final double? end;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final base = DefaultTextStyle.of(context).style;
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 1;
    TextStyle style(double size) => TextStyle(
      fontFamily: base.fontFamily,
      fontFamilyFallback: base.fontFamilyFallback,
      fontSize: size,
    );
    final restShift = cssBaselineShift(style(restFont), restLine, dpr);
    final floatShift = cssBaselineShift(style(floatFont), floatLine, dpr);
    return TweenAnimationBuilder<double>(
      tween: Tween(end: floated ? 1 : 0),
      duration: reduced ? Duration.zero : const Duration(milliseconds: 140),
      curve: Curves.ease,
      builder: (context, t, _) {
        final size = restFont + (floatFont - restFont) * t;
        final line = restLine + (floatLine - restLine) * t;
        final top = restTop + (floatTop - restTop) * t;
        final shift = restShift + (floatShift - restShift) * t;
        return PositionedDirectional(
          start: start,
          end: end,
          top: top,
          child: IgnorePointer(
            child: ExcludeSemantics(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                widthFactor: end == null ? 1 : null,
                child: Padding(
                  padding: EdgeInsetsDirectional.symmetric(
                    horizontal: padded ? 4 : 0,
                  ),
                  child: SizedBox(
                    height: line,
                    child: Transform.translate(
                      offset: Offset(0, shift),
                      child: Text(
                        text,
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: size,
                          height: line / size,
                          leadingDistribution: TextLeadingDistribution.even,
                          fontWeight: FontWeight.w400,
                          color: color,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FieldPainter extends CustomPainter {
  _FieldPainter({
    required this.fill,
    required this.edge,
    required this.radius,
    required this.ring,
    required this.raised,
    required this.highlight,
    required this.depth,
    this.notch,
    this.rtl = false,
  });
  final Color fill, edge, highlight;
  final Color? ring;
  final double radius, depth;
  final bool raised;

  /// Where a hint floated onto the border cuts the edge and ring: its inline start and width.
  final ({double start, double width})? notch;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    if (raised) {
      canvas.drawPath(
        shape.shift(const Offset(0, 2)),
        Paint()
          ..color = Color.from(alpha: depth, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
    }
    if (fill.a > 0) canvas.drawPath(shape, Paint()..color = fill);
    if (raised) {
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
      canvas.restore();
    }
    if (notch case final n?) {
      // The outline's notch (text-field.css masks a 3px band from 1px outside the control).
      final width = n.width.clamp(0.0, size.width);
      final x = rtl ? size.width - n.start - width : n.start;
      canvas.save();
      canvas.clipRect(
        Rect.fromLTWH(x, -1, width, 3),
        clipOp: ui.ClipOp.difference,
      );
    }
    if (ring != null) {
      // box-shadow: 0 0 0 1px — a 1px band just outside the border.
      final outer = rect.inflate(1);
      canvas.drawPath(
        superellipsePath(outer, [for (final r in radii) r + 1], inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = ring!,
      );
    }
    if (edge.a > 0) {
      canvas.drawPath(
        superellipsePath(rect, radii, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = edge,
      );
    }
    if (notch != null) canvas.restore();
  }

  @override
  bool shouldRepaint(_FieldPainter old) =>
      old.fill != fill ||
      old.edge != edge ||
      old.ring != ring ||
      old.radius != radius ||
      old.raised != raised ||
      old.notch != notch ||
      old.rtl != rtl;
}

/// A labelled text input: an editable line (or growing lines) inside the field frame, with a
/// floating hint, icons, affixes, supporting text, validation and an optional counter. The twin
/// of `TextField` in `@feeef.dev/ui/primitives/text-field`.
class TextField extends StatefulWidget {
  const TextField({
    super.key,
    this.label,
    this.hint,
    this.placeholder,
    this.ariaLabel,
    this.name,
    this.controlSize = ControlSize.regular,
    this.variant = ControlVariant.outlined,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.showCounter = false,
    this.value,
    this.defaultValue,
    this.onValueChange,
    this.onSubmitted,
    this.validator,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.disabled = false,
    this.readOnly = false,
    this.required = false,
    this.requiredMessage = 'Fill in this field.',
    this.minLength,
    this.maxLength,
    this.multiline = false,
    this.minLines = 1,
    this.maxLines,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.textDirection,
    this.autofocus = false,
    this.controller,
    this.focusNode,
  });

  /// The field's name. It sits inside the empty field and floats up on focus or with a value.
  final String? hint;
  final String? label;

  /// Shown in the empty field when there is no [hint] or [label].
  final String? placeholder;

  /// Accessible name when the field has no [hint] or [label] (the web `aria-label`).
  final String? ariaLabel;

  /// Name the value is submitted under in a [FieldForm].
  final String? name;
  final ControlSize controlSize;
  final ControlVariant variant;
  final FieldLabelStyle labelStyle;
  final Widget? leadingIcon, leading, trailing, supportingText;

  /// An error to show now, such as one from the server.
  final String? error;

  /// Shows the character count under the field, with [maxLength] when set.
  final bool showCounter;

  /// The text, for a controlled field. Null shows an empty field.
  final String? value;

  /// The initial text, for an uncontrolled field.
  final String? defaultValue;

  /// Called with the new text on every change.
  final ValueChanged<String>? onValueChange;
  final ValueChanged<String>? onSubmitted;
  final InputValidator? validator;
  final ValidationMode validationMode;

  /// Called with the visible error message, or null when it clears.
  final ValueChanged<String?>? onValidationChange;

  /// [required] marks the hint and makes an empty field invalid.
  final bool disabled, readOnly, required;

  /// Error shown when a required field is empty.
  final String requiredMessage;

  /// Fewest characters a non-empty value needs.
  final int? minLength;
  final int? maxLength;

  /// A growing multi-line field instead of a single line.
  final bool multiline;

  /// Multiline only: visible lines when empty.
  final int minLines;

  /// Multiline only: lines before the field scrolls. Unlimited when null.
  final int? maxLines;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;

  /// Text direction of the field. Null follows the surrounding direction.
  final TextDirection? textDirection;
  final bool autofocus;
  final TextEditingController? controller;
  final FocusNode? focusNode;

  @override
  State<TextField> createState() => _TextFieldState();
}

class _TextFieldState extends State<TextField>
    with FieldFormMember<TextField>
    implements TextSelectionGestureDetectorBuilderDelegate {
  late final TextEditingController _ownController = TextEditingController(
    text: widget.value ?? widget.defaultValue ?? '',
  );
  late final FocusNode _ownFocus = FocusNode();
  late final _gestures = TextSelectionGestureDetectorBuilder(delegate: this);
  final _editableKey = GlobalKey<EditableTextState>();
  bool _touched = false;
  String? _validationError;

  TextEditingController get _controller => widget.controller ?? _ownController;
  FocusNode get _focus => widget.focusNode ?? _ownFocus;

  @override
  GlobalKey<EditableTextState> get editableTextKey => _editableKey;
  @override
  bool get forcePressEnabled => false;
  @override
  bool get selectionEnabled => !widget.disabled;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_changed);
    _focus.addListener(_focusChanged);
  }

  @override
  void didUpdateWidget(TextField old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      (old.controller ?? _ownController).removeListener(_changed);
      _controller.addListener(_changed);
    }
    if (old.focusNode != widget.focusNode) {
      (old.focusNode ?? _ownFocus).removeListener(_focusChanged);
      _focus.addListener(_focusChanged);
    }
    if (widget.value != null && widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value!,
        selection: TextSelection.collapsed(offset: widget.value!.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    _focus.removeListener(_focusChanged);
    _ownController.dispose();
    _ownFocus.dispose();
    super.dispose();
  }

  String _last = '';
  bool _resetting = false;
  void _changed() {
    final text = _controller.text;
    if (text == _last) return;
    _last = text;
    if (!_resetting &&
        (widget.validationMode == ValidationMode.change ||
            (_touched && widget.validationMode == ValidationMode.blur))) {
      _validate();
    }
    widget.onValueChange?.call(text);
    setState(() {});
  }

  void _focusChanged() {
    if (!_focus.hasFocus) {
      _touched = true;
      if (widget.validationMode != ValidationMode.submit) _validate();
    }
  }

  /// The browser's constraint checks (required, minLength, email), then [TextField.validator].
  String? _check(String text) {
    if (widget.required && text.isEmpty) return widget.requiredMessage;
    final min = widget.minLength;
    if (min != null && text.isNotEmpty && text.length < min) {
      return 'Use at least $min characters (now ${text.length}).';
    }
    if (widget.keyboardType == TextInputType.emailAddress &&
        text.isNotEmpty &&
        !RegExp(r'^[^\s@]+@[^\s@]+$').hasMatch(text)) {
      return 'Enter an email address, like name@example.com.';
    }
    final next = widget.validator?.call(text);
    return next == null || next.isEmpty ? null : next;
  }

  void _validate() => _show(_check(_controller.text));

  void _show(String? error) {
    if (error == _validationError) return;
    setState(() => _validationError = error);
    widget.onValidationChange?.call(error);
  }

  @override
  String? get formName => widget.name;
  @override
  String get formValue => _controller.text;
  @override
  bool validateForSubmit() {
    _touched = true;
    _validate();
    return widget.error == null && _check(_controller.text) == null;
  }

  @override
  void resetField() {
    _touched = false;
    _show(null);
    final initial = widget.defaultValue ?? '';
    if (widget.value == null) {
      _resetting = true;
      _controller.text = initial;
      _resetting = false;
    } else {
      widget.onValueChange?.call(initial);
    }
  }

  @override
  void focusField() => _focus.requestFocus();

  void _submitted(String text) {
    widget.onSubmitted?.call(text);
    if (!widget.multiline) form?.submit();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final paint = c.variant(widget.variant);
    final hint = widget.hint ?? widget.label;
    final text = _controller.text;
    final message = widget.error ?? _validationError;
    final ink = paint.ink;
    final dir = widget.textDirection ?? Directionality.of(context);
    final lines = widget.multiline ? widget.minLines.clamp(1, 1 << 20) : 1;

    return FieldShell(
      label: widget.label,
      hint: widget.hint,
      labelStyle: widget.labelStyle,
      leadingIcon: widget.leadingIcon,
      leading: widget.leading,
      trailing: widget.trailing,
      supportingText: widget.supportingText,
      error: message,
      variant: widget.variant,
      controlSize: widget.controlSize,
      disabled: widget.disabled,
      required: widget.required,
      populated: text.isNotEmpty,
      minLines: lines,
      // The whole frame is the input's hit target, like the web field whose input fills it.
      frameBuilder: (context, frame) => MouseRegion(
        cursor: widget.disabled
            ? SystemMouseCursors.forbidden
            : SystemMouseCursors.text,
        child: _gestures.buildGestureDetector(
          behavior: HitTestBehavior.translucent,
          child: frame,
        ),
      ),
      counter: widget.showCounter
          ? Text(
              widget.maxLength != null
                  ? '${text.length} / ${widget.maxLength}'
                  : '${text.length}',
            )
          : null,
      child: Builder(
        builder: (context) {
          final fieldStyle = DefaultTextStyle.of(context).style;
          final lineHeight =
              (fieldStyle.height ?? 1) * (fieldStyle.fontSize ?? 16);
          final editable = EditableText(
            key: _editableKey,
            controller: _controller,
            focusNode: _focus,
            readOnly: widget.readOnly || widget.disabled,
            autofocus: widget.autofocus,
            obscureText: widget.obscureText,
            style: DefaultTextStyle.of(context).style.copyWith(color: ink),
            textDirection: dir,
            cursorColor: c.focus,
            backgroundCursorColor: c.muted,
            cursorWidth: 1,
            selectionColor: mixSrgb(c.focus, 0.28, transparent),
            selectionHeightStyle: ui.BoxHeightStyle.max,
            selectionControls: null,
            enableInteractiveSelection: !widget.disabled,
            rendererIgnoresPointer: true,
            minLines: widget.multiline ? lines : null,
            maxLines: widget.multiline ? widget.maxLines : 1,
            keyboardType:
                widget.keyboardType ??
                (widget.multiline ? TextInputType.multiline : null),
            textInputAction: widget.textInputAction,
            autofillHints: widget.autofillHints,
            inputFormatters: [
              if (widget.maxLength != null)
                LengthLimitingTextInputFormatter(widget.maxLength),
            ],
            onSubmitted: _submitted,
            mouseCursor: SystemMouseCursors.text,
          );
          Widget field = CssBaseline(lineHeight: lineHeight, child: editable);
          if (hint == null && widget.placeholder != null && text.isEmpty) {
            field = Stack(
              children: [
                IgnorePointer(
                  child: CssBaseline(
                    lineHeight: lineHeight,
                    child: Text(
                      widget.placeholder!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: widget.variant == ControlVariant.filled
                            ? c.onPrimary
                            : c.muted,
                      ),
                    ),
                  ),
                ),
                field,
              ],
            );
          }
          return Semantics(
            label: hint ?? widget.ariaLabel ?? widget.placeholder,
            hint: message ?? '',
            textField: true,
            enabled: !widget.disabled,
            child: field,
          );
        },
      ),
    );
  }
}

/// What a field gives the [FieldForm] it sits in: its name and value for submission, a check that
/// reveals its error, a reset to its initial value and focus. [TextField], [Select] and
/// `NumberField` implement it; custom fields can too, registering with [FieldFormState.register].
abstract interface class FieldFormEntry {
  /// The submitted name. Fields without one are validated but not submitted.
  String? get formName;

  /// The value submitted under [formName].
  String get formValue;

  /// Runs every check, shows the error, and reports whether the field is valid.
  bool validateForSubmit();

  /// Restores the initial value and hides the error.
  void resetField();

  /// Moves focus to the field, for the first invalid one on submit.
  void focusField();
}

/// A form around kit fields: the twin of a web `<form>` with `onSubmit` and `onReset`. Call
/// `FieldForm.of(context).submit()` from a submit button (a single-line [TextField] submits on
/// Enter, like the browser's implicit submission). An invalid field blocks submission, shows its
/// error and takes focus; otherwise [onSubmit] gets the named values, like `FormData`.
class FieldForm extends StatefulWidget {
  const FieldForm({
    super.key,
    this.onSubmit,
    this.onReset,
    required this.child,
  });

  /// Called with `{name: value}` of every named field once all fields are valid.
  final ValueChanged<Map<String, String>>? onSubmit;

  /// Called after every field went back to its initial value.
  final VoidCallback? onReset;
  final Widget child;

  /// The nearest form, or null when the field is not in one.
  static FieldFormState? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_FieldFormScope>()?.form;

  static FieldFormState of(BuildContext context) {
    final form = maybeOf(context);
    assert(form != null, 'FieldForm.of() called outside a FieldForm');
    return form!;
  }

  @override
  State<FieldForm> createState() => FieldFormState();
}

class FieldFormState extends State<FieldForm> {
  final _fields = <FieldFormEntry>[];

  void register(FieldFormEntry field) {
    if (!_fields.contains(field)) _fields.add(field);
  }

  void unregister(FieldFormEntry field) => _fields.remove(field);

  /// Validates every field; submits when all are valid. Returns whether it submitted.
  bool submit() {
    FieldFormEntry? firstInvalid;
    for (final field in _fields) {
      if (!field.validateForSubmit()) firstInvalid ??= field;
    }
    if (firstInvalid != null) {
      firstInvalid.focusField();
      return false;
    }
    widget.onSubmit?.call({
      for (final field in _fields)
        if (field.formName != null) field.formName!: field.formValue,
    });
    return true;
  }

  /// Puts every field back to its initial value, then calls `onReset`.
  void reset() {
    for (final field in _fields) {
      field.resetField();
    }
    widget.onReset?.call();
  }

  @override
  Widget build(BuildContext context) =>
      _FieldFormScope(form: this, child: widget.child);
}

class _FieldFormScope extends InheritedWidget {
  const _FieldFormScope({required this.form, required super.child});
  final FieldFormState form;

  @override
  bool updateShouldNotify(_FieldFormScope old) => old.form != form;
}

/// Keeps a field registered with the nearest [FieldForm] while it is mounted.
mixin FieldFormMember<T extends StatefulWidget> on State<T>
    implements FieldFormEntry {
  FieldFormState? _form;

  /// The form this field belongs to, if any.
  FieldFormState? get form => _form;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final next = FieldForm.maybeOf(context);
    if (next != _form) {
      _form?.unregister(this);
      _form = next?..register(this);
    }
  }

  @override
  void dispose() {
    _form?.unregister(this);
    super.dispose();
  }
}
