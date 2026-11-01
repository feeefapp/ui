import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'button.dart' show ControlOverrides, ControlSize;
import '../theme/surfaces.dart';
import '../menu/anchored_panel.dart';
import '../menu/menu_surface.dart';
import 'text_field.dart';

/// One choice in a [Select] menu. A check marks the selected option.
class Option {
  const Option({this.value, required this.child, this.disabled = false});

  /// The value passed to `onValueChange`; `''` is the "no selection" option. Defaults to the text
  /// of a [Text] child, like the web `Option`.
  final String? value;

  /// [value], or the child's text when it has none.
  String get resolvedValue =>
      value ?? (child is Text ? (child as Text).data ?? '' : '');

  /// The option's visible content, also shown in the trigger when selected.
  final Widget child;
  final bool disabled;
}

/// A single-choice dropdown: the twin of `Select` in `@feeef.dev/ui/primitives/select`. With a
/// hint, label, icons, supporting text or validation it sits in the same field frame as
/// [TextField]; without, it is a compact control-styled button. The menu opens below it on a
/// [PopoverSurface]; arrows move, Enter or Space chooses, Escape closes.
class Select extends StatefulWidget {
  const Select({
    super.key,
    required this.value,
    required this.onValueChange,
    required this.children,
    this.label,
    this.hint,
    this.ariaLabel,
    this.placeholder,
    this.name,
    this.variant = ControlVariant.elevated,
    this.controlSize = ControlSize.regular,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.disabled = false,
    this.required = false,
    this.requiredMessage = 'Choose an option.',
    this.validator,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.focusNode,
  });

  /// The selected option's value. `null` or `''` means nothing is selected.
  final String? value;
  final ValueChanged<String> onValueChange;

  /// The options of the menu.
  final List<Option> children;
  final String? label, hint;

  /// Accessible name when the select has no hint.
  final String? ariaLabel;

  /// Shown while nothing is selected, when there is no hint.
  final String? placeholder;

  /// Name the value is submitted under in a [FieldForm].
  final String? name;
  final ControlVariant variant;
  final ControlSize controlSize;
  final FieldLabelStyle labelStyle;
  final Widget? leadingIcon, leading, trailing, supportingText;
  final String? error;
  final bool disabled, required;

