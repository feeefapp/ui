import 'dart:ui' as ui show BoxHeightStyle;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'text_field.dart' show InputValidator, ValidationMode;

/// The direction HTML gives a `dir="auto"` text control: right to left when the first strong
/// character is Arabic or Hebrew, left to right for any other non-empty value, and [parent] when
/// the value is empty.
TextDirection autoTextDirection(String value, TextDirection parent) {
  if (value.isEmpty) return parent;
  for (final rune in value.runes) {
    if (_isRtl(rune)) return TextDirection.rtl;
    if (_isLtrStrong(rune)) return TextDirection.ltr;
  }
  return TextDirection.ltr;
}

bool _isRtl(int c) =>
    (c >= 0x0590 && c <= 0x08FF) ||
    (c >= 0xFB1D && c <= 0xFDFF) ||
    (c >= 0xFE70 && c <= 0xFEFF) ||
    (c >= 0x10800 && c <= 0x10FFF) ||
    (c >= 0x1E800 && c <= 0x1EFFF);

bool _isLtrStrong(int c) =>
    (c >= 0x41 && c <= 0x5A) ||
    (c >= 0x61 && c <= 0x7A) ||
    (c >= 0xC0 && c <= 0x24F && c != 0xD7 && c != 0xF7) ||
    (c >= 0x370 && c <= 0x58F) ||
    (c >= 0x0900 && c <= 0x1FFF) ||
    (c >= 0x2C00 && c <= 0xD7FF) ||
    (c >= 0xF900 && c <= 0xFB1C);

/// An unpainted editable line (or lines) with the kit's validation and auto-growing lines: the
/// twin of `RawInput` in `@feeef.dev/ui/primitives/raw-input`. Selection, IME and keyboard stay
/// the platform's. Use it inside bespoke editors that draw their own surface (a composer, a
/// toolbar search); use `TextField` everywhere else.
///
/// It inherits the surrounding text style; its line height is the style's (`line-height: 1.5`
/// when the style sets none).
class RawInput extends StatefulWidget {
  const RawInput({
    super.key,
    this.value,
    this.defaultValue,
    this.onValueChange,
    this.multiline = false,
    this.autoResize = true,
    this.minLines = 1,
    this.maxLines,
    this.validator,
    this.error,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.label,
    this.disabled = false,
    this.readOnly = false,
    this.maxLength,
    this.textDirection,
    this.autoDirection = false,
    this.style,
    this.textAlign = TextAlign.start,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.obscureText = false,
    this.autofocus = false,
    this.controller,
    this.focusNode,
    this.onKeyEvent,
    this.onSubmitted,
    this.onFocusChange,
  });

  /// The text, for a controlled input. Null leaves it uncontrolled.
  final String? value;

  /// The initial text of an uncontrolled input.
  final String? defaultValue;

  /// Called with the new text on every change.
  final ValueChanged<String>? onValueChange;

  /// Several lines (a `<textarea>`) instead of one.
  final bool multiline;

  /// Multiline only: grows with its content between [minLines] and [maxLines]. Turn it off for
  /// editors that size themselves: the input then takes its natural height within its parent's
  /// constraints and scrolls when they cut it.
  final bool autoResize;

  /// Multiline only: visible lines when empty.
  final int minLines;

  /// Multiline only: lines before the input scrolls. Unlimited when null.
  final int? maxLines;

  /// Synchronous check run on the value; return an actionable error, or null when it is valid.
  final InputValidator? validator;

  /// An error to show now, such as one from the server.
  final String? error;

  /// When errors are reported: after the first blur, on every change, or only on submit.
  final ValidationMode validationMode;

  /// Called with the visible error message, or null when it clears.
  final ValueChanged<String?>? onValidationChange;

  /// Accessible name (`aria-label`).
  final String? label;
  final bool disabled, readOnly;

  /// Maximum length in characters.
  final int? maxLength;

  /// Text direction. Null follows the surrounding direction, or the text with [autoDirection].
  final TextDirection? textDirection;

