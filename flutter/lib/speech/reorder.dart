/// Speech block reordering: the Dart twin of `@feeef.dev/ui/speech/reorder` (`useSpeechReorder`).
/// Pointer movement stays off the build path; the owner receives one edit on drop.
library;

import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../i18n/i18n.dart';
import 'block_order.dart';
import '../theme.dart';

/// Pointer travel (px) before a press on the handle becomes a drag.
const speechActivationDistance = 6.0;

/// How long neighbours take to slide into their preview or final place.
const speechSlideDuration = Duration(milliseconds: 220);

/// The slide's easing (`cubic-bezier(.2,.8,.2,1)`).
const speechSlideCurve = Cubic(0.2, 0.8, 0.2, 1);

/// Auto-scroll speed in px per 60 Hz frame while the pointer is at [y] in a viewport whose
/// content edges are [top] and [bottom]: up to 12, ramping in over an edge band of a quarter of the
/// viewport (between 12 and 64 px). Negative scrolls up.
double speechAutoScrollSpeed(double y, double top, double bottom) {
  final edge = math.min(64.0, math.max(12.0, (bottom - top) / 4));
  if (y < top + edge) return -math.min(12.0, (top + edge - y) / 4);
  if (y > bottom - edge) return math.min(12.0, (y - bottom + edge) / 4);
  return 0;
}

/// The dragged card's offset for a grab [delta]: it stays in its lane, between the first slot's
/// top and the last slot's bottom, with its grab point under the pointer.
double speechDragOffset(List<SpeechSlot> items, int index, double delta) {
  final own = items[index];
  final last = items.last;
  return math.max(
    items.first.top - own.top,
    math.min(last.top + last.height - own.height - own.top, delta),
  );
}

/// Lays speech blocks out as a column [spacing] apart and coordinates their reordering (the
/// web kit's `.lab-voice-writing` parent, where blocks are siblings). The block being dragged, or
/// settling after a drop, paints above the others. Give each block a stable key (usually its id) so
/// its state follows it when the order changes.
class SpeechReorderGroup extends StatefulWidget {
  const SpeechReorderGroup({
    super.key,
    this.spacing = 12,
    required this.children,
  });

  /// Gap between blocks (`.lab-voice-writing { gap: 12px }`).
  final double spacing;

  /// The blocks, in order; each block's `index` is its position here.
  final List<Widget> children;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('spacing', spacing, defaultValue: 12));
  }

  @override
  State<SpeechReorderGroup> createState() => _GroupState();
}

class _Drag {
  _Drag({
    required this.owner,
    required this.items,
    required this.slots,
    required this.start,
    required this.startLocal,
    required this.pointer,
  }) : y = start,
       target = owner.index;
  final SpeechReorder owner;
  final List<SpeechReorder> items;
  final List<SpeechSlot> slots;
  final double start, startLocal;
  final int pointer;
  double y;
  int target;
  bool active = false;
  Duration? time;
}

