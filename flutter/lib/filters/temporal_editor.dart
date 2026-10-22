import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../primitives/number_field.dart';
import '../primitives/segmented.dart';
import '../primitives/text_field.dart';
import '../theme.dart';
import 'calendar.dart';
import 'temporal.dart';

String _two(int n) => n.toString().padLeft(2, '0');

/// What a temporal editor edits and how it reports: the twin of `TemporalEditorOptions`.
@immutable
class TemporalEditorOptions {
  const TemporalEditorOptions({
    required this.config,
    required this.value,
    required this.onChange,
    this.onPick,
    this.locale,
    this.resetKey,
  });

  /// Type, bounds, step and presets. Presets that fail `validateTemporal` are hidden.
  final TemporalConfig config;

  /// Current draft value.
  final TemporalValue? value;

  /// Called on every pick, preset or edit. Nothing is validated or committed for you.
  final ValueChanged<TemporalValue?> onChange;

  /// Called when a choice is complete on its own: a day in a date picker, or a preset. Hosts can
  /// commit right away instead of waiting for Apply (DateField does).
  final ValueChanged<TemporalValue?>? onPick;

  /// Locale for month, weekday and endpoint names. Defaults to the [I18n] locale.
  final String? locale;

  /// Changing it resets the visible month, the active end and typed entry (e.g. on every open).
  final Object? resetKey;
}

/// The picker's state, for hosts that place its parts apart (the result of `useTemporalEditor` in
/// the web kit): a dialog floats [TemporalPresets] and [TemporalEdges] in its top bar and scrolls
/// [TemporalBody]. Create it with [TemporalEditorBuilder], which keeps it in sync with the options.
class TemporalEditorState extends ChangeNotifier {
  /// State for [_options], naming months in [_locale].
  TemporalEditorState(this._options, this._locale)
    : _seenKey = _options.resetKey {
    _edge = _initialEdge();
    _month = _initialMonth();
  }

  TemporalEditorOptions _options;
  String _locale;
  Object? _seenKey;
  late TemporalEdge _edge;
  late String _month;
  bool _manual = false;

  /// Takes new options without notifying (call it while building); a new `resetKey` resets the
  /// month, the active end and typed entry.
  void update(TemporalEditorOptions options, {required String locale}) {
    _options = options;
    _locale = locale;
    if (_seenKey != options.resetKey) {
      _seenKey = options.resetKey;
      _edge = _initialEdge();
      _month = _initialMonth();
      _manual = false;
    }
  }

  TemporalEdge _initialEdge() => range && from.isNotEmpty && to.isEmpty
      ? TemporalEdge.to
      : TemporalEdge.from;

  String _initialMonth() {
    var month =
        (hasCalendar && from.isNotEmpty ? from : calendarDate(DateTime.now()))
            .substring(0, 7);
    final min = config.min, max = config.max;
    if (hasCalendar && min != null && min.length >= 7) {
      if (month.compareTo(min.substring(0, 7)) < 0) month = min.substring(0, 7);
    }
    if (hasCalendar && max != null && max.length >= 7) {
      if (month.compareTo(max.substring(0, 7)) > 0) month = max.substring(0, 7);
    }
    return month;
  }

  /// Type, bounds, step and presets.
  TemporalConfig get config => _options.config;

  /// Current draft value.
  TemporalValue? get value => _options.value;

  /// Locale for names.
  String get locale => _locale;

  /// The native input of the type.
  TemporalInput get type => temporalInputType(config.type);

  /// A `…Range` type.
  bool get range => isTemporalRange(config.type);

  /// Dates and datetimes show calendars.
  bool get hasCalendar => type != TemporalInput.time;

  /// Times and datetimes show time fields.
  bool get hasTime => type != TemporalInput.date;

  /// The single value or the range start; `''` when empty.
  String get from => switch (value) {
    TemporalSingle(:final value) => value,
    TemporalRange(:final from) => from,
    null => '',
  };

  /// The range end; `''` when empty or single.
  String get to => switch (value) {
    TemporalRange(:final to) => to,
    _ => '',
  };

  /// The end the next calendar click sets.
  TemporalEdge get edge => _edge;

