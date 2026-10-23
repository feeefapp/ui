import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'dock/dock.dart';
import 'filters/temporal.dart';
import 'filters/temporal_dialog.dart';
import 'filters/temporal_editor.dart';
import 'glass/container.dart';
import 'icons/lucide.dart';
import 'menu/anchored_panel.dart';
import 'primitives/button.dart';
import 'primitives/modal.dart';
import 'primitives/popover_surface.dart';
import 'primitives/text_field.dart';
import 'scroll/scroll_area.dart';
import 'theme.dart';
import 'toolbar.dart';
import 'toolbar_search.dart';

/// Which editor a [FilterOption] uses: on/off (`boolean`), a choice list (`enumeration`, the web
/// kit's `enum`), a temporal type, or `custom` (your own editor in a dialog).
enum FilterType {
  boolean,
  enumeration,
  date,
  time,
  datetime,
  dateRange,
  timeRange,
  datetimeRange,
  custom;

  /// One of the date and time types.
  bool get isTemporal => index >= date.index && index <= datetimeRange.index;

  /// One of the `…Range` types: edited in a dialog.
  bool get isRange =>
      this == dateRange || this == timeRange || this == datetimeRange;
}

/// A filter's value (the web kit's `FilterValue`): [FilterFlag] for on/off filters, [FilterText]
/// for a choice or a date/time, [FilterRange] for a `{from, to}` range. `null` means any.
sealed class FilterValue {
  const FilterValue();
}

/// An on/off filter's value: `true` when enabled.
final class FilterFlag extends FilterValue {
  const FilterFlag(this.value);

  /// Whether the filter is on.
  final bool value;

  @override
  bool operator ==(Object other) => other is FilterFlag && other.value == value;
  @override
  int get hashCode => value.hashCode;
  @override
  String toString() => 'FilterFlag($value)';
}

/// A text value: a choice's `value`, or a local ISO date, time or datetime.
final class FilterText extends FilterValue {
  const FilterText(this.value);

  /// The stored text.
  final String value;

  @override
  bool operator ==(Object other) => other is FilterText && other.value == value;
  @override
  int get hashCode => value.hashCode;
  @override
  String toString() => 'FilterText($value)';
}

/// A `{from, to}` range; either end may be `''` (open).
final class FilterRange extends FilterValue {
  const FilterRange({this.from = '', this.to = ''});

  /// Start of the range, or `''`.
  final String from;

  /// End of the range, or `''`.
  final String to;

  @override
  bool operator ==(Object other) =>
      other is FilterRange && other.from == from && other.to == to;
  @override
  int get hashCode => Object.hash(from, to);
  @override
  String toString() => 'FilterRange($from, $to)';
}

/// One choice of an `enumeration` filter; the stored value is [value].
@immutable
class FilterChoice {
  const FilterChoice({required this.value, required this.label});

  /// Stored value.
  final String value;

  /// Text shown in the choice list and on the chip.
  final String label;
}

/// Thrown by `onNaturalFilter`: its [message] is shown under the description field.
class FilterError implements Exception {
  const FilterError(this.message);

  /// The message shown to the user.
  final String message;

  @override
  String toString() => message;
}

/// One filter in the catalog: the twin of `FilterOption` in `@feeef.dev/ui/filter-bar`. The
/// constructor picks the editor: on/off (default), [FilterOption.choices],
/// [FilterOption.temporal] or [FilterOption.custom].
@immutable
class FilterOption {
  /// An on/off filter: its id is in the bar's `value` while it is on.
  const FilterOption({
    required this.id,
    required this.label,
    this.description,
    this.icon,
    this.keywords = const [],
    this.validate,
  }) : _type = FilterType.boolean,
       choices = const [],
       config = null,
       renderEditor = null,
       formatValue = null;

  /// A choice list (`type: 'enum'`); the stored value is the choice's `value`.
  const FilterOption.choices({
    required this.id,
    required this.label,
    required this.choices,
    this.description,
    this.icon,
    this.keywords = const [],
    this.validate,
  }) : _type = FilterType.enumeration,
       config = null,
       renderEditor = null,
       formatValue = null;

  /// A date or time filter: the web kit's `FilterOption & TemporalConfig`. [config] gives the
  /// type, bounds, step and presets. Range types open a [TemporalDialog], single values a menu
  /// with a [TemporalFilterEditor].
  const FilterOption.temporal({
    required this.id,
    required this.label,
    required TemporalConfig this.config,
    this.description,
    this.icon,
    this.keywords = const [],
    this.validate,
  }) : _type = FilterType.date,
       choices = const [],
       renderEditor = null,
       formatValue = null;