class _GroupState extends State<SpeechReorderGroup>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final _blocks = <SpeechReorder>{};
  late final _ticker = createTicker(_tick);
  _Drag? _drag;
  Duration _now = Duration.zero;

  bool get reordering => _drag?.active ?? false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('reordering', value: reordering, ifTrue: 'reordering'))
      ..add(IntProperty('blocks', _blocks.length));
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker.dispose();
    super.dispose();
  }

  // A window blur, hide or resize cancels a drag, as in the web kit.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) _finish(true);
  }

  @override
  void didChangeMetrics() {
    if (_drag != null) _finish(true);
  }

  void _repaintOrder() {
    if (mounted) setState(() {});
  }

  bool get _reduced => reducedMotionOf(context);

  RenderBox? get _box => context.findRenderObject() as RenderBox?;

  List<SpeechReorder> _ordered() =>
      _blocks.where((b) => b._top() != null).toList()
        ..sort((a, b) => a.index.compareTo(b.index));

  double _local(double globalY) =>
      _box?.globalToLocal(Offset(0, globalY)).dy ?? globalY;

  void _ensureTicking() {
    if (_ticker.isActive) return;
    // A fresh run's elapsed time starts from zero.
    _now = Duration.zero;
    _ticker.start();
  }

  void _tick(Duration elapsed) {
    _now = elapsed;
    final drag = _drag;
    if (drag != null) _sample(drag, elapsed);
    var sliding = false;
    for (final block in _blocks) {
      sliding = block._step(elapsed) || sliding;
    }
    if (_drag == null && !sliding) _ticker.stop();
  }

  void _slide(SpeechReorder block, double from, double to) {
    block._slideFrom = from;
    block._slideTo = to;
    if (_reduced || (from - to).abs() < 0.5) {
      block._slideStart = null;
      block._offset.value = to;
      return;
    }
    block._slideStart = _ticker.isActive ? _now : null;
    block._offset.value = from;
    _ensureTicking();
  }

  void _begin(SpeechReorder owner, PointerDownEvent event) {
    if (_drag != null) return;
    // Settle an earlier reorder before measuring a new one.
    for (final block in _blocks) {
      block._slideStart = null;
      block._offset.value = 0;
      block._settling.value = false;
    }
    final items = _ordered();
    final slots = [
      for (final block in items) (top: block._top()!, height: block._height()),
    ];
    if (!items.contains(owner)) return;
    _drag = _Drag(
      owner: owner,
      items: items,
      slots: slots,
      start: event.position.dy,
      startLocal: _local(event.position.dy),
      pointer: event.pointer,
    );
    _ensureTicking();
  }

  void _sample(_Drag drag, Duration time) {
    final elapsed =
        math.min(32, (time - (drag.time ?? time)).inMicroseconds / 1000) /
        (1000 / 60);
    drag.time = time;
    final owner = drag.owner;
    final index = drag.items.indexOf(owner);
    if (!drag.active &&
        (drag.y - drag.start).abs() > speechActivationDistance) {
      drag.active = true;
      owner._dragging.value = true;
      setState(() {});
      owner._announce(
        I18n.of(owner._context!).t('lab.speech.picked', {'index': index + 1}),
      );
    }
    if (!drag.active) return;
    final scrollable = context.findAncestorStateOfType<ScrollableState>();
    final viewport = scrollable?.context.findRenderObject() as RenderBox?;
    if (scrollable != null && viewport != null && viewport.hasSize) {
      final top = viewport.localToGlobal(Offset.zero).dy;
      final speed = speechAutoScrollSpeed(
        drag.y,
        top,
        top + viewport.size.height,
      );
      final position = scrollable.position;
      if (speed != 0 && position.axis == Axis.vertical) {
        final next = (position.pixels + speed * elapsed).clamp(
          position.minScrollExtent,
          position.maxScrollExtent,
        );
        if (next != position.pixels) position.jumpTo(next);
      }
    }
    // Scrolling moves the group, so a group-relative delta already includes it.
    final delta = _local(drag.y) - drag.startLocal;
    final offset = speechDragOffset(drag.slots, index, delta);
    final target = speechDragIndex(drag.slots, index, delta);
    if (target != drag.target) {
      final offsets = speechPreviewOffsets(drag.slots, index, target);
      for (var i = 0; i < drag.items.length; i++) {
        if (i == index) continue;
        final block = drag.items[i];
        _slide(block, block._offset.value, offsets[i]);
      }
      drag.target = target;
      owner._announce(
        I18n.of(
          owner._context!,
        ).t('lab.speech.position', {'index': target + 1, 'count': owner.count}),
      );
    }
    owner._slideStart = null;
    owner._offset.value = offset;
  }

  void _move(SpeechReorder owner, PointerMoveEvent event) {
    if (_drag?.pointer == event.pointer) _drag!.y = event.position.dy;
  }

  void _up(SpeechReorder owner, PointerUpEvent event) {
    final drag = _drag;
    if (drag?.pointer != event.pointer) return;
    drag!.y = event.position.dy;
    _sample(drag, _now);
    _finish(false);
  }

  void _finish(bool cancel, {bool rebuild = true}) {
    final drag = _drag;
    if (drag == null) return;
    _drag = null;
    final owner = drag.owner;
    final index = drag.items.indexOf(owner);
    final moved = !cancel && drag.active && drag.target != index;
    final offsets = moved
        ? speechPreviewOffsets(drag.slots, index, drag.target)
        : [for (final _ in drag.items) 0.0];
    final predicted = <SpeechReorder, double>{};
    for (var i = 0; i < drag.items.length; i++) {
      final block = drag.items[i];
      predicted[block] = drag.slots[i].top + offsets[i];
      _slide(block, block._offset.value - offsets[i], 0);
    }
    owner._dragging.value = false;
    owner._settling.value = owner._offset.value != owner._slideTo;
    if (moved) {
      owner._onMove(index, drag.target);
      _correct(predicted);
    }
    if (rebuild && mounted) setState(() {});
    if (drag.active) {
      owner._announce(
        cancel
            ? I18n.of(owner._context!).t('lab.speech.cancelled')
            : I18n.of(owner._context!).t('lab.speech.moved', {
                'index': drag.target + 1,
                'count': owner.count,
              }),
      );
    }
  }

  /// After the owner applied a move, slides keep each block where it was on screen. If the new
  /// layout is not where the preview predicted (an unkeyed list, a late rebuild), shift the slides.
  void _correct(Map<SpeechReorder, double> predicted) {
    SchedulerBinding.instance.addPostFrameCallback((_) {
      for (final MapEntry(key: block, value: top) in predicted.entries) {
        final actual = block._top();
        if (actual == null || (actual - top).abs() < 0.5) continue;
        final shift = top - actual;
        block._slideFrom += shift;
        block._offset.value += shift;
        if (block._slideStart == null) _slide(block, block._offset.value, 0);
      }
    });
  }

  KeyEventResult _key(SpeechReorder owner, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final drag = _drag;
    if (drag != null) {
      if (drag.owner == owner &&
          event.logicalKey == LogicalKeyboardKey.escape) {
        _finish(true);
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    final next = event.logicalKey == LogicalKeyboardKey.arrowUp
        ? owner.index - 1
        : event.logicalKey == LogicalKeyboardKey.arrowDown
        ? owner.index + 1
        : null;
    if (next == null) return KeyEventResult.ignored;
    if (next < 0 || next >= owner.count) return KeyEventResult.handled;
    final items = _ordered();
    final from = items.indexOf(owner);
    if (from >= 0 && next < items.length) {
      final slots = [
        for (final block in items)
          (top: block._top()!, height: block._height()),
      ];
      final offsets = speechPreviewOffsets(slots, from, next);
      final predicted = <SpeechReorder, double>{};
      for (var i = 0; i < items.length; i++) {
        predicted[items[i]] = slots[i].top + offsets[i];
        _slide(items[i], items[i]._offset.value - offsets[i], 0);
      }
      _correct(predicted);
    }
    owner._onMove(owner.index, next);
    owner._announce(
      I18n.of(owner._context!)
          .t('lab.speech.moved', {'index': next + 1, 'count': owner.count}),
    );
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final raised = {
      for (final block in _blocks)
        if (block._dragging.value || block._settling.value) block.index,
    };
    return _GroupScope(
      state: this,
      reordering: reordering,
      child: MouseRegion(
        cursor: reordering ? SystemMouseCursors.grabbing : MouseCursor.defer,
        child: _SpeechColumn(
          spacing: widget.spacing,
          raised: raised,
          children: widget.children,
        ),
      ),
    );
  }
}

class _GroupScope extends InheritedWidget {
  const _GroupScope({
    required this.state,
    required this.reordering,
    required super.child,
  });
  final _GroupState state;
  final bool reordering;
  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<_GroupState>('state', state))
      ..add(
        FlagProperty('reordering', value: reordering, ifTrue: 'reordering'),
      );
  }

  @override
  bool updateShouldNotify(_GroupScope old) =>
      old.state != state || old.reordering != reordering;
}

