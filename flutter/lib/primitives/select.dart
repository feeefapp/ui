import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'button.dart' show ControlSize;
import '../theme/surfaces.dart';
import 'popover_surface.dart';
import 'text_field.dart';
import '../glass/container.dart';

/// One choice in a [Select] menu. A check marks the selected option.
class Option {
  const Option({
    required this.value,
    required this.child,
    this.disabled = false,
  });

  /// The value passed to `onValueChange`; `''` is the "no selection" option.
  final String value;

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
  State<Select> createState() => _SelectState();
}

class _SelectState extends State<Select> with SingleTickerProviderStateMixin {
  final _portal = OverlayPortalController();
  final _link = LayerLink();
  final _trigger = GlobalKey();
  late final FocusNode _ownFocus = FocusNode();
  FocusNode get _focus => widget.focusNode ?? _ownFocus;
  // Fades the menu out over 140ms before it unmounts.
  late final _fade = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 140),
  );
  int _highlight = -1;
  bool _touched = false;
  bool _hovered = false;
  bool _focusVisible = false;
  String? _validationError;

  String get _value => widget.value ?? '';
  bool get _open =>
      _portal.isShowing && _fade.status != AnimationStatus.reverse;

  @override
  void dispose() {
    _fade.dispose();
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

  void _openMenu() {
    if (widget.disabled || _portal.isShowing) return;
    setState(() {
      _highlight = widget.children.indexWhere((o) => o.value == _value);
      if (_highlight < 0) {
        _highlight = widget.children.indexWhere((o) => !o.disabled);
      }
    });
    _portal.show();
    _fade.value = 1;
  }

  Future<void> _closeMenu() async {
    if (!_portal.isShowing) return;
    _touched = true;
    if (widget.validationMode != ValidationMode.submit) _validate(_value);
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (!reduced) await _fade.reverse().orCancel.catchError((_) {});
    if (mounted && _fade.status != AnimationStatus.forward) _portal.hide();
    _focus.requestFocus();
  }

  void _choose(int index) {
    if (index < 0 || index >= widget.children.length) return;
    final option = widget.children[index];
    if (option.disabled) return;
    widget.onValueChange(option.value);
    if (widget.validationMode == ValidationMode.change ||
        (_touched && widget.validationMode == ValidationMode.blur)) {
      _validate(option.value);
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
      (o) => o.value == _value && _value.isNotEmpty,
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
          compact: widget.controlSize == ControlSize.compact,
          variant: widget.variant,
          hovered: _hovered,
          open: _portal.isShowing,
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

    return CompositedTransformTarget(
      link: _link,
      child: OverlayPortal(
        controller: _portal,
        overlayChildBuilder: (context) => GlassLayer(child: _menu(context)),
        child: Semantics(
          button: true,
          enabled: !widget.disabled,
          expanded: _portal.isShowing,
          label: hint ?? widget.ariaLabel,
          value: selected.isEmpty ? null : _semanticValue(selected.first),
          child: KeyedSubtree(key: _trigger, child: trigger),
        ),
      ),
    );
  }

  String? _semanticValue(Option option) {
    final child = option.child;
    return child is Text ? child.data : option.value;
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
      if (!focused && !_portal.isShowing) {
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
                _portal.isShowing ? _closeMenu() : _openMenu();
              },
        child: child,
      ),
    ),
  );

  Widget _menu(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final box = _trigger.currentContext?.findRenderObject() as RenderBox?;
    final width = box?.size.width ?? 200;
    final below = box == null
        ? 300.0
        : MediaQuery.sizeOf(context).height -
              box.localToGlobal(Offset(0, box.size.height)).dy -
              6 -
              12;
    final space1 = s.density == Density.thin ? 2.0 : 4.0;
    final optionRadius = s.radiusGroup - space1 - 1;
    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: _closeMenu,
          ),
        ),
        CompositedTransformFollower(
          link: _link,
          targetAnchor: Alignment.bottomLeft,
          offset: const Offset(0, 6),
          child: Align(
            alignment: Alignment.topLeft,
            child: FadeTransition(
              opacity: _fade,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: width,
                  maxHeight: math.max(80, math.min(320, below)),
                ),
                child: IntrinsicWidth(
                  child: PopoverSurface(
                    padding: EdgeInsets.all(space1),
                    child: DefaultTextStyle.merge(
                      style: const TextStyle(
                        fontSize: 14,
                        height: 20 / 14,
                        leadingDistribution: TextLeadingDistribution.even,
                      ),
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            for (var i = 0; i < widget.children.length; i++)
                              _OptionRow(
                                option: widget.children[i],
                                checked: widget.children[i].value == _value,
                                highlighted: i == _highlight,
                                radius: optionRadius,
                                height: theme.coarsePointer(context)
                                    ? s.touchTarget
                                    : s.controlCompact,
                                highlight: mixSrgb(c.primary, 0.14, c.surface),
                                checkedFill: c.controlSelected,
                                both: mixSrgb(c.primary, 0.28, c.surface),
                                onHover: () => setState(() => _highlight = i),
                                onTap: () => _choose(i),
                              ),
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
      ],
    );
  }
}

/// `.lab-select-option`: 5px 10px, compact height, checked = selected tint and weight 500, check
/// icon at the end; highlighted = primary 14% (28% when also checked).
class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.option,
    required this.checked,
    required this.highlighted,
    required this.radius,
    required this.height,
    required this.highlight,
    required this.checkedFill,
    required this.both,
    required this.onHover,
    required this.onTap,
  });
  final Option option;
  final bool checked, highlighted;
  final double radius, height;
  final Color highlight, checkedFill, both;
  final VoidCallback onHover, onTap;

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
      child: MouseRegion(
        onEnter: (_) => onHover(),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: option.disabled ? null : onTap,
          child: Opacity(
            opacity: option.disabled ? 0.5 : 1,
            child: DecoratedBox(
              decoration: ShapeDecoration(
                color: fill,
                shape: SuperellipseBorder(radius: radius),
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: height),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  child: Row(
                    spacing: 12,
                    children: [
                      Expanded(
                        child: DefaultTextStyle.merge(
                          style: TextStyle(
                            fontWeight: checked
                                ? FontWeight.w500
                                : FontWeight.w400,
                          ),
                          child: CssBaseline(
                            lineHeight: 20,
                            child: option.child,
                          ),
                        ),
                      ),
                      if (checked) const LucideCheck(size: 18),
                    ],
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

/// The plain trigger (`.lab-select.lab-control`): a control-sized button in the variant's paint,
/// 13/20 text, 5px 10px padding (0 14px compact), 8px gap, hover and open fills.
class _PlainTrigger extends StatelessWidget {
  const _PlainTrigger({
    required this.compact,
    required this.variant,
    required this.hovered,
    required this.open,
    required this.focus,
    required this.child,
  });
  final bool compact, hovered, open, focus;
  final ControlVariant variant;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final paint = c.variant(variant);
    final coarse = theme.coarsePointer(context);
    final height = coarse
        ? s.touchTarget
        : (compact ? s.controlCompact : s.controlHeight);
    final radius = compact ? s.radiusControlCompact : s.radiusControl;
    final raised =
        variant == ControlVariant.elevated || variant == ControlVariant.filled;
    return CustomPaint(
      painter: ControlSurfacePainter(
        fill: open ? paint.pressed : (hovered ? paint.hover : paint.fill),
        edge: paint.edge,
        radius: radius,
        raised: raised,
        highlight: c.controlHighlight,
        depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
        focus: focus ? c.focus : null,
      ),
      child: SizedBox(
        height: height,
        child: Padding(
          // Border-box: the 1px border adds to the padding.
          padding: EdgeInsets.symmetric(horizontal: (compact ? 14 : 10) + 1),
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