  /// Chooses the end the next calendar click sets.
  void setEdge(TemporalEdge edge) {
    if (edge == _edge) return;
    _edge = edge;
    notifyListeners();
  }

  /// The visible (first) month, `YYYY-MM`.
  String get month => _month;

  /// Shows another month.
  void setMonth(String month) {
    if (month == _month) return;
    _month = month;
    notifyListeners();
  }

  /// Whether typed entry is shown.
  bool get manual => _manual;

  /// Shows or hides typed entry.
  void setManual(bool manual) {
    if (manual == _manual) return;
    _manual = manual;
    notifyListeners();
  }

  /// Quick choices that pass the config's rules.
  List<TemporalPreset> get presets => [
    for (final p in config.presets ?? temporalPresets(config.type))
      if (validateTemporal(config, p.value) == null) p,
  ];

  /// The `YYYY-MM-DD` part of a value.
  String dayOnly(String text) =>
      text.length > 10 ? text.substring(0, 10) : text;

  /// Applies a preset and reports it as a complete pick.
  void choosePreset(TemporalValue? next) {
    _options.onChange(next);
    _edge = TemporalEdge.from;
    final start = switch (next) {
      TemporalSingle(:final value) => value,
      TemporalRange(:final from) => from,
      null => '',
    };
    if (start.length >= 7 && hasCalendar) _month = start.substring(0, 7);
    notifyListeners();
    _options.onPick?.call(next);
  }

  /// Sets one part: the single value, or a range end.
  void setPart(TemporalEdge part, String next) => _options.onChange(
    range
        ? TemporalRange(
            from: part == TemporalEdge.from ? next : from,
            to: part == TemporalEdge.to ? next : to,
          )
        : (next.isEmpty ? null : TemporalSingle(next)),
  );

  /// A calendar click: the day (keeping a datetime's time), or the next end of a range.
  void pickDay(String day) {
    if (!range) {
      final time = from.contains('T') ? from.split('T')[1] : '';
      final next = TemporalSingle(
        type == TemporalInput.datetimeLocal
            ? '${day}T${time.isEmpty ? '09:00' : time}'
            : day,
      );
      _options.onChange(next);
      if (type == TemporalInput.date) _options.onPick?.call(next);
      return;
    }
    final next = chooseRangeDate(
      TemporalRange(from: dayOnly(from), to: dayOnly(to)),
      day,
      _edge,
    );
    String withTime(String d, String existing, String fallback) {
      if (d.isEmpty || type != TemporalInput.datetimeLocal) return d;
      final time = existing.contains('T') ? existing.split('T')[1] : '';
      return '${d}T${time.isEmpty ? fallback : time}';
    }

    _options.onChange(
      TemporalRange(
        from: withTime(next.value.from, from, '00:00'),
        to: withTime(next.value.to, to, '23:59'),
      ),
    );
    _edge = next.edge;
    notifyListeners();
  }

  /// An end's short label (`Oct 19`), or `Any`.
  String endpointText(String text) => text.isNotEmpty && hasCalendar
      ? TemporalLocale.of(locale).monthDay(parseCalendarDate(text))
      : (text.isEmpty ? 'Any' : text);

  /// Sets the time of a part, keeping its day (today when it has none).
  void setTime(TemporalEdge part, String time) {
    final original = part == TemporalEdge.from ? from : to;
    final day = dayOnly(original);
    setPart(
      part,
      type == TemporalInput.datetimeLocal
          ? '${day.isEmpty ? calendarDate(DateTime.now()) : day}T$time'
          : time,
    );
  }

  /// Whether [preset] is the current value.
  bool presetActive(TemporalPreset preset) => value == preset.value;
}

/// Owns a [TemporalEditorState] for [options] and builds with it, rebuilding on every change.
class TemporalEditorBuilder extends StatefulWidget {
  const TemporalEditorBuilder({
    super.key,
    required this.options,
    required this.builder,
  });

  /// The editor's options; read again on every build.
  final TemporalEditorOptions options;

  /// Builds the host with the editor state.
  final Widget Function(BuildContext context, TemporalEditorState editor)
  builder;

