import 'dart:math' as math;
import 'dart:ui' as ui show SemanticsRole;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../actions/actions_bar.dart' show ActionsWidthProvider;
import '../brand/geometry.dart';
import '../glass/container.dart';
import '../glass/geometry.dart';
import '../glass/press.dart';
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../menu/anchored_panel.dart';
import '../menu/menu_surface.dart';
import '../scaffold.dart' show GlassGroup;
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../scroll/metrics.dart' show scrollEdgeOpacities;
import '../scroll/reveal.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';
import 'button.dart' show ControlOverrides;
import 'lens.dart';
import 'lens_model.dart';
import 'segmented.dart' show SegmentOption, SegmentTone;
import 'segmented_model.dart';
import 'touch_target.dart';

/// The selection engine shared by [SegmentedControl] and [TabView]'s tab bar: the Flutter twin of
/// `SelectionTrack` in `@feeef.dev/ui/primitives/selection-track`. Internal (not exported by
/// `feeef_ui.dart`): apps use those two, which own the semantics and the look; a third selection
/// widget extends this instead of forking it.

/// What chose an option: a tap (also Enter and Space), a released drag, or an arrow, Home or End
/// key.
enum SelectionSource { press, drag, key }

/// How an option lays out its content: icon, label and badge in a row (a segment), or the icon
/// over the label with the badge on the icon (a tab).
enum SelectionLayout { inline, stacked }

/// The pill at rest: the primary fill with on-primary ink (a segmented control), or iOS 27's quiet
/// pill (a tab bar): the ink at 7 % over what is under it, with the selected glyph and label in the
/// primary colour. Pressed or dragged, both become the same glass lens (a water drop that
/// magnifies, [lensMagnify]); inside it the ink is the ink colour (filled) or the primary (quiet).
enum SelectionPill { filled, quiet }

/// How much the pressed or dragged pill (a water drop) magnifies the options under it (the web
/// kit's `LENS_MAGNIFY`).
const double lensMagnify = 0.18;

/// What a track does when its options don't fit: scroll them inside itself, or fold into one
/// capsule (the selection and a chevron) that opens the options as a single-choice menu.
enum SelectionOverflow { scroll, menu }

/// The chevron a folded track adds after the selected option: 4px gap + a 14px icon
/// (`.lab-segmented-chevron`).
const double _chevronWidth = 18;

/// How far past its room a track must be before it folds, and inside it before it unfolds.
const double _foldHysteresis = 1;

/// A host's option sizes (a tab bar; the web kit sets them in the host's CSS). Without them a
/// track is a segmented control: the theme's control height, inset, padding and type.
@immutable
class SelectionTrackSizes {
  const SelectionTrackSizes({
    required this.height,
    required this.inset,
    required this.gap,
    required this.padding,
    required this.fontSize,
    required this.lineHeight,
    this.minWidth = 0,
    this.maxWidth = double.infinity,
    this.direction = Axis.vertical,
    this.overlap = 0,
    this.paddingTop = 0,
    this.paddingBottom = 0,
    this.iconLine = 24,
    this.contentGap,
  });

  /// An option's height (the pill's).
  final double height;

  /// From the track's edge to the pill, and between options.
  final double inset, gap;

  /// An option's side padding.
  final double padding;

  /// The label's size and line height.
  final double fontSize, lineHeight;

  /// An option's width range; its label ellipsizes past [maxWidth].
  final double minWidth, maxWidth;

  /// Stacked options: the icon over the label ([Axis.vertical]) or beside it (a wide tab bar).
  final Axis direction;

  /// How far each option reaches over the one before it (equal-width tracks; iOS 27 tabs overlap
  /// by 8pt: a negative `margin-inline-start`).
  final double overlap;

  /// An option's top and bottom padding: its content centres in the height between them.
  final double paddingTop, paddingBottom;

  /// The height of the line the icon sits in (22px icon, 24px wide).
  final double iconLine;

  /// Between the icon and the label; null: 2 stacked, 8 beside.
  final double? contentGap;

  @override
  bool operator ==(Object other) =>
      other is SelectionTrackSizes &&
      other.height == height &&
      other.inset == inset &&
      other.gap == gap &&
      other.padding == padding &&
      other.fontSize == fontSize &&
      other.lineHeight == lineHeight &&
      other.minWidth == minWidth &&
      other.maxWidth == maxWidth &&
      other.direction == direction &&
      other.overlap == overlap &&
      other.paddingTop == paddingTop &&
      other.paddingBottom == paddingBottom &&
      other.iconLine == iconLine &&
      other.contentGap == contentGap;

  @override
  int get hashCode => Object.hash(
    height,
    inset,
    gap,
    padding,
    fontSize,
    lineHeight,
    minWidth,
    maxWidth,
    direction,
    overlap,
    paddingTop,
    paddingBottom,
    iconLine,
    contentGap,
  );
}

/// A host folding the track into its selected option frame by frame (a minimizing tab bar): the
/// twin of the CSS a tab view writes on its track while minimizing. At [progress] p the other
/// options fade at `1 - 2.2p`, every label at `1 - 2p` and the pill at `1 - p`; the selected icon
/// moves by [icon] and its plain ink turns to the primary by p; from p ≥ 0.5 the other options
/// take no pointer. The host moves the track itself.
class SelectionMinimize extends ChangeNotifier {
  double _progress = 0;
  Offset _icon = Offset.zero;

  /// 0 the full track … 1 only the selected icon.
  double get progress => _progress;

  /// Where the selected icon is moved (the host's geometry, already scaled by the progress).
  Offset get icon => _icon;

  void set(double progress, Offset icon) {
    if (progress == _progress && icon == _icon) return;
    _progress = progress;
    _icon = icon;
    notifyListeners();
  }

  ({Rect option, Offset icon})? Function(RenderBox ancestor)? _measure;

  /// The selected option's box in [ancestor]'s coordinates and how far its icon's centre is from
  /// the option's centre; null before the track is laid out.
  ({Rect option, Offset icon})? measure(RenderBox ancestor) =>
      _measure?.call(ancestor);
}

/// One row of options and one moving pill: measuring, the pill and its glass lens with the touch
/// glow, drag with rubber band and momentum snap, auto-scroll, one-row overflow with edge fades and
/// reveal, keyboard roving, right-to-left, badges, tones, reduced motion and solid glass.
///
/// [semantics] makes it a radio group or a tab list; [layout], [pill] and [sizes] make it a
/// segmented control or a tab bar. A host's [minimize] folds it toward the selected option (a
/// minimizing tab bar). It needs a bounded width to scroll.
class SelectionTrack<T> extends StatefulWidget {
  const SelectionTrack({
    super.key,
    required this.value,
    required this.onSelect,
    required this.options,
    required this.label,
    this.semantics = SelectionSemantics.radio,
    this.layout = SelectionLayout.inline,
    this.pill = SelectionPill.filled,
    this.sizes,
    this.disabled = false,
    this.equalWidth = false,
    this.draggable = true,
    this.minimize,
    this.overflow = SelectionOverflow.scroll,
  });

  /// The selected option's value.
  final T value;

  /// Called with the chosen value and what chose it: on every tap, when a dragged pill is released
  /// on another option, and on every arrow, Home or End key.
  final void Function(T value, SelectionSource source) onSelect;

  /// Options, in display order.
  final List<SegmentOption<T>> options;

  /// Accessible name of the group.
  final String label;

  /// A radio group (also Up and Down keys) or a tab list (Left and Right only).
  final SelectionSemantics semantics;

  /// Inline icon, label, badge; or the icon (badge on it) over the label.
  final SelectionLayout layout;

  /// The pill's rest paint.
  final SelectionPill pill;

  /// A host's option sizes; null for a segmented control's.
  final SelectionTrackSizes? sizes;

  /// Disables every option.
  final bool disabled;

  /// Fills the width with equal options that ellipsize (never scrolls).
  final bool equalWidth;

  /// False: taps select but never pick up the pill.
  final bool draggable;

  /// A host's minimize progress (a tab bar shrinking to its selected tab), or null.
  final SelectionMinimize? minimize;

  /// When the options don't fit the width the track is given: [SelectionOverflow.scroll] inside
  /// it, or [SelectionOverflow.menu]: the other options fold into the selected one, which gains a
  /// chevron and opens them as a radio menu (never with [equalWidth]). It folds by the width its
  /// parent gives it: in a [Row] wrap it in [Flexible].
  final SelectionOverflow overflow;

  @override
  State<SelectionTrack<T>> createState() => _SelectionTrackState<T>();
}

/// A press that may become a drag of the pill.
class _Drag {
  _Drag({
    required this.pointer,
    required this.touch,
    required this.start,
    required this.onPill,
    required this.grab,
    required this.index,
    required this.time,
  }) : catching = !onPill,
       last = start;
  final int pointer;
  final bool touch;
  final Offset start;

  /// The latest pointer position (global) and its time (ms), for auto-scroll frames between moves.
  Offset last;
  double time;

  /// Pressed on the pill itself (it lifts at once) rather than on another option.
  final bool onPill;

  /// Pointer x less the pill centre when grabbed.
  final double grab;

  /// Past the slop: the pill follows the pointer.
  bool active = false;

  /// Pressed off the pill: it springs to the pointer before tracking it.
  bool catching;

  /// Reduced motion: the option under the pointer.
  int index;
}

/// Notifies painters and clippers whenever any pill value moves.
class _PillMotion extends ChangeNotifier {
  void changed() => notifyListeners();
}