  /// Error shown when a required select is empty.
  final String requiredMessage;
  final InputValidator? validator;
  final ValidationMode validationMode;
  final ValueChanged<String?>? onValidationChange;
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('value', value))
      ..add(
        ObjectFlagProperty<ValueChanged<String>>.has(
          'onValueChange',
          onValueChange,
        ),
      )
      ..add(IterableProperty<Option>('children', children))
      ..add(StringProperty('label', label, defaultValue: null))
      ..add(StringProperty('hint', hint, defaultValue: null))
      ..add(StringProperty('ariaLabel', ariaLabel, defaultValue: null))
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(StringProperty('name', name, defaultValue: null))
      ..add(
        EnumProperty<ControlVariant>(
          'variant',
          variant,
          defaultValue: ControlVariant.elevated,
        ),
      )
      ..add(
        EnumProperty<ControlSize>(
          'controlSize',
          controlSize,
          defaultValue: ControlSize.regular,
        ),
      )
      ..add(
        EnumProperty<FieldLabelStyle>(
          'labelStyle',
          labelStyle,
          defaultValue: FieldLabelStyle.outlined,
        ),
      )
      ..add(StringProperty('error', error, defaultValue: null))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(FlagProperty('required', value: required, ifTrue: 'required'))
      ..add(
        StringProperty(
          'requiredMessage',
          requiredMessage,
          defaultValue: 'Choose an option.',
        ),
      )
      ..add(ObjectFlagProperty<InputValidator?>.has('validator', validator))
      ..add(
        EnumProperty<ValidationMode>(
          'validationMode',
          validationMode,
          defaultValue: ValidationMode.blur,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<String?>?>.has(
          'onValidationChange',
          onValidationChange,
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
  State<Select> createState() => _SelectState();
}

class _SelectState extends State<Select> with FieldFormMember<Select> {
  final _trigger = GlobalKey();
  late final FocusNode _ownFocus = FocusNode();
  FocusNode get _focus => widget.focusNode ?? _ownFocus;
  bool _menuOpen = false;
  double _triggerWidth = 0;
  int _highlight = -1;
  bool _touched = false;
  bool _hovered = false;
  bool _focusVisible = false;
  String? _validationError;

  String get _value => widget.value ?? '';
  bool get _open => _menuOpen;

  @override
  void dispose() {
    _ownFocus.dispose();
    super.dispose();
  }

  String? _check(String value) {
    if (widget.required && value.isEmpty) return widget.requiredMessage;
    final error = widget.validator?.call(value);
    return error == null || error.isEmpty ? null : error;
  }

  void _validate(String value) {
    final error = _check(value);
    if (error == _validationError) return;
    setState(() => _validationError = error);
    widget.onValidationChange?.call(error);
  }

  @override
  String? get formName => widget.name;
  @override
  String get formValue => _value;
  @override
  bool validateForSubmit() {
    _touched = true;
    _validate(_value);
    return widget.error == null && _check(_value) == null;
  }

  @override
  void resetField() {
    _touched = false;
    if (_validationError != null) {
      setState(() => _validationError = null);
      widget.onValidationChange?.call(null);
    }
  }

  @override
  void focusField() => _focus.requestFocus();

  void _openMenu() {
    if (widget.disabled || _menuOpen) return;
    setState(() {
      _highlight = widget.children.indexWhere((o) => o.resolvedValue == _value);
      if (_highlight < 0) {
        _highlight = widget.children.indexWhere((o) => !o.disabled);
      }
    });
    setState(() {
      _triggerWidth = _trigger.currentContext?.size?.width ?? 0;
      _menuOpen = true;
    });
  }

  void _closeMenu() {
    if (!_menuOpen) return;
    _touched = true;
    if (widget.validationMode != ValidationMode.submit) _validate(_value);
    // The menu flies back into the field (MenuSurface) before it unmounts.
    setState(() => _menuOpen = false);
    _focus.requestFocus();
  }

  void _choose(int index) {
    if (index < 0 || index >= widget.children.length) return;
    final option = widget.children[index];
    if (option.disabled) return;
    widget.onValueChange(option.resolvedValue);
    if (widget.validationMode == ValidationMode.change ||
        (_touched && widget.validationMode == ValidationMode.blur)) {
      _validate(option.resolvedValue);
    }
    _closeMenu();
  }

  void _move(int delta) {
    final n = widget.children.length;
    if (n == 0) return;
    var next = _highlight;
    for (var i = 0; i < n; i++) {
      next = (next + delta).clamp(0, n - 1);
      if (!widget.children[next].disabled) break;
    }
    setState(() => _highlight = next);
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    if (!_open) {
      if (key == LogicalKeyboardKey.arrowDown ||
          key == LogicalKeyboardKey.arrowUp ||
          key == LogicalKeyboardKey.enter ||
          key == LogicalKeyboardKey.space) {
        _openMenu();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (key == LogicalKeyboardKey.escape || key == LogicalKeyboardKey.tab) {
      _closeMenu();
      return key == LogicalKeyboardKey.tab
          ? KeyEventResult.ignored
          : KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowDown) _move(1);
    if (key == LogicalKeyboardKey.arrowUp) _move(-1);
    if (key == LogicalKeyboardKey.home) _move(-widget.children.length);
    if (key == LogicalKeyboardKey.end) _move(widget.children.length);
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.space) {
      _choose(_highlight);
    }
    return KeyEventResult.handled;
  }

  bool get _decorated =>
      widget.hint != null ||
      widget.label != null ||
      widget.placeholder != null ||
      widget.leadingIcon != null ||
      widget.leading != null ||
      widget.trailing != null ||
      widget.supportingText != null ||
      widget.error != null ||
      _validationError != null ||
      widget.required ||
      widget.validator != null;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final selected = widget.children.where(
      (o) => o.resolvedValue == _value && _value.isNotEmpty,
    );
    final hint = widget.hint ?? widget.label;
    final Widget? shown = selected.isNotEmpty
        ? selected.first.child
        : (hint == null && widget.placeholder != null
              ? Text(widget.placeholder!, style: TextStyle(color: c.muted))
              : null);
    final chevron = const LucideChevronDown(size: 18);
    final message = widget.error ?? _validationError;

    Widget trigger;
    if (_decorated) {
      trigger = FieldShell(
        label: widget.label,
        hint: widget.hint,
        labelStyle: widget.labelStyle,
        variant: widget.variant,
        controlSize: widget.controlSize,
        leadingIcon: widget.leadingIcon,
        leading: widget.leading,
        trailing: widget.trailing,
        supportingText: widget.supportingText,
        error: message,
        disabled: widget.disabled,
        required: widget.required,
        populated: _value.isNotEmpty,
        frameBuilder: (context, frame) => _pressable(frame),
        child: Builder(
          builder: (context) {
            final style = DefaultTextStyle.of(context).style;
            final line = (style.height ?? 1.25) * (style.fontSize ?? 16);
            return Row(
              spacing: 12,
              children: [
                Expanded(
                  child: CssBaseline(
                    lineHeight: line,
                    child: DefaultTextStyle.merge(
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      child: shown ?? const SizedBox.shrink(),
                    ),
                  ),
                ),
                IconTheme.merge(
                  data: IconThemeData(color: c.ink),
                  child: chevron,
                ),
              ],
            );
          },
        ),
      );
    } else {
      trigger = _pressable(
        _PlainTrigger(
          small: widget.controlSize == ControlSize.small,
          variant: widget.variant,
          hovered: _hovered,
          open: _menuOpen,
          focus: _focusVisible,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 8,
            children: [
              if (shown != null) CssBaseline(lineHeight: 20, child: shown),
              // An inline icon on a 13/20 line: it stands on the baseline (14px down), so its line
              // box is 24px tall with the icon at the top, and that box is centred.
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: chevron,
              ),
            ],
          ),
        ),
      );
    }

    // The options grow out of the field as a glass menu that covers it, centred on it.
    return AnchoredPanel(
      open: _menuOpen,
      onDismiss: _closeMenu,
      cover: true,
      panel: _menu,
      child: Semantics(
        button: true,
        enabled: !widget.disabled,
        expanded: _menuOpen,
        label: hint ?? widget.ariaLabel,
        value: selected.isEmpty ? null : _semanticValue(selected.first),
        child: KeyedSubtree(key: _trigger, child: trigger),
      ),
    );
  }

  String? _semanticValue(Option option) {
    final child = option.child;
    return child is Text ? child.data : option.resolvedValue;
  }

  Widget _pressable(Widget child) => Focus(
    focusNode: _focus,
    canRequestFocus: !widget.disabled,
    onKeyEvent: _onKey,
    onFocusChange: (focused) {
      setState(
        () => _focusVisible =
            focused &&
            FocusManager.instance.highlightMode ==
                FocusHighlightMode.traditional,
      );
      if (!focused && !_menuOpen) {
        _touched = true;
        if (widget.validationMode != ValidationMode.submit) _validate(_value);
      }
    },
    child: MouseRegion(
      cursor: widget.disabled
          ? SystemMouseCursors.forbidden
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.disabled
            ? null
            : () {
                _focus.requestFocus();
                _menuOpen ? _closeMenu() : _openMenu();
              },
        child: child,
      ),
    ),
  );

  Widget _menu(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return ConstrainedBox(
      // `.lab-select-menu`: at most 320 tall, at least as wide as the field.
      constraints: const BoxConstraints(maxHeight: 320),
      child: MenuSurface(
        label: widget.hint ?? widget.ariaLabel,
        minWidth: _triggerWidth,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < widget.children.length; i++)
              _OptionRow(
                option: widget.children[i],
                checked: widget.children[i].resolvedValue == _value,
                highlighted: i == _highlight,
                highlight: mixSrgb(c.primary, 0.14, c.surface),
                checkedFill: c.controlSelected,
                both: mixSrgb(c.primary, 0.28, c.surface),
                onHover: () => setState(() => _highlight = i),
                onTap: () => _choose(i),
              ),
          ],
        ),
      ),
    );
  }
}