  @override
  State<TemporalEditorBuilder> createState() => _TemporalEditorBuilderState();
}

class _TemporalEditorBuilderState extends State<TemporalEditorBuilder> {
  TemporalEditorState? _editor;

  @override
  void dispose() {
    _editor?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = widget.options.locale ?? I18n.of(context).locale;
    final editor = _editor ??= TemporalEditorState(widget.options, locale);
    editor.update(widget.options, locale: locale);
    return ListenableBuilder(
      listenable: editor,
      builder: (context, _) => widget.builder(context, editor),
    );
  }
}

/// How [TemporalPresets] lays out its chips.
enum TemporalPresetsLayout {
  /// A wrapping block of chips (popovers, menus).
  list,

  /// One scrolling row of toolbar buttons, meant for a glass group (dialog top bars).
  bar,
}

/// Quick choices: the twin of `TemporalPresets`. Nothing when there are none.
class TemporalPresets extends StatelessWidget {
  const TemporalPresets({
    super.key,
    required this.editor,
    this.layout = TemporalPresetsLayout.list,
  });

  /// The editor state.
  final TemporalEditorState editor;

  /// `list` chips or a scrolling `bar`.
  final TemporalPresetsLayout layout;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: editor,
    builder: (context, _) {
      final presets = editor.presets;
      if (presets.isEmpty) return const SizedBox.shrink();
      final bar = layout == TemporalPresetsLayout.bar;
      final buttons = [
        for (final p in presets)
          Button(
            variant: editor.presetActive(p)
                ? ButtonVariant.tonal
                : ButtonVariant.text,
            appearance: bar
                ? ButtonAppearance.toolbar
                : ButtonAppearance.defaultAppearance,
            controlSize: ControlSize.compact,
            pressed: editor.presetActive(p),
            onClick: () => editor.choosePreset(p.value),
            children: [Text(p.label)],
          ),
      ];
      final Widget content;
      if (bar) {
        // One row that scrolls sideways and fades 12px at both edges.
        content = ShaderMask(
          blendMode: BlendMode.dstIn,
          shaderCallback: (rect) {
            final edge = rect.width > 24 ? 12 / rect.width : 0.0;
            return LinearGradient(
              colors: const [
                Color(0x00000000),
                Color(0xFF000000),
                Color(0xFF000000),
                Color(0x00000000),
              ],
              stops: [0, edge, 1 - edge, 1],
            ).createShader(rect);
          },
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(mainAxisSize: MainAxisSize.min, children: buttons),
          ),
        );
      } else {
        content = Wrap(spacing: 4, runSpacing: 4, children: buttons);
      }
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Quick choices',
        child: content,
      );
    },
  );
}

/// The start/end switch of a date range; each side shows its chosen day. Nothing for other
/// types. The twin of `TemporalEdges`.
class TemporalEdges extends StatelessWidget {
  const TemporalEdges({
    super.key,
    required this.editor,
    this.appearance = SegmentedAppearance.grouped,
  });

  /// The editor state.
  final TemporalEditorState editor;

  /// `plain` when it sits inside a glass group of its own.
  final SegmentedAppearance appearance;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: editor,
    builder: (context, _) {
      if (!editor.range || !editor.hasCalendar) return const SizedBox.shrink();
      return SegmentedControl<TemporalEdge>(
        label: 'Which end you are choosing',
        appearance: appearance,
        // `.lab-temporal-edges`: both ends share the width.
        equalWidth: true,
        value: editor.edge,
        onChange: editor.setEdge,
        options: [
          SegmentOption(
            value: TemporalEdge.from,
            label:
                'Start · ${editor.endpointText(editor.dayOnly(editor.from))}',
          ),
          SegmentOption(
            value: TemporalEdge.to,
            label: 'End · ${editor.endpointText(editor.dayOnly(editor.to))}',
          ),
        ],
      );
    },
  );
}

/// Calendars, times and typed entry: the twin of `TemporalBody`. Two months and side-by-side
/// times when the body is at least 620px wide (the web kit's container query).
class TemporalBody extends StatelessWidget {
  const TemporalBody({
    super.key,
    required this.editor,
    this.footer,
    this.onSubmit,
  });

