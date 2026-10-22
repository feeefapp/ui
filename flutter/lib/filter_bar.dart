import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'dock/dock.dart';
import 'glass/container.dart';
import 'icons/lucide.dart';
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
  }) : type = FilterType.boolean,
       choices = const [],
       min = null,
       max = null,
       step = null,
       allowOvernight = false,
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
  }) : type = FilterType.enumeration,
       min = null,
       max = null,
       step = null,
       allowOvernight = false,
       renderEditor = null,
       formatValue = null;

  /// A date or time filter (`TemporalConfig`). Range types open a dialog, single values a menu.
  const FilterOption.temporal({
    required this.id,
    required this.label,
    required this.type,
    this.min,
    this.max,
    this.step,
    this.allowOvernight = false,
    this.description,
    this.icon,
    this.keywords = const [],
    this.validate,
  }) : assert(
         type == FilterType.date ||
             type == FilterType.time ||
             type == FilterType.datetime ||
             type == FilterType.dateRange ||
             type == FilterType.timeRange ||
             type == FilterType.datetimeRange,
       ),
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
  }) : type = FilterType.custom,
       choices = const [],
       min = null,
       max = null,
       step = null,
       allowOvernight = false;

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

  /// The editor this filter uses.
  final FilterType type;

  /// The choices of an `enumeration` filter.
  final List<FilterChoice> choices;

  /// Earliest allowed value, in the same ISO format as the value.
  final String? min;

  /// Latest allowed value, in the same ISO format as the value.
  final String? max;

  /// Allowed increment: days for dates, seconds for times and datetimes, counted from [min].
  final num? step;

  /// Time ranges only: lets the end time be earlier than the start (crossing midnight).
  final bool allowOvernight;

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
  final _portal = OverlayPortalController();
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
  Rect _anchor = Rect.zero;
  FocusNode? _returnFocus;
  String? _editing;
  FilterValue? _draft;
  String _editError = '';
  String _text = '', _error = '';
  bool _busy = false;

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

  Rect _rectOf(GlobalKey key) {
    final box = key.currentContext?.findRenderObject() as RenderBox?;
    final overlay = Overlay.maybeOf(context)?.context.findRenderObject();
    if (box == null || !box.attached || overlay is! RenderBox) return _anchor;
    return box.localToGlobal(Offset.zero, ancestor: overlay) & box.size;
  }

  void _open(_Panel panel) {
    setState(() {
      _panel = panel;
      if (panel == _Panel.catalog) _query = '';
      if (panel == _Panel.natural) _error = '';
    });
    _portal.show();
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
    _portal.hide();
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
    _anchor = _rectOf(target ?? _catalogKey);
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
    if (_panel == _Panel.value) {
      _portal.show();
    } else {
      _portal.hide();
    }
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
                controlSize: ControlSize.compact,
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
                  controlSize: ControlSize.compact,
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
                    controlSize: ControlSize.compact,
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

    return OverlayPortal(
      controller: _portal,
      overlayChildBuilder: (context) => GlassLayer(child: _overlay(context)),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Semantics(
            container: true,
            explicitChildNodes: true,
            label: widget.label,
            child: GlassScope(child: bar),
          ),
          Modal(
            open: dialog != null,
            label: dialog != null
                ? 'Edit ${dialog.label} filter'
                : 'Edit filter',
            close: () => setState(() => _editing = null),
            scrollable: true,
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
            child: dialog == null
                ? const SizedBox.shrink()
                : _dialogBody(context, dialog),
          ),
        ],
      ),
    );
  }

  void _submitDialog(FilterOption option) {
    if (option.type.isTemporal) {
      final next = _normalizeTemporal(_draft);
      final message =
          _validateTemporal(option, next) ?? option.validate?.call(next);
      if (message != null) {
        setState(() {
          _draft = next;
          _editError = message;
        });
        return;
      }
      _commit(option, next);
      return;
    }
    final message = option.validate?.call(_draft);
    if (message != null) {
      setState(() => _editError = message);
      return;
    }
    _commit(option, _draft);
  }

  Widget _dialogBody(BuildContext context, FilterOption option) {
    final c = ThemeProvider.of(context).colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        if (!option.type.isTemporal || option.description != null)
          Text(
            option.description ??
                'Set a value, or clear it while keeping this filter pinned.',
            style: TextStyle(color: c.muted, fontSize: 13),
          ),
        if (option.type == FilterType.custom)
          option.renderEditor!(
            context,
            _draft,
            (value) => setState(() => _draft = value),
          )
        else
          _TemporalFields(
            option: option,
            value: _draft,
            onChange: (value) => setState(() {
              _draft = value;
              _editError = '';
            }),
            onSubmit: () => _submitDialog(option),
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
            controlSize: ControlSize.compact,
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
          controlSize: ControlSize.compact,
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
          controlSize: ControlSize.compact,
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
    final overlay = Overlay.maybeOf(this.context)?.context.findRenderObject();
    final area = overlay is RenderBox && overlay.hasSize
        ? overlay.size
        : MediaQuery.sizeOf(context);
    final anchor = switch (_panel) {
      _Panel.catalog => _rectOf(_catalogKey),
      _Panel.natural => _rectOf(_naturalKey),
      _ => _anchor,
    };
    // `.lab-filter-panel` widths and heights; Radix sideOffset 8, collisionPadding 12.
    final width = math.max(
      0.0,
      math.min(_panel == _Panel.catalog ? 360.0 : 300.0, area.width - 24),
    );
    final desired = _panel == _Panel.catalog ? 450.0 : 280.0;
    final below = area.height - anchor.bottom - 8 - 12;
    final above = anchor.top - 8 - 12;
    final down = below >= desired || below >= above;
    final height = math.max(0.0, math.min(desired, down ? below : above));
    final rtl = Directionality.of(this.context) == TextDirection.rtl;
    final left = (rtl ? anchor.right - width : anchor.left)
        .clamp(12.0, math.max(12.0, area.width - 12 - width))
        .toDouble();
    final top = down ? anchor.bottom + 8 : anchor.top - 8 - height;
    final label = switch (_panel) {
      _Panel.catalog => 'Available filters',
      _Panel.natural => 'Describe a filter',
      _ =>
        _selected != null ? 'Edit ${_selected!.label} filter' : 'Edit filter',
    };
    final s = ThemeProvider.of(context).sizes;
    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: _close,
          ),
        ),
        Positioned(
          left: left,
          top: top,
          width: width,
          height: height,
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
      ],
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
            controlSize: ControlSize.compact,
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
          // `.lab-filter-row-main`: 8px padding, 10px gap, small radius, at least compact height.
          child: ControlOverrides.merge(
            context,
            height: math.max(s.controlCompact, 38),
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
          controlSize: ControlSize.compact,
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
            controlSize: ControlSize.compact,
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
          _TemporalFields(
            option: option,
            value: _draft,
            onChange: (next) => setState(() {
              _draft = next;
              _editError = '';
            }),
            onSubmit: () => _applySmallTemporal(option),
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
            controlSize: ControlSize.compact,
            onClick: () => _commit(option, null),
            children: const [Text('Clear value')],
          ),
          if (option.type.isTemporal)
            Button(
              variant: ButtonVariant.filled,
              controlSize: ControlSize.compact,
              onClick: () => _applySmallTemporal(option),
              children: const [Text('Apply')],
            ),
        ],
      ),
      child: body,
    );
  }

  void _applySmallTemporal(FilterOption option) {
    final next = _normalizeTemporal(_draft);
    final message =
        _validateTemporal(option, next) ?? option.validate?.call(next);
    if (message != null) {
      setState(() => _editError = message);
      return;
    }
    _commit(option, next);
  }
}