/// `.lab-select-option` in the menu: the menu's row metrics; checked = selected tint and weight
/// 500, check icon at the end; highlighted = primary 14% (28% when also checked).
class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.option,
    required this.checked,
    required this.highlighted,
    required this.highlight,
    required this.checkedFill,
    required this.both,
    required this.onHover,
    required this.onTap,
  });
  final Option option;
  final bool checked, highlighted;
  final Color highlight, checkedFill, both;
  final VoidCallback onHover, onTap;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<Option>('option', option))
      ..add(FlagProperty('checked', value: checked, ifTrue: 'checked'))
      ..add(
        FlagProperty('highlighted', value: highlighted, ifTrue: 'highlighted'),
      )
      ..add(ColorProperty('highlight', highlight))
      ..add(ColorProperty('checkedFill', checkedFill))
      ..add(ColorProperty('both', both))
      ..add(ObjectFlagProperty<VoidCallback>.has('onHover', onHover))
      ..add(ObjectFlagProperty<VoidCallback>.has('onTap', onTap));
  }

  @override
  Widget build(BuildContext context) {
    final fill = checked && highlighted
        ? both
        : highlighted
        ? highlight
        : checked
        ? checkedFill
        : const Color(0x00000000);
    return Semantics(
      selected: checked,
      button: true,
      enabled: !option.disabled,
      child: MenuRow(
        label: DefaultTextStyle.merge(
          style: TextStyle(
            fontWeight: checked ? FontWeight.w500 : FontWeight.w400,
          ),
          child: option.child,
        ),
        trailing: checked ? const LucideCheck(size: 18) : null,
        fill: fill,
        enabled: !option.disabled,
        onHover: onHover,
        onTap: onTap,
      ),
    );
  }
}