class _SelectionTrackState<T> extends State<SelectionTrack<T>>
    with SingleTickerProviderStateMixin {
  final _nodes = <int, FocusNode>{};
  final _keys = <int, GlobalKey>{};
  final _iconKeys = <int, GlobalKey>{};
  final _trackKey = GlobalKey();
  final _motion = _PillMotion();
  final _scroll = ScrollController();
  late final Ticker _autoScroll = createTicker(_autoScrollTick);
  Duration _autoLast = Duration.zero;

  // Pill: centre, width and top; press response: swell, stretch, lens (0 filled … 1 glass), glow.
  final center = MotionValue(0, 0.05);
  final width = MotionValue(0, 0.05);
  final top = MotionValue(0, 0.05);
  final press = MotionValue(1, 0.0005);
  final stretch = MotionValue(0, 0.05);
  final lens = MotionValue(0, 0.002);
  final glowRadius = MotionValue(glassGlowStart, 0.5);
  final glowOpacity = MotionValue(0, 0.005);
  final _unsubscribe = <void Function()>[];

  List<Rect> _boxes = const [];
  List<SegmentSpan> _spans = const [];

  /// The options are wider than the control: it scrolls.
  bool _overflow = false;
  bool _placed = false;
  bool _measureQueued = false;
  Offset _glowAt = Offset.zero;
  _Drag? _drag;
  bool _dragging = false;

  // Folding into a menu: each option's own width (measured offstage), whether the track is folded
  // now (decided at layout from the width it is given) and the menu.
  List<double>? _natural;
  final _reported = <int, double>{};
  bool _folded = false;
  bool _menuOpen = false;

  bool get _menu =>
      widget.overflow == SelectionOverflow.menu && !widget.equalWidth;

  FocusNode _node(int index) => _nodes.putIfAbsent(index, FocusNode.new);
  GlobalKey _key(int index) => _keys.putIfAbsent(index, GlobalKey.new);
  GlobalKey _iconKey(int index) => _iconKeys.putIfAbsent(index, GlobalKey.new);

  /// [SelectionMinimize.measure]: the selected option and its icon's offset to the option's
  /// centre, in [ancestor]'s pixels.
  ({Rect option, Offset icon})? _measureMinimize(RenderBox ancestor) {
    Rect? rect(GlobalKey? key) {
      final box = key?.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached || !box.hasSize) return null;
      return MatrixUtils.transformRect(
        box.getTransformTo(ancestor),
        Offset.zero & box.size,
      );
    }

    final option = rect(_keys[_selected]);
    if (option == null) return null;
    final icon = rect(_iconKeys[_selected]);
    return (
      option: option,
      icon: icon == null ? Offset.zero : option.center - icon.center,
    );
  }

  void _attachMinimize(SelectionMinimize? minimize) {
    minimize?._measure = _measureMinimize;
    minimize?.addListener(_motion.changed);
  }

  void _detachMinimize(SelectionMinimize? minimize) {
    if (minimize?._measure == _measureMinimize) minimize?._measure = null;
    minimize?.removeListener(_motion.changed);
  }

  bool get _reduced => reducedMotionOf(context);
  int get _selected =>
      widget.options.indexWhere((option) => option.value == widget.value);

  @override
  void initState() {
    super.initState();
    for (final value in [
      center,
      width,
      top,
      press,
      stretch,
      lens,
      glowRadius,
      glowOpacity,
    ]) {
      _unsubscribe.add(value.subscribe((_) => _motion.changed()));
    }
    _attachMinimize(widget.minimize);
    // While dragged, the width follows the centre: one segment's width to the next.
    _unsubscribe.add(
      center.subscribe((c) {
        if (_drag?.active ?? false) width.set(segmentedPillWidth(c, _spans));
      }),
    );
  }

  @override
  void didUpdateWidget(SelectionTrack<T> old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) _queueMeasure(follow: true);
    if (old.minimize != widget.minimize) {
      _detachMinimize(old.minimize);
      _attachMinimize(widget.minimize);
    }
    if (old.options.length != widget.options.length) {
      _reported.clear();
      _natural = null;
    }
    // Stops a drag the host no longer allows (a tab bar that minimizes).
    if (!widget.draggable && old.draggable && (_drag?.active ?? false)) {
      _onEnd(null, cancelled: true);
    }
  }

  @override
  void dispose() {
    _detachMinimize(widget.minimize);
    for (final off in _unsubscribe) {
      off();
    }
    for (final value in [
      center,
      width,
      top,
      press,
      stretch,
      lens,
      glowRadius,
      glowOpacity,
    ]) {
      value.stop();
    }
    for (final node in _nodes.values) {
      node.dispose();
    }
    _autoScroll.dispose();
    _scroll.dispose();
    _motion.dispose();
    super.dispose();
  }

  bool _follow = false;

  /// Measures after this frame's layout, then follows the selection (or the new geometry).
  void _queueMeasure({bool follow = false}) {
    _follow = _follow || follow;
    if (_measureQueued) return;
    _measureQueued = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _measureQueued = false;
      if (!mounted) return;
      final follow = _follow;
      _follow = false;
      final changed = _measure();
      final overflow =
          !widget.equalWidth &&
          _scroll.hasClients &&
          _scroll.position.hasContentDimensions &&
          _scroll.position.maxScrollExtent > 0.5;
      final overflowChanged = overflow != _overflow;
      if (overflowChanged) setState(() => _overflow = overflow);
      if (_drag?.active ?? false) return;
      if (!_placed) {
        // Not laid out yet: the next layout queues another measure.
        if (_boxes.isEmpty) return;
        // No option selected: placed with no pill. Only one rebuild either way, so a value
        // that matches no option settles instead of measuring every frame.
        if (_selected >= 0 && _selected < _boxes.length) {
          _moveTo(_selected, Springs.snappy);
          _reveal(_selected, smooth: false);
        } else {
          _placed = true;
        }
        setState(() {});
        return;
      }
      final index = _selected;
      if (index < 0 || index >= _boxes.length) return;
      final box = _boxes[index];
      // Whatever chose it (a tap, a key, a release, the owner), the selection scrolls into view.
      if (follow || overflowChanged) _reveal(index, smooth: follow);
      // The pill appears for the first time (the value had no option): jump, don't grow from 0.
      if (width.get() <= 0) _placed = false;
      if (follow) {
        // A released pill already heading here keeps its release spring.
        if (center.isAnimating && (center.target - box.center.dx).abs() < 0.5) {
          return;
        }
        _moveTo(index, Springs.snappy);
      } else if (changed) {
        if (center.isAnimating) {
          _moveTo(index, Springs.snappy);
        } else {
          // At rest: snap to the new geometry without animating a resize.
          center.set(box.center.dx);
          width.set(box.width);
          top.set(box.top);
        }
      }
    });
  }

  /// Reads every option's box in the track's own pixels. True when anything moved.
  bool _measure() {
    final track = _trackKey.currentContext?.findRenderObject() as RenderBox?;
    if (track == null || !track.hasSize) return false;
    final boxes = <Rect>[];
    for (var i = 0; i < widget.options.length; i++) {
      final box = _keys[i]?.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.hasSize || !box.attached) return false;
      boxes.add(box.localToGlobal(Offset.zero, ancestor: track) & box.size);
    }
    var changed = boxes.length != _boxes.length;
    for (var i = 0; !changed && i < boxes.length; i++) {
      changed = boxes[i] != _boxes[i];
    }
    _boxes = boxes;
    _spans = [
      for (var i = 0; i < boxes.length; i++)
        SegmentSpan(
          boxes[i].left,
          boxes[i].width,
          disabled: widget.disabled || widget.options[i].disabled,
        ),
    ];
    if (changed) _motion.changed();
    return changed;
  }

  /// Scrolls the track (never an enclosing scroll view) to show option [index] clear of the
  /// edge fades.
  void _reveal(int index, {required bool smooth}) {
    if (!_scroll.hasClients) return;
    revealScrollChild(
      _scroll,
      _keys[index]?.currentContext,
      inline: RevealAlignment.nearest,
      behavior: smooth ? RevealBehavior.smooth : RevealBehavior.instant,
    );
  }

  /// While a pill is dragged, a pointer near an edge of a scrolling track scrolls it.
  void _autoScrollTick(Duration elapsed) {
    final d = _drag;
    if (d == null || !d.active || !_overflow || !_scroll.hasClients) {
      _autoScroll.stop();
      return;
    }
    final dt = ((elapsed - _autoLast).inMicroseconds / 1e6).clamp(0.0, 0.05);
    _autoLast = elapsed;
    final position = _scroll.position;
    final viewport = position.context.notificationContext?.findRenderObject();
    if (viewport is! RenderBox || !viewport.attached) return;
    final speed = segmentedAutoScrollSpeed(
      viewport.globalToLocal(d.last).dx,
      0,
      viewport.size.width,
    );
    if (speed == 0) return;
    // Right-to-left scroll offsets grow leftward.
    final delta =
        (axisDirectionIsReversed(position.axisDirection) ? -speed : speed) * dt;
    final target = (position.pixels + delta).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    if (target == position.pixels) return;
    position.jumpTo(target);
    _dragTo(d, auto: true);
  }

  /// Springs (or, with reduced motion or before the first placement, jumps) the pill onto [index].
  void _moveTo(int index, Spring spring, {double? velocity}) {
    if (index < 0 || index >= _boxes.length) return;
    final box = _boxes[index];
    final instant = _reduced || !_placed;
    _placed = true;
    center.animateTo(
      box.center.dx,
      spring: spring,
      instant: instant,
      velocity: velocity,
    );
    width.animateTo(box.width, spring: spring, instant: instant);
    top.animateTo(box.top, spring: spring, instant: instant);
  }

  /// The pill as drawn: placed, then swollen and stretched by a press.
  Rect get _pill {
    final height = _boxes.isEmpty ? 0.0 : _boxes.first.height;
    final w = width.get();
    final shape = pressedShape(
      GlassShape(
        x: center.get() - w / 2,
        y: top.get(),
        width: w,
        height: height,
        radius: 0,
      ),
      press.get(),
      stretch.get(),
      0,
    );
    return Rect.fromLTWH(shape.x, shape.y, shape.width, shape.height);
  }

  void _pressIn(Offset at) {
    if (_reduced) return;
    _glowAt = at;
    press.animateTo(glassPressScale, spring: Springs.snappy);
    lens.animateTo(1, spring: Springs.snappy);
    glowRadius.set(glassGlowStart);
    glowOpacity.set(1);
    glowRadius.animateTo(glassGlowRadius(width.get()), spring: Springs.smooth);
  }

  void _pressOut() {
    press.animateTo(1, spring: Springs.bouncy);
    stretch.animateTo(0, spring: Springs.bouncy);
    lens.animateTo(0, spring: Springs.snappy);
    glowOpacity.animateTo(0, spring: Springs.smooth);
  }

  Offset? _local(Offset global) {
    final track = _trackKey.currentContext?.findRenderObject() as RenderBox?;
    return track == null || !track.attached
        ? null
        : track.globalToLocal(global);
  }

  void _onDown(PointerDownEvent event) {
    if (widget.disabled || _drag != null || _folded) return;
    _measure();
    final at = _local(event.position);
    if (_boxes.isEmpty || at == null) return;
    final index = segmentIndexAt(at.dx, _spans);
    if (index < 0 || _spans[index].disabled) return;
    final onPill = index == _selected && !center.isAnimating;
    final touch = event.kind == PointerDeviceKind.touch;
    // A finger off the pill in a scrolling track scrolls it (a tap still selects).
    if (_overflow && touch && !onPill) return;
    _drag = _Drag(
      pointer: event.pointer,
      touch: touch,
      start: event.position,
      onPill: onPill,
      grab: onPill ? at.dx - center.get() : 0,
      index: index,
      time: event.timeStamp.inMicroseconds / 1000,
    );
    if (onPill) _pressIn(at);
  }

  /// True once the press has become a drag (the recognizer then claims the pointer).
  bool _onMove(PointerMoveEvent event) {
    final d = _drag;
    if (d == null || event.pointer != d.pointer) return false;
    final at = _local(event.position);
    if (at == null) return d.active;
    d
      ..last = event.position
      ..time = event.timeStamp.inMicroseconds / 1000;
    if (!d.active) {
      final delta = event.position - d.start;
      final slop = d.touch ? segmentedSlopTouch : segmentedSlopMouse;
      if (delta.dx.abs() < slop || delta.dx.abs() < delta.dy.abs()) {
        return false;
      }
      d.active = true;
      setState(() => _dragging = true);
      if (!d.onPill) _pressIn(at);
      if (_overflow && !_autoScroll.isActive) {
        _autoLast = Duration.zero;
        _autoScroll.start();
      }
    }
    _dragTo(d, auto: false);
    return true;
  }

  /// Moves a dragged pill to the pointer. [auto]: an auto-scroll frame moved the track under a
  /// still pointer, so the pill springs after it instead of tracking pointer samples.
  void _dragTo(_Drag d, {required bool auto}) {
    final at = _local(d.last);
    if (at == null) return;
    if (_reduced) {
      // No sliding: the pill sits on the option under the pointer.
      final index = segmentIndexAt(at.dx, _spans);
      if (index >= 0 && !_spans[index].disabled && index != d.index) {
        d.index = index;
        center.set(_boxes[index].center.dx);
        width.set(_boxes[index].width);
      }
      return;
    }
    _glowAt = at;
    final target = segmentedDragCenter(at.dx, d.grab, _spans);
    if (d.catching || auto) {
      center.animateTo(target, spring: Springs.interactive);
      if (d.catching && (center.get() - target).abs() < 1) d.catching = false;
    } else {
      center.track(target, d.time);
    }
    stretch.animateTo(
      lensStretch(center.velocityAt(d.time)),
      spring: Springs.interactive,
    );
    _motion.changed();
  }

  void _onEnd(PointerEvent? event, {required bool cancelled}) {
    final d = _drag;
    if (d == null || (event != null && event.pointer != d.pointer)) return;
    _drag = null;
    if (_autoScroll.isActive) _autoScroll.stop();
    _pressOut();
    if (!d.active) return;
    setState(() => _dragging = false);
    final time = event == null ? null : event.timeStamp.inMicroseconds / 1000;
    final velocity = time == null ? 0.0 : center.velocityAt(time);
    final index = cancelled
        ? _selected
        : _reduced
        ? d.index
        : segmentedSnapIndex(center.get(), velocity, _spans);
    final target = index >= 0 ? index : _selected;
    _moveTo(target, Springs.release, velocity: _reduced ? null : velocity);
    if (cancelled || target < 0) return;
    final option = widget.options[target];
    if (option.value == widget.value) return;
    widget.onSelect(option.value, SelectionSource.drag);
    // If the owner keeps the old value, the pill goes back to it.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && _drag == null && widget.value != option.value) {
        _moveTo(_selected, Springs.snappy);
      }
    });
  }

  List<int> get _enabled => [
    for (var i = 0; i < widget.options.length; i++)
      if (!widget.disabled && !widget.options[i].disabled) i,
  ];

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = switch (event.logicalKey) {
      LogicalKeyboardKey.arrowRight => 'ArrowRight',
      LogicalKeyboardKey.arrowLeft => 'ArrowLeft',
      LogicalKeyboardKey.arrowDown => 'ArrowDown',
      LogicalKeyboardKey.arrowUp => 'ArrowUp',
      LogicalKeyboardKey.home => 'Home',
      LogicalKeyboardKey.end => 'End',
      _ => null,
    };
    // Folded: Up and Down open the menu (a pop-up button); Left, Right, Home and End still step
    // through the options without opening it.
    if (_folded && (key == 'ArrowDown' || key == 'ArrowUp')) {
      _openMenu();
      return KeyEventResult.handled;
    }
    final enabled = _enabled;
    final target = key == null
        ? null
        : selectionKeyTarget(
            key,
            enabled.indexWhere((i) => widget.options[i].value == widget.value),
            enabled.length,
            Directionality.of(context) == TextDirection.rtl,
            _folded ? SelectionSemantics.tab : widget.semantics,
          );
    if (target == null) return KeyEventResult.ignored;
    final next = enabled[target];
    widget.onSelect(widget.options[next].value, SelectionSource.key);
    _node(next).requestFocus();
    return KeyEventResult.handled;
  }

  void _openMenu() {
    if (!_folded || widget.disabled) return;
    setState(() => _menuOpen = true);
  }

  /// Closes the menu and puts focus back on the capsule, like Radix.
  void _closeMenu() {
    if (!_menuOpen) return;
    setState(() => _menuOpen = false);
    if (_selected >= 0) _node(_selected).requestFocus();
  }

  /// Collects the offstage options' widths; one rebuild when any changed.
  void _report(int index, double width) {
    _reported[index] = width;
    if (_reported.length < widget.options.length) return;
    final next = [
      for (var i = 0; i < widget.options.length; i++) _reported[i] ?? 0,
    ];
    final old = _natural;
    if (old != null &&
        old.length == next.length &&
        [for (var i = 0; i < next.length; i++) (old[i] - next[i]).abs() < 0.5]
            .every((same) => same)) {
      return;
    }
    if (mounted) setState(() => _natural = next);
  }

  /// The unfolded width: every option, the gaps between them and the inset around them.
  double? _fullWidth(double inset, double gap) {
    final natural = _natural;
    if (natural == null || natural.length != widget.options.length) return null;
    return natural.fold<double>(0, (sum, w) => sum + w) +
        gap * math.max(0, natural.length - 1) +
        2 * inset;
  }

  @override
  Widget build(BuildContext context) {
    if (!_menu) {
      _folded = false;
      return _buildTrack(context, folded: false);
    }
    final s = ThemeProvider.of(context).sizes;
    final inset = widget.sizes?.inset ?? s.segmentedInset;
    final gap = widget.sizes?.gap ?? inset;
    return LayoutBuilder(
      builder: (context, constraints) {
        final full = _fullWidth(inset, gap);
        // The room the parent can give: a Dock says so (its actions slot, like an ActionsBar's),
        // since it hugs its content; elsewhere the width this track is given. A pixel of
        // hysteresis either way, so it never flaps at the edge.
        final room = math.min(
          constraints.maxWidth,
          ActionsWidthProvider.maybeOf(context) ?? double.infinity,
        );
        final folded =
            full != null &&
            full > room + (_folded ? -_foldHysteresis : _foldHysteresis);
        if (folded != _folded) {
          // While it folds or unfolds, the bubbles around it follow their layout instead of
          // springing after it.
          final glass = GlassMember.of(context);
          SchedulerBinding.instance.addPostFrameCallback(
            (_) => glass?.followLayoutFor(const Duration(milliseconds: 450)),
          );
        }
        _folded = folded;
        if (!folded && _menuOpen) {
          SchedulerBinding.instance.addPostFrameCallback((_) {
            if (mounted && !_folded) setState(() => _menuOpen = false);
          });
        }
        return AnchoredPanel(
          open: _menuOpen && folded,
          onDismiss: _closeMenu,
          cover: true,
          // In a toolbar the menu lines up with the capsule's edge on its side of the bounds.
          align: context.findAncestorWidgetOfExactType<GlassGroup>() != null
              ? null
              : PanelAlign.center,
          panel: (context) => _SelectionMenu<T>(
            label: widget.label,
            options: widget.options,
            selected: _selected,
            disabled: widget.disabled,
            onPick: (index) {
              _closeMenu();
              widget.onSelect(
                widget.options[index].value,
                SelectionSource.press,
              );
            },
            onClose: _closeMenu,
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              _buildTrack(context, folded: folded),
              // Real option contents, laid out but never painted: their own widths.
              Positioned(
                left: 0,
                top: 0,
                child: Offstage(child: _measureRow(context)),
              ),
            ],
          ),
        );
      },
    );
  }

  /// The options as they are unfolded, offstage, each reporting its width.
  Widget _measureRow(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final c = theme.colors;
    final sizes = widget.sizes;
    final padding = sizes?.padding ?? s.controlPadding;
    final fontSize = sizes?.fontSize ?? (s.density == Density.thin ? 12 : 13);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < widget.options.length; i++)
          SizeReporter(
            onSize: (size) => _report(i, size.width),
            child: Padding(
              padding: EdgeInsetsDirectional.symmetric(horizontal: padding + 1),
              child: _inlineContent(
                widget.options[i],
                fontSize: fontSize,
                ink: c.muted,
                fill: false,
                radiusScale: s.radiusScale,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTrack(BuildContext context, {required bool folded}) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final enabled = _enabled;
    final selected = _selected;
    final tabIndex = enabled.contains(selected) || (folded && selected >= 0)
        ? selected
        : (enabled.isEmpty ? -1 : enabled.first);
    // A segmented control is a regular button tall (a host's control height inside one); on touch
    // each option reaches out to the touch target instead (TouchTarget). The pill sits the inset
    // inside it. A host's sizes (a tab bar) set the option height, inset and gap instead.
    final overrides = ControlOverrides.maybeOf(context);
    final sizes = widget.sizes;
    final inset = sizes?.inset ?? s.segmentedInset;
    final gap = sizes?.gap ?? inset;
    final height = sizes == null
        ? overrides?.height ?? s.controlHeight
        : sizes.height + 2 * inset;
    final touch = overrides?.touchTarget ?? s.touchTarget;
    final optionHeight = height - 2 * inset;
    final solid = glassStyleOf(context) == GlassStyle.solid;
    final quiet = widget.pill == SelectionPill.quiet;
    // The pill's rest paint, the selected ink, and the ink inside the drop (its fill is gone, the
    // glass is clear).
    final pillFill = quiet ? mixSrgb(c.ink, 0.07, transparent) : c.primary;
    final pillInk = quiet ? c.primary : c.onPrimary;
    final lensInk = quiet ? c.primary : c.ink;
    _queueMeasure();

    Widget segment(int i) => KeyedSubtree(
      key: _key(i),
      child: _Segment(
        option: widget.options[i],
        index: i,
        selected: i == selected,
        disabled: widget.disabled || widget.options[i].disabled,
        // Until the pill is placed, the selected option paints the fill itself.
        fallback: !_placed && i == selected ? pillFill : null,
        dragging: _dragging,
        focusNode: _node(i),
        tabbable: i == tabIndex,
        semantics: widget.semantics,
        layout: widget.layout,
        sizes: sizes,
        minimize: widget.minimize,
        iconKey: _iconKey(i),
        foldable: _menu,
        menuFolded: folded,
        menuOpen: _menuOpen,
        naturalWidth: _natural != null && i < _natural!.length
            ? _natural![i]
            : null,
        groupLabel: widget.label,
        height: optionHeight,
        touchTarget: touch,
        padding: sizes?.padding ?? s.controlPadding,
        radius: optionHeight / 2 * s.radiusScale,
        // 13px semibold, iOS; 12px in the thin density (a host's sizes set their own).
        fontSize: sizes?.fontSize ?? (s.density == Density.thin ? 12 : 13),
        lineHeight: sizes?.lineHeight,
        // Folded, the selected option is the capsule that opens the menu.
        onSelect: () => folded && i == selected
            ? _openMenu()
            : widget.onSelect(widget.options[i].value, SelectionSource.press),
        fill: widget.equalWidth,
        radiusScale: s.radiusScale,
        ink: _InkClip(this, i, s.radiusScale),
        inkColor: pillInk,
        lensInkColor: lensInk,
        lens: () => solid ? 0 : lens.get(),
        motion: _motion,
      ),
    );
    // The track: the options and, painted behind them, the pill.
    final tab = widget.semantics == SelectionSemantics.tab;
    final Widget row = widget.equalWidth
        // Equal options sharing the width (CSS `flex: 1 1 0`), overlapping by the host's overlap.
        ? _EqualRow(
            spacing: gap - (sizes?.overlap ?? 0),
            minChildWidth: sizes?.minWidth ?? 0,
            textDirection: Directionality.of(context),
            children: [
              for (var i = 0; i < widget.options.length; i++) segment(i),
            ],
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            // A track that folds springs the gaps away with the options it folds.
            spacing: _menu ? 0 : gap,
            children: [
              for (var i = 0; i < widget.options.length; i++) ...[
                if (_menu && i > 0) _FoldGap(gap: gap, folded: folded),
                segment(i),
              ],
            ],
          );
    final track = _OnLayout(
      onLayout: _queueMeasure,
      child: CustomPaint(
        key: _trackKey,
        painter: _PillPainter(
          state: this,
          fill: pillFill,
          lensPaint: LensPaint.of(c),
          radiusScale: s.radiusScale,
          solid: solid,
          disabled: widget.disabled,
        ),
        child: tab
            // A tab list holds only its tabs (no scroll or focus nodes between them).
            ? Semantics(
                container: true,
                role: ui.SemanticsRole.tabBar,
                label: widget.label,
                explicitChildNodes: true,
                child: row,
              )
            : row,
      ),
    );
    // A track that folds into a menu never scrolls: its row fits it. Until its options' widths
    // are known (the first frame) it lays them out at their own size, clipped and unpainted.
    final Widget body = _menu
        ? Padding(
            padding: EdgeInsets.all(inset),
            child: Opacity(
              opacity: _natural == null ? 0 : 1,
              // Unpainted for a frame, but already there for assistive tech.
              alwaysIncludeSemantics: true,
              child: ClipRect(
                clipBehavior: _natural == null ? Clip.hardEdge : Clip.none,
                child: OverflowBox(
                  fit: OverflowBoxFit.deferToChild,
                  alignment: AlignmentDirectional.centerStart,
                  minWidth: 0,
                  maxWidth: double.infinity,
                  child: track,
                ),
              ),
            ),
          )
        : widget.equalWidth
        ? Padding(padding: EdgeInsets.all(inset), child: track)
        // One row that scrolls inside the track when it doesn't fit: the clip reaches
        // segmentedBleed above and below (a pressed pill swells and casts a shadow) and the edges
        // fade where there is more.
        : ClipRect(
            clipper: const _BleedClip(segmentedBleed),
            clipBehavior: _overflow ? Clip.hardEdge : Clip.none,
            child: ListenableBuilder(
              listenable: _scroll,
              builder: (context, child) => ShaderMask(
                blendMode: BlendMode.dstIn,
                shaderCallback: (bounds) => _edgeFade(this, bounds),
                child: child,
              ),
              child: ScrollConfiguration(
                behavior: ScrollConfiguration.of(context)
                    .copyWith(scrollbars: false, overscroll: false),
                child: SingleChildScrollView(
                  controller: _scroll,
                  scrollDirection: Axis.horizontal,
                  clipBehavior: Clip.none,
                  padding: EdgeInsets.all(inset),
                  child: ScrollRevealPadding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: segmentedFade,
                    ),
                    child: track,
                  ),
                ),
              ),
            ),
          );

    final Widget focus = Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: _onKey,
      // A press here lifts the pill, not the glass bubble around the track.
      child: GlassOwnPress(
        child: RawGestureDetector(
          behavior: HitTestBehavior.opaque,
          gestures: widget.disabled || !widget.draggable
              ? const <Type, GestureRecognizerFactory>{}
              : {
                  _PillDragRecognizer:
                      GestureRecognizerFactoryWithHandlers<_PillDragRecognizer>(
                        () => _PillDragRecognizer(debugOwner: this),
                        (r) {
                          r
                            ..onDown = _onDown
                            ..onMove = _onMove
                            ..onEnd = _onEnd;
                        },
                      ),
                },
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: height),
            child: body,
          ),
        ),
      ),
    );
    // A radio group names the whole control; a tab list sits on its row of tabs (above). Folded,
    // the capsule is a pop-up button and the radios live in its menu.
    return tab || folded
        ? focus
        : Semantics(
            container: true,
            role: ui.SemanticsRole.radioGroup,
            label: widget.label,
            enabled: !widget.disabled,
            child: focus,
          );
  }
}

