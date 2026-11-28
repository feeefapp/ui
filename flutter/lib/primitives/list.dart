import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../i18n/i18n.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import 'list_model.dart';
import 'square_slot.dart';

/// A group of rows on one rounded card, with an optional header above and footer below: the
/// inset-grouped list of iOS Settings and Mail, the twin of `ListSection` in
/// `@feeef.dev/ui/primitives/list`. Rows are separated by hairlines that start after their leading
/// icon. With [onReorder], every row gets a grip: drag it, or focus it and press the arrow keys.
class ListSection extends StatefulWidget {
  const ListSection({
    super.key,
    this.header,
    this.footer,
    this.label,
    this.onReorder,
    required this.children,
  });

  /// Short label above the card, in sentence case.
  final Widget? header;

  /// Help text under the card.
  final Widget? footer;

  /// Accessible name when there is no visible header.
  final String? label;

  /// Makes the rows reorderable. Move item `from` to index `to` in your data.
  final void Function(int from, int to)? onReorder;

  /// ListRow widgets.
  final List<Widget> children;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label, defaultValue: null))
      ..add(
        ObjectFlagProperty<void Function(int from, int to)?>.has(
          'onReorder',
          onReorder,
        ),
      );
  }

  @override
  State<ListSection> createState() => _ListSectionState();
}

class _ListSectionState extends State<ListSection> {
  final _keys = <int, GlobalKey>{};
  final _contentKeys = <int, GlobalKey>{};
  final _offsets = <int, MotionValue>{};
  int? _lifted;
  _Drag? _drag;

  GlobalKey _key(int i) => _keys.putIfAbsent(i, GlobalKey.new);
  GlobalKey _contentKey(int i) => _contentKeys.putIfAbsent(i, GlobalKey.new);
  MotionValue _offset(int i) => _offsets.putIfAbsent(i, () {
    final value = MotionValue(0, 0.25);
    value.subscribe((_) => setState(() {}));
    return value;
  });

  @override
  void dispose() {
    for (final o in _offsets.values) {
      o.stop();
    }
    super.dispose();
  }

  List<double> _heights() => [
    for (var i = 0; i < widget.children.length; i++)
      (_keys[i]?.currentContext?.findRenderObject() as RenderBox?)
              ?.size
              .height ??
          0,
  ];

  void _commit(int from, int to) {
    widget.onReorder?.call(from, to);
    SemanticsService.sendAnnouncement(
      View.of(context),
      I18n.of(
        context,
      ).t('lab.list.moved', {'index': to + 1, 'count': widget.children.length}),
      Directionality.of(context),
    );
  }

  void _dragStart(int index) {
    final heights = _heights();
    final above = heights.take(index).fold(0.0, (a, b) => a + b);
    final below = heights.skip(index + 1).fold(0.0, (a, b) => a + b);
    setState(() {
      _drag = _Drag(index, heights, -above, below);
      _lifted = index;
    });
  }

  void _dragUpdate(double dy) {
    final d = _drag;
    if (d == null) return;
    d.dy += dy;
    final delta = d.dy < d.min
        ? d.min + rubberBand(d.dy - d.min, 200)
        : d.dy > d.max
        ? d.max + rubberBand(d.dy - d.max, 200)
        : d.dy;
    _offset(d.from).set(delta);
    final to = reorderTarget(d.heights, d.from, delta);
    if (to != d.to) {
      d.to = to;
      final shifts = reorderShifts(d.heights, d.from, to);
      for (var j = 0; j < shifts.length; j++) {
        if (j != d.from) {
          _offset(j).animateTo(shifts[j], spring: Springs.snappy);
        }
      }
    }
  }