  /// The editor state.
  final TemporalEditorState editor;

  /// Shown at the end of the typed-entry row, e.g. a popover's own actions.
  final Widget? footer;

  /// Enter in a typed-entry field: the host's Apply (the web kit submits the enclosing form).
  final VoidCallback? onSubmit;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: editor,
    builder: (context, _) => LayoutBuilder(
      builder: (context, constraints) =>
          _build(context, constraints.maxWidth >= 620),
    ),
  );

  Widget _build(BuildContext context, bool wide) {
    final e = editor;
    final range = e.range;
    final pair = range && wide;
    Widget month({
      required String label,
      required String month,
      required ValueChanged<String> onMonthChange,
      required CalendarNavigation navigation,
    }) => CalendarMonth(
      label: label,
      month: month,
      onMonthChange: onMonthChange,
      from: e.dayOnly(e.from),
      to: e.dayOnly(e.to),
      min: e.config.min,
      max: e.config.max,
      onSelect: e.pickDay,
      locale: e.locale,
      navigation: navigation,
    );

    final children = <Widget>[];
    if (e.hasCalendar) {
      final first = month(
        label: range ? 'First month' : 'Calendar',
        month: e.month,
        onMonthChange: e.setMonth,
        // Two months: the first keeps only its previous arrow, the second only its next arrow.
        navigation: pair
            ? CalendarNavigation.previous
            : CalendarNavigation.both,
      );
      children.add(
        pair
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 20,
                children: [
                  Expanded(child: first),
                  Expanded(
                    child: month(
                      label: 'Second month',
                      month: shiftMonth(e.month, 1),
                      onMonthChange: (next) => e.setMonth(shiftMonth(next, -1)),
                      navigation: CalendarNavigation.next,
                    ),
                  ),
                ],
              )
            : first,
      );
    }
    if (e.hasTime) {
      String timeOf(String text) =>
          e.hasCalendar ? (text.contains('T') ? text.split('T')[1] : '') : text;
      final start = _TimeInput(
        label: range ? 'Start time' : 'Time',
        value: timeOf(e.from),
        step: e.config.step ?? 60,
        onChange: (time) => e.setTime(TemporalEdge.from, time),
      );
      final end = range
          ? _TimeInput(
              label: 'End time',
              value: timeOf(e.to),
              step: e.config.step ?? 60,
              onChange: (time) => e.setTime(TemporalEdge.to, time),
            )
          : null;
      final note = range && e.config.allowOvernight
          ? _Note(
              'An end time before the start time continues into the next day.',
            )
          : null;
      children.add(
        pair && end != null
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 8,
                    children: [
                      Expanded(child: start),
                      Expanded(child: end),
                    ],
                  ),
                  if (note != null)
                    Row(
                      spacing: 8,
                      children: [
                        Expanded(child: note),
                        const Spacer(),
                      ],
                    ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [start, ?end, ?note],
              ),
      );
    }
    final toggleText = e.manual
        ? 'Hide typed entry'
        : range
        ? (e.hasCalendar ? 'Type the dates' : 'Type the times')
        : (e.hasCalendar ? 'Type a date' : 'Type a time');
    children.add(
      _FooterRow(
        children: [
          Semantics(
            expanded: e.manual,
            child: Button(
              controlSize: ControlSize.compact,
              onClick: () => e.setManual(!e.manual),
              // `size={16}` loses to the kit's `.lab-control > svg` 18px.
              children: [const LucideKeyboard(), Text(toggleText)],
            ),
          ),
          ?footer,
        ],
      ),
    );
    if (e.manual) {
      final parts = range
          ? [TemporalEdge.from, TemporalEdge.to]
          : [TemporalEdge.from];
      final fields = [
        for (final part in parts)
          _ManualField(
            key: ValueKey(part),
            hint: !range
                ? (e.hasCalendar ? 'Date' : 'Time')
                : part == TemporalEdge.from
                ? 'Start'
                : 'End',
            value: part == TemporalEdge.to ? e.to : e.from,
            onChanged: (text) => e.setPart(part, text),
            onSubmit: onSubmit,
          ),
      ];
      children.add(
        pair && fields.length == 2
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [for (final f in fields) Expanded(child: f)],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: fields,
              ),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: children,
    );
  }
}

