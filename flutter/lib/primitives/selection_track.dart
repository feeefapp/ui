import 'dart:math' as math;
import 'dart:ui' as ui show SemanticsRole;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../glass/geometry.dart';
import '../glass/press.dart';
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

/// The pill at rest: the primary fill with on-primary ink (a segmented control), or a light primary
/// tint with the ink colour (a tab bar). Pressed or dragged, both become the same glass lens.
enum SelectionPill { filled, tinted }

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
      other.direction == direction;

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
  );
}

/// One row of options and one moving pill: measuring, the pill and its glass lens with the touch
/// glow, drag with rubber band and momentum snap, auto-scroll, one-row overflow with edge fades and
/// reveal, keyboard roving, right-to-left, badges, tones, reduced motion and solid glass.
///
/// [semantics] makes it a radio group or a tab list; [layout], [pill] and [sizes] make it a
/// segmented control or a tab bar. [collapsed] folds it to the selected option, icon only (a
/// minimized tab bar). It needs a bounded width to scroll.
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
    this.collapsed = false,
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

  /// Shows only the selected option, icon only, as a circle; the others fold away on a spring.
  /// Needs [sizes].
  final bool collapsed;

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

  FocusNode _node(int index) => _nodes.putIfAbsent(index, FocusNode.new);
  GlobalKey _key(int index) => _keys.putIfAbsent(index, GlobalKey.new);

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
    // Stops a drag the host no longer allows (a tab bar that minimizes).
    if (!widget.draggable && old.draggable && (_drag?.active ?? false)) {
      _onEnd(null, cancelled: true);
    }
  }

  @override
  void dispose() {
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
    if (widget.disabled || _drag != null) return;
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
    final enabled = _enabled;
    final target = key == null
        ? null
        : selectionKeyTarget(
            key,
            enabled.indexWhere((i) => widget.options[i].value == widget.value),
            enabled.length,
            Directionality.of(context) == TextDirection.rtl,
            widget.semantics,
          );
    if (target == null) return KeyEventResult.ignored;
    final next = enabled[target];
    widget.onSelect(widget.options[next].value, SelectionSource.key);
    _node(next).requestFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final enabled = _enabled;
    final selected = _selected;
    final tabIndex = enabled.contains(selected)
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
    final tinted = widget.pill == SelectionPill.tinted;
    // The pill's rest paint and the selected ink.
    final pillFill = tinted ? mixSrgb(c.primary, 0.16, transparent) : c.primary;
    final pillInk = tinted ? c.ink : c.onPrimary;
    final collapsed = widget.collapsed;
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
        collapsed: collapsed,
        height: optionHeight,
        touchTarget: touch,
        padding: sizes?.padding ?? s.controlPadding,
        radius: optionHeight / 2 * s.radiusScale,
        // 13px semibold, iOS; 12px in the thin density (a host's sizes set their own).
        fontSize: sizes?.fontSize ?? (s.density == Density.thin ? 12 : 13),
        lineHeight: sizes?.lineHeight,
        onSelect: () =>
            widget.onSelect(widget.options[i].value, SelectionSource.press),
        fill: widget.equalWidth,
        radiusScale: s.radiusScale,
        ink: _InkClip(this, i, s.radiusScale),
        inkColor: pillInk,
        inkOpacity: () => solid ? 1 : 1 - lens.get().clamp(0.0, 1.0),
        motion: _motion,
      ),
    );
    // The track: the options and, painted behind them, the pill.
    final tab = widget.semantics == SelectionSemantics.tab;
    final row = Row(
      mainAxisSize: widget.equalWidth ? MainAxisSize.max : MainAxisSize.min,
      spacing: gap,
      children: [
        for (var i = 0; i < widget.options.length; i++)
          widget.equalWidth ? Expanded(child: segment(i)) : segment(i),
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
    final Widget body = widget.equalWidth
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
    // A radio group names the whole control; a tab list sits on its row of tabs (above).
    return tab
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

/// The selected ink of option [index]: cut to the pill's shape as it passes.
class _InkClip {
  _InkClip(this.state, this.index, this.radiusScale);
  final _SelectionTrackState<dynamic> state;
  final int index;
  final double radiusScale;

  RRect clip(Size size) {
    final boxes = state._boxes;
    if (state._placed && state._selected < 0) return RRect.zero;
    if (!state._placed || index >= boxes.length) {
      // Before placement only the selected option shows its ink (whole).
      return index == state._selected
          ? RRect.fromRectXY(Offset.zero & size, 0, 0)
          : RRect.zero;
    }
    final pill = state._pill.shift(-boxes[index].topLeft);
    final radius = math.min(pill.width, pill.height) / 2 * radiusScale;
    final cut = pill.intersect(Offset.zero & size);
    if (cut.width <= 0 || cut.height <= 0) return RRect.zero;
    return RRect.fromRectAndRadius(cut, Radius.circular(radius));
  }
}

/// Paints its child, then paints it again in [color] inside [ink]'s clip: the selected ink of an
/// option (the web kit's `.lab-segmented-ink` copy), without a second copy of the label in the
/// tree. [_InkHole]s below it (a tab's badge) are cut out of the ink, so they keep their own paint.
class _InkOverlay extends SingleChildRenderObjectWidget {
  const _InkOverlay({
    required this.ink,
    required this.color,
    required this.opacity,
    required this.repaint,
    required super.child,
  });
  final _InkClip ink;
  final Color color;
  final double Function() opacity;
  final Listenable repaint;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderInkOverlay(ink, color, opacity, repaint);

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderInkOverlay renderObject,
  ) {
    renderObject
      ..ink = ink
      ..color = color
      ..opacity = opacity
      ..repaint = repaint;
  }
}

class _RenderInkOverlay extends RenderProxyBox {
  _RenderInkOverlay(this.ink, this._color, this.opacity, this._repaint);
  _InkClip ink;
  double Function() opacity;

  /// Boxes cut out of the ink ([_InkHole]), with their corner radius.
  final holes = <_RenderInkHole>{};

  Color _color;
  set color(Color value) {
    if (value == _color) return;
    _color = value;
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
    context.paintChild(child, offset);
    final alpha = opacity().clamp(0.0, 1.0);
    final clip = ink.clip(size);
    if (alpha <= 0 || clip.width <= 0 || clip.height <= 0) return;
    void paintInk(PaintingContext context, Offset offset) {
      context.pushColorFilter(
        offset,
        ColorFilter.mode(
          _color.withValues(alpha: _color.a * alpha),
          BlendMode.srcIn,
        ),
        (context, offset) => context.paintChild(child, offset),
      );
    }

    // Each hole in its own shape (the badge's superellipse), so no ink shows at its corners.
    final cut = [
      for (final hole in holes)
        if (hole.attached && hole.hasSize)
          superellipsePath(
            MatrixUtils.transformRect(
              hole.getTransformTo(this),
              Offset.zero & hole.size,
            ),
            [hole.radius, hole.radius, hole.radius, hole.radius],
          ),
    ];
    if (cut.isEmpty) {
      context.pushClipRRect(true, offset, Offset.zero & size, clip, paintInk);
      return;
    }
    var path = Path()..addRRect(clip);
    for (final hole in cut) {
      path = Path.combine(PathOperation.difference, path, hole);
    }
    context.pushClipPath(true, offset, Offset.zero & size, path, paintInk);
  }
}

/// Cuts its child out of the selected ink of the option around it ([_InkOverlay]): a tab's badge
/// keeps its own colours as the pill passes, like the web kit's badge drawn above the ink.
class _InkHole extends SingleChildRenderObjectWidget {
  const _InkHole({required this.radius, required super.child});
  final double radius;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderInkHole(radius);

  @override
  void updateRenderObject(BuildContext context, _RenderInkHole renderObject) {
    renderObject.radius = radius;
  }
}

class _RenderInkHole extends RenderProxyBox {
  _RenderInkHole(this.radius);
  double radius;
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

/// The pill: [fill] at rest (the primary, or its light tint on a tab bar); pressed or dragged it
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
    final alpha = disabled ? 0.42 : 1.0;
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
    required this.collapsed,
    required this.height,
    required this.touchTarget,
    required this.padding,
    required this.radius,
    required this.fontSize,
    required this.lineHeight,
    required this.onSelect,
    required this.ink,
    required this.inkColor,
    required this.inkOpacity,
    required this.motion,
    required this.radiusScale,
    this.fill = false,
  });

  final SegmentOption<T> option;
  final int index;
  final bool selected, disabled, tabbable, dragging, collapsed;

  /// The selected fill the option paints itself (the pill isn't placed yet), or null.
  final Color? fallback;
  final SelectionSemantics semantics;
  final SelectionLayout layout;

  /// A host's sizes (a tab bar): the option's width range and folding.
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
  final Color inkColor;
  final double Function() inkOpacity;
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
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

  // A sized option (a tab) springs its width range and padding as the track folds and unfolds
  // (`springTiming(SPRINGS.snappy)` in CSS).
  late final MotionValue _min, _max, _pad;
  final _unsubscribe = <void Function()>[];

  ({double min, double max, double pad}) get _target {
    final sizes = widget.sizes;
    if (sizes == null) {
      return (min: 0, max: double.infinity, pad: widget.padding);
    }
    if (widget.collapsed) {
      return widget.selected
          ? (min: widget.height, max: widget.height, pad: 0)
          : (min: 0, max: 0, pad: 0);
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
    if (widget.sizes == null) return;
    final t = _target;
    final instant = reducedMotionOf(context) || old.sizes != widget.sizes;
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
  Widget _inline(Color ink, {Color? tone}) => IconTheme.merge(
    data: IconThemeData(size: 16, color: ink),
    child: DefaultTextStyle.merge(
      style: TextStyle(
        fontSize: widget.fontSize,
        height: _line(widget.fontSize) / widget.fontSize,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w600,
        color: ink,
      ),
      maxLines: 1,
      softWrap: false,
      child: CssBaseline(
        lineHeight: _line(widget.fontSize),
        child: Row(
          mainAxisSize: widget.fill ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          spacing: 6,
          children: [
            if (widget.option.icon case final icon?)
              tone == null
                  ? icon
                  : IconTheme.merge(
                      data: IconThemeData(color: tone),
                      child: icon,
                    ),
            if (widget.fill)
              Flexible(
                child: Text(
                  widget.option.label,
                  overflow: TextOverflow.ellipsis,
                ),
              )
            else
              Text(widget.option.label),
            if (widget.option.badge case final badge?)
              _Badge(text: badge, ink: ink, radiusScale: widget.radiusScale),
          ],
        ),
      ),
    ),
  );

  /// A tab's content: the icon (22px in a 24px box, its badge on the corner, cut out of the
  /// selected ink) over or beside the label, which hides while the track is folded.
  Widget _stacked(Color ink, {Color? tone}) {
    final sizes = widget.sizes;
    final direction = sizes?.direction ?? Axis.vertical;
    final lineHeight = widget.lineHeight ?? _line(widget.fontSize);
    final badge = widget.option.badge;
    final icon = widget.option.icon;
    final label = DefaultTextStyle.merge(
      style: TextStyle(
        fontSize: widget.fontSize,
        height: lineHeight / widget.fontSize,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w600,
        color: ink,
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
        SizedBox.square(
          dimension: 24,
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
                    radius: 9 * widget.radiusScale,
                    child: _IconBadge(
                      text: badge,
                      radiusScale: widget.radiusScale,
                    ),
                  ),
                ),
            ],
          ),
        ),
      if (!widget.collapsed)
        direction == Axis.horizontal ? Flexible(child: label) : label,
      if (icon == null && badge != null)
        _Badge(text: badge, ink: ink, radiusScale: widget.radiusScale),
    ];
    return Flex(
      direction: direction,
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      spacing: direction == Axis.horizontal ? 8 : 2,
      children: children,
    );
  }

  @override
  Widget build(BuildContext context) {
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
    final sized = widget.sizes != null;
    // Options are border-box buttons with a 1px border.
    final pad = sized ? math.max(0.0, _pad.get()) : widget.padding;
    final padding = EdgeInsetsDirectional.symmetric(horizontal: pad + 1);
    final content = stacked
        ? _stacked(c.muted, tone: tone)
        : _inline(c.muted, tone: tone);
    // The selected ink, cut to the pill's shape as it passes (the badge keeps its alpha, so it
    // turns into a pill of the selected ink; a tab's badge is cut out and keeps its colours).
    Widget body = _InkOverlay(
      ink: widget.ink,
      color: widget.inkColor,
      opacity: widget.inkOpacity,
      repaint: widget.motion,
      child: Padding(padding: padding, child: content),
    );
    if (sized) {
      // A width range that springs as the track folds: the content keeps its own width (never
      // narrower than the icon) and is clipped to the option.
      final maxWidth = math.max(0.0, _max.get());
      final minWidth = math.min(maxWidth, math.max(0.0, _min.get()));
      body = ConstrainedBox(
        constraints: BoxConstraints(minWidth: minWidth, maxWidth: maxWidth),
        child: ClipPath(
          clipper: _SuperellipseClip(widget.radius),
          child: OverflowBox(
            fit: OverflowBoxFit.deferToChild,
            minWidth: 0,
            maxWidth: math.max(maxWidth, 24 + (pad + 1) * 2),
            child: body,
          ),
        ),
      );
    }
    final folded = widget.collapsed && !widget.selected;
    final tab = widget.semantics == SelectionSemantics.tab;
    final label = badge == null
        ? widget.option.label
        : '${widget.option.label}, $badge';
    return Semantics(
      role: tab ? ui.SemanticsRole.tab : null,
      selected: tab ? widget.selected : null,
      button: tab ? true : null,
      inMutuallyExclusiveGroup: tab ? null : true,
      checked: tab ? null : widget.selected,
      onTap: tab && !widget.disabled ? widget.onSelect : null,
      label: label,
      enabled: !widget.disabled,
      excludeSemantics: true,
      // Only the selected option is a Tab stop; arrows reach the others (radio group and tab list
      // pattern).
      child: ExcludeFocusTraversal(
        excluding: !widget.tabbable,
        child: FocusableActionDetector(
          focusNode: widget.focusNode,
          enabled: !widget.disabled,
          descendantsAreFocusable: false,
          mouseCursor: widget.disabled
              ? SystemMouseCursors.forbidden
              : SystemMouseCursors.click,
          onShowHoverHighlight: (value) => setState(() => _hovered = value),
          onShowFocusHighlight: (value) =>
              setState(() => _focusVisible = value),
          actions: {
            ActivateIntent: CallbackAction<ActivateIntent>(
              onInvoke: (_) => widget.onSelect(),
            ),
          },
          child: IgnorePointer(
            // A folded option takes no pointer.
            ignoring: folded,
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
                    tween: ColorTween(end: fill),
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