/// The mask of a scrolling track: each edge fades in (to [segmentedFade]) as content moves past
/// it; opaque when it doesn't scroll. The twin of the web kit's `mask-image` on the scroller.
Shader _edgeFade(_SelectionTrackState<dynamic> state, Rect bounds) {
  var left = 0.0, right = 0.0;
  if (state._overflow && state._scroll.hasClients) {
    final position = state._scroll.position;
    if (position.hasContentDimensions && position.hasPixels) {
      final max = position.maxScrollExtent;
      final offset = axisDirectionIsReversed(position.axisDirection)
          ? max - position.pixels
          : position.pixels;
      final edges = scrollEdgeOpacities(offset, max, segmentedFade);
      left = edges.top;
      right = edges.bottom;
    }
  }
  const opaque = Color(0xFF000000);
  final stop = bounds.width > 0
      ? (segmentedFade / bounds.width).clamp(0.0, 0.5)
      : 0.0;
  return LinearGradient(
    colors: [
      opaque.withValues(alpha: 1 - left),
      opaque,
      opaque,
      opaque.withValues(alpha: 1 - right),
    ],
    stops: [0, stop, 1 - stop, 1],
  ).createShader(bounds);
}

/// Clips a scrolling track at its sides, reaching [bleed] above and below.
class _BleedClip extends CustomClipper<Rect> {
  const _BleedClip(this.bleed);
  final double bleed;