/// `.lab-temporal-note`: a muted 13px sentence.
class _Note extends StatelessWidget {
  const _Note(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(
      color: ThemeProvider.of(context).colors.muted,
      fontSize: 13,
      height: 18 / 13,
    ),
  );
}

/// One typed-entry field. It owns its controller so a calendar pick that rewrites the text never
/// reports back as a typed change.
class _ManualField extends StatefulWidget {
  const _ManualField({
    super.key,
    required this.hint,
    required this.value,
    required this.onChanged,
    this.onSubmit,
  });
  final String hint, value;
  final ValueChanged<String> onChanged;
  final VoidCallback? onSubmit;

  @override
  State<_ManualField> createState() => _ManualFieldState();
}

class _ManualFieldState extends State<_ManualField> {
  late final _controller = TextEditingController(text: widget.value);
  bool _syncing = false;

  @override
  void didUpdateWidget(_ManualField old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) {
      _syncing = true;
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
      _syncing = false;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: _controller,
    hint: widget.hint,
    controlSize: ControlSize.compact,
    keyboardType: TextInputType.datetime,
    onValueChange: (text) {
      if (!_syncing) widget.onChanged(text);
    },
    onSubmitted: widget.onSubmit == null ? null : (_) => widget.onSubmit!(),
  );
}

/// Hour : minute (: second) as number fields: drag to scrub, type, or use the arrow keys.
class _TimeInput extends StatelessWidget {
  const _TimeInput({
    required this.label,
    required this.value,
    required this.onChange,
    this.step = 60,
  });
  final String label, value;
  final ValueChanged<String> onChange;

  /// Seconds between allowed values; minutes snap to it, seconds appear below one minute.
  final num step;