/// One block's side of the reordering (what `useSpeechReorder` returns for one block): its
/// offset, drag state and the handle's pointer and key handlers. A block creates one, keeps it
/// in sync with [update] and disposes it.
class SpeechReorder {
  SpeechReorder();

  /// Wrap the block's laid-out box in a widget with this key so its slot can be measured.
  final layoutKey = GlobalKey();
  final _offset = ValueNotifier<double>(0);
  final _dragging = ValueNotifier<bool>(false);
  final _settling = ValueNotifier<bool>(false);

  /// Position of the block in the list, from 0.
  int index = 0;

  /// Number of blocks in the list.
  int count = 0;
  void Function(int from, int to) _onMove = (_, _) {};
  BuildContext? _context;
  _GroupState? _group;
  double _slideFrom = 0, _slideTo = 0;
  Duration? _slideStart;

  /// The block's vertical offset from its laid-out place (drag, preview or settle).
  ValueListenable<double> get offset => _offset;

  /// True while this block is being dragged.
  ValueListenable<bool> get dragging => _dragging;

  /// True while a dropped block glides into place (it still paints above its neighbours).
  ValueListenable<bool> get settling => _settling;

  /// Whether a [SpeechReorderGroup] coordinates this block; without one only the keyboard moves it.
  bool get grouped => _group != null;