  @override
  Rect getClip(Size size) =>
      Rect.fromLTRB(0, -bleed, size.width, size.height + bleed);

  @override
  bool shouldReclip(_BleedClip old) => old.bleed != bleed;
}

/// Claims a press that moves sideways past the slop (before taps, scroll views or the glass
/// container can), so the pill follows it; a plain tap still reaches the option.
class _PillDragRecognizer extends OneSequenceGestureRecognizer {
  _PillDragRecognizer({super.debugOwner});

  void Function(PointerDownEvent event)? onDown;
  bool Function(PointerMoveEvent event)? onMove;
  void Function(PointerEvent? event, {required bool cancelled})? onEnd;
  bool _accepted = false;
  int? _pointer;

  @override
  void addAllowedPointer(PointerDownEvent event) {
    if (_pointer != null) return;
    super.addAllowedPointer(event);
    _pointer = event.pointer;
    _accepted = false;
    onDown?.call(event);
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event.pointer != _pointer) return;
    if (event is PointerMoveEvent) {
      final dragging = onMove?.call(event) ?? false;
      if (dragging && !_accepted) {
        _accepted = true;
        resolve(GestureDisposition.accepted);
      }
    } else if (event is PointerUpEvent) {
      onEnd?.call(event, cancelled: false);
      stopTrackingPointer(event.pointer);
    } else if (event is PointerCancelEvent) {
      onEnd?.call(event, cancelled: true);
      stopTrackingPointer(event.pointer);
    }
  }

  @override
  void rejectGesture(int pointer) {
    // A tap or a scroll view took it: no drag.
    if (pointer == _pointer && !_accepted) onEnd?.call(null, cancelled: true);
    super.rejectGesture(pointer);
  }

  @override
  void didStopTrackingLastPointer(int pointer) {
    _pointer = null;
    _accepted = false;
  }

  @override
  String get debugDescription => 'segmented pill drag';
}

