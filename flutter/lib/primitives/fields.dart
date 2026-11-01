/// Plain form fields, the twin of `@feeef.dev/ui/primitives/fields`: `Input` and `Textarea` are
/// the bare `.lab-input` / `.lab-textarea` boxes (no label frame; use [TextField] for that) and
/// `Label` is `.lab-label` text. The web `Input type="checkbox|radio"` renders the kit's Checkbox
/// or Radio; in Dart use those widgets directly. Flutter's own `Image` is the twin of `Image`.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';

/// A bare single-line text box (`<input class="lab-input">`): field height, 5px 10px padding, a
/// 1px line border with superellipse corners, the surface fill, 13px/20px text, a focus-coloured
/// edge that thickens inward when focused (no outer ring), half opacity when disabled, a danger
/// border when [invalid].
class Input extends StatelessWidget {
  const Input({
    super.key,
    this.controller,
    this.defaultValue,
    this.onChanged,
    this.onSubmitted,
    this.placeholder,
    this.ariaLabel,
    this.disabled = false,
    this.readOnly = false,
    this.invalid = false,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.autofocus = false,
    this.focusNode,
  });

  /// Owns the text (controlled); otherwise the field keeps its own, starting at [defaultValue].
  final TextEditingController? controller;
  final String? defaultValue;
  final ValueChanged<String>? onChanged, onSubmitted;

  /// Shown while empty, in the muted colour at 70%.
  final String? placeholder;

  /// Accessible name (`aria-label`); pair a visible [Label] with it.
  final String? ariaLabel;
  final bool disabled, readOnly;