// ---- Temporal values ----------------------------------------------------------------------------

FilterValue? _normalizeTemporal(FilterValue? value) => switch (value) {
  FilterRange(from: '', to: '') => null,
  FilterText(value: '') => null,
  _ => value,
};

/// `validateTemporal` from `@feeef.dev/ui/filters/temporal`: ISO format and real calendar dates,
/// `step`, `min`/`max`, and range order. An English error, or null when valid.
String? _validateTemporal(FilterOption config, FilterValue? value) {
  if (value == null) return null;
  final parts = switch (value) {
    FilterRange(:final from, :final to) => [
      from,
      to,
    ].where((p) => p.isNotEmpty),
    FilterText(value: final text) => [text],
    _ => const <String>[],
  }.toList();
  final name = config.type.name;
  final input = name.startsWith('datetime')
      ? 'datetime'
      : name.startsWith('time')
      ? 'time'
      : 'date';
  final timePattern = RegExp(r'^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$');
  final datePattern = RegExp(
    r'^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?)?$',
  );
  bool valid(String part) {
    if (input == 'time') return timePattern.hasMatch(part);
    final match = datePattern.firstMatch(part);
    if (match == null || (input == 'datetime') != part.contains('T')) {
      return false;
    }
    final year = int.parse(match[1]!);
    final month = int.parse(match[2]!);
    final day = int.parse(match[3]!);
    final date = DateTime(year, month, day);
    return date.year == year && date.month == month && date.day == day;
  }

  if (parts.any((part) => !valid(part))) return 'Enter a valid date or time.';
  final step = config.step;
  if (step != null && step > 0) {
    double units(String part) {
      if (input == 'time') {
        final pieces = part.split(':');
        var total = 0.0;
        for (var i = 0; i < pieces.length && i < 3; i++) {
          total +=
              (double.tryParse(pieces[i]) ?? double.nan) * [3600, 60, 1][i];
        }
        return total;
      }
      final parsed = DateTime.tryParse(
        input == 'date' ? '${part}T00:00:00Z' : '${part}Z',
      );
      if (parsed == null) return double.nan;
      return input == 'date'
          ? parsed.millisecondsSinceEpoch / 86400000
          : parsed.millisecondsSinceEpoch / 1000;
    }

    final base = config.min != null ? units(config.min!) : 0.0;
    if (parts.any((part) {
      final steps = (units(part) - base) / step;
      return (steps - steps.roundToDouble()).abs() > 1e-7;
    })) {
      return input == 'date'
          ? 'Choose a date in $step-day steps.'
          : 'Choose a time in $step-second steps.';
    }
  }
  final shortTime = RegExp(r'^\d{2}:\d{2}$');
  String comparable(String part) =>
      input != 'date' && shortTime.hasMatch(part.split('T').last)
      ? '$part:00'
      : part;
  final min = config.min, max = config.max;
  if (min != null &&
      parts.any((part) => comparable(part).compareTo(comparable(min)) < 0)) {
    return 'Use a value on or after $min.';
  }
  if (max != null &&
      parts.any((part) => comparable(part).compareTo(comparable(max)) > 0)) {
    return 'Use a value on or before $max.';
  }
  if (value is FilterRange &&
      value.from.isNotEmpty &&
      value.to.isNotEmpty &&
      comparable(value.from).compareTo(comparable(value.to)) > 0 &&
      !(config.type == FilterType.timeRange && config.allowOvernight)) {
    return config.type == FilterType.timeRange
        ? 'The end time must be on or after the start time.'
        : 'The end must be on or after the start.';
  }
  return null;
}