  Future<void> _dragEnd() async {
    final d = _drag;
    if (d == null) return;
    _drag = null;
    final landing = reorderLanding(d.heights, d.from, d.to);
    final arrived = await _offset(d.from)
        .animateTo(landing, spring: Springs.release);
    if (!mounted || !arrived) return;
    setState(() => _lifted = null);
    for (final o in _offsets.values) {
      o.set(0);
    }
    if (d.to != d.from) _commit(d.from, d.to);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final reorder = widget.onReorder != null;
    bool leading(Widget w) => w is ListRow && w.leading != null;
    bool selected(Widget w) => w is ListRow && w.selected;
    final card = ClipPath(
      clipBehavior: _drag != null ? Clip.none : Clip.antiAlias,
      clipper: _drag != null
          ? null
          : ShapeBorderClipper(shape: SuperellipseBorder(radius: s.listRadius)),
      child: DecoratedBox(
        decoration: listCardDecoration(theme),
        position: DecorationPosition.foreground,
        child: DecoratedBox(
          decoration: ShapeDecoration(
            color: listCardFill(theme),
            shape: SuperellipseBorder(radius: s.listRadius),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < widget.children.length; i++)
                _RowSlot(
                  key: _key(i),
                  contentKey: _contentKey(i),
                  index: i,
                  // Hairline above every row but the first, after the leading icon (inset + 32 + 14).
                  // Selected neighbours read as one block: no hairline between them.
                  hairline:
                      i == 0 ||
                          (selected(widget.children[i]) &&
                              selected(widget.children[i - 1]))
                      ? null
                      : (leading(widget.children[i]) ||
                                leading(widget.children[i - 1])
                            ? s.listInset + 32 + 14
                            : s.listInset),
                  hairlineColor: _drag != null ? null : c.line,
                  offset: _offsets[i]?.get() ?? 0,
                  lifted: _lifted == i,
                  reorder: reorder ? this : null,
                  child: widget.children[i],
                ),
            ],
          ),
        ),
      ),
    );
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.header == null ? widget.label : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          if (widget.header != null)
            Padding(
              padding: EdgeInsets.symmetric(horizontal: s.listInset),
              child: Semantics(
                header: true,
                child: DefaultTextStyle.merge(
                  style: TextStyle(
                    color: c.muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    // The web kit's h3 tracking (-0.035em) applies to the header too.
                    letterSpacing: 13 * -0.035,
                    height: 17 / 13,
                    leadingDistribution: TextLeadingDistribution.even,
                  ),
                  child: widget.header!,
                ),
              ),
            ),
          card,
        ],
      ),
    );
  }
}

/// Fill of a [ListSection] card. Dark: ink 4% over surface (a lifted grey). Light: near-white so
/// the card reads against the tinted page (ink-over-surface vanished into the ground at 1.02:1).
Color listCardFill(ThemeData theme) => theme.brightness == Brightness.dark
    ? mixSrgb(theme.colors.ink, 0.04, theme.colors.surface)
    : const Color(0xffffffff);

/// Inner hairline of a [ListSection] card: light only, a soft edge so white never blurs into the page.
Decoration listCardDecoration(ThemeData theme) => ShapeDecoration(
  shape: SuperellipseBorder(
    radius: theme.sizes.listRadius,
    side: theme.brightness == Brightness.dark
        ? BorderSide.none
        : BorderSide(color: Color.from(alpha: 0.09, red: 0, green: 0, blue: 0)),
  ),
);

class _Drag {
  _Drag(this.from, this.heights, this.min, this.max) : to = from;
  final int from;
  final List<double> heights;
  final double min, max;
  int to;
  double dy = 0;
}

/// Where a row sits in its section: its hairline, reorder offset and grip.
class _RowSlot extends StatelessWidget {
  const _RowSlot({
    super.key,
    required this.contentKey,
    required this.index,
    required this.hairline,
    required this.hairlineColor,
    required this.offset,
    required this.lifted,
    required this.reorder,
    required this.child,
  });