  /// `aria-invalid`: paints the danger border.
  final bool invalid;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final bool autofocus;
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        DiagnosticsProperty<TextEditingController>(
          'controller',
          controller,
          defaultValue: null,
        ),
      )
      ..add(StringProperty('defaultValue', defaultValue, defaultValue: null))
      ..add(
        ObjectFlagProperty<ValueChanged<String>?>.has('onChanged', onChanged),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<String>?>.has(
          'onSubmitted',
          onSubmitted,
        ),
      )
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(StringProperty('ariaLabel', ariaLabel, defaultValue: null))
      ..add(
        FlagProperty(
          'disabled',
          value: disabled,
          ifTrue: 'disabled',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'readOnly',
          value: readOnly,
          ifTrue: 'read-only',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'invalid',
          value: invalid,
          ifTrue: 'invalid',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'obscureText',
          value: obscureText,
          ifTrue: 'obscured',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<TextInputType>(
          'keyboardType',
          keyboardType,
          defaultValue: null,
        ),
      )
      ..add(
        EnumProperty<TextInputAction>(
          'textInputAction',
          textInputAction,
          defaultValue: null,
        ),
      )
      ..add(
        IterableProperty<String>(
          'autofillHints',
          autofillHints,
          defaultValue: null,
        ),
      )
      ..add(
        FlagProperty(
          'autofocus',
          value: autofocus,
          ifTrue: 'autofocus',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) => _RawField(
    multiline: false,
    controller: controller,
    defaultValue: defaultValue,
    onChanged: onChanged,
    onSubmitted: onSubmitted,
    placeholder: placeholder,
    ariaLabel: ariaLabel,
    disabled: disabled,
    readOnly: readOnly,
    invalid: invalid,
    obscureText: obscureText,
    keyboardType: keyboardType,
    textInputAction: textInputAction,
    autofillHints: autofillHints,
    autofocus: autofocus,
    focusNode: focusNode,
  );
}

/// A bare multi-line text box (`<textarea class="lab-textarea">`): like [Input], growing from
/// [minLines] (the browser's two rows) to [maxLines] (unbounded by default).
class Textarea extends StatelessWidget {
  const Textarea({
    super.key,
    this.controller,
    this.defaultValue,
    this.onChanged,
    this.placeholder,
    this.ariaLabel,
    this.disabled = false,
    this.readOnly = false,
    this.invalid = false,
    this.minLines = 2,
    this.maxLines,
    this.autofocus = false,
    this.focusNode,
  });

  final TextEditingController? controller;
  final String? defaultValue;
  final ValueChanged<String>? onChanged;
  final String? placeholder;
  final String? ariaLabel;
  final bool disabled, readOnly, invalid;

  /// Visible rows at least (`rows`, default 2).
  final int minLines;

  /// Rows before it scrolls; null grows without limit.
  final int? maxLines;
  final bool autofocus;
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        DiagnosticsProperty<TextEditingController>(
          'controller',
          controller,
          defaultValue: null,
        ),
      )
      ..add(StringProperty('defaultValue', defaultValue, defaultValue: null))
      ..add(
        ObjectFlagProperty<ValueChanged<String>?>.has('onChanged', onChanged),
      )
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(StringProperty('ariaLabel', ariaLabel, defaultValue: null))
      ..add(
        FlagProperty(
          'disabled',
          value: disabled,
          ifTrue: 'disabled',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'readOnly',
          value: readOnly,
          ifTrue: 'read-only',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'invalid',
          value: invalid,
          ifTrue: 'invalid',
          defaultValue: false,
        ),
      )
      ..add(IntProperty('minLines', minLines, defaultValue: 2))
      ..add(IntProperty('maxLines', maxLines, defaultValue: null))
      ..add(
        FlagProperty(
          'autofocus',
          value: autofocus,
          ifTrue: 'autofocus',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) => _RawField(
    multiline: true,
    controller: controller,
    defaultValue: defaultValue,
    onChanged: onChanged,
    placeholder: placeholder,
    ariaLabel: ariaLabel,
    disabled: disabled,
    readOnly: readOnly,
    invalid: invalid,
    minLines: minLines,
    maxLines: maxLines,
    autofocus: autofocus,
    focusNode: focusNode,
  );
}

class _RawField extends StatefulWidget {
  const _RawField({
    required this.multiline,
    this.controller,
    this.defaultValue,
    this.onChanged,
    this.onSubmitted,
    this.placeholder,
    this.ariaLabel,
    this.disabled = false,
    this.readOnly = false,
    this.invalid = false,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.minLines = 1,
    this.maxLines,
    this.autofocus = false,
    this.focusNode,
  });
  final bool multiline;
  final TextEditingController? controller;
  final String? defaultValue;
  final ValueChanged<String>? onChanged, onSubmitted;
  final String? placeholder, ariaLabel;
  final bool disabled, readOnly, invalid, obscureText, autofocus;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final int minLines;
  final int? maxLines;
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty(
          'multiline',
          value: multiline,
          ifTrue: 'multiline',
          ifFalse: 'single-line',
        ),
      )
      ..add(
        DiagnosticsProperty<TextEditingController>(
          'controller',
          controller,
          defaultValue: null,
        ),
      )
      ..add(StringProperty('defaultValue', defaultValue, defaultValue: null))
      ..add(
        ObjectFlagProperty<ValueChanged<String>?>.has('onChanged', onChanged),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<String>?>.has(
          'onSubmitted',
          onSubmitted,
        ),
      )
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(StringProperty('ariaLabel', ariaLabel, defaultValue: null))
      ..add(
        FlagProperty(
          'disabled',
          value: disabled,
          ifTrue: 'disabled',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'readOnly',
          value: readOnly,
          ifTrue: 'read-only',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'invalid',
          value: invalid,
          ifTrue: 'invalid',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'obscureText',
          value: obscureText,
          ifTrue: 'obscured',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<TextInputType>(
          'keyboardType',
          keyboardType,
          defaultValue: null,
        ),
      )
      ..add(
        EnumProperty<TextInputAction>(
          'textInputAction',
          textInputAction,
          defaultValue: null,
        ),
      )
      ..add(
        IterableProperty<String>(
          'autofillHints',
          autofillHints,
          defaultValue: null,
        ),
      )
      ..add(IntProperty('minLines', minLines, defaultValue: 1))
      ..add(IntProperty('maxLines', maxLines, defaultValue: null))
      ..add(
        FlagProperty(
          'autofocus',
          value: autofocus,
          ifTrue: 'autofocus',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      );
  }

  @override
  State<_RawField> createState() => _RawFieldState();
}

class _RawFieldState extends State<_RawField> {
  late final _ownController = TextEditingController(
    text: widget.defaultValue ?? '',
  );
  late final _ownFocus = FocusNode();
  TextEditingController get _controller => widget.controller ?? _ownController;
  FocusNode get _focus => widget.focusNode ?? _ownFocus;
  bool _focusVisible = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_focusChanged);
    _controller.addListener(_rebuild);
  }

  @override
  void didUpdateWidget(_RawField old) {
    super.didUpdateWidget(old);
    final oldFocus = old.focusNode ?? _ownFocus;
    if (oldFocus != _focus) {
      oldFocus.removeListener(_focusChanged);
      _focus.addListener(_focusChanged);
    }
    final oldController = old.controller ?? _ownController;
    if (oldController != _controller) {
      oldController.removeListener(_rebuild);
      _controller.addListener(_rebuild);
    }
  }

  void _rebuild() => setState(() {});

  void _focusChanged() {
    // Text fields always show :focus-visible when focused.
    if (_focusVisible != _focus.hasFocus) {
      setState(() => _focusVisible = _focus.hasFocus);
    }
  }

  @override
  void dispose() {
    _focus.removeListener(_focusChanged);
    _controller.removeListener(_rebuild);
    _ownController.dispose();
    _ownFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final radius = s.radiusControl;
    final style = TextStyle(
      fontFamily: kitFontFamily,
      fontSize: 13,
      height: 20 / 13,
      color: c.ink,
      leadingDistribution: TextLeadingDistribution.even,
    );
    final border = widget.invalid
        ? c.danger
        : _focusVisible
        ? c.focus
        : c.line;
    final editable = EditableText(
      controller: _controller,
      focusNode: _focus,
      readOnly: widget.readOnly || widget.disabled,
      obscureText: widget.obscureText,
      style: style,
      strutStyle: StrutStyle.fromTextStyle(style, forceStrutHeight: true),
      cursorColor: c.ink,
      backgroundCursorColor: c.muted,
      selectionColor: c.focus.withValues(alpha: 0.25),
      keyboardType:
          widget.keyboardType ??
          (widget.multiline ? TextInputType.multiline : TextInputType.text),
      textInputAction: widget.textInputAction,
      autofillHints: widget.autofillHints,
      autofocus: widget.autofocus,
      minLines: widget.multiline ? widget.minLines : 1,
      maxLines: widget.multiline ? widget.maxLines : 1,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
    );
    final empty = _controller.text.isEmpty;
    final field = Stack(
      children: [
        if (empty && widget.placeholder != null)
          Positioned.fill(
            child: IgnorePointer(
              child: ExcludeSemantics(
                child: DefaultTextStyle(
                  style: style.copyWith(
                    color: c.muted.withValues(alpha: c.muted.a * 0.7),
                  ),
                  child: CssBaseline(
                    lineHeight: 20,
                    child: Text(
                      widget.placeholder!,
                      maxLines: widget.multiline ? null : 1,
                      overflow: widget.multiline ? null : TextOverflow.clip,
                    ),
                  ),
                ),
              ),
            ),
          ),
        editable,
      ],
    );
    final box = ConstrainedBox(
      constraints: BoxConstraints(minHeight: s.fieldHeight),
      child: CustomPaint(
        painter: _FieldPainter(
          fill: c.surface,
          edge: c.glassEdgeLow,
          border: border,
          borderWidth: _focusVisible && !widget.invalid
              ? FocusRingStyle.of(context).width
              : 1,
          radius: radius,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
          child: widget.multiline
              ? field
              : SizedBox(
                  height: s.fieldHeight - 12,
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: field,
                  ),
                ),
        ),
      ),
    );
    final ring = box;
    return Semantics(
      textField: true,
      multiline: widget.multiline,
      label: widget.ariaLabel,
      hint: widget.placeholder,
      enabled: !widget.disabled,
      child: IgnorePointer(
        ignoring: widget.disabled,
        child: Opacity(
          opacity: widget.disabled ? 0.5 : 1,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.disabled ? null : _focus.requestFocus,
            child: MouseRegion(
              cursor: widget.disabled
                  ? SystemMouseCursors.forbidden
                  : SystemMouseCursors.text,
              child: ring,
            ),
          ),
        ),
      ),
    );
  }
}

