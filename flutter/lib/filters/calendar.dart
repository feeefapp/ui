import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/tokens.dart';
import 'temporal.dart';

/// Which paging arrows a [CalendarMonth] shows; two side-by-side months show one each.
enum CalendarNavigation { both, previous, next }

/// One month grid: the twin of `CalendarMonth` in `@feeef.dev/ui/filters/calendar`. The heading is
/// a plain row on the host surface: previous, a title that opens a month/year grid, next. Days
/// support arrow, Home/End and Page Up/Down navigation (arrows mirror in right-to-left); a range
/// paints one continuous band.
class CalendarMonth extends StatefulWidget {
  const CalendarMonth({
    super.key,
    required this.month,
    required this.onMonthChange,
    required this.from,
    this.to,
    this.min,
    this.max,
    required this.onSelect,
    this.locale,
    this.label = 'Calendar',
    this.navigation = CalendarNavigation.both,
  });

  /// Visible month as `YYYY-MM`.
  final String month;

  /// Called when the person pages or picks another month or year.
  final ValueChanged<String> onMonthChange;

  /// Selected day, or range start, as `YYYY-MM-DD`.
  final String from;

  /// Range end as `YYYY-MM-DD`; days between [from] and [to] are tinted.
  final String? to;

  /// Earliest selectable day; earlier days are disabled.
  final String? min;

  /// Latest selectable day; later days are disabled.
  final String? max;

  /// Called with the chosen day as `YYYY-MM-DD`.
  final ValueChanged<String> onSelect;

  /// Locale for month, weekday and day names; the [I18n] locale when null.
  final String? locale;

  /// Accessible name of the month region.
  final String label;

  /// Which paging arrows this month shows.
  final CalendarNavigation navigation;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('month', month))
      ..add(
        ObjectFlagProperty<ValueChanged<String>>.has(
          'onMonthChange',
          onMonthChange,
        ),
      )
      ..add(StringProperty('from', from))
      ..add(StringProperty('to', to, defaultValue: null))
      ..add(StringProperty('min', min, defaultValue: null))
      ..add(StringProperty('max', max, defaultValue: null))
      ..add(ObjectFlagProperty<ValueChanged<String>>.has('onSelect', onSelect))
      ..add(StringProperty('locale', locale, defaultValue: null))
      ..add(StringProperty('label', label, defaultValue: 'Calendar'))
      ..add(
        EnumProperty<CalendarNavigation>(
          'navigation',
          navigation,
          defaultValue: CalendarNavigation.both,
        ),
      );
  }

  @override
  State<CalendarMonth> createState() => _CalendarMonthState();
}

class _CalendarMonthState extends State<CalendarMonth> {
  String _focusDate = '';
  bool _picking = false;
  int _pickYear = 0;
  final _nodes = <String, FocusNode>{};

  FocusNode _node(String day) =>
      _nodes.putIfAbsent(day, () => FocusNode(debugLabel: day));

  @override
  void didUpdateWidget(CalendarMonth old) {
    super.didUpdateWidget(old);
    if (old.month != widget.month) _scheduleFocus();
  }