  /// Keeps the row's element (and the grip's drag) while a move wraps it in a layer.
  final GlobalKey contentKey;
  final int index;
  final double? hairline;
  final Color? hairlineColor;
  final double offset;
  final bool lifted;
  final _ListSectionState? reorder;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<GlobalKey>('contentKey', contentKey))
      ..add(IntProperty('index', index))
      ..add(DoubleProperty('hairline', hairline, defaultValue: null))
      ..add(ColorProperty('hairlineColor', hairlineColor, defaultValue: null))
      ..add(DoubleProperty('offset', offset))
      ..add(FlagProperty('lifted', value: lifted, ifTrue: 'lifted'))
      ..add(
        DiagnosticsProperty<_ListSectionState>(
          'reorder',
          reorder,
          defaultValue: null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    Widget row = _RowScope(
      reorder: reorder != null,
      alternate: index.isOdd,
      child: child,
    );
    if (reorder != null) {
      final title = child is ListRow ? (child as ListRow).title : null;
      final name = child is ListRow ? (child as ListRow).reorderLabel : null;
      row = Stack(
        children: [
          row,
          PositionedDirectional(
            top: 0,
            bottom: 0,
            end: 4,
            width: 44,
            child: _Grip(
              label:
                  name ??
                  (title is Text && title.data != null
                      ? 'Reorder ${title.data}'
                      : 'Reorder'),
              onStart: () => reorder!._dragStart(index),
              onUpdate: reorder!._dragUpdate,
              onEnd: reorder!._dragEnd,
              onStep: (delta) {
                final to = index + delta;
                if (to >= 0 && to < reorder!.widget.children.length) {
                  reorder!._commit(index, to);
                }
              },
            ),
          ),
        ],
      );
    }
    row = KeyedSubtree(key: contentKey, child: row);
    if (lifted) {
      row = DecoratedBox(
        decoration: ShapeDecoration(
          color: c.surface,
          shape: SuperellipseBorder(radius: theme.sizes.radiusControl),
          shadows: const [
            BoxShadow(
              color: Color.from(alpha: 0.38, red: 0, green: 0, blue: 0),
              offset: Offset(0, 16),
              blurRadius: 32,
              spreadRadius: -14,
            ),
          ],
        ),
        child: row,
      );
    }
    if (offset != 0 || lifted) {
      // A moving row is its own layer: every frame of a reorder shifts the rows around the
      // lifted one, and shifting a layer costs nothing where repainting the row would.
      row = Transform.translate(
        offset: Offset(0, offset),
        child: RepaintBoundary(
          child: lifted ? Transform.scale(scale: 1.02, child: row) : row,
        ),
      );
    }
    final line = hairline;
    final color = hairlineColor;
    if (line == null || color == null) return row;
    return Stack(
      children: [
        row,
        PositionedDirectional(
          top: 0,
          start: line,
          end: 0,
          height: 1,
          child: IgnorePointer(child: ColoredBox(color: color)),
        ),
      ],
    );
  }
}

class _RowScope extends InheritedWidget {
  const _RowScope({
    required this.reorder,
    required this.alternate,
    required super.child,
  });
  final bool reorder;

  /// Every second row of its section (CSS `:nth-child(even)`): selected, it takes the lighter
  /// tint, so selected neighbours alternate.
  final bool alternate;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('reorder', value: reorder, ifTrue: 'reorderable'))
      ..add(FlagProperty('alternate', value: alternate, ifTrue: 'alternate'));
  }

  @override
  bool updateShouldNotify(_RowScope old) =>
      old.reorder != reorder || old.alternate != alternate;
}

class _Grip extends StatefulWidget {
  const _Grip({
    required this.label,
    required this.onStart,
    required this.onUpdate,
    required this.onEnd,
    required this.onStep,
  });
  final String label;
  final VoidCallback onStart;
  final ValueChanged<double> onUpdate;
  final VoidCallback onEnd;
  final ValueChanged<int> onStep;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(ObjectFlagProperty<VoidCallback>.has('onStart', onStart))
      ..add(ObjectFlagProperty<ValueChanged<double>>.has('onUpdate', onUpdate))
      ..add(ObjectFlagProperty<VoidCallback>.has('onEnd', onEnd))
      ..add(ObjectFlagProperty<ValueChanged<int>>.has('onStep', onStep));
  }

  @override
  State<_Grip> createState() => _GripState();
}

