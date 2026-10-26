import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../filters/temporal.dart';
import '../filters/temporal_dialog.dart';
import '../filters/temporal_editor.dart';
import '../glass/container.dart';
import '../menu/anchored_panel.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../toolbar.dart';
import 'button.dart';
import 'popover_surface.dart';
import 'text_field.dart';

/// A synchronous rule on a temporal value: an error message, or null when it is valid.
typedef TemporalValidator = String? Function(TemporalValue? value);

/// A date or time field: the twin of `TemporalField` in `@feeef.dev/ui/primitives/temporal-field`.
/// A full-surface trigger opens a selection-first picker with preset chips, calendars, number-field
/// times and optional typed entry. Single values open in a popover (a dialog on phones, under
/// 600px), ranges in a dialog. A date commits on the day you pick; times, datetimes and ranges
/// commit on Apply. Needs an [Overlay] above it.
class TemporalField extends StatefulWidget {
  const TemporalField({
    super.key,
    required this.type,
    required this.value,
    required this.onValueChange,
    this.min,
    this.max,
    this.step,
    this.allowOvernight = false,
    this.presets,
    this.hint,
    this.label,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.variant = ControlVariant.outlined,
    this.controlSize = ControlSize.regular,
    this.disabled = false,
    this.readOnly = false,
    this.required = false,
    this.requiredMessage = 'Choose a value.',
    this.placeholder,
    this.clearable = false,
    this.validator,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.onBlur,
    this.locale,
    this.formatValue,
    this.ariaLabel,
    this.focusNode,
  });

  /// Value shape and picker: date, time, datetime, or one of their `Range` forms.
  final TemporalType type;

  /// Committed value: a local ISO string (`2026-10-21`, `09:30`, `2026-10-21T09:30`), a range, or
  /// `null`.
  final TemporalValue? value;

  /// Called with the normalized value on Apply or when the clear button empties the field.
  final ValueChanged<TemporalValue?> onValueChange;

  /// Earliest allowed value, in the value's ISO format. Earlier days are disabled.
  final String? min;

  /// Latest allowed value, in the value's ISO format. Later days are disabled.
  final String? max;

  /// Allowed increment: days for dates, seconds for times and datetimes, counted from [min].
  final num? step;

  /// Time ranges only: lets the end time be earlier than the start (crossing midnight).
  final bool allowOvernight;

  /// Quick choices; defaults to `temporalPresets(type)`. Presets that break the rules are hidden.
  final List<TemporalPreset>? presets;

  /// The field's name. It sits inside the empty field and floats up with a value or while open.
  final String? hint;
  final String? label;
  final FieldLabelStyle labelStyle;

  /// Decorative icon at the start; a clock for times, a calendar otherwise when null.
  final Widget? leadingIcon;

  /// Content at the start of the field, after the icon.
  final Widget? leading;

  /// Content at the end of the field, before the clear button and the chevron.
  final Widget? trailing;

  /// Help text under the field. Replaced by an error while there is one.
  final Widget? supportingText;

  /// An error to show now, such as one from the server.
  final String? error;
  final ControlVariant variant;

  /// Field height: `regular` (44px) or `small` (36px).
  final ControlSize controlSize;

  /// Blocks opening and dims the field.
  final bool disabled;

  /// Shows the value but never opens the picker; skips validation.
  final bool readOnly;

  /// Requires a value; checked on blur and on Apply.
  final bool required;

  /// Error shown when a required field is empty.
  final String requiredMessage;

  /// Text shown while empty. Hidden when a [hint] is set; add an [ariaLabel] when used alone.
  final String? placeholder;

  /// Shows a clear button inside the field while it has a value.
  final bool clearable;

  /// Extra rule after the built-in format, step and bounds checks.
  final TemporalValidator? validator;

  /// When errors appear: after the field loses focus (default), on every change, or only when the
  /// host validates.
  final ValidationMode validationMode;

  /// Receives the current error message, or null once the value is valid.
  final ValueChanged<String?>? onValidationChange;

  /// Called when the trigger loses focus.
  final VoidCallback? onBlur;

  /// Locale for the displayed value and the calendar; the [I18n] locale when null. The stored
  /// value stays ISO.
  final String? locale;

  /// Replaces the default display text for the value. Display only.
  final String Function(TemporalValue? value)? formatValue;

  /// Accessible name when there is no visible [hint].
  final String? ariaLabel;

  /// Focus node of the trigger.
  final FocusNode? focusNode;

  @override
  State<TemporalField> createState() => _TemporalFieldState();
}