/// Calls [onLayout] whenever the track lays out (a resize, new labels, another density).
/// Equal options sharing the track's width (CSS `flex: 1 1 0`), [spacing] apart; a negative
/// spacing overlaps them, later options on top (iOS 27 tabs). Given a bounded width it fills it
/// (`width: 100%`); unbounded, it takes the options' summed natural widths, shared equally. No
/// option is narrower than [minChildWidth].
class _EqualRow extends MultiChildRenderObjectWidget {
  const _EqualRow({
    required this.spacing,
    required this.minChildWidth,
    required this.textDirection,
    required super.children,
  });
  final double spacing, minChildWidth;
  final TextDirection textDirection;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderEqualRow(spacing, minChildWidth, textDirection);

  @override
  void updateRenderObject(BuildContext context, _RenderEqualRow renderObject) {
    renderObject
      ..spacing = spacing
      ..minChildWidth = minChildWidth
      ..textDirection = textDirection;
  }
}

class _EqualRowParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderEqualRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _EqualRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _EqualRowParentData> {
  _RenderEqualRow(this._spacing, this._minChildWidth, this._textDirection);

  double _spacing;
  set spacing(double value) {
    if (value == _spacing) return;
    _spacing = value;
    markNeedsLayout();
  }

  double _minChildWidth;
  set minChildWidth(double value) {
    if (value == _minChildWidth) return;
    _minChildWidth = value;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _EqualRowParentData) {
      child.parentData = _EqualRowParentData();
    }
  }

  double _sum(double Function(RenderBox child) width) {
    var total = 0.0;
    var child = firstChild;
    while (child != null) {
      total += math.max(_minChildWidth, width(child));
      child = childAfter(child);
    }
    return math.max(0, total + _spacing * math.max(0, childCount - 1));
  }

  double _tallest(double Function(RenderBox child) height) {
    var tallest = 0.0;
    var child = firstChild;
    while (child != null) {
      tallest = math.max(tallest, height(child));
      child = childAfter(child);
    }
    return tallest;
  }

  double _each(double width) => childCount == 0
      ? 0
      : math.max(
          _minChildWidth,
          (width - _spacing * (childCount - 1)) / childCount,
        );

  @override
  double computeMinIntrinsicWidth(double height) =>
      _sum((child) => child.getMinIntrinsicWidth(height));

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _sum((child) => child.getMaxIntrinsicWidth(height));

  @override
  double computeMinIntrinsicHeight(double width) =>
      _tallest((child) => child.getMinIntrinsicHeight(_each(width)));

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _tallest((child) => child.getMaxIntrinsicHeight(_each(width)));

  double _width(BoxConstraints constraints) => constraints.constrainWidth(
    constraints.hasBoundedWidth
        ? constraints.maxWidth
        : computeMaxIntrinsicWidth(double.infinity),
  );

  BoxConstraints _childConstraints(BoxConstraints constraints, double each) =>
      BoxConstraints(
        minWidth: each,
        maxWidth: each,
        maxHeight: constraints.maxHeight,
      );

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final width = _width(constraints);
    final inner = _childConstraints(constraints, _each(width));
    final height = _tallest((child) => child.getDryLayout(inner).height);
    return constraints.constrain(Size(width, height));
  }

  @override
  void performLayout() {
    final width = _width(constraints);
    final each = _each(width);
    final inner = _childConstraints(constraints, each);
    var child = firstChild;
    var height = 0.0;
    while (child != null) {
      child.layout(inner, parentUsesSize: true);
      height = math.max(height, child.size.height);
      child = childAfter(child);
    }
    size = constraints.constrain(Size(width, height));
    child = firstChild;
    var i = 0;
    final rtl = _textDirection == TextDirection.rtl;
    while (child != null) {
      final x = i * (each + _spacing);
      (child.parentData! as _EqualRowParentData).offset = Offset(
        rtl ? size.width - x - each : x,
        (size.height - child.size.height) / 2,
      );
      child = childAfter(child);
      i++;
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}

class _OnLayout extends SingleChildRenderObjectWidget {
  const _OnLayout({required this.onLayout, required super.child});
  final VoidCallback onLayout;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderOnLayout(onLayout);

  @override
  void updateRenderObject(BuildContext context, _RenderOnLayout renderObject) {
    renderObject.onLayout = onLayout;
  }
}

class _RenderOnLayout extends RenderProxyBox {
  _RenderOnLayout(this.onLayout);
  VoidCallback onLayout;

  @override
  void performLayout() {
    super.performLayout();
    onLayout();
  }
}

/// The selected ink of option [index]: the pill (the drop) in the option's own pixels.
class _InkClip {
  _InkClip(this.state, this.index, this.radiusScale);
  final _SelectionTrackState<dynamic> state;
  final int index;
  final double radiusScale;

  /// The pill over this option, or [Rect.zero] when there is none; null before placement, when
  /// only the selected option shows its ink (whole).
  Rect? drop() {
    final boxes = state._boxes;
    if (state._placed && state._selected < 0) return Rect.zero;
    if (!state._placed || index >= boxes.length) {
      return index == state._selected ? null : Rect.zero;
    }
    return state._pill.shift(-boxes[index].topLeft);
  }

  /// The drop's corner radius.
  double radius(Rect drop) =>
      math.min(drop.width, drop.height) / 2 * radiusScale;
}

/// Paints its child, then paints it again in the selected ink inside [ink]'s drop: the selected
/// ink of an option (the web kit's `.lab-segmented-ink` copy), without a second copy of the label
/// in the tree. Pressed or dragged ([lens] > 0) the drop magnifies: the ink copy scales by
/// `1 + lensMagnify × lens` around the drop's centre, still cut to the drop, its colour turns from
/// [color] to [lensColor], and the plain child is cut out under the drop (an elliptical hole the
/// drop's size). [_InkHole]s below it (a tab's badge) are drawn over the copy in their own paint,
/// magnified with it.
class _InkOverlay extends SingleChildRenderObjectWidget {
  const _InkOverlay({
    required this.ink,
    required this.color,
    required this.lensColor,
    required this.lens,
    required this.repaint,
    required super.child,
  });
  final _InkClip ink;
  final Color color, lensColor;
  final double Function() lens;
  final Listenable repaint;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderInkOverlay(ink, color, lensColor, lens, repaint);

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderInkOverlay renderObject,
  ) {
    renderObject
      ..ink = ink
      ..color = color
      ..lensColor = lensColor
      ..lens = lens
      ..repaint = repaint;
  }
}

class _RenderInkOverlay extends RenderProxyBox {
  _RenderInkOverlay(
    this.ink,
    this._color,
    this._lensColor,
    this.lens,
    this._repaint,
  );
  _InkClip ink;
  double Function() lens;

  /// Boxes drawn over the ink in their own paint ([_InkHole]).
  final holes = <_RenderInkHole>{};

  Color _color;
  set color(Color value) {
    if (value == _color) return;
    _color = value;
    markNeedsPaint();
  }

  Color _lensColor;
  set lensColor(Color value) {
    if (value == _lensColor) return;
    _lensColor = value;
    markNeedsPaint();
  }