  /// Your own editor, shown in the filter dialog.
  const FilterOption.custom({
    required this.id,
    required this.label,
    required FilterEditorBuilder this.renderEditor,
    this.formatValue,
    this.description,
    this.icon,
    this.keywords = const [],
    this.validate,
  }) : _type = FilterType.custom,
       choices = const [],
       config = null;

  /// Stable id; the key in `value` / `values` / `pinned`.
  final String id;

  /// Name shown in the catalog and on the pinned chip.
  final String label;

  /// Second line of the catalog row (hidden there, like the web kit) and the dialog's intro.
  final String? description;

  /// Catalog row icon. Defaults to one per type.
  final Widget? icon;

  /// Extra words the catalog search matches.
  final List<String> keywords;

  /// Returns an error message to block Apply, or null. Runs after the built-in temporal checks.
  final String? Function(FilterValue? value)? validate;

  final FilterType _type;

  /// The editor this filter uses.
  FilterType get type => switch (config?.type) {
    null => _type,
    TemporalType.date => FilterType.date,
    TemporalType.time => FilterType.time,
    TemporalType.datetime => FilterType.datetime,
    TemporalType.dateRange => FilterType.dateRange,
    TemporalType.timeRange => FilterType.timeRange,
    TemporalType.datetimeRange => FilterType.datetimeRange,
  };

  /// The choices of an `enumeration` filter.
  final List<FilterChoice> choices;

  /// A temporal filter's type, bounds, step and presets.
  final TemporalConfig? config;

  /// Renders a custom filter's editor. Call `onChange` with the draft value.
  final FilterEditorBuilder? renderEditor;

  /// Text for a custom filter's chip and catalog row. Defaults to the raw value.
  final String Function(FilterValue? value)? formatValue;
}

/// Builds a custom filter's editor from the draft [value]; [onChange] updates the draft.
typedef FilterEditorBuilder = Widget Function(
  BuildContext context,
  FilterValue? value,
  ValueChanged<FilterValue?> onChange,
);

String _summary(FilterOption option, FilterValue? value) {
  if (value == null) return 'Any';
  if (option.type == FilterType.custom && option.formatValue != null) {
    return option.formatValue!(value);
  }
  if (value is FilterRange) {
    return '${value.from.isEmpty ? 'Any date' : value.from} → '
        '${value.to.isEmpty ? 'Any date' : value.to}';
  }
  if (option.type == FilterType.enumeration) {
    final text = value is FilterText ? value.value : null;
    for (final choice in option.choices) {
      if (choice.value == text) {
        return choice.label.isEmpty ? 'Any' : choice.label;
      }
    }
    return 'Any';
  }
  if (value is FilterFlag) return value.value ? 'On' : 'Off';
  return (value as FilterText).value;
}

/// Filter toolbar: a searchable catalog button, an optional natural-language button, pinned
/// filter chips and trailing actions. Pinning controls shortcuts, clearing controls query values.
/// The twin of `FilterBar` in `@feeef.dev/ui/filter-bar`.
class FilterBar extends StatefulWidget {
  const FilterBar({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChange,
    this.values,
    this.onValuesChange,
    this.pinned,
    this.onPinnedChange,
    this.onNaturalFilter,
    this.onBack,
    this.trailing,
  });

  /// Accessible name of the bar.
  final String label;

  /// The filter catalog.
  final List<FilterOption> options;

  /// Enabled boolean filters.
  final List<String> value;

  /// Called with the new list of enabled boolean filter ids.
  final ValueChanged<List<String>> onChange;

  /// Non-boolean values can be controlled independently from pinned shortcuts.
  final Map<String, FilterValue?>? values;

  /// Called with every non-boolean value after an edit; cleared filters are `null`.
  final ValueChanged<Map<String, FilterValue?>>? onValuesChange;

  /// Ids shown as chips in the bar (controlled). Pinning never changes a value.
  final List<String>? pinned;

  /// Called when filters are pinned or unpinned. Editing or toggling a filter also pins it.
  final ValueChanged<List<String>>? onPinnedChange;

  /// Adds a "describe a filter" button. Return the boolean filter ids to enable (an empty list
  /// clears all) or throw a [FilterError] whose message is shown under the field. You supply the
  /// parser or model.
  final FutureOr<List<String>> Function(String text)? onNaturalFilter;