/// The plain trigger (`.lab-select.lab-control`): a control-sized button in the variant's paint,
/// 13/20 text, 5px 10px padding (the small padding when small), 8px gap, hover and open fills.
class _PlainTrigger extends StatelessWidget {
  const _PlainTrigger({
    required this.small,
    required this.variant,
    required this.hovered,
    required this.open,
    required this.focus,
    required this.child,
  });
  final bool small, hovered, open, focus;
  final ControlVariant variant;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('small', value: small, ifTrue: 'small'))
      ..add(FlagProperty('hovered', value: hovered, ifTrue: 'hovered'))
      ..add(FlagProperty('open', value: open, ifTrue: 'open'))
      ..add(FlagProperty('focus', value: focus, ifTrue: 'focused'))
      ..add(EnumProperty<ControlVariant>('variant', variant));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final paint = c.variant(variant);
    final coarse = theme.coarsePointer(context);
    // A host (toolbar bubble, dock) sets the regular height and the inset radius, like a
    // button's; touch growth stops at the host's target (in a bubble: the bubble's control).
    final overrides = ControlOverrides.maybeOf(context);
    final base = small
        ? s.controlSmall
        : (overrides?.height ?? s.controlHeight);
    final touch = overrides?.touchTarget ?? s.touchTarget;
    final height = coarse && touch > base ? touch : base;
    final radius =
        overrides?.radius ?? (small ? s.radiusControlSmall : s.radiusControl);
    final raised =
        variant == ControlVariant.elevated || variant == ControlVariant.filled;
    return CustomPaint(
      painter: ControlSurfacePainter(
        dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
        fill: open
            ? paint.pressed
            : (hovered || focus ? paint.hover : paint.fill),
        edge: paint.edge,
        radius: radius,
        raised: raised,
        highlight: c.controlHighlight,
        depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
        focus: focus ? FocusRingStyle.of(context) : null,
      ),
      child: SizedBox(
        height: height,
        child: Padding(
          // Border-box: the 1px border adds to the padding.
          padding: EdgeInsets.symmetric(
            horizontal: (small ? s.controlPaddingSmall : 10) + 1,
          ),
          child: Center(
            widthFactor: 1,
            child: IconTheme.merge(
              data: IconThemeData(color: paint.ink),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  fontSize: 13,
                  height: 20 / 13,
                  leadingDistribution: TextLeadingDistribution.even,
                  color: paint.ink,
                ),
                maxLines: 1,
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