  Listenable _repaint;
  set repaint(Listenable value) {
    if (value == _repaint) return;
    if (attached) {
      _repaint.removeListener(markNeedsPaint);
      value.addListener(markNeedsPaint);
    }
    _repaint = value;
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _repaint.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _repaint.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  bool get alwaysNeedsCompositing => child != null;

  @override
  void paint(PaintingContext context, Offset offset) {
    final child = this.child;
    if (child == null) return;
    final bounds = Offset.zero & size;
    final drop = ink.drop();
    final amount = lens().clamp(0.0, 1.0);
    final zoom = 1 + lensMagnify * amount;
    // The plain content, cut out where the drop magnifies it.
    final crosses =
        drop != null &&
        amount > 0.01 &&
        drop.left < size.width &&
        drop.right > 0;
    if (crosses) {
      context.pushClipPath(
        true,
        offset,
        bounds,
        Path()
          ..fillType = PathFillType.evenOdd
          ..addRect(bounds.inflate(drop.height))
          ..addOval(drop),
        (context, offset) => context.paintChild(child, offset),
      );
    } else {
      context.paintChild(child, offset);
    }

    // Where the ink shows (final pixels) and the scale around the drop's centre.
    final RRect clip;
    final Offset centre;
    if (drop == null) {
      clip = RRect.fromRectXY(bounds, 0, 0);
      centre = bounds.center;
    } else {
      centre = drop.center;
      final scaled = Rect.fromLTRB(
        centre.dx + (bounds.left - centre.dx) * zoom,
        centre.dy + (bounds.top - centre.dy) * zoom,
        centre.dx + (bounds.right - centre.dx) * zoom,
        centre.dy + (bounds.bottom - centre.dy) * zoom,
      );
      final cut = drop.intersect(scaled);
      if (cut.width <= 0 || cut.height <= 0) return;
      clip = RRect.fromRectAndRadius(cut, Radius.circular(ink.radius(drop)));
    }
    final inkColor = Color.lerp(_color, _lensColor, amount)!;
    final transform = Matrix4.identity()
      ..translateByDouble(centre.dx, centre.dy, 0, 1)
      ..scaleByDouble(zoom, zoom, 1, 1)
      ..translateByDouble(-centre.dx, -centre.dy, 0, 1);

    final live = [
      for (final hole in holes)
        if (hole.attached && hole.hasSize) hole,
    ];
    void paintInk(PaintingContext context, Offset offset) {
      context.pushColorFilter(
        offset,
        ColorFilter.mode(inkColor, BlendMode.srcIn),
        (context, offset) => context.paintChild(child, offset),
      );
      // The badges show in the copy in their own colours, magnified with it.
      for (final hole in live) {
        context.pushTransform(
          true,
          offset,
          hole.getTransformTo(this),
          (context, offset) => context.paintChild(hole, offset),
        );
      }
    }

    context.pushClipRRect(true, offset, bounds, clip, (context, offset) {
      if (zoom == 1) {
        paintInk(context, offset);
      } else {
        context.pushTransform(true, offset, transform, paintInk);
      }
    });
  }
}

/// Draws its child in its own paint over the selected ink of the option around it ([_InkOverlay]):
/// a tab's badge keeps its colours as the pill passes, like the web kit's badge drawn above the ink.
class _InkHole extends SingleChildRenderObjectWidget {
  const _InkHole({required super.child});

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderInkHole();
}

class _RenderInkHole extends RenderProxyBox {
  _RenderInkOverlay? _overlay;

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    RenderObject? node = parent;
    while (node != null && node is! _RenderInkOverlay) {
      node = node.parent;
    }
    _overlay = node as _RenderInkOverlay?;
    _overlay?.holes.add(this);
  }

  @override
  void detach() {
    _overlay?.holes.remove(this);
    _overlay = null;
    super.detach();
  }
}

/// The pill: [fill] at rest (the primary, or the quiet 7 % ink on a tab bar); pressed or dragged it
/// becomes a glass lens (fill → glass, [LensPaint]), swells and shows the touch glow, like a pressed
/// GlassContainer bubble. Solid styles keep the fill.
class _PillPainter extends CustomPainter {
  _PillPainter({
    required this.state,
    required this.fill,
    required this.lensPaint,
    required this.radiusScale,
    required this.solid,
    required this.disabled,
  }) : super(repaint: state._motion);
  final _SelectionTrackState<dynamic> state;
  final Color fill;
  final LensPaint lensPaint;
  final double radiusScale;
  final bool solid, disabled;

  @override
  void paint(Canvas canvas, Size size) {
    if (!state._placed || state._boxes.isEmpty || state._selected < 0) return;
    final rect = state._pill;
    if (rect.width <= 0 || rect.height <= 0) return;
    final base =
        state._boxes.first.height / 2 * radiusScale * state.press.get();
    final radius = math.min(base, math.min(rect.width, rect.height) / 2);
    final shape = superellipsePath(rect, [radius, radius, radius, radius]);
    final lens = solid ? 0.0 : state.lens.get().clamp(0.0, 1.0);
    // A minimizing host fades the pill out as the track folds to the selected icon.
    final fade = 1 - (state.widget.minimize?.progress ?? 0).clamp(0.0, 1.0);
    if (fade <= 0) return;
    final alpha = (disabled ? 0.42 : 1.0) * fade;
    if (alpha < 1) {
      canvas.saveLayer(
        null,
        Paint()..color = Color.from(alpha: alpha, red: 0, green: 0, blue: 0),
      );
    }
    lensPaint.paintShadow(canvas, shape, lens);
    if (lens < 0.999) {
      canvas.drawPath(
        shape,
        Paint()..color = fill.withValues(alpha: fill.a * (1 - lens)),
      );
    }
    lensPaint.paint(
      canvas,
      rect,
      radius,
      lens: lens,
      glowAt: state._glowAt,
      glowRadius: state.glowRadius.get(),
      glowOpacity: state.glowOpacity.get(),
    );
    if (alpha < 1) canvas.restore();
  }

  @override
  bool shouldRepaint(_PillPainter old) =>
      old.state != state ||
      old.fill != fill ||
      old.lensPaint != lensPaint ||
      old.radiusScale != radiusScale ||
      old.solid != solid ||
      old.disabled != disabled;
}

class _Segment<T> extends StatefulWidget {
  const _Segment({
    required this.option,
    required this.index,
    required this.selected,
    required this.disabled,
    required this.fallback,
    required this.dragging,
    required this.focusNode,
    required this.tabbable,
    required this.semantics,
    required this.layout,
    required this.sizes,
    required this.minimize,
    required this.iconKey,
    this.foldable = false,
    this.menuFolded = false,
    this.menuOpen = false,
    this.naturalWidth,
    this.groupLabel = '',
    required this.height,
    required this.touchTarget,
    required this.padding,
    required this.radius,
    required this.fontSize,
    required this.lineHeight,
    required this.onSelect,
    required this.ink,
    required this.inkColor,
    required this.lensInkColor,
    required this.lens,
    required this.motion,
    required this.radiusScale,
    this.fill = false,
  });

  final SegmentOption<T> option;
  final int index;
  final bool selected, disabled, tabbable, dragging;

  /// A host folding the track toward the selected option ([SelectionMinimize]), or null.
  final SelectionMinimize? minimize;

  /// On the icon's box: the track measures the selected icon for a minimizing host.
  final GlobalKey iconKey;

  /// In a track that folds into a menu: [menuFolded] folds the other options away and gives the
  /// selected one a chevron (it opens the menu, [menuOpen]); [naturalWidth] is the option's own
  /// width, which the fold springs from; [groupLabel] names the capsule.
  final bool foldable, menuFolded, menuOpen;
  final double? naturalWidth;
  final String groupLabel;

  /// The selected fill the option paints itself (the pill isn't placed yet), or null.
  final Color? fallback;
  final SelectionSemantics semantics;
  final SelectionLayout layout;

  /// A host's sizes (a tab bar): the option's width range, padding and type.
  final SelectionTrackSizes? sizes;

  /// Takes the width it is given and centres (and ellipsizes) its content.
  final bool fill;
  final FocusNode focusNode;
  final double height, padding, radius, fontSize, radiusScale;

  /// The label's line height; null: a segment's (18px, 16px at 12px).
  final double? lineHeight;

  /// The smallest hit area on touch screens ([TouchTarget]).
  final double touchTarget;
  final VoidCallback onSelect;
  final _InkClip ink;

  /// The selected ink at rest and inside the drop.
  final Color inkColor, lensInkColor;

  /// 0 the pill at rest … 1 a glass drop (0 for solid glass).
  final double Function() lens;
  final Listenable motion;

  @override
  State<_Segment<T>> createState() => _SegmentState<T>();
}

/// 13px/18px, 12px/16px (`.lab-segmented-option` line heights).
double _line(double fontSize) => fontSize <= 12 ? 16 : 18;

/// One option: the web kit's ghost toolbar button with `.lab-segmented-option` geometry (the pill
/// height, `--lab-control-padding` sides, a capsule, 13px semibold text), or a tab's stacked icon
/// and label. The pill paints the selection behind it; the option only tints for hover and press
/// when it isn't selected.
class _SegmentState<T> extends State<_Segment<T>> {
  final _semanticsKey = GlobalKey();
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

  // An option of a track that folds into a menu springs its width and padding as the track folds
  // and unfolds (`springTiming(SPRINGS.snappy)` in CSS).
  late final MotionValue _min, _max, _pad;
  final _unsubscribe = <void Function()>[];

  ({double min, double max, double pad}) get _target {
    final sizes = widget.sizes;
    if (widget.foldable && sizes == null) {
      final natural = widget.naturalWidth ?? double.infinity;
      if (widget.menuFolded && !widget.selected) {
        return (min: 0, max: 0, pad: 0);
      }
      return (
        min: 0,
        max: natural + (widget.menuFolded ? _chevronWidth : 0),
        pad: widget.padding,
      );
    }
    if (sizes == null) {
      return (min: 0, max: double.infinity, pad: widget.padding);
    }
    return (min: sizes.minWidth, max: sizes.maxWidth, pad: widget.padding);
  }

  @override
  void initState() {
    super.initState();
    final t = _target;
    _min = MotionValue(t.min, 0.1);
    _max = MotionValue(t.max.isFinite ? t.max : 1e6, 0.1);
    _pad = MotionValue(t.pad, 0.1);
    for (final v in [_min, _max, _pad]) {
      _unsubscribe.add(v.subscribe((_) => setState(() {})));
    }
  }