class _GripState extends State<_Grip> {
  bool _focus = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Semantics(
      button: true,
      label: widget.label,
      hint: 'Drag, or use the up and down arrow keys.',
      child: Focus(
        onFocusChange: (f) => setState(
          () => _focus =
              f &&
              FocusManager.instance.highlightMode ==
                  FocusHighlightMode.traditional,
        ),
        onKeyEvent: (_, event) {
          if (event is! KeyDownEvent) return KeyEventResult.ignored;
          if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
            widget.onStep(-1);
            return KeyEventResult.handled;
          }
          if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
            widget.onStep(1);
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: MouseRegion(
          cursor: SystemMouseCursors.grab,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onVerticalDragStart: (_) => widget.onStart(),
            onVerticalDragUpdate: (d) => widget.onUpdate(d.delta.dy),
            onVerticalDragEnd: (_) => widget.onEnd(),
            onVerticalDragCancel: widget.onEnd,
            child: FocusRing(
              visible: _focus,
              inside: true,
              radius: theme.sizes.radiusControlSmall,
              child: Center(
                child: LucideGripVertical(size: 20, color: c.muted),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// An action revealed by swiping a row.
class RowAction {
  const RowAction({
    required this.label,
    this.icon,
    this.tone = RowActionTone.neutral,
    required this.onAction,
  });

  /// Short verb: “Confirm”, “Archive”, “Delete”.
  final String label;
  final Widget? icon;
  final RowActionTone tone;
  final VoidCallback onAction;
}

/// `destructive` (red), `primary` (brand) or `neutral` (gray, default).
enum RowActionTone { neutral, primary, destructive }

const double _actionWidth = 76;

/// Only one row shows its actions at a time.
_ListRowState? _openRow;

/// One row of a list: a full-width button with leading media, title, subtitle, trailing value and
/// an optional chevron. Swipe actions reveal behind it, and inside a reorderable [ListSection] it
/// gets a grip. The twin of `ListRow` in `@feeef.dev/ui/primitives/list`.
class ListRow extends StatefulWidget {
  const ListRow({
    super.key,
    required this.title,
    this.subtitle,
    this.subtitleWrap = false,
    this.leading,
    this.trailing,
    this.chevron = false,
    this.selected = false,
    this.onClick,
    this.disabled = false,
    this.leadingActions = const [],
    this.trailingActions = const [],
    this.fullSwipe = true,
    this.reorderLabel,
  });

  /// Main text.
  final Widget title;

  /// Secondary text in muted styling; one line with an ellipsis by default.
  final Widget? subtitle;

  /// Allows the subtitle to wrap to its content height instead of truncating.
  /// Leading and trailing media stay centered against the entire text block.
  /// An explicit [Text.maxLines] on the subtitle can still limit its lines.
  final bool subtitleWrap;

  /// Icon, avatar or thumbnail at the start.
  final Widget? leading;

  /// Value, badge or control at the end.
  final Widget? trailing;

  /// Shows a disclosure chevron: the row opens another page.
  final bool chevron;

  /// Marks the row as the current selection (a split view's open item).
  final bool selected;

  /// Without it the row is static text.
  final VoidCallback? onClick;
  final bool disabled;

  /// Actions revealed by swiping toward the end (they sit at the start). The first runs on a long
  /// swipe.
  final List<RowAction> leadingActions;

  /// Actions revealed by swiping toward the start (they sit at the end).
  final List<RowAction> trailingActions;

  /// Whether a long swipe runs the first action.
  final bool fullSwipe;

  /// Accessible name of the reorder grip.
  final String? reorderLabel;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('subtitleWrap', value: subtitleWrap, ifTrue: 'wrap'))
      ..add(FlagProperty('chevron', value: chevron, ifTrue: 'chevron'))
      ..add(FlagProperty('selected', value: selected, ifTrue: 'selected'))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onClick', onClick))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(
        IterableProperty<RowAction>(
          'leadingActions',
          leadingActions,
          defaultValue: const <RowAction>[],
        ),
      )
      ..add(
        IterableProperty<RowAction>(
          'trailingActions',
          trailingActions,
          defaultValue: const <RowAction>[],
        ),
      )
      ..add(
        FlagProperty(
          'fullSwipe',
          value: fullSwipe,
          ifFalse: 'no full swipe',
          defaultValue: true,
        ),
      )
      ..add(StringProperty('reorderLabel', reorderLabel, defaultValue: null));
  }

  @override
  State<ListRow> createState() => _ListRowState();
}

class _ListRowState extends State<ListRow> {
  final _offset = MotionValue(0, 0.25);
  double _width = 360;
  SwipeSide? _open;
  bool _hovered = false, _down = false, _focus = false;
  late final void Function() _unsubscribe;
  final _rowFocus = FocusNode();

  bool get _swipeable =>
      widget.leadingActions.isNotEmpty || widget.trailingActions.isNotEmpty;

  SwipeSides get _sides => SwipeSides(
    leading: widget.leadingActions.length * _actionWidth,
    trailing: widget.trailingActions.length * _actionWidth,
    row: _width,
    fullLeading: widget.fullSwipe,
    fullTrailing: widget.fullSwipe,
  );

  @override
  void initState() {
    super.initState();
    _unsubscribe = _offset.subscribe((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    _offset.stop();
    _rowFocus.dispose();
    if (_openRow == this) _openRow = null;
    super.dispose();
  }

  Future<bool> _settle(double target, [double? velocity]) =>
      _offset.animateTo(target, spring: Springs.release, velocity: velocity);

  void _close() {
    setState(() => _open = null);
    _settle(0);
    if (_openRow == this) _openRow = null;
  }

  void _run(RowAction action) {
    _close();
    action.onAction();
  }

  bool get _rtl => Directionality.of(context) == TextDirection.rtl;

  double _start = 0;
  void _dragStart(DragStartDetails _) {
    if (_openRow != null && _openRow != this) _openRow!._close();
    _offset.stop();
    _start = _offset.get();
  }

  void _dragUpdate(DragUpdateDetails details) {
    final s = _sides;
    _start += _rtl ? -details.delta.dx : details.delta.dx;
    final raw = _start;
    final max = s.leading > 0 ? s.row : 0.0;
    final min = s.trailing > 0 ? -s.row : 0.0;
    _offset.set(
      raw > max
          ? max + rubberBand(raw - max, 120)
          : raw < min
          ? min + rubberBand(raw - min, 120)
          : raw,
    );
  }

  void _dragEnd(DragEndDetails details) {
    final velocity = (details.primaryVelocity ?? 0) * (_rtl ? -1 : 1);
    final landing = swipeRelease(_offset.get(), velocity, _sides);
    if (landing.commit != null) {
      final action =
          (landing.commit == SwipeSide.leading
                  ? widget.leadingActions
                  : widget.trailingActions)
              .first;
      setState(() => _open = null);
      _settle(landing.offset, velocity).then((_) {
        action.onAction();
        // A row that stays (archive, mark read) slides home; a removed one is gone already.
        if (mounted) _settle(0);
      });
      return;
    }
    setState(
      () => _open = landing.offset > 0
          ? SwipeSide.leading
          : landing.offset < 0
          ? SwipeSide.trailing
          : null,
    );
    _openRow = landing.offset != 0 ? this : null;
    _settle(landing.offset, velocity);
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (!_swipeable || event is! KeyDownEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    final towardEnd =
        key ==
        (_rtl ? LogicalKeyboardKey.arrowLeft : LogicalKeyboardKey.arrowRight);
    final towardStart =
        key ==
        (_rtl ? LogicalKeyboardKey.arrowRight : LogicalKeyboardKey.arrowLeft);
    final side = towardStart && widget.trailingActions.isNotEmpty
        ? SwipeSide.trailing
        : towardEnd && widget.leadingActions.isNotEmpty
        ? SwipeSide.leading
        : null;
    if (side == null) return KeyEventResult.ignored;
    final width =
        (side == SwipeSide.leading
                ? widget.leadingActions
                : widget.trailingActions)
            .length *
        _actionWidth;
    setState(() => _open = side);
    _openRow = this;
    _settle(side == SwipeSide.leading ? width : -width);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      FocusScope.of(context).nextFocus();
    });
    return KeyEventResult.handled;
  }

  // Every row measures its real width: the trailing cap and the swipe distances depend on it.
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => _build(context, constraints.maxWidth),
  );

  Widget _build(BuildContext context, double width) {
    _width = width.isFinite ? width : 360;
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final scope = context.dependOnInheritedWidgetOfExactType<_RowScope>();
    final reorder = scope?.reorder ?? false;
    final padEnd = reorder ? 52.0 : s.listInset;
    // `max-width: 45%` of the row's content box (inside its inline padding).
    final trailingCap = width.isFinite
        ? math.max(0.0, width - s.listInset - padEnd) * 0.45
        : double.infinity;
    final interactive = widget.onClick != null && !widget.disabled;
    final card = mixSrgb(c.ink, 0.04, c.surface);
    // Selected neighbours alternate two tints so each row stays distinct (DESIGN: selected runs).
    final fill = widget.selected
        ? mixSrgb(c.primary, scope?.alternate == true ? 0.09 : 0.14, c.surface)
        : interactive && _down
        ? c.controlPressed
        : interactive && (_hovered || _focus)
        ? (_swipeable ? mixSrgb(c.ink, 0.05, card) : c.controlHover)
        : (_swipeable ? card : const Color(0x00000000));

    Widget body = Row(
      spacing: 14,
      children: [
        if (widget.leading != null)
          SquareSlot(
            size: 32,
            child: IconTheme.merge(
              data: IconThemeData(size: 22, color: c.muted),
              child: DefaultTextStyle.merge(
                style: TextStyle(color: c.muted),
                child: widget.leading!,
              ),
            ),
          ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              DefaultTextStyle.merge(
                style: const TextStyle(
                  fontSize: 15,
                  height: 20 / 15,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                softWrap: false,
                child: widget.title,
              ),
              if (widget.subtitle != null)
                DefaultTextStyle(
                  // A fresh style resets an ancestor's maxLines when wrapping is requested.
                  style: DefaultTextStyle.of(context).style.copyWith(
                    fontSize: 13,
                    height: 18 / 13,
                    leadingDistribution: TextLeadingDistribution.even,
                    color: c.muted,
                  ),
                  maxLines: widget.subtitleWrap ? null : 1,
                  overflow: widget.subtitleWrap
                      ? TextOverflow.clip
                      : TextOverflow.ellipsis,
                  softWrap: widget.subtitleWrap,
                  child: widget.subtitle!,
                ),
            ],
          ),
        ),
        if (widget.trailing != null)
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: trailingCap),
            child: IconTheme.merge(
              data: IconThemeData(color: c.muted),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  color: c.muted,
                  fontSize: 14,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
                child: widget.trailing!,
              ),
            ),
          ),
        if (widget.chevron)
          // margin-inline-start: -4px: the 18px chevron takes 14px of layout and reaches 4px
          // back into the gap.
          SizedBox(
            width: 14,
            height: 18,
            child: OverflowBox(
              maxWidth: 18,
              alignment: AlignmentDirectional.centerEnd,
              child: Transform.flip(
                flipX: _rtl,
                child: LucideChevronRight(
                  size: 18,
                  color: mixSrgb(c.muted, 0.7, const Color(0x00000000)),
                ),
              ),
            ),
          ),
      ],
    );