  /// Shows a back button before the filter controls, e.g. to leave a filtered view.
  final VoidCallback? onBack;

  /// Content at the end of the bar, usually a ToolbarGroup of view actions.
  final Widget? trailing;

  @override
  State<FilterBar> createState() => _FilterBarState();
}

enum _Panel { none, catalog, natural, value }

class _FilterBarState extends State<FilterBar> {
  static int _serial = 0;
  final String _id = 'lab-filter-bar-${_serial++}';
  final _catalogKey = GlobalKey();
  final _naturalKey = GlobalKey();
  final _catalogTrigger = FocusNode(debugLabel: 'Choose filters');
  final _naturalTrigger = FocusNode(debugLabel: 'Natural filter');
  final _naturalInput = FocusNode(debugLabel: 'Filter description');
  final _panelScope = FocusScopeNode(debugLabel: 'Filter panel');
  final _chipKeys = <String, GlobalKey>{};
  final _chipNodes = <String, FocusNode>{};
  final _unpinNodes = <String, FocusNode>{};

  Map<String, FilterValue?> _localValues = {};
  List<String> _localPins = [];
  _Panel _panel = _Panel.none;
  String _query = '', _choiceQuery = '';
  GlobalKey? _valueAnchor;
  FocusNode? _returnFocus;
  String? _editing;
  FilterValue? _draft;
  String _editError = '';
  String _text = '', _error = '';
  bool _busy = false;

  /// The last range filter edited in the temporal dialog (latched for its exit transition).
  FilterOption? _temporalDialog;

  Map<String, FilterValue?> get _values => widget.values ?? _localValues;
  List<String> get _pins => widget.pinned ?? _localPins;

  @override
  void dispose() {
    for (final node in [
      _catalogTrigger,
      _naturalTrigger,
      _naturalInput,
      ..._chipNodes.values,
      ..._unpinNodes.values,
    ]) {
      node.dispose();
    }
    _panelScope.dispose();
    super.dispose();
  }

  bool _isBoolean(FilterOption option) => option.type == FilterType.boolean;

  FilterValue? _read(FilterOption option) => _isBoolean(option)
      ? (widget.value.contains(option.id) ? const FilterFlag(true) : null)
      : _values[option.id];

  void _change(FilterOption option, FilterValue? next) {
    if (_isBoolean(option)) {
      widget.onChange(
        next == const FilterFlag(true)
            ? {...widget.value, option.id}.toList()
            : widget.value.where((id) => id != option.id).toList(),
      );
    } else {
      final normalized =
          next is FilterRange && next.from.isEmpty && next.to.isEmpty
          ? null
          : next;
      final updated = {..._values, option.id: normalized};
      setState(() => _localValues = updated);
      widget.onValuesChange?.call(updated);
    }
  }

  void _setPins(List<String> next) {
    // An unpinned chip takes its focused button with it: focus moves to the catalog button.
    if (_unpinNodes.values.any((node) => node.hasFocus)) {
      _catalogTrigger.requestFocus();
    }
    setState(() => _localPins = next);
    widget.onPinnedChange?.call(next);
  }

  void _pin(String id) => _setPins({..._pins, id}.toList());

  void _clearAll() {
    widget.onChange([]);
    final cleared = {
      for (final option in widget.options)
        if (!_isBoolean(option)) option.id: null,
    };
    setState(() => _localValues = cleared);
    widget.onValuesChange?.call(cleared);
  }