class _TemporalFieldState extends State<TemporalField> {
  final _frameKey = GlobalKey();
  late final FocusNode _ownFocus = FocusNode(debugLabel: 'TemporalField');
  final _popoverScope = FocusScopeNode(debugLabel: 'TemporalField popover');
  FocusNode get _focus => widget.focusNode ?? _ownFocus;

  bool _open = false;
  TemporalValue? _draft;
  String? _draftError;
  String? _message;
  bool _touched = false, _editing = false;

  bool get _range => isTemporalRange(widget.type);
  bool get _instant => widget.type == TemporalType.date;
  bool get _asDialog =>
      _range || (MediaQuery.maybeSizeOf(context)?.width ?? 1000) < 600;
  String? get _floatingHint => widget.hint ?? widget.label;
  String get _title =>
      _floatingHint ?? widget.ariaLabel ?? 'Choose date and time';

  TemporalConfig get _config => TemporalConfig(
    type: widget.type,
    min: widget.min,
    max: widget.max,
    step: widget.step,
    allowOvernight: widget.allowOvernight,
    presets: widget.presets,
  );

  @override
  void didUpdateWidget(TemporalField old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value &&
        _touched &&
        widget.validationMode != ValidationMode.submit) {
      _publish(_validate(widget.value), build: true);
    }
    if ((widget.disabled || widget.readOnly) && _open) {
      _editing = false;
      _open = false;
    }
  }

  @override
  void dispose() {
    _ownFocus.dispose();
    _popoverScope.dispose();
    super.dispose();
  }

  String? _validate(TemporalValue? next) {
    if (widget.readOnly) return null;
    final normalized = normalizeTemporal(next);
    if (widget.required && normalized == null) return widget.requiredMessage;
    final failure = validateTemporal(
      TemporalConfig(
        type: widget.type,
        min: widget.min,
        max: widget.max,
        step: widget.step,
        allowOvernight: widget.allowOvernight,
      ),
      normalized,
    );
    if (failure != null) return failure;
    final custom = widget.validator?.call(normalized);
    return custom == null || custom.isEmpty ? null : custom;
  }

  /// Shows [next] as the field's error and reports it. [build] is true while the framework is
  /// building (didUpdateWidget), where setState is not needed.
  void _publish(String? next, {bool build = false}) {
    if (build) {
      _message = next;
    } else {
      setState(() => _message = next);
    }
    widget.onValidationChange?.call(next);
  }

  void _begin() {
    if (widget.disabled || widget.readOnly) return;
    setState(() {
      _draft = widget.value;
      _draftError = null;
      _editing = true;
      _open = true;
    });
    if (!_asDialog) {
      // Focus moves into the popover (Radix focuses its content), so Escape reaches it.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _open) _popoverScope.requestFocus();
      });
    }
  }

  void _hide() {
    _editing = false;
    final wasOpen = _open;
    _open = false;
    if (wasOpen && !_asDialog) _focus.requestFocus();
  }

  void _close() {
    setState(_hide);
    _touched = true;
    if (widget.validationMode != ValidationMode.submit) {
      _publish(_validate(widget.value));
    }
  }

  void _commit(TemporalValue? next) {
    final normalized = normalizeTemporal(next);
    widget.onValueChange(normalized);
    _touched = true;
    if (widget.validationMode != ValidationMode.submit) {
      _publish(_validate(normalized));
    }
    setState(_hide);
  }

  void _apply() {
    final normalized = normalizeTemporal(_draft);
    final failure = _validate(normalized);
    if (failure != null) {
      setState(() => _draftError = failure);
      return;
    }
    _commit(normalized);
  }

  void _clear() {
    if (_instant) {
      _commit(null);
    } else {
      setState(() {
        _draft = null;
        _draftError = null;
      });
    }
  }

  void _changeDraft(TemporalValue? next) => setState(() {
    _draft = next;
    _draftError = null;
  });

  void _pick(TemporalValue? next) {
    if (!_instant) return;
    final failure = _validate(normalizeTemporal(next));
    if (failure != null) {
      setState(() => _draftError = failure);
    } else {
      _commit(next);
    }
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowDown ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space) {
      if (!widget.readOnly && !_open) _begin();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  /// The popover and the dialog end their footer with one glass group. A date with nothing to
  /// clear has no actions at all: the day itself is the action.
  Widget? _actions() {
    final empty = normalizeTemporal(_draft) == null;
    if (_instant && empty) return null;
    return GlassScope(
      child: ToolbarGroup(
        label: '$_title actions',
        children: [
          Button(
            appearance: ButtonAppearance.toolbar,
            controlSize: ControlSize.regular,
            disabled: empty,
            onClick: _clear,
            children: const [Text('Clear')],
          ),
          if (!_instant)
            Button(
              variant: ButtonVariant.filled,
              appearance: ButtonAppearance.toolbar,
              controlSize: ControlSize.regular,
              onClick: _apply,
              children: const [Text('Apply')],
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final locale = widget.locale ?? I18n.of(context).locale;
    final formatted =
        (widget.formatValue ??
        (v) => formatTemporalValue(widget.type, v, locale))(widget.value);
    final populated = normalizeTemporal(widget.value) != null;
    final shown = formatted.isNotEmpty
        ? formatted
        : (_floatingHint == null ? widget.placeholder ?? '' : '');
    final interactive = !widget.disabled && !widget.readOnly;

    final trailing = Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        ?widget.trailing,
        if (widget.clearable && populated && interactive)
          ControlOverrides.merge(
            context,
            height: 28,
            radius: theme.sizes.radiusControlSmall,
            child: IconButton(
              ariaLabel: 'Clear $_title',
              onClick: () {
                _focus.requestFocus();
                _commit(null);
              },
              icon: const LucideX(size: 16),
            ),
          ),
        const LucideChevronDown(size: 18),
      ],
    );

    final field = FieldShell(
      hint: widget.hint,
      label: widget.label,
      labelStyle: widget.labelStyle,
      leadingIcon:
          widget.leadingIcon ??
          (widget.type.name.startsWith('time')
              ? const LucideClock()
              : const LucideCalendarDays()),
      leading: widget.leading,
      trailing: trailing,
      supportingText: widget.supportingText,
      error: widget.error ?? _message,
      variant: widget.variant,
      controlSize: widget.controlSize,
      disabled: widget.disabled,
      required: widget.required,
      populated: populated,
      alwaysFloat: _open,
      frameBuilder: (context, frame) =>
          KeyedSubtree(key: _frameKey, child: _pressable(frame)),
      child: Builder(
        builder: (context) {
          final style = DefaultTextStyle.of(context).style;
          final line = (style.height ?? 1.25) * (style.fontSize ?? 16);
          // Full width: FieldShell's frame sizes to its child, which an input fills on the web.
          return CssBaseline(
            lineHeight: line,
            child: SizedBox(
              width: double.infinity,
              child: Text(
                shown.isEmpty ? ' ' : shown,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          );
        },
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnchoredPanel(
          open: _open && !_asDialog,
          onDismiss: _close,
          align: PanelAlign.start,
          sideOffset: 8,
          panel: _popover,
          child: Semantics(
            button: true,
            enabled: !widget.disabled,
            readOnly: widget.readOnly,
            expanded: _open,
            label:
                widget.ariaLabel ??
                _floatingHint ??
                widget.placeholder ??
                _title,
            value: formatted,
            child: field,
          ),
        ),
        TemporalDialog(
          open: _open && _asDialog,
          label: _title,
          close: _close,
          returnFocus: _focus,
          dir: Directionality.of(context),
          onApply: _apply,
          onClear: _clear,
          clearDisabled: normalizeTemporal(_draft) == null,
          showApply: !_instant,
          error: _draftError == null ? null : Text(_draftError!),
          config: _config,
          locale: locale,
          value: _draft,
          onChange: _changeDraft,
          onPick: _pick,
        ),
      ],
    );
  }

  Widget _pressable(Widget frame) => Focus(
    focusNode: _focus,
    canRequestFocus: !widget.disabled,
    onKeyEvent: _onKey,
    onFocusChange: (focused) {
      if (!focused && !_editing) {
        _touched = true;
        if (widget.validationMode != ValidationMode.submit) {
          _publish(_validate(widget.value));
        }
        widget.onBlur?.call();
      }
    },
    child: MouseRegion(
      cursor: widget.disabled
          ? SystemMouseCursors.forbidden
          : widget.readOnly
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.disabled
            ? null
            : () {
                _focus.requestFocus();
                if (_open && !_asDialog) {
                  _close();
                } else {
                  _begin();
                }
              },
        child: frame,
      ),
    ),
  );

  /// The anchored popover: start-aligned under the trigger (above it when there is more room
  /// there), 8px away, kept 12px inside its bounds ([AnchoredPanel]), hugging its content.
  Widget _popover(BuildContext context) {
    final calendar = temporalInputType(widget.type) != TemporalInput.time;
    final editor = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        TemporalFilterEditor(
          config: _config,
          locale: widget.locale ?? I18n.of(context).locale,
          value: _draft,
          resetKey: _open,
          onChange: _changeDraft,
          onPick: _pick,
          onSubmit: _apply,
          footer: _actions(),
        ),
        if (_draftError != null) TemporalError(child: Text(_draftError!)),
      ],
    );
    return Shortcuts(
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
      },
      child: Actions(
        actions: {
          DismissIntent: CallbackAction<DismissIntent>(
            onInvoke: (_) {
              _close();
              return null;
            },
          ),
        },
        child: FocusScope(
          node: _popoverScope,
          child: Semantics(
            scopesRoute: true,
            explicitChildNodes: true,
            label: _title,
            child: LayoutBuilder(
              builder: (context, constraints) => SizedBox(
                width: math.min(calendar ? 352.0 : 320.0, constraints.maxWidth),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 640),
                  child: PopoverSurface(
                    padding: const EdgeInsets.all(12),
                    child: SingleChildScrollView(child: editor),
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

/// Shared props of the single-value fields ([DateField], [TimeField], [DateTimeField]): the
/// committed value is a local ISO string, or null when empty.
abstract class TemporalSingleField extends StatelessWidget {
  const TemporalSingleField({
    super.key,
    required this.type,
    required this.value,
    required this.onValueChange,
    this.min,
    this.max,
    this.step,
    this.presets,
    this.hint,
    this.label,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.variant = ControlVariant.outlined,
    this.controlSize = ControlSize.regular,
    this.disabled = false,
    this.readOnly = false,
    this.required = false,
    this.requiredMessage = 'Choose a value.',
    this.placeholder,
    this.clearable = false,
    this.validator,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.onBlur,
    this.locale,
    this.formatValue,
    this.ariaLabel,
    this.focusNode,
  });

  /// Which single type this field edits.
  final TemporalType type;

  /// Committed local ISO string, or null when empty.
  final String? value;

  /// Called with the applied string, or null when cleared.
  final ValueChanged<String?> onValueChange;

  /// See [TemporalField.min].
  final String? min;

  /// See [TemporalField.max].
  final String? max;

  /// See [TemporalField.step].
  final num? step;

  /// See [TemporalField.presets].
  final List<TemporalPreset>? presets;
  final String? hint, label;
  final FieldLabelStyle labelStyle;
  final Widget? leadingIcon, leading, trailing, supportingText;
  final String? error;
  final ControlVariant variant;
  final ControlSize controlSize;
  final bool disabled, readOnly, required, clearable;

  /// See [TemporalField.requiredMessage].
  final String requiredMessage;

  /// See [TemporalField.placeholder].
  final String? placeholder;

  /// See [TemporalField.validator].
  final TemporalValidator? validator;
  final ValidationMode validationMode;
  final ValueChanged<String?>? onValidationChange;
  final VoidCallback? onBlur;
  final String? locale;
  final String Function(TemporalValue? value)? formatValue;
  final String? ariaLabel;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => TemporalField(
    type: type,
    value: value == null ? null : TemporalSingle(value!),
    onValueChange: (next) =>
        onValueChange(next is TemporalSingle ? next.value : null),
    min: min,
    max: max,
    step: step,
    presets: presets,
    hint: hint,
    label: label,
    labelStyle: labelStyle,
    leadingIcon: leadingIcon,
    leading: leading,
    trailing: trailing,
    supportingText: supportingText,
    error: error,
    variant: variant,
    controlSize: controlSize,
    disabled: disabled,
    readOnly: readOnly,
    required: required,
    requiredMessage: requiredMessage,
    placeholder: placeholder,
    clearable: clearable,
    validator: validator,
    validationMode: validationMode,
    onValidationChange: onValidationChange,
    onBlur: onBlur,
    locale: locale,
    formatValue: formatValue,
    ariaLabel: ariaLabel,
    focusNode: focusNode,
  );
}

/// Shared props of the range fields ([DateRangeField], [TimeRangeField], [DateTimeRangeField]):
/// the committed value is a range whose ends may be `''` (open), or null.
abstract class TemporalRangeField extends StatelessWidget {
  const TemporalRangeField({
    super.key,
    required this.type,
    required this.value,
    required this.onValueChange,
    this.min,
    this.max,
    this.step,
    this.allowOvernight = false,
    this.presets,
    this.hint,
    this.label,
    this.labelStyle = FieldLabelStyle.outlined,
    this.leadingIcon,
    this.leading,
    this.trailing,
    this.supportingText,
    this.error,
    this.variant = ControlVariant.outlined,
    this.controlSize = ControlSize.regular,
    this.disabled = false,
    this.readOnly = false,
    this.required = false,
    this.requiredMessage = 'Choose a value.',
    this.placeholder,
    this.clearable = false,
    this.validator,
    this.validationMode = ValidationMode.blur,
    this.onValidationChange,
    this.onBlur,
    this.locale,
    this.formatValue,
    this.ariaLabel,
    this.focusNode,
  });

  /// Which range type this field edits.
  final TemporalType type;

  /// Committed range of local ISO strings, or null.
  final TemporalRange? value;

  /// Called with the applied range, or null when cleared.
  final ValueChanged<TemporalRange?> onValueChange;

  /// See [TemporalField.min].
  final String? min;

  /// See [TemporalField.max].
  final String? max;

  /// See [TemporalField.step].
  final num? step;

  /// See [TemporalField.allowOvernight].
  final bool allowOvernight;

  /// See [TemporalField.presets].
  final List<TemporalPreset>? presets;
  final String? hint, label;
  final FieldLabelStyle labelStyle;
  final Widget? leadingIcon, leading, trailing, supportingText;
  final String? error;
  final ControlVariant variant;
  final ControlSize controlSize;
  final bool disabled, readOnly, required, clearable;

  /// See [TemporalField.requiredMessage].
  final String requiredMessage;

  /// See [TemporalField.placeholder].
  final String? placeholder;

  /// See [TemporalField.validator].
  final TemporalValidator? validator;
  final ValidationMode validationMode;
  final ValueChanged<String?>? onValidationChange;
  final VoidCallback? onBlur;
  final String? locale;
  final String Function(TemporalValue? value)? formatValue;
  final String? ariaLabel;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => TemporalField(
    type: type,
    value: value,
    onValueChange: (next) => onValueChange(next is TemporalRange ? next : null),
    min: min,
    max: max,
    step: step,
    allowOvernight: allowOvernight,
    presets: presets,
    hint: hint,
    label: label,
    labelStyle: labelStyle,
    leadingIcon: leadingIcon,
    leading: leading,
    trailing: trailing,
    supportingText: supportingText,
    error: error,
    variant: variant,
    controlSize: controlSize,
    disabled: disabled,
    readOnly: readOnly,
    required: required,
    requiredMessage: requiredMessage,
    placeholder: placeholder,
    clearable: clearable,
    validator: validator,
    validationMode: validationMode,
    onValidationChange: onValidationChange,
    onBlur: onBlur,
    locale: locale,
    formatValue: formatValue,
    ariaLabel: ariaLabel,
    focusNode: focusNode,
  );
}

/// A calendar day, stored as `YYYY-MM-DD`; it commits on the day you pick.
class DateField extends TemporalSingleField {
  const DateField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
  }) : super(type: TemporalType.date);
}

/// A time of day, stored as `HH:mm` (or `HH:mm:ss` when `step` is under 60 seconds).
class TimeField extends TemporalSingleField {
  const TimeField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
  }) : super(type: TemporalType.time);
}

/// A local date and time, stored as `YYYY-MM-DDTHH:mm`.
class DateTimeField extends TemporalSingleField {
  const DateTimeField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
  }) : super(type: TemporalType.datetime);
}

/// A range of calendar days, stored as a [TemporalRange] of dates.
class DateRangeField extends TemporalRangeField {
  const DateRangeField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
    super.allowOvernight,
  }) : super(type: TemporalType.dateRange);
}

/// A range of times of day; `allowOvernight` lets the end come before the start.
class TimeRangeField extends TemporalRangeField {
  const TimeRangeField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
    super.allowOvernight,
  }) : super(type: TemporalType.timeRange);
}

/// A range of local dates and times.
class DateTimeRangeField extends TemporalRangeField {
  const DateTimeRangeField({
    super.key,
    required super.value,
    required super.onValueChange,
    super.min,
    super.max,
    super.step,
    super.presets,
    super.hint,
    super.label,
    super.labelStyle,
    super.leadingIcon,
    super.leading,
    super.trailing,
    super.supportingText,
    super.error,
    super.variant,
    super.controlSize,
    super.disabled,
    super.readOnly,
    super.required,
    super.requiredMessage,
    super.placeholder,
    super.clearable,
    super.validator,
    super.validationMode,
    super.onValidationChange,
    super.onBlur,
    super.locale,
    super.formatValue,
    super.ariaLabel,
    super.focusNode,
    super.allowOvernight,
  }) : super(type: TemporalType.datetimeRange);
}