  @override
  Widget build(BuildContext context) {
    final pieces = (value.isEmpty ? '09:00' : value).split(':');
    int at(int i, int fallback) =>
        i < pieces.length ? int.tryParse(pieces[i]) ?? 0 : fallback;
    final h = at(0, 9), m = at(1, 0), s = at(2, 0);
    final seconds = step < 60;
    final minuteStep = seconds ? 1 : (step / 60).round().clamp(1, 30);
    void set(int hour, int minute, int second) => onChange(
      '${_two(hour)}:${_two(minute)}${seconds ? ':${_two(second)}' : ''}',
    );
    String format(double v) => _two(v.round());
    final colon = ExcludeSemantics(
      child: Text(
        ':',
        style: TextStyle(
          color: ThemeProvider.of(context).colors.muted,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 6,
        children: [
          ExcludeSemantics(
            child: Text(
              label,
              style: TextStyle(
                color: ThemeProvider.of(context).colors.muted,
                fontSize: 13,
              ),
            ),
          ),
          Directionality(
            textDirection: TextDirection.ltr,
            child: Row(
              spacing: 4,
              children: [
                Expanded(
                  child: NumberField(
                    label: 'Hour',
                    controlSize: ControlSize.compact,
                    min: 0,
                    max: 23,
                    value: h.toDouble(),
                    steppers: false,
                    format: format,
                    onValueChange: (hour) => set(hour.round(), m, s),
                  ),
                ),
                colon,
                Expanded(
                  child: NumberField(
                    label: 'Minute',
                    controlSize: ControlSize.compact,
                    min: 0,
                    max: (60 - minuteStep).toDouble(),
                    step: minuteStep.toDouble(),
                    value: m.toDouble(),
                    steppers: false,
                    format: format,
                    onValueChange: (minute) => set(h, minute.round(), s),
                  ),
                ),
                if (seconds) ...[
                  colon,
                  Expanded(
                    child: NumberField(
                      label: 'Second',
                      controlSize: ControlSize.compact,
                      min: 0,
                      max: 59,
                      step: step < 1 ? 1 : step.toDouble(),
                      value: s.toDouble(),
                      steppers: false,
                      format: format,
                      onValueChange: (second) => set(h, m, second.round()),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The picker body without a trigger, all parts in one column: presets as chips, a start/end
/// switch for ranges, one or two calendars, number-field times and optional typed entry. The
/// twin of `TemporalFilterEditor`; controlled — place it in your own form or popover. In a dialog,
/// use `TemporalDialog`, which floats the presets and the switch in its top bar.
class TemporalFilterEditor extends StatelessWidget {
  const TemporalFilterEditor({
    super.key,
    required this.config,
    required this.value,
    required this.onChange,
    this.onPick,
    this.locale,
    this.resetKey,
    this.footer,
    this.onSubmit,
  });

  /// Type, bounds, step and presets. Presets that fail `validateTemporal` are hidden.
  final TemporalConfig config;

  /// Current draft value.
  final TemporalValue? value;

  /// Called on every pick, preset or edit.
  final ValueChanged<TemporalValue?> onChange;

  /// Called when a choice is complete on its own: a day in a date picker, or a preset.
  final ValueChanged<TemporalValue?>? onPick;

  /// Locale for month, weekday and endpoint names; the [I18n] locale when null.
  final String? locale;

  /// Changing it resets the visible month, the active end and typed entry.
  final Object? resetKey;

  /// Shown at the end of the typed-entry row, e.g. a popover's own actions.
  final Widget? footer;

  /// Enter in a typed-entry field: the host's Apply.
  final VoidCallback? onSubmit;

  @override
  Widget build(BuildContext context) => TemporalEditorBuilder(
    options: TemporalEditorOptions(
      config: config,
      value: value,
      onChange: onChange,
      onPick: onPick,
      locale: locale,
      resetKey: resetKey,
    ),
    builder: (context, editor) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        if (editor.presets.isNotEmpty) TemporalPresets(editor: editor),
        if (editor.range && editor.hasCalendar) TemporalEdges(editor: editor),
        TemporalBody(editor: editor, footer: footer, onSubmit: onSubmit),
      ],
    ),
  );
}

/// `.lab-temporal-footer`: the typed-entry toggle at the start and the host's actions at the end,
/// on one row when they fit; otherwise the actions wrap below, still at the end (the web kit's
/// wrapping flex row with `margin-inline-start: auto`). 8px gaps.
class _FooterRow extends MultiChildRenderObjectWidget {
  const _FooterRow({required super.children});

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderFooterRow(Directionality.of(context));

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderFooterRow renderObject,
  ) => renderObject.direction = Directionality.of(context);
}

class _FooterParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderFooterRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _FooterParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _FooterParentData> {
  _RenderFooterRow(this._direction);

  static const _gap = 8.0;
  TextDirection _direction;
  set direction(TextDirection value) {
    if (value == _direction) return;
    _direction = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _FooterParentData) {
      child.parentData = _FooterParentData();
    }
  }

  List<RenderBox> get _children {
    final list = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      list.add(child);
      child = childAfter(child);
    }
    return list;
  }

  @override
  void performLayout() {
    final children = _children;
    final loose = constraints.loosen();
    for (final child in children) {
      child.layout(loose, parentUsesSize: true);
    }
    final maxWidth = constraints.maxWidth;
    final total =
        children.fold<double>(0, (sum, c) => sum + c.size.width) +
        _gap * math.max(0, children.length - 1);
    final oneRow = total <= maxWidth;
    final rowHeight = children.fold<double>(
      0,
      (h, c) => math.max(h, c.size.height),
    );
    final width = maxWidth.isFinite ? maxWidth : total;
    double place(RenderBox child, bool atEnd) {
      final start = atEnd ? width - child.size.width : 0.0;
      return _direction == TextDirection.rtl
          ? width - start - child.size.width
          : start;
    }

    var y = 0.0;
    for (var i = 0; i < children.length; i++) {
      final child = children[i];
      final data = child.parentData! as _FooterParentData;
      final atEnd = i > 0;
      if (oneRow) {
        data.offset = Offset(
          place(child, atEnd),
          (rowHeight - child.size.height) / 2,
        );
      } else {
        data.offset = Offset(place(child, atEnd), y);
        y += child.size.height + _gap;
      }
    }
    final height = oneRow ? rowHeight : math.max(0.0, y - _gap);
    size = constraints.constrain(Size(width, height));
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);
}