  @override
  void didUpdateWidget(_Segment<T> old) {
    super.didUpdateWidget(old);
    if (!widget.foldable) return;
    final t = _target;
    // Jumps the first time the option's own width is known (from "no limit"), springs after.
    final instant =
        reducedMotionOf(context) ||
        old.sizes != widget.sizes ||
        (widget.foldable && old.naturalWidth == null);
    _min.animateTo(t.min, spring: Springs.snappy, instant: instant);
    _max.animateTo(t.max, spring: Springs.snappy, instant: instant);
    _pad.animateTo(t.pad, spring: Springs.snappy, instant: instant);
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    for (final v in [_min, _max, _pad]) {
      v.stop();
    }
    super.dispose();
  }

  /// A segment's content in [ink], the icon in its [tone] when it has one.
  Widget _inline(Color ink, {Color? tone}) => _inlineContent(
    widget.option,
    fontSize: widget.fontSize,
    ink: ink,
    tone: tone,
    fill: widget.fill,
    radiusScale: widget.radiusScale,
  );

  /// A tab's content: the icon (22px in a 24px-wide line, its badge on the corner, cut out of the
  /// selected ink) over or beside the label. A minimizing host fades the label and moves the
  /// selected icon to the option's centre.
  Widget _stacked(Color ink, {Color? tone}) {
    final sizes = widget.sizes;
    final direction = sizes?.direction ?? Axis.vertical;
    final lineHeight = widget.lineHeight ?? _line(widget.fontSize);
    final badge = widget.option.badge;
    final icon = widget.option.icon;
    final minimize = widget.minimize;
    // A minimizing host fades the labels at `1 - 2p`: in the text colour, not an Opacity layer
    // (the option paints its content twice, plain and selected ink, and a layer can only be in one
    // place).
    final fade = (1 - 2 * (minimize?.progress ?? 0)).clamp(0.0, 1.0);
    final label = DefaultTextStyle.merge(
      style: TextStyle(
        fontSize: widget.fontSize,
        height: lineHeight / widget.fontSize,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w600,
        color: ink.withValues(alpha: ink.a * fade),
      ),
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.ellipsis,
      child: CssBaseline(
        lineHeight: lineHeight,
        child: Text(widget.option.label),
      ),
    );
    final children = [
      if (icon != null)
        SizedBox(
          key: widget.iconKey,
          width: 24,
          height: sizes?.iconLine ?? 24,
          // A minimizing host moves the selected icon (and its badge) to the option's centre.
          child: Transform.translate(
            offset: minimize != null && widget.selected
                ? minimize.icon
                : Offset.zero,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                IconTheme.merge(
                  data: IconThemeData(size: 22, color: tone ?? ink),
                  child: icon,
                ),
                if (badge != null)
                  PositionedDirectional(
                    top: -5,
                    start: 14,
                    child: _InkHole(
                      child: _IconBadge(
                        text: badge,
                        radiusScale: widget.radiusScale,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      direction == Axis.horizontal ? Flexible(child: label) : label,
      if (icon == null && badge != null)
        _Badge(text: badge, ink: ink, radiusScale: widget.radiusScale),
    ];
    return Flex(
      direction: direction,
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      spacing: sizes?.contentGap ?? (direction == Axis.horizontal ? 8 : 2),
      children: children,
    );
  }

  @override
  Widget build(BuildContext context) {
    final minimize = widget.minimize;
    if (minimize == null) return _build(context);
    return ListenableBuilder(
      listenable: minimize,
      builder: (context, _) => _build(context),
    );
  }

  Widget _build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final tone = switch (widget.option.tone) {
      SegmentTone.success => c.success,
      SegmentTone.warning => c.warning,
      SegmentTone.danger => c.danger,
      null => null,
    };
    final badge = widget.option.badge;
    final active = !widget.disabled && !widget.selected && !widget.dragging;
    final fill =
        widget.fallback ??
        (_down && active
            ? c.controlPressed
            : (_hovered || _focusVisible) && active
            ? c.controlHover
            : transparent);
    final stacked = widget.layout == SelectionLayout.stacked;
    final sizes = widget.sizes;
    final foldable = widget.foldable;
    // A minimizing host: the selected glyph turns to the primary, the others fade and, past
    // halfway, take no pointer.
    final p = (widget.minimize?.progress ?? 0).clamp(0.0, 1.0);
    final minimized = widget.minimize != null && !widget.selected && p >= 0.5;
    // Options are border-box buttons with a 1px border.
    final pad = foldable ? math.max(0.0, _pad.get()) : widget.padding;
    final padding = EdgeInsetsDirectional.symmetric(horizontal: pad + 1);
    final ink = widget.selected && p > 0
        ? Color.lerp(c.muted, c.primary, p)!
        : c.muted;
    Widget content = stacked
        ? _stacked(ink, tone: tone)
        : _inline(ink, tone: tone);
    // The selected option of a track that folds carries the chevron, shown only while folded.
    if (foldable && widget.selected) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          content,
          _FoldChevron(open: widget.menuFolded, color: c.muted),
        ],
      );
    }
    // A host's top and bottom padding: the content centres between them (and may overflow both
    // equally, like a button's content).
    final shift = (sizes?.paddingTop ?? 0) - (sizes?.paddingBottom ?? 0);
    if (sizes != null && !foldable) {
      content = Padding(
        padding: EdgeInsets.only(
          top: math.max(0, shift),
          bottom: math.max(0, -shift),
        ),
        child: Center(child: content),
      );
    }
    // The selected ink, cut to the pill's shape as it passes (the badge keeps its alpha, so it
    // turns into a pill of the selected ink; a tab's badge is cut out and keeps its colours).
    Widget body = _InkOverlay(
      ink: widget.ink,
      color: widget.inkColor,
      lensColor: widget.lensInkColor,
      lens: widget.lens,
      repaint: widget.motion,
      child: Padding(padding: padding, child: content),
    );
    if (foldable) {
      // A width range that springs as the track folds: the content keeps its own width and is
      // clipped to the option.
      final maxWidth = math.max(0.0, _max.get());
      final minWidth = math.min(maxWidth, math.max(0.0, _min.get()));
      body = ConstrainedBox(
        constraints: BoxConstraints(minWidth: minWidth, maxWidth: maxWidth),
        child: ClipPath(
          clipper: _SuperellipseClip(widget.radius),
          child: OverflowBox(
            fit: OverflowBoxFit.deferToChild,
            minWidth: 0,
            maxWidth: double.infinity,
            child: body,
          ),
        ),
      );
    } else if (sizes != null) {
      // A host's width range; the content centres in the option (never narrower than the icon).
      body = ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: math.min(sizes.minWidth, sizes.maxWidth),
          maxWidth: math.max(sizes.maxWidth, 24 + (pad + 1) * 2),
        ),
        child: body,
      );
    }
    final sized = sizes != null || foldable;
    final folded = widget.menuFolded && !widget.selected;
    final tab = widget.semantics == SelectionSemantics.tab;
    final label = badge == null
        ? widget.option.label
        : '${widget.option.label}, $badge';
    // Folded, the selected option is a pop-up button named by the group and its value.
    final trigger = widget.menuFolded && widget.selected;
    if (trigger) {
      return Semantics(
        key: _semanticsKey,
        button: true,
        expanded: widget.menuOpen,
        label: '${widget.groupLabel}: $label',
        enabled: !widget.disabled,
        onTap: widget.disabled ? null : widget.onSelect,
        excludeSemantics: true,
        child: _interactive(
          context,
          folded: false,
          fill: fill,
          sized: sized,
          body: body,
        ),
      );
    }
    Widget option = _interactive(
      context,
      folded: folded,
      inert: minimized,
      fill: fill,
      sized: sized,
      body: body,
    );
    if (widget.minimize != null && !widget.selected) {
      option = Opacity(opacity: (1 - 2.2 * p).clamp(0.0, 1.0), child: option);
    }
    final node = Semantics(
      // Keeps the option's state when it moves in and out of the exclusion below.
      key: _semanticsKey,
      role: tab ? ui.SemanticsRole.tab : null,
      selected: tab ? widget.selected : null,
      button: tab ? true : null,
      inMutuallyExclusiveGroup: tab ? null : true,
      checked: tab ? null : widget.selected,
      onTap: tab && !widget.disabled ? widget.onSelect : null,
      label: label,
      enabled: !widget.disabled,
      excludeSemantics: true,
      child: option,
    );
    // Folded into the menu, the other options leave the accessibility tree.
    return widget.menuFolded ? ExcludeSemantics(child: node) : node;
  }

  /// Focus, hover, press and the option's own paint around [body].
  Widget _interactive(
    BuildContext context, {
    required bool folded,
    bool inert = false,
    required Color fill,
    required bool sized,
    required Widget body,
  }) {
    // Only the selected option is a Tab stop; arrows reach the others (radio group and tab list
    // pattern).
    return ExcludeFocusTraversal(
      excluding: !widget.tabbable,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        enabled: !widget.disabled,
        descendantsAreFocusable: false,
        mouseCursor: widget.disabled
            ? SystemMouseCursors.forbidden
            : SystemMouseCursors.click,
        onShowHoverHighlight: (value) => setState(() => _hovered = value),
        onShowFocusHighlight: (value) => setState(() => _focusVisible = value),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.onSelect(),
          ),
        },
        child: IgnorePointer(
          // A folded option, or one a minimizing host has hidden, takes no pointer.
          ignoring: folded || inert,
          child: TouchTarget(
            minSize: widget.touchTarget,
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
              child: AnimatedOpacity(
                opacity: widget.disabled ? 0.42 : (folded ? 0 : 1),
                duration: Duration(milliseconds: folded || sized ? 160 : 140),
                child: TweenAnimationBuilder<Color?>(
                  tween: PaintColorTween(end: fill),
                  duration: const Duration(milliseconds: 140),
                  curve: const Cubic(0.2, 0.8, 0.2, 1),
                  builder: (context, color, child) => FocusRing(
                    visible: _focusVisible,
                    radius: widget.radius,
                    child: DecoratedBox(
                      decoration: ShapeDecoration(
                        color: color,
                        shape: SuperellipseBorder(radius: widget.radius),
                      ),
                      child: child,
                    ),
                  ),
                  child: SizedBox(height: widget.height, child: body),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A count after an option's label (`.lab-segmented-badge`): a small neutral pill of the ink
/// around it (14 %), 18px tall, 11px semibold tabular figures, so it reads on the bare option and,
/// in the selected ink, on the pill.
class _Badge extends StatelessWidget {
  const _Badge({
    required this.text,
    required this.ink,
    required this.radiusScale,
  });
  final String text;
  final Color ink;
  final double radiusScale;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: ShapeDecoration(
      color: ink.withValues(alpha: ink.a * 0.14),
      shape: SuperellipseBorder(radius: 9 * radiusScale),
    ),
    child: ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 18),
      child: SizedBox(
        height: 18,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 5),
          child: Center(
            widthFactor: 1,
            child: Text(
              text,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                height: 18 / 11,
                leadingDistribution: TextLeadingDistribution.even,
                fontWeight: FontWeight.w600,
                color: ink,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// A tab's count on its icon's corner (stacked `.lab-segmented-badge`): a danger pill, 18px tall,
/// 11px semibold surface-coloured text, that needs action.
class _IconBadge extends StatelessWidget {
  const _IconBadge({required this.text, required this.radiusScale});
  final String text;
  final double radiusScale;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 18),
      child: Container(
        height: 18,
        padding: const EdgeInsets.symmetric(horizontal: 5),
        decoration: ShapeDecoration(
          color: c.danger,
          shape: SuperellipseBorder(radius: 9 * radiusScale),
        ),
        alignment: Alignment.center,
        child: CssBaseline(
          lineHeight: 18,
          child: Text(
            text,
            textAlign: TextAlign.center,
            maxLines: 1,
            softWrap: false,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              height: 18 / 11,
              leadingDistribution: TextLeadingDistribution.even,
              color: c.surface,
            ),
          ),
        ),
      ),
    );
  }
}

class _SuperellipseClip extends CustomClipper<Path> {
  _SuperellipseClip(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_SuperellipseClip old) => old.radius != radius;
}

/// A segment's content (`.lab-segmented-content`): the icon (in its [tone] when it has one), the
/// label and the badge in [ink], 13px semibold on an 18px line.
Widget _inlineContent<T>(
  SegmentOption<T> option, {
  required double fontSize,
  required Color ink,
  Color? tone,
  required bool fill,
  required double radiusScale,
}) => IconTheme.merge(
  data: IconThemeData(size: 16, color: ink),
  child: DefaultTextStyle.merge(
    style: TextStyle(
      fontSize: fontSize,
      height: _line(fontSize) / fontSize,
      leadingDistribution: TextLeadingDistribution.even,
      fontWeight: FontWeight.w600,
      color: ink,
    ),
    maxLines: 1,
    softWrap: false,
    child: CssBaseline(
      lineHeight: _line(fontSize),
      child: Row(
        mainAxisSize: fill ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        spacing: 6,
        children: [
          if (option.icon case final icon?)
            tone == null
                ? icon
                : IconTheme.merge(
                    data: IconThemeData(color: tone),
                    child: icon,
                  ),
          if (fill)
            Flexible(child: Text(option.label, overflow: TextOverflow.ellipsis))
          else
            Text(option.label),
          if (option.badge case final badge?)
            _Badge(text: badge, ink: ink, radiusScale: radiusScale),
        ],
      ),
    ),
  ),
);

/// Springs a value toward 0 or 1 on the snappy spring (jumps under reduced motion), rebuilding
/// with it: the gap and chevron of a track that folds (`springTiming(SPRINGS.snappy)` in CSS).
abstract class _FoldState<W extends StatefulWidget> extends State<W> {
  late final MotionValue _t;
  void Function()? _off;

  bool get target;

  @override
  void initState() {
    super.initState();
    _t = MotionValue(target ? 1 : 0, 0.002);
    _off = _t.subscribe((_) => setState(() {}));
  }

  @override
  void didUpdateWidget(W old) {
    super.didUpdateWidget(old);
    _t.animateTo(
      target ? 1 : 0,
      spring: Springs.snappy,
      instant: reducedMotionOf(context),
    );
  }

  @override
  void dispose() {
    _off?.call();
    _t.stop();
    super.dispose();
  }

  double get t => _t.get().clamp(0.0, 1.0);
}

/// The gap between two options of a track that folds: it springs away with the options.
class _FoldGap extends StatefulWidget {
  const _FoldGap({required this.gap, required this.folded});
  final double gap;
  final bool folded;

  @override
  State<_FoldGap> createState() => _FoldGapState();
}

class _FoldGapState extends _FoldState<_FoldGap> {
  @override
  bool get target => !widget.folded;

  @override
  Widget build(BuildContext context) => SizedBox(width: widget.gap * t);
}

/// The chevron after the selected option of a folded track (`.lab-segmented-chevron`): 4px gap
/// and a 14px chevron, growing from nothing as the track folds.
class _FoldChevron extends StatefulWidget {
  const _FoldChevron({required this.open, required this.color});
  final bool open;
  final Color color;

  @override
  State<_FoldChevron> createState() => _FoldChevronState();
}

class _FoldChevronState extends _FoldState<_FoldChevron> {
  @override
  bool get target => widget.open;

  @override
  Widget build(BuildContext context) => ClipRect(
    child: SizedBox(
      width: _chevronWidth * t,
      child: OverflowBox(
        alignment: AlignmentDirectional.centerStart,
        minWidth: _chevronWidth,
        maxWidth: _chevronWidth,
        child: Opacity(
          opacity: t,
          child: Padding(
            padding: const EdgeInsetsDirectional.only(start: 4),
            child: LucideChevronDown(size: 14, color: widget.color),
          ),
        ),
      ),
    ),
  );
}

/// The options of a folded track as a menu (`.lab-actions-menu` on a [MenuSurface], Radix
/// `DropdownMenu.RadioGroup` on the web): one radio row each with a check before the chosen one,
/// the option's icon, label and badge. Opens on the chosen option; Up and Down move (skipping
/// disabled ones), Home and End jump, Enter and Space choose, Escape closes.
class _SelectionMenu<T> extends StatefulWidget {
  const _SelectionMenu({
    required this.label,
    required this.options,
    required this.selected,
    required this.disabled,
    required this.onPick,
    required this.onClose,
  });
  final String label;
  final List<SegmentOption<T>> options;
  final int selected;
  final bool disabled;
  final ValueChanged<int> onPick;
  final VoidCallback onClose;

  @override
  State<_SelectionMenu<T>> createState() => _SelectionMenuState<T>();
}

class _SelectionMenuState<T> extends State<_SelectionMenu<T>> {
  late int _highlight = widget.selected;
  final _scope = FocusScopeNode(debugLabel: 'Segmented menu');

  bool _enabled(int i) => !widget.disabled && !widget.options[i].disabled;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scope.requestFocus();
    });
  }

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  void _move(int delta) {
    final n = widget.options.length;
    var next = _highlight;
    for (var i = 0; i < n; i++) {
      next = (next + delta + n) % n;
      if (_enabled(next)) break;
    }
    setState(() => _highlight = next);
  }

  void _jump(bool first) {
    final order = [for (var i = 0; i < widget.options.length; i++) i];
    for (final i in first ? order : order.reversed) {
      if (_enabled(i)) return setState(() => _highlight = i);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return FocusScope(
      node: _scope,
      onKeyEvent: (_, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        final key = event.logicalKey;
        if (key == LogicalKeyboardKey.escape) {
          widget.onClose();
        } else if (key == LogicalKeyboardKey.arrowDown) {
          _move(1);
        } else if (key == LogicalKeyboardKey.arrowUp) {
          _move(-1);
        } else if (key == LogicalKeyboardKey.home) {
          _jump(true);
        } else if (key == LogicalKeyboardKey.end) {
          _jump(false);
        } else if ((key == LogicalKeyboardKey.enter ||
                key == LogicalKeyboardKey.space) &&
            _highlight >= 0 &&
            _enabled(_highlight)) {
          widget.onPick(_highlight);
        } else {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      },
      child: MenuSurface(
        label: widget.label,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < widget.options.length; i++)
              Builder(
                builder: (context) {
                  final option = widget.options[i];
                  final badge = option.badge;
                  return Semantics(
                    inMutuallyExclusiveGroup: true,
                    checked: i == widget.selected,
                    enabled: _enabled(i),
                    label: badge == null
                        ? option.label
                        : '${option.label}, $badge',
                    onTap: _enabled(i) ? () => widget.onPick(i) : null,
                    excludeSemantics: true,
                    child: MenuRow(
                      leading: i == widget.selected
                          ? const LucideCheck(size: 18)
                          : const SizedBox.shrink(),
                      label: Row(
                        spacing: 12,
                        children: [
                          if (option.icon case final icon?)
                            IconTheme.merge(
                              data: const IconThemeData(size: 16),
                              child: icon,
                            ),
                          Flexible(child: Text(option.label)),
                        ],
                      ),
                      trailing: badge == null
                          ? null
                          : _Badge(
                              text: badge,
                              ink: theme.colors.ink,
                              radiusScale: theme.sizes.radiusScale,
                            ),
                      highlighted: i == _highlight,
                      enabled: _enabled(i),
                      onHover: () => setState(() => _highlight = i),
                      onTap: () => widget.onPick(i),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