  /// `dir="auto"`: the direction follows the first strong character of the text.
  final bool autoDirection;

  /// Merged over the surrounding text style.
  final TextStyle? style;
  final TextAlign textAlign;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final bool obscureText, autofocus;
  final TextEditingController? controller;
  final FocusNode? focusNode;

  /// Sees every key press first (`onKeyDown`); return `handled` to stop the input's own handling,
  /// e.g. to send on Enter.
  final KeyEventResult Function(KeyEvent event, TextEditingValue value)?
  onKeyEvent;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<bool>? onFocusChange;

  @override
  State<RawInput> createState() => RawInputState();
}

/// The state of a [RawInput]: [focus], [validate] and the current [validationMessage].
class RawInputState extends State<RawInput>
    implements TextSelectionGestureDetectorBuilderDelegate {
  late final TextEditingController _ownController = TextEditingController(
    text: widget.value ?? widget.defaultValue ?? '',
  );
  late final FocusNode _ownFocus = FocusNode(debugLabel: 'RawInput');
  late final _gestures = TextSelectionGestureDetectorBuilder(delegate: this);
  final _editableKey = GlobalKey<EditableTextState>();
  bool _touched = false;
  String? _message;
  String _last = '';

  TextEditingController get _controller => widget.controller ?? _ownController;
  FocusNode get _focus => widget.focusNode ?? _ownFocus;

  /// The error a submit would report now (custom validity), whether or not it is visible.
  String? get validationMessage => _currentError();

  @override
  GlobalKey<EditableTextState> get editableTextKey => _editableKey;
  @override
  bool get forcePressEnabled => false;
  @override
  bool get selectionEnabled => !widget.disabled;

  /// Moves keyboard focus into the input.
  void focus() => _focus.requestFocus();

  /// Runs validation now and reports the result, as a form submit does (`onInvalid`).
  String? validate() {
    _touched = true;
    final error = _currentError();
    _report(error);
    return error;
  }

  @override
  void initState() {
    super.initState();
    _last = _controller.text;
    _controller.addListener(_changed);
    _focus.addListener(_focusChanged);
  }

  @override
  void didUpdateWidget(RawInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    final old = oldWidget;
    if (old.controller != widget.controller) {
      (old.controller ?? _ownController).removeListener(_changed);
      _controller.addListener(_changed);
    }
    if (old.focusNode != widget.focusNode) {
      (old.focusNode ?? _ownFocus).removeListener(_focusChanged);
      _focus.addListener(_focusChanged);
    }
    final value = widget.value;
    if (value != null && value != _controller.text) {
      _last = value;
      _controller.value = TextEditingValue(
        text: value,
        selection: TextSelection.collapsed(offset: value.length),
      );
    }
    if (old.error != widget.error || old.validator != widget.validator) {
      if (_touched && widget.validationMode != ValidationMode.submit) {
        _report(_currentError());
      }
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

  KeyEventResult _key(FocusNode node, KeyEvent event) =>
      widget.onKeyEvent?.call(event, _controller.value) ??
      KeyEventResult.ignored;

  void _changed() {
    final text = _controller.text;
    if (text == _last) {
      setState(() {});
      return;
    }
    _last = text;
    if (widget.validationMode == ValidationMode.change ||
        (_touched && widget.validationMode == ValidationMode.blur)) {
      _report(_currentError());
    }
    widget.onValueChange?.call(text);
    // A controlled input shows the owner's value: put it back if the owner kept the old one.
    setState(() {});
  }

  bool _hadFocus = false;
  void _focusChanged() {
    final has = _focus.hasFocus;
    if (has == _hadFocus) return;
    _hadFocus = has;
    if (!has) {
      _touched = true;
      if (widget.validationMode != ValidationMode.submit) {
        _report(_currentError());
      }
    }
    widget.onFocusChange?.call(has);
  }

  String? _currentError() {
    final explicit = widget.error;
    if (explicit != null && explicit.isNotEmpty) return explicit;
    final next = widget.validator?.call(_controller.text);
    return next == null || next.isEmpty ? null : next;
  }

  void _report(String? error) {
    if (error == _message) return;
    setState(() => _message = error);
    widget.onValidationChange?.call(error);
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final inherited = DefaultTextStyle.of(context).style;
    var style = inherited.merge(widget.style);
    final fontSize = style.fontSize ?? 14;
    // `.lab-raw-editor { line-height: 1.5 }` unless the host sets one.
    final lineHeight = (style.height ?? 1.5) * fontSize;
    style = style.copyWith(
      height: lineHeight / fontSize,
      leadingDistribution: TextLeadingDistribution.even,
    );
    final parent = Directionality.of(context);
    final direction =
        widget.textDirection ??
        (widget.autoDirection
            ? autoTextDirection(_controller.text, parent)
            : parent);
    final multiline = widget.multiline;
    final lines = widget.minLines < 1 ? 1 : widget.minLines;
    final editable = EditableText(
      key: _editableKey,
      controller: _controller,
      focusNode: _focus,
      readOnly: widget.readOnly || widget.disabled,
      autofocus: widget.autofocus,
      obscureText: widget.obscureText,
      style: style,
      textAlign: widget.textAlign,
      textDirection: direction,
      cursorColor: c.focus,
      backgroundCursorColor: c.muted,
      cursorWidth: 1,
      selectionColor: mixSrgb(c.focus, 0.28, transparent),
      selectionHeightStyle: ui.BoxHeightStyle.max,
      enableInteractiveSelection: !widget.disabled,
      rendererIgnoresPointer: true,
      minLines: multiline && widget.autoResize ? lines : null,
      maxLines: multiline
          ? (widget.autoResize
                ? (widget.maxLines == null
                      ? null
                      : (widget.maxLines! < lines ? lines : widget.maxLines))
                : null)
          : 1,
      keyboardType:
          widget.keyboardType ??
          (multiline ? TextInputType.multiline : TextInputType.text),
      textInputAction:
          widget.textInputAction ??
          (multiline ? TextInputAction.newline : null),
      autofillHints: widget.autofillHints,
      inputFormatters: [
        if (widget.maxLength != null)
          LengthLimitingTextInputFormatter(widget.maxLength),
      ],
      onSubmitted: widget.onSubmitted,
      mouseCursor: SystemMouseCursors.text,
    );
    // The editor lays text out 2px narrower than its box (cursor width + 1px gap) and paints it
    // from the left, so text aligned to the right edge would stop 2px short of it; the browser's
    // input ends at the edge. Shift by that margin, or half of it for centred text.
    const caretMargin = 1 + 1.0;
    final rightShare = switch (widget.textAlign) {
      TextAlign.left => 0.0,
      TextAlign.right => 1.0,
      TextAlign.center => 0.5,
      TextAlign.end => direction == TextDirection.ltr ? 1.0 : 0.0,
      TextAlign.start ||
      TextAlign.justify => direction == TextDirection.rtl ? 1.0 : 0.0,
    };
    final placed = rightShare == 0
        ? editable
        : Transform.translate(
            offset: Offset(caretMargin * rightShare, 0),
            child: editable,
          );
    return Semantics(
      label: widget.label,
      hint: _message ?? '',
      textField: true,
      multiline: multiline,
      readOnly: widget.readOnly,
      enabled: !widget.disabled,
      maxValueLength: widget.maxLength,
      child: MouseRegion(
        cursor: widget.disabled
            ? SystemMouseCursors.forbidden
            : SystemMouseCursors.text,
        child: _gestures.buildGestureDetector(
          behavior: HitTestBehavior.translucent,
          // Sees keys before the app's text shortcuts and the IME (the focused input is below).
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: widget.onKeyEvent == null ? null : _key,
            // CssBaseline measures the ambient text style: give it the input's own.
            child: DefaultTextStyle.merge(
              style: style,
              child: CssBaseline(lineHeight: lineHeight, child: placed),
            ),
          ),
        ),
      ),
    );
  }
}