  void _open(_Panel panel) {
    setState(() {
      _panel = panel;
      if (panel == _Panel.catalog) _query = '';
      if (panel == _Panel.natural) _error = '';
    });
    if (panel == _Panel.natural) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _panel == _Panel.natural) _naturalInput.requestFocus();
      });
    }
  }

  void _close() {
    final panel = _panel;
    setState(() {
      _panel = _Panel.none;
      if (panel == _Panel.value) _editing = null;
    });
    switch (panel) {
      case _Panel.catalog:
        _catalogTrigger.requestFocus();
      case _Panel.natural:
        _naturalTrigger.requestFocus();
      case _Panel.value:
        _returnFocus?.requestFocus();
      case _Panel.none:
        break;
    }
  }

  bool _isDialog(FilterOption option) =>
      option.type.isRange || option.type == FilterType.custom;

  void _edit(FilterOption option, [GlobalKey? target]) {
    _valueAnchor = target ?? _catalogKey;
    final chip = _chipKeys[option.id];
    _returnFocus = _pins.contains(option.id) && chip?.currentContext != null
        ? _chipNodes[option.id]
        : _catalogTrigger;
    setState(() {
      _choiceQuery = '';
      _draft = _read(option);
      _editError = '';
      _editing = option.id;
      _panel = _isDialog(option) ? _Panel.none : _Panel.value;
    });
  }

  void _finishEditing() {
    if (_panel == _Panel.value) {
      _close();
    } else {
      setState(() => _editing = null);
    }
  }

  /// Applies [next] to [option], pins it and closes its editor.
  void _commit(FilterOption option, FilterValue? next) {
    _change(option, next);
    _pin(option.id);
    _finishEditing();
  }

  FilterOption? get _selected {
    for (final option in widget.options) {
      if (option.id == _editing) return option;
    }
    return null;
  }

  Future<void> _submitNatural() async {
    final text = _text.trim();
    final parse = widget.onNaturalFilter;
    if (_busy || text.isEmpty || parse == null) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final ids = await parse(text);
      if (ids.any(
        (id) => !widget.options.any((o) => o.id == id && _isBoolean(o)),
      )) {
        throw const FilterError('Choose a supported on/off filter.');
      }
      if (ids.isEmpty) {
        _clearAll();
      } else {
        widget.onChange(ids.toSet().toList());
      }
      _setPins({..._pins, ...ids}.toList());
      if (mounted && _panel == _Panel.natural) _close();
    } on FilterError catch (reason) {
      if (mounted) setState(() => _error = reason.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not create this filter.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.options.where((o) => _read(o) != null).length;
    final pinned = widget.options.where((o) => _pins.contains(o.id)).toList();
    final selected = _selected;
    final dialog = selected != null && _isDialog(selected) ? selected : null;
    // The temporal dialog stays mounted after its first use so its exit can run.
    if (dialog != null && dialog.type.isTemporal) _temporalDialog = dialog;

    final bar = _BarWrap(
      gap: 8,
      pushLastToEnd: widget.trailing != null,
      children: [
        if (widget.onBack != null)
          ToolbarGroup(
            label: 'Filter navigation',
            glassId: '$_id-back',
            children: [
              IconButton(
                appearance: ButtonAppearance.toolbar,
                controlSize: ControlSize.regular,
                ariaLabel: 'Back from filtered view',
                onClick: widget.onBack,
                icon: Transform.flip(
                  flipX: Directionality.of(context) == TextDirection.rtl,
                  child: const LucideArrowLeft(),
                ),
              ),
            ],
          ),
        ToolbarGroup(
          label: 'Filter controls',
          glassId: '$_id-controls',
          children: [
            KeyedSubtree(
              key: _catalogKey,
              child: Semantics(
                expanded: _panel == _Panel.catalog,
                child: IconButton(
                  appearance: ButtonAppearance.toolbar,
                  controlSize: ControlSize.regular,
                  focusNode: _catalogTrigger,
                  ariaLabel:
                      'Choose filters${active > 0 ? ' ($active active)' : ''}',
                  onClick: () => _panel == _Panel.catalog
                      ? _close()
                      : _open(_Panel.catalog),
                  icon: const LucideListFilter(),
                ),
              ),
            ),
            if (widget.onNaturalFilter != null)
              KeyedSubtree(
                key: _naturalKey,
                child: Semantics(
                  expanded: _panel == _Panel.natural,
                  child: IconButton(
                    appearance: ButtonAppearance.toolbar,
                    controlSize: ControlSize.regular,
                    focusNode: _naturalTrigger,
                    ariaLabel: 'Create filter from natural language',
                    onClick: () => _panel == _Panel.natural
                        ? _close()
                        : _open(_Panel.natural),
                    icon: const LucideSparkles(),
                  ),
                ),
              ),
          ],
        ),
        if (pinned.isNotEmpty)
          Semantics(
            container: true,
            explicitChildNodes: true,
            label: 'Pinned filters',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [for (final option in pinned) _chip(context, option)],
            ),
          ),
        if (widget.trailing != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 8,
            children: [widget.trailing!],
          ),
      ],
    );

    // Radix Popover: start-aligned 8px from its trigger, flipped and shifted to stay inside its
    // bounds (AnchoredPanel).
    return AnchoredPanel(
      open: _panel != _Panel.none,
      onDismiss: _close,
      anchor: switch (_panel) {
        _Panel.catalog => _catalogKey,
        _Panel.natural => _naturalKey,
        _ => _valueAnchor ?? _catalogKey,
      },
      align: PanelAlign.start,
      sideOffset: 8,
      panel: _overlay,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Semantics(
            container: true,
            explicitChildNodes: true,
            label: widget.label,
            child: GlassScope(child: bar),
          ),
          if (_temporalDialog case final option?)
            TemporalDialog(
              open: dialog != null && dialog.type.isTemporal,
              label: 'Edit ${option.label} filter',
              close: () => setState(() => _editing = null),
              returnFocus: _returnFocus,
              config: option.config!,
              value: _toTemporal(_draft),
              onChange: (next) => setState(() {
                _draft = _fromTemporal(next);
                _editError = '';
              }),
              intro: option.description == null
                  ? null
                  : Text(option.description!),
              error: _editError.isEmpty ? null : Text(_editError),
              clearLabel: const Text('Clear value'),
              onClear: () {
                _change(option, null);
                _pin(option.id);
                setState(() => _editing = null);
              },
              applyLabel: const Text('Apply filter'),
              onApply: () => _submitDialog(option),
            ),
          Modal(
            returnFocus: _returnFocus,
            open: dialog != null && !dialog.type.isTemporal,
            label: dialog != null
                ? 'Edit ${dialog.label} filter'
                : 'Edit filter',
            close: () => setState(() => _editing = null),
            scrollable: true,
            fitContent: true,
            // `.lab-filter-editor-dialog`: at most 460px wide.
            width: 460,
            bottom: Dock(
              label: 'Filter editor actions',
              children: [
                Button(
                  onClick: () {
                    if (selected != null) {
                      _change(selected, null);
                      _pin(selected.id);
                    }
                    setState(() => _editing = null);
                  },
                  children: const [Text('Clear value')],
                ),
                Button(
                  variant: ButtonVariant.filled,
                  onClick: dialog == null ? null : () => _submitDialog(dialog),
                  children: const [Text('Apply filter')],
                ),
              ],
            ),
            child: dialog == null || dialog.type.isTemporal
                ? const SizedBox.shrink()
                : _dialogBody(context, dialog),
          ),
        ],
      ),
    );
  }

  /// Validates [option]'s draft (the built-in temporal checks, then its own `validate`) and
  /// commits it, or shows the message and keeps the editor open.
  void _submitDialog(FilterOption option) {
    final config = option.config;
    final next = config != null
        ? _fromTemporal(normalizeTemporal(_toTemporal(_draft)))
        : _draft;
    final message =
        (config == null ? null : validateTemporal(config, _toTemporal(next))) ??
        option.validate?.call(next);
    if (message != null) {
      setState(() {
        _draft = next;
        _editError = message;
      });
      return;
    }
    _commit(option, next);
  }

  /// `.lab-filter-editor-form`: the description, the custom editor and the error.
  Widget _dialogBody(BuildContext context, FilterOption option) {
    final c = ThemeProvider.of(context).colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Text(
          option.description ??
              'Set a value, or clear it while keeping this filter pinned.',
          style: TextStyle(color: c.muted, fontSize: 13),
        ),
        if (option.renderEditor != null)
          option.renderEditor!(
            context,
            _draft,
            (value) => setState(() => _draft = value),
          ),
        if (_editError.isNotEmpty)
          Semantics(
            liveRegion: true,
            child: Text(_editError, style: TextStyle(color: c.danger)),
          ),
      ],
    );
  }

  Widget _chip(BuildContext context, FilterOption option) {
    final c = ThemeProvider.of(context).colors;
    final key = _chipKeys.putIfAbsent(option.id, GlobalKey.new);
    final node = _chipNodes.putIfAbsent(
      option.id,
      () => FocusNode(debugLabel: 'Edit ${option.id}'),
    );
    final unpin = _unpinNodes.putIfAbsent(
      option.id,
      () => FocusNode(debugLabel: 'Unpin ${option.id}'),
    );
    final value = _read(option);
    return ToolbarGroup(
      label: '${option.label} filter',
      glassId: '$_id-pin-${option.id}',
      children: [
        KeyedSubtree(
          key: key,
          child: Button(
            appearance: ButtonAppearance.toolbar,
            controlSize: ControlSize.regular,
            focusNode: node,
            ariaLabel: 'Edit ${option.label} filter',
            onClick: () => _edit(option, key),
            children: [
              Text(option.label),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 130),
                child: Text(
                  _summary(option, value),
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: c.muted),
                ),
              ),
            ],
          ),
        ),
        IconButton(
          appearance: ButtonAppearance.toolbar,
          controlSize: ControlSize.regular,
          ariaLabel: 'Clear ${option.label} value',
          disabled: value == null,
          onClick: () {
            node.requestFocus();
            _change(option, null);
          },
          icon: const LucideX(size: 16),
        ),
        IconButton(
          appearance: ButtonAppearance.toolbar,
          controlSize: ControlSize.regular,
          focusNode: unpin,
          ariaLabel: 'Unpin ${option.label}',
          onClick: () =>
              _setPins(_pins.where((id) => id != option.id).toList()),
          icon: const LucidePinOff(size: 16),
        ),
      ],
    );
  }

  // ---- Popovers -------------------------------------------------------------------------------

  Widget _overlay(BuildContext context) {
    if (_panel == _Panel.none) return const SizedBox.shrink();
    // `.lab-filter-panel` widths and heights, within the room AnchoredPanel gives it.
    final desired = _panel == _Panel.catalog ? 450.0 : 280.0;
    final label = switch (_panel) {
      _Panel.catalog => 'Available filters',
      _Panel.natural => 'Describe a filter',
      _ =>
        _selected != null ? 'Edit ${_selected!.label} filter' : 'Edit filter',
    };
    final s = ThemeProvider.of(context).sizes;
    return LayoutBuilder(
      builder: (context, constraints) => SizedBox(
        width: math.min(
          _panel == _Panel.catalog ? 360.0 : 300.0,
          constraints.maxWidth,
        ),
        height: math.min(desired, constraints.maxHeight),
        // Its own glass container: the popover's bubbles never join the bar's material.
        child: GlassContainer(
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: (_, event) {
              if (event is KeyDownEvent &&
                  event.logicalKey == LogicalKeyboardKey.escape) {
                _close();
                return KeyEventResult.handled;
              }
              return KeyEventResult.ignored;
            },
            child: FocusScope(
              node: _panelScope,
              autofocus: true,
              child: Semantics(
                container: true,
                explicitChildNodes: true,
                label: label,
                child: PopoverSurface(
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(
                      fontSize: 13,
                      height: 20 / 13,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                    child: switch (_panel) {
                      _Panel.catalog => _catalog(context, s.radiusGroup),
                      _Panel.natural => _natural(context, s.radiusGroup),
                      _ => _valueMenu(context, s.radiusGroup),
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  bool _matches(FilterOption option) =>
      '${option.label} ${option.description ?? ''} ${option.keywords.join(' ')}'
          .toLowerCase()
          .contains(_query.toLowerCase());

  Widget _catalog(BuildContext context, double radius) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final active = widget.options.where((o) => _read(o) != null).length;
    final rows = widget.options.where(_matches).toList();
    return ScrollArea(
      label: 'Filter catalog rows',
      contentPadding: 8,
      edgeGap: 8,
      radius: radius,
      top: ToolbarSearch(
        label: 'Find a filter',
        value: _query,
        onValueChange: (v) => setState(() => _query = v),
        defaultExpanded: true,
      ),
      bottom: Dock(
        label: 'Filter catalog actions',
        content: Text('$active active · ${_pins.length} pinned'),
        children: [
          Button(
            controlSize: ControlSize.regular,
            disabled: active == 0,
            onClick: _clearAll,
            children: const [Text('Clear values')],
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final option in rows)
            _catalogRow(context, option, c.primary, c.muted, s),
          if (rows.isEmpty)
            Semantics(
              liveRegion: true,
              child: const Text('No matching filters.'),
            ),
        ],
      ),
    );
  }

  Widget _catalogRow(
    BuildContext context,
    FilterOption option,
    Color primary,
    Color muted,
    SizeTokens s,
  ) {
    final value = _read(option);
    final pinned = _pins.contains(option.id);
    final icon =
        option.icon ??
        (option.type == FilterType.enumeration
            ? const LucideSlidersHorizontal()
            : option.type.name.startsWith('date')
            ? const LucideCalendarDays()
            : const LucideToggleLeft());
    return Row(
      children: [
        Expanded(
          // `.lab-filter-row-main`: 8px padding, 10px gap, small radius, at least a menu row (`--lab-menu-row-height`).
          child: ControlOverrides.merge(
            context,
            height: math.max(s.menuRowHeight, 38),
            radius: s.radiusSmall,
            child: Button(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
              gap: 10,
              alignment: AlignmentDirectional.centerStart,
              onClick: () {
                if (_isBoolean(option)) {
                  _change(
                    option,
                    value == null ? const FilterFlag(true) : null,
                  );
                  _pin(option.id);
                } else {
                  _edit(option);
                }
              },
              children: [
                IconTheme.merge(
                  data: IconThemeData(color: muted, size: 18),
                  child: icon,
                ),
                Expanded(
                  child: Text(
                    option.label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: value != null ? primary : null,
                    ),
                  ),
                ),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 90),
                  child: Text(
                    _summary(option, value),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: muted),
                  ),
                ),
              ],
            ),
          ),
        ),
        IconButton(
          controlSize: ControlSize.regular,
          ariaLabel: '${pinned ? 'Unpin' : 'Pin'} ${option.label}',
          pressed: pinned,
          onClick: () => pinned
              ? _setPins(_pins.where((id) => id != option.id).toList())
              : _pin(option.id),
          icon: pinned ? const LucidePinOff() : const LucidePin(),
        ),
      ],
    );
  }

  Widget _natural(BuildContext context, double radius) {
    final available = widget.options
        .where(_isBoolean)
        .map((o) => o.label)
        .join(', ');
    return ScrollArea(
      label: 'Natural filter description',
      edgeGap: 8,
      contentPadding: 12,
      radius: radius,
      bottom: Dock(
        label: 'Natural filter actions',
        children: [
          Button(
            variant: ButtonVariant.filled,
            controlSize: ControlSize.regular,
            loading: _busy,
            disabled: _busy || _text.trim().isEmpty,
            onClick: _submitNatural,
            children: const [Text('Apply filters')],
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          const Text(
            'Describe what you want',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          TextField(
            hint: 'Filter description',
            leadingIcon: const LucideSparkles(),
            value: _text,
            focusNode: _naturalInput,
            onValueChange: (v) => setState(() => _text = v),
            onSubmitted: (_) => _submitNatural(),
            error: _error.isEmpty ? null : _error,
            supportingText: Text('Available: $available.'),
          ),
        ],
      ),
    );
  }

  Widget _valueMenu(BuildContext context, double radius) {
    final option = _selected;
    if (option == null) return const SizedBox.shrink();
    final c = ThemeProvider.of(context).colors;
    final value = _read(option);
    Widget body;
    if (option.type == FilterType.enumeration) {
      final choices = option.choices
          .where(
            (choice) =>
                choice.label.toLowerCase().contains(_choiceQuery.toLowerCase()),
          )
          .toList();
      body = Semantics(
        container: true,
        label: '${option.label} choices',
        child: ControlOverrides.merge(
          context,
          pressedFill: c.surfaceSoft,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 2,
            children: [
              for (final choice in choices)
                Button(
                  alignment: AlignmentDirectional.centerStart,
                  pressed: value == FilterText(choice.value),
                  onClick: () => _commit(option, FilterText(choice.value)),
                  children: [
                    Expanded(
                      child: Text(
                        choice.label,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (value == FilterText(choice.value))
                      const ExcludeSemantics(child: Text('✓')),
                  ],
                ),
              if (choices.isEmpty)
                Semantics(
                  liveRegion: true,
                  child: const Text('No matching options.'),
                ),
            ],
          ),
        ),
      );
    } else if (_isBoolean(option)) {
      body = ControlOverrides.merge(
        context,
        pressedFill: c.surfaceSoft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 2,
          children: [
            for (final next in const [FilterFlag(true), null])
              Button(
                alignment: AlignmentDirectional.center,
                pressed: value == next,
                onClick: () => _commit(option, next),
                children: [Text(next != null ? 'On' : 'Any')],
              ),
          ],
        ),
      );
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          TemporalFilterEditor(
            config: option.config!,
            value: _toTemporal(_draft),
            onChange: (next) => setState(() {
              _draft = _fromTemporal(next);
              _editError = '';
            }),
            onSubmit: () => _submitDialog(option),
          ),
          if (_editError.isNotEmpty)
            Semantics(
              liveRegion: true,
              child: Text(
                _editError,
                style: TextStyle(color: c.danger, fontSize: 12),
              ),
            ),
        ],
      );
    }
    return ScrollArea(
      label: '${option.label} options',
      edgeGap: 8,
      contentPadding: 8,
      radius: radius,
      top: option.type == FilterType.enumeration
          ? ToolbarSearch(
              label: 'Search ${option.label.toLowerCase()}',
              value: _choiceQuery,
              onValueChange: (v) => setState(() => _choiceQuery = v),
              defaultExpanded: true,
            )
          : null,
      bottom: Dock(
        label: 'Filter value actions',
        children: [
          Button(
            controlSize: ControlSize.regular,
            onClick: () => _commit(option, null),
            children: const [Text('Clear value')],
          ),
          if (option.type.isTemporal)
            Button(
              variant: ButtonVariant.filled,
              controlSize: ControlSize.regular,
              onClick: () => _submitDialog(option),
              children: const [Text('Apply')],
            ),
        ],
      ),
      child: body,
    );
  }
}

// ---- Temporal values ----------------------------------------------------------------------------

/// A filter value as the temporal editor's value: text → single, range → range.
TemporalValue? _toTemporal(FilterValue? value) => switch (value) {
  FilterText(:final value) => TemporalSingle(value),
  FilterRange(:final from, :final to) => TemporalRange(from: from, to: to),
  _ => null,
};

/// The temporal editor's value as a filter value.
FilterValue? _fromTemporal(TemporalValue? value) => switch (value) {
  TemporalSingle(:final value) => FilterText(value),
  TemporalRange(:final from, :final to) => FilterRange(from: from, to: to),
  null => null,
};

// ---- Layout -------------------------------------------------------------------------------------

/// `.lab-filter-bar`: a wrapping row (gap 8, items at the line's start, each at most the full
/// width) whose last item takes `margin-inline-start: auto` when [pushLastToEnd].
class _BarWrap extends MultiChildRenderObjectWidget {
  const _BarWrap({
    required this.gap,
    required this.pushLastToEnd,
    required super.children,
  });
  final double gap;
  final bool pushLastToEnd;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderBarWrap(gap, pushLastToEnd, Directionality.of(context));

  @override
  void updateRenderObject(BuildContext context, _RenderBarWrap renderObject) =>
      renderObject
        ..gap = gap
        ..pushLastToEnd = pushLastToEnd
        ..direction = Directionality.of(context);
}

class _BarWrapData extends ContainerBoxParentData<RenderBox> {}

class _RenderBarWrap extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _BarWrapData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _BarWrapData> {
  _RenderBarWrap(this._gap, this._pushLastToEnd, this._direction);

  double _gap;
  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  bool _pushLastToEnd;
  set pushLastToEnd(bool value) {
    if (value == _pushLastToEnd) return;
    _pushLastToEnd = value;
    markNeedsLayout();
  }

  TextDirection _direction;
  set direction(TextDirection value) {
    if (value == _direction) return;
    _direction = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _BarWrapData) child.parentData = _BarWrapData();
  }

  Size _layout(BoxConstraints constraints, {required bool dry}) {
    final maxWidth = constraints.maxWidth;
    final inner = BoxConstraints(maxWidth: maxWidth);
    final children = <RenderBox>[];
    final sizes = <Size>[];
    var child = firstChild;
    while (child != null) {
      children.add(child);
      if (dry) {
        sizes.add(child.getDryLayout(inner));
      } else {
        child.layout(inner, parentUsesSize: true);
        sizes.add(child.size);
      }
      child = childAfter(child);
    }
    final starts = <Offset>[];
    var x = 0.0, y = 0.0, line = 0.0, right = 0.0;
    var empty = true;
    for (var i = 0; i < sizes.length; i++) {
      final size = sizes[i];
      if (!empty && x + _gap + size.width > maxWidth + 1e-9) {
        y += line + _gap;
        x = 0;
        line = 0;
        empty = true;
      }
      var left = empty ? 0.0 : x + _gap;
      if (_pushLastToEnd && i == sizes.length - 1 && maxWidth.isFinite) {
        left = math.max(left, maxWidth - size.width);
      }
      starts.add(Offset(left, y));
      x = left + size.width;
      right = math.max(right, x);
      line = math.max(line, size.height);
      empty = false;
    }
    final result = constraints.constrain(
      Size(maxWidth.isFinite ? maxWidth : right, y + line),
    );
    if (!dry) {
      final rtl = _direction == TextDirection.rtl;
      for (var i = 0; i < children.length; i++) {
        final data = children[i].parentData! as _BarWrapData;
        data.offset = rtl
            ? Offset(result.width - starts[i].dx - sizes[i].width, starts[i].dy)
            : starts[i];
      }
    }
    return result;
  }

  @override
  void performLayout() => size = _layout(constraints, dry: false);

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      _layout(constraints, dry: true);

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