  /// Whether the enclosing group is in the middle of a pointer drag.
  static bool reorderingOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_GroupScope>()?.reordering ??
      false;

  /// Syncs the block's props and finds its group. Call from `build` (or `didChangeDependencies`).
  void update(
    BuildContext context, {
    required int index,
    required int count,
    required void Function(int from, int to) onMove,
  }) {
    this.index = index;
    this.count = count;
    _onMove = onMove;
    _context = context;
    final group = context.getInheritedWidgetOfExactType<_GroupScope>()?.state;
    if (group != _group) {
      _group?._blocks.remove(this);
      _group = group;
      group?._blocks.add(this);
    }
  }

  /// Leaves the group and frees the notifiers.
  void dispose() {
    final group = _group;
    if (group != null && group._drag?.owner == this) {
      group._finish(true, rebuild: false);
    }
    group?._blocks.remove(this);
    _group = null;
    _offset.dispose();
    _dragging.dispose();
    _settling.dispose();
  }

  RenderBox? get _render {
    final render = layoutKey.currentContext?.findRenderObject();
    return render is RenderBox && render.attached && render.hasSize
        ? render
        : null;
  }

  double? _top() {
    final render = _render, box = _group?._box;
    if (render == null) return null;
    return render.localToGlobal(Offset.zero, ancestor: box).dy;
  }

  double _height() => _render?.size.height ?? 0;

  /// Advances this block's slide; true while it is still moving.
  bool _step(Duration now) {
    final start = _slideStart;
    if (start == null) {
      if (_offset.value != _slideTo && _group?._drag?.owner != this) {
        _slideStart = now;
        return true;
      }
      if (_settling.value) _settling.value = false;
      return false;
    }
    final t = (now - start).inMicroseconds / speechSlideDuration.inMicroseconds;
    if (t >= 1) {
      _slideStart = null;
      _offset.value = _slideTo;
      if (_settling.value) {
        _settling.value = false;
        _group?._repaintOrder();
      }
      return false;
    }
    _offset.value =
        _slideFrom + (_slideTo - _slideFrom) * speechSlideCurve.transform(t);
    return true;
  }

  void _announce(String message) {
    final context = _context;
    if (context == null || !context.mounted) return;
    SemanticsService.sendAnnouncement(
      View.of(context),
      message,
      Directionality.of(context),
    );
  }

  /// Handle pointer down: starts measuring a possible drag (primary button only).
  void pointerDown(PointerDownEvent event) {
    if (event.buttons & kPrimaryButton == 0) return;
    _group?._begin(this, event);
  }

  /// Handle pointer move.
  void pointerMove(PointerMoveEvent event) => _group?._move(this, event);

  /// Handle pointer up: drops the block.
  void pointerUp(PointerUpEvent event) => _group?._up(this, event);

  /// Handle pointer cancel: puts everything back.
  void pointerCancel(PointerCancelEvent event) {
    final group = _group;
    if (group?._drag?.pointer == event.pointer) group!._finish(true);
  }