  @override
  void dispose() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  /// Focuses [_focusDate] once its button is built, like the web kit's layout effect.
  void _scheduleFocus() {
    if (_focusDate.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final node = _nodes[_focusDate];
      if (node != null && node.context != null && !node.hasFocus) {
        node.requestFocus();
      }
      // Drop the nodes of days that are no longer shown.
      final shown = _days.toSet();
      _nodes.removeWhere((day, node) {
        if (shown.contains(day) || node.hasFocus) return false;
        node.dispose();
        return true;
      });
    });
  }

  DateTime get _date => parseCalendarDate('${widget.month}-01');
  List<String?> get _days => monthDays(_date.year, _date.month - 1);

  bool _inBounds(String day) {
    final min = widget.min, max = widget.max;
    return (min == null ||
            min.isEmpty ||
            day.compareTo(min.substring(0, math.min(10, min.length))) >= 0) &&
        (max == null ||
            max.isEmpty ||
            day.compareTo(max.substring(0, math.min(10, max.length))) <= 0);
  }

  String? get _minMonth => widget.min == null || widget.min!.isEmpty
      ? null
      : widget.min!.substring(0, math.min(7, widget.min!.length));
  String? get _maxMonth => widget.max == null || widget.max!.isEmpty
      ? null
      : widget.max!.substring(0, math.min(7, widget.max!.length));

  /// `YYYY-MM` with a 0-based [m] that may run past the year, as the web kit writes it.
  String _monthKey(int y, int m) => '$y-${(m + 1).toString().padLeft(2, '0')}';

  bool _outOfBounds(int y, int m) =>
      (_minMonth != null && _monthKey(y, m).compareTo(_minMonth!) < 0) ||
      (_maxMonth != null && _monthKey(y, m).compareTo(_maxMonth!) > 0);

  void _go(int y, int m) => widget.onMonthChange(
    calendarDate(DateTime(y, m + 1, 1, 12)).substring(0, 7),
  );

  KeyEventResult _onKey(String day, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final key = event.logicalKey;
    final date = parseCalendarDate(day);
    final weekdayIndex = date.weekday - 1;
    DateTime target;
    if (key == LogicalKeyboardKey.arrowLeft) {
      target = DateTime(date.year, date.month, date.day + (rtl ? 1 : -1), 12);
    } else if (key == LogicalKeyboardKey.arrowRight) {
      target = DateTime(date.year, date.month, date.day + (rtl ? -1 : 1), 12);
    } else if (key == LogicalKeyboardKey.arrowUp) {
      target = DateTime(date.year, date.month, date.day - 7, 12);
    } else if (key == LogicalKeyboardKey.arrowDown) {
      target = DateTime(date.year, date.month, date.day + 7, 12);
    } else if (key == LogicalKeyboardKey.home) {
      target = DateTime(date.year, date.month, date.day - weekdayIndex, 12);
    } else if (key == LogicalKeyboardKey.end) {
      target = DateTime(date.year, date.month, date.day + 6 - weekdayIndex, 12);
    } else if (key == LogicalKeyboardKey.pageUp ||
        key == LogicalKeyboardKey.pageDown) {
      final month = date.month + (key == LogicalKeyboardKey.pageUp ? -1 : 1);
      final last = DateTime(date.year, month + 1, 0).day;
      target = DateTime(date.year, month, math.min(date.day, last), 12);
    } else {
      return KeyEventResult.ignored;
    }
    final next = calendarDate(target);
    if (!_inBounds(next)) return KeyEventResult.handled;
    widget.onMonthChange(next.substring(0, 7));
    setState(() => _focusDate = next);
    _scheduleFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final names = TemporalLocale.of(widget.locale ?? I18n.of(context).locale);
    final date = _date;
    final year = date.year, monthIndex = date.month - 1;
    final today = calendarDate(DateTime.now());
    final days = _days;
    final to = widget.to ?? '';
    final from = widget.from;
    final tabDate =
        [_focusDate, from, today]
            .firstWhere(
              (day) => day.isNotEmpty && days.contains(day) && _inBounds(day),
              orElse: () => '',
            )
            .nonEmpty ??
        days.firstWhere(
          (day) => day != null && _inBounds(day),
          orElse: () => null,
        );
    final title = names.monthYear(year, date.month);
    final lo = from.isNotEmpty && to.isNotEmpty
        ? (from.compareTo(to) < 0 ? from : to)
        : '';
    final hi = from.isNotEmpty && to.isNotEmpty
        ? (from.compareTo(to) < 0 ? to : from)
        : '';
    final rtl = Directionality.of(context) == TextDirection.rtl;
    Widget chevron(Widget icon) => Transform.flip(flipX: rtl, child: icon);

    final heading = Semantics(
      container: true,
      explicitChildNodes: true,
      label: '${widget.label} navigation',
      child: Row(
        spacing: 4,
        children: [
          if (widget.navigation != CalendarNavigation.next)
            IconButton(
              controlSize: ControlSize.small,
              ariaLabel: 'Previous month',
              disabled: _picking
                  ? _minMonth != null &&
                        '${_pickYear - 1}-12'.compareTo(_minMonth!) < 0
                  : _outOfBounds(year, monthIndex - 1),
              onClick: () => _picking
                  ? setState(() => _pickYear--)
                  : _go(year, monthIndex - 1),
              icon: chevron(const LucideChevronLeft()),
            ),
          Expanded(
            child: Semantics(
              expanded: _picking,
              child: Button(
                controlSize: ControlSize.small,
                alignment: AlignmentDirectional.center,
                ariaLabel: _picking
                    ? 'Choose a month in $_pickYear'
                    : '$title, choose month and year',
                onClick: () => setState(() {
                  _pickYear = year;
                  _picking = !_picking;
                }),
                children: [
                  ExcludeSemantics(
                    child: Text(
                      _picking ? '$_pickYear' : title,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.navigation != CalendarNavigation.previous)
            IconButton(
              controlSize: ControlSize.small,
              ariaLabel: 'Next month',
              disabled: _picking
                  ? _maxMonth != null &&
                        '${_pickYear + 1}-01'.compareTo(_maxMonth!) > 0
                  : _outOfBounds(year, monthIndex + 1),
              onClick: () => _picking
                  ? setState(() => _pickYear++)
                  : _go(year, monthIndex + 1),
              icon: chevron(const LucideChevronRight()),
            ),
        ],
      ),
    );

    final Widget body;
    if (_picking) {
      body = Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Months of $_pickYear',
        child: Column(
          spacing: 4,
          children: [
            for (var row = 0; row < 4; row++)
              Row(
                spacing: 4,
                children: [
                  for (var m = row * 3; m < row * 3 + 3; m++)
                    Expanded(
                      child: Button(
                        variant: m == monthIndex && _pickYear == year
                            ? ButtonVariant.tonal
                            : ButtonVariant.text,
                        controlSize: ControlSize.small,
                        alignment: AlignmentDirectional.center,
                        pressed: m == monthIndex && _pickYear == year,
                        disabled: _outOfBounds(_pickYear, m),
                        onClick: () {
                          _go(_pickYear, m);
                          setState(() => _picking = false);
                        },
                        children: [Text(names.monthShort(m + 1))],
                      ),
                    ),
                ],
              ),
          ],
        ),
      );
    } else {
      final cell = theme.coarsePointer(context) ? 44.0 : 40.0;
      final band = mixSrgb(theme.colors.primary, 0.18, transparent);
      body = Semantics(
        container: true,
        explicitChildNodes: true,
        label: title,
        child: Column(
          // `border-spacing: 0 2px`: 2px above, between and below the rows.
          children: [
            const SizedBox(height: 2),
            SizedBox(
              height: 28,
              child: Row(
                children: [
                  for (var i = 1; i <= 7; i++)
                    Expanded(
                      child: Center(
                        child: Semantics(
                          label: names.weekdayLong(i),
                          excludeSemantics: true,
                          child: Text(
                            names.weekdayNarrow(i),
                            maxLines: 1,
                            style: TextStyle(
                              color: theme.colors.muted,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            for (var week = 0; week < 6; week++) ...[
              const SizedBox(height: 2),
              SizedBox(
                height: cell,
                child: Row(
                  children: [
                    for (final day in days.sublist(week * 7, week * 7 + 7))
                      Expanded(
                        child: _bandCell(
                          day: day,
                          from: from,
                          to: to,
                          lo: lo,
                          hi: hi,
                          band: band,
                          rtl: rtl,
                          child: day == null
                              ? null
                              : _CalendarDay(
                                  key: ValueKey(day),
                                  text: names.number(
                                    int.parse(day.substring(8)),
                                  ),
                                  label: names.dateFull(parseCalendarDate(day)),
                                  size: cell,
                                  focusNode: _node(day),
                                  tabbable: day == tabDate,
                                  selected: day == from || day == to,
                                  today: day == today,
                                  disabled: !_inBounds(day),
                                  onSelect: () => widget.onSelect(day),
                                  onKey: (event) => _onKey(day, event),
                                ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 2),
          ],
        ),
      );
    }

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [heading, body],
      ),
    );
  }

  /// A `td`: full band between the ends, a half band under each end (mirrored in RTL).
  Widget _bandCell({
    required String? day,
    required String from,
    required String to,
    required String lo,
    required String hi,
    required Color band,
    required bool rtl,
    required Widget? child,
  }) {
    final start = day != null && day == (lo.isNotEmpty ? lo : from);
    final end = day != null && hi.isNotEmpty && day == hi;
    final between =
        day != null &&
        lo.isNotEmpty &&
        day.compareTo(lo) > 0 &&
        day.compareTo(hi) < 0;
    final rangeStart = start && hi.isNotEmpty && lo != hi;
    final rangeEnd = end && lo != hi;
    _BandPart? part;
    if (between) part = _BandPart.full;
    if (rangeStart) part = _BandPart.endHalf;
    if (rangeEnd) part = _BandPart.startHalf;
    return CustomPaint(
      painter: part == null ? null : _BandPainter(part, band, rtl),
      child: child == null ? const SizedBox.expand() : Center(child: child),
    );
  }
}

extension on String {
  String? get nonEmpty => isEmpty ? null : this;
}

enum _BandPart { full, startHalf, endHalf }

class _BandPainter extends CustomPainter {
  _BandPainter(this.part, this.color, this.rtl);
  final _BandPart part;
  final Color color;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final half = size.width / 2;
    final Rect rect = switch (part) {
      _BandPart.full => Offset.zero & size,
      // The half toward the inline end (right in LTR).
      _BandPart.endHalf =>
        rtl
            ? Rect.fromLTWH(0, 0, half, size.height)
            : Rect.fromLTWH(half, 0, half, size.height),
      _BandPart.startHalf =>
        rtl
            ? Rect.fromLTWH(half, 0, half, size.height)
            : Rect.fromLTWH(0, 0, half, size.height),
    };
    canvas.drawRect(rect, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_BandPainter old) =>
      old.part != part || old.color != color || old.rtl != rtl;
}

/// `.lab-calendar-day`: a cell-sized superellipse button (14px tabular figures), hover and
/// pressed fills, today's inset ring and weight, the selected primary fill and the 2px focus
/// outline 1px outside.
class _CalendarDay extends StatefulWidget {
  const _CalendarDay({
    super.key,
    required this.text,
    required this.label,
    required this.size,
    required this.focusNode,
    required this.tabbable,
    required this.selected,
    required this.today,
    required this.disabled,
    required this.onSelect,
    required this.onKey,
  });
  final String text, label;
  final double size;
  final FocusNode focusNode;
  final bool tabbable, selected, today, disabled;
  final VoidCallback onSelect;
  final KeyEventResult Function(KeyEvent event) onKey;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('text', text))
      ..add(StringProperty('label', label))
      ..add(DoubleProperty('size', size))
      ..add(DiagnosticsProperty<FocusNode>('focusNode', focusNode))
      ..add(FlagProperty('tabbable', value: tabbable, ifTrue: 'tabbable'))
      ..add(FlagProperty('selected', value: selected, ifTrue: 'selected'))
      ..add(FlagProperty('today', value: today, ifTrue: 'today'))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(ObjectFlagProperty<VoidCallback>.has('onSelect', onSelect))
      ..add(
        ObjectFlagProperty<KeyEventResult Function(KeyEvent event)>.has(
          'onKey',
          onKey,
        ),
      );
  }

  @override
  State<_CalendarDay> createState() => _CalendarDayState();
}

class _CalendarDayState extends State<_CalendarDay> {
  bool _hovered = false, _down = false, _focusVisible = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final selected = widget.selected;
    final interactive = !widget.disabled && !selected;
    final fill = selected
        ? c.primary
        : interactive && _down
        ? c.controlPressed
        : interactive && _hovered
        ? c.controlHover
        : transparent;
    final reduced = reducedMotionOf(context);
    final radius = 20 * theme.sizes.radiusScale;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = math.min(widget.size, constraints.maxWidth);
        return Semantics(
          button: true,
          enabled: !widget.disabled,
          toggled: selected,
          label: widget.label,
          excludeSemantics: true,
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: (_, event) => widget.onKey(event),
            child: FocusableActionDetector(
              focusNode: widget.focusNode,
              enabled: !widget.disabled,
              // Only one day is a Tab stop; arrows reach the others.
              descendantsAreTraversable: false,
              mouseCursor: widget.disabled
                  ? SystemMouseCursors.basic
                  : SystemMouseCursors.click,
              onShowHoverHighlight: (v) => setState(() => _hovered = v),
              onShowFocusHighlight: (v) => setState(() => _focusVisible = v),
              actions: {
                ActivateIntent: CallbackAction<ActivateIntent>(
                  onInvoke: (_) => widget.disabled ? null : widget.onSelect(),
                ),
              },
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapDown: widget.disabled
                    ? null
                    : (_) => setState(() => _down = true),
                onTapUp: widget.disabled
                    ? null
                    : (_) => setState(() => _down = false),
                onTapCancel: widget.disabled
                    ? null
                    : () => setState(() => _down = false),
                onTap: widget.disabled ? null : widget.onSelect,
                child: Opacity(
                  opacity: widget.disabled ? 0.35 : 1,
                  child: TweenAnimationBuilder<Color?>(
                    tween: PaintColorTween(end: fill),
                    duration: reduced
                        ? Duration.zero
                        : MotionTokens.durationFast,
                    curve: MotionTokens.ease,
                    builder: (context, color, child) => CustomPaint(
                      painter: _DayPainter(
                        fill: color ?? fill,
                        radius: radius,
                        ring: widget.today && !selected
                            ? c.controlBorder
                            : null,
                        focus: _focusVisible
                            ? FocusRingStyle.of(context)
                            : null,
                      ),
                      child: child,
                    ),
                    child: SizedBox(
                      width: width,
                      height: widget.size,
                      child: Center(
                        child: Text(
                          widget.text,
                          maxLines: 1,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: selected || widget.today
                                ? FontWeight.w600
                                : FontWeight.w400,
                            fontFeatures: const [FontFeature.tabularFigures()],
                            color: selected ? c.onPrimary : c.ink,
                          ),
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
    ).withTraversal(widget.tabbable);
  }
}

extension on Widget {
  /// Keeps the day focusable but out of Tab order unless it is the month's Tab stop.
  Widget withTraversal(bool tabbable) =>
      ExcludeFocusTraversal(excluding: !tabbable, child: this);
}

class _DayPainter extends CustomPainter {
  _DayPainter({
    required this.fill,
    required this.radius,
    required this.ring,
    required this.focus,
  });
  final Color fill;
  final double radius;
  final Color? ring;
  final FocusRingStyle? focus;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    if (fill.a > 0) {
      canvas.drawPath(superellipsePath(rect, radii), Paint()..color = fill);
    }
    if (ring != null) {
      // box-shadow: inset 0 0 0 1px.
      canvas.drawPath(
        superellipsePath(rect, radii, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = ring!,
      );
    }
    if (focus != null) paintFocusRing(canvas, rect, radius, focus!);
  }

  @override
  bool shouldRepaint(_DayPainter old) =>
      old.fill != fill ||
      old.radius != radius ||
      old.ring != ring ||
      old.focus != focus;
}