/// Text entry for date and time values in their ISO form (one field, or From / To for ranges).
/// Stands in for the web kit's calendar `TemporalFilterEditor` until that is ported.
class _TemporalFields extends StatelessWidget {
  const _TemporalFields({
    required this.option,
    required this.value,
    required this.onChange,
    required this.onSubmit,
  });
  final FilterOption option;
  final FilterValue? value;
  final ValueChanged<FilterValue?> onChange;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final name = option.type.name;
    final format = name.startsWith('datetime')
        ? 'YYYY-MM-DDTHH:MM'
        : name.startsWith('time')
        ? 'HH:MM'
        : 'YYYY-MM-DD';
    if (option.type.isRange) {
      final range = value is FilterRange
          ? value! as FilterRange
          : const FilterRange();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          TextField(
            hint: 'From',
            placeholder: format,
            value: range.from,
            onValueChange: (v) => onChange(FilterRange(from: v, to: range.to)),
            onSubmitted: (_) => onSubmit(),
          ),
          TextField(
            hint: 'To',
            placeholder: format,
            value: range.to,
            onValueChange: (v) =>
                onChange(FilterRange(from: range.from, to: v)),
            onSubmitted: (_) => onSubmit(),
          ),
        ],
      );
    }
    final text = value is FilterText ? (value! as FilterText).value : '';
    return TextField(
      hint: switch (option.type) {
        FilterType.time => 'Time',
        FilterType.datetime => 'Date and time',
        _ => 'Date',
      },
      placeholder: format,
      value: text,
      onValueChange: (v) => onChange(v.isEmpty ? null : FilterText(v)),
      onSubmitted: (_) => onSubmit(),
    );
  }
}

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