  /// Handle key presses: arrow keys move the block one place, Escape cancels a drag.
  KeyEventResult keyDown(KeyEvent event) {
    final group = _group;
    if (group != null) return group._key(this, event);
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final next = event.logicalKey == LogicalKeyboardKey.arrowUp
        ? index - 1
        : event.logicalKey == LogicalKeyboardKey.arrowDown
        ? index + 1
        : null;
    if (next == null) return KeyEventResult.ignored;
    if (next < 0 || next >= count) return KeyEventResult.handled;
    _onMove(index, next);
    final context = _context;
    if (context != null) {
      _announce(
        I18n.of(context)
            .t('lab.speech.moved', {'index': next + 1, 'count': count}),
      );
    }
    return KeyEventResult.handled;
  }
}

class _SpeechColumn extends MultiChildRenderObjectWidget {
  const _SpeechColumn({
    required this.spacing,
    required this.raised,
    required super.children,
  });
  final double spacing;
  final Set<int> raised;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('spacing', spacing))
      ..add(IterableProperty<int>('raised', raised));
  }

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSpeechColumn(spacing, raised);

  @override
  void updateRenderObject(
    BuildContext context,
    covariant _RenderSpeechColumn renderObject,
  ) => renderObject
    ..spacing = spacing
    ..raised = raised;
}

class _ColumnData extends ContainerBoxParentData<RenderBox> {}

/// A stretched column whose raised children paint (and hit-test) above the rest.
class _RenderSpeechColumn extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _ColumnData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _ColumnData> {
  _RenderSpeechColumn(this._spacing, this._raised);

  double _spacing;
  set spacing(double value) {
    if (value == _spacing) return;
    _spacing = value;
    markNeedsLayout();
  }

  Set<int> _raised;
  set raised(Set<int> value) {
    if (setEquals(value, _raised)) return;
    _raised = value;
    markNeedsPaint();
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('spacing', _spacing))
      ..add(IterableProperty<int>('raised', _raised));
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _ColumnData) child.parentData = _ColumnData();
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
  double computeMinIntrinsicWidth(double height) => _children.fold(
    0,
    (a, c) => math.max(a, c.getMinIntrinsicWidth(double.infinity)),
  );

  @override
  double computeMaxIntrinsicWidth(double height) => _children.fold(
    0,
    (a, c) => math.max(a, c.getMaxIntrinsicWidth(double.infinity)),
  );

  @override
  double computeMinIntrinsicHeight(double width) =>
      computeMaxIntrinsicHeight(width);

  @override
  double computeMaxIntrinsicHeight(double width) {
    final children = _children;
    return children.fold(0.0, (a, c) => a + c.getMaxIntrinsicHeight(width)) +
        _spacing * math.max(0, children.length - 1);
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final inner = BoxConstraints.tightFor(width: constraints.maxWidth);
    final children = _children;
    var height = _spacing * math.max(0, children.length - 1);
    for (final child in children) {
      height += child.getDryLayout(inner).height;
    }
    return constraints.constrain(Size(constraints.maxWidth, height));
  }

  @override
  void performLayout() {
    final inner = BoxConstraints.tightFor(width: constraints.maxWidth);
    var y = 0.0;
    var first = true;
    for (final child in _children) {
      if (!first) y += _spacing;
      first = false;
      child.layout(inner, parentUsesSize: true);
      (child.parentData! as _ColumnData).offset = Offset(0, y);
      y += child.size.height;
    }
    size = constraints.constrain(Size(constraints.maxWidth, y));
  }

  List<RenderBox> get _paintOrder {
    final children = _children;
    return [
      for (var i = 0; i < children.length; i++)
        if (!_raised.contains(i)) children[i],
      for (var i = 0; i < children.length; i++)
        if (_raised.contains(i)) children[i],
    ];
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final child in _paintOrder) {
      context.paintChild(
        child,
        offset + (child.parentData! as _ColumnData).offset,
      );
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final child in _paintOrder.reversed) {
      final data = child.parentData! as _ColumnData;
      final hit = result.addWithPaintOffset(
        offset: data.offset,
        position: position,
        hitTest: (result, transformed) =>
            child.hitTest(result, position: transformed),
      );
      if (hit) return true;
    }
    return false;
  }
}