/// Fill, `box-shadow: inset 0 1px 0 edge` and the 1px border, all on the superellipse.
class _FieldPainter extends CustomPainter {
  _FieldPainter({
    required this.fill,
    required this.edge,
    required this.border,
    this.borderWidth = 1,
    required this.radius,
  });
  final Color fill, edge, border;
  final double radius, borderWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = List.filled(4, radius);
    canvas.drawPath(superellipsePath(rect, radii), Paint()..color = fill);
    // The inset shadow lives in the padding box: inside the border, minus itself moved 1px down.
    final inner = superellipsePath(
      rect.deflate(1),
      List.filled(4, radius > 1 ? radius - 1 : 0),
    );
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        inner,
        inner.shift(const Offset(0, 1)),
      ),
      Paint()..color = edge,
    );
    canvas.drawPath(
      superellipsePath(rect, radii, inset: borderWidth / 2),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = borderWidth
        ..color = border,
    );
  }

  @override
  bool shouldRepaint(_FieldPainter old) =>
      old.borderWidth != borderWidth ||
      old.fill != fill ||
      old.edge != edge ||
      old.border != border ||
      old.radius != radius;
}

/// Field label text (`<label class="lab-label">`): 13px, medium weight, 20px line height.
class Label extends StatelessWidget {
  const Label({super.key, required this.child});

  /// The label, usually a `Text`.
  final Widget child;

  @override
  Widget build(BuildContext context) => DefaultTextStyle.merge(
    style: const TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      height: 20 / 13,
    ),
    child: CssBaseline(lineHeight: 20, child: child),
  );
}