    Widget row = DecoratedBox(
      decoration: BoxDecoration(color: fill),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: s.listRowHeight),
        child: Padding(
          padding: EdgeInsetsDirectional.fromSTEB(s.listInset, 8, padEnd, 8),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: c.ink),
            child: body,
          ),
        ),
      ),
    );
    // Keyboard focus: a ring just inside the row (the card clips its corners).
    row = FocusRing(visible: _focus, inside: true, radius: 0, child: row);
    row = Opacity(opacity: widget.disabled ? 0.5 : 1, child: row);

    if (widget.onClick != null) {
      row = Semantics(
        button: true,
        selected: widget.selected,
        enabled: !widget.disabled,
        child: Focus(
          focusNode: _rowFocus,
          canRequestFocus: !widget.disabled,
          onKeyEvent: _onKey,
          onFocusChange: (f) => setState(
            () => _focus =
                f &&
                FocusManager.instance.highlightMode ==
                    FocusHighlightMode.traditional,
          ),
          child: Shortcuts(
            shortcuts: const {
              SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
              SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
            },
            child: Actions(
              actions: {
                ActivateIntent: CallbackAction<ActivateIntent>(
                  onInvoke: (_) {
                    if (interactive) widget.onClick!();
                    return null;
                  },
                ),
              },
              child: MouseRegion(
                cursor: interactive
                    ? SystemMouseCursors.click
                    : MouseCursor.defer,
                onEnter: (_) => setState(() => _hovered = true),
                onExit: (_) => setState(() => _hovered = false),
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: interactive
                      ? (_) => setState(() => _down = true)
                      : null,
                  onTapUp: interactive
                      ? (_) => setState(() => _down = false)
                      : null,
                  onTapCancel: interactive
                      ? () => setState(() => _down = false)
                      : null,
                  onTap: interactive
                      ? () {
                          // A tap on an open row closes it instead of opening the row.
                          if (_open != null) {
                            _close();
                          } else {
                            widget.onClick!();
                          }
                        }
                      : null,
                  child: row,
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (!_swipeable) return row;
    final v = _offset.get();
    final sides = _sides;
    final full = swipeIsFull(v, sides);
    return ClipRect(
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onHorizontalDragStart: _dragStart,
        onHorizontalDragUpdate: _dragUpdate,
        onHorizontalDragEnd: _dragEnd,
        child: Stack(
          children: [
            if (v > 0.5)
              _Actions(
                side: SwipeSide.leading,
                width: v.abs(),
                full: full,
                open: _open == SwipeSide.leading,
                actions: widget.leadingActions,
                onRun: _run,
                onEscape: _close,
              ),
            if (v < -0.5)
              _Actions(
                side: SwipeSide.trailing,
                width: v.abs(),
                full: full,
                open: _open == SwipeSide.trailing,
                actions: widget.trailingActions,
                onRun: _run,
                onEscape: _close,
              ),
            Transform.translate(offset: Offset(_rtl ? -v : v, 0), child: row),
          ],
        ),
      ),
    );
  }
}

/// The revealed actions on one side, as wide as the swipe; the first takes over on a full swipe.
class _Actions extends StatelessWidget {
  const _Actions({
    required this.side,
    required this.width,
    required this.full,
    required this.open,
    required this.actions,
    required this.onRun,
    required this.onEscape,
  });
  final SwipeSide side;
  final double width;
  final bool full, open;
  final List<RowAction> actions;
  final ValueChanged<RowAction> onRun;
  final VoidCallback onEscape;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<SwipeSide>('side', side))
      ..add(DoubleProperty('width', width))
      ..add(FlagProperty('full', value: full, ifTrue: 'full swipe'))
      ..add(FlagProperty('open', value: open, ifTrue: 'open'))
      ..add(IterableProperty<RowAction>('actions', actions))
      ..add(ObjectFlagProperty<ValueChanged<RowAction>>.has('onRun', onRun))
      ..add(ObjectFlagProperty<VoidCallback>.has('onEscape', onEscape));
  }

  @override
  Widget build(BuildContext context) {
    final ordered = side == SwipeSide.leading
        ? actions
        : actions.reversed.toList();
    return PositionedDirectional(
      top: 0,
      bottom: 0,
      start: side == SwipeSide.leading ? 0 : null,
      end: side == SwipeSide.trailing ? 0 : null,
      width: width,
      child: ExcludeFocus(
        excluding: !open,
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: full ? 1 : 0),
          duration: const Duration(milliseconds: 260),
          curve: const Cubic(0.2, 0.9, 0.25, 1.15),
          builder: (context, t, _) {
            // flex-grow: the first (outer) action grows to 60 on a full swipe.
            final weights = [
              for (final a in ordered)
                a == actions.first ? 1 + 59 * t.clamp(0.0, 1.2) : 1.0,
            ];
            final total = weights.fold(0.0, (a, b) => a + b);
            return Row(
              children: [
                for (var i = 0; i < ordered.length; i++)
                  SizedBox(
                    width: width * weights[i] / total,
                    child: _ActionButton(
                      action: ordered[i],
                      onRun: onRun,
                      onEscape: onEscape,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.action,
    required this.onRun,
    required this.onEscape,
  });
  final RowAction action;
  final ValueChanged<RowAction> onRun;
  final VoidCallback onEscape;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<RowAction>('action', action))
      ..add(ObjectFlagProperty<ValueChanged<RowAction>>.has('onRun', onRun))
      ..add(ObjectFlagProperty<VoidCallback>.has('onEscape', onEscape));
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final (bg, fg) = switch (action.tone) {
      RowActionTone.primary => (c.primary, c.onPrimary),
      RowActionTone.destructive => (c.danger, c.surface),
      RowActionTone.neutral => (mixSrgb(c.ink, 0.55, c.surface), c.surface),
    };
    return Semantics(
      button: true,
      label: action.label,
      excludeSemantics: true,
      child: Focus(
        onKeyEvent: (_, event) {
          if (event is KeyDownEvent &&
              event.logicalKey == LogicalKeyboardKey.escape) {
            onEscape();
            return KeyEventResult.handled;
          }
          if (event is KeyDownEvent &&
              (event.logicalKey == LogicalKeyboardKey.enter ||
                  event.logicalKey == LogicalKeyboardKey.space)) {
            onRun(action);
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: GestureDetector(
          onTap: () => onRun(action),
          child: ColoredBox(
            color: bg,
            child: ClipRect(
              child: OverflowBox(
                // Content keeps its size and is clipped while the action is narrow (overflow: hidden).
                minWidth: 0,
                maxWidth: double.infinity,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  spacing: 4,
                  children: [
                    if (action.icon != null)
                      IconTheme.merge(
                        data: IconThemeData(size: 20, color: fg),
                        child: action.icon!,
                      ),
                    Text(
                      action.label,
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: fg,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
