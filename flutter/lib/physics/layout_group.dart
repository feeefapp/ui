/// Shared-element layout transitions (FLIP on springs): the Dart twin of
/// `@feeef.dev/ui/physics/layout-group`.
library;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'motion_value.dart';
import 'spring.dart';

/// Shared-element layout transitions (FLIP on springs): whenever the group rebuilds, every
/// [LayoutGroupItem] inside it that moved animates from where it was to where it now is, even
/// into another container inside the group. Mark an item `size: true` to animate its size too (it
/// scales, so prefer it for media and plain shapes). An interrupted move continues from where it
/// is on screen at the speed it had, so rapid changes never jump. Items keep their identity by
/// [LayoutGroupItem.layoutId], which must be unique in the group.
class LayoutGroup extends StatefulWidget {
  const LayoutGroup({
    super.key,
    required this.child,
    this.layoutKey = _always,
    this.spring = Springs.snappy,
    this.animateEnter = true,
  });

  static const Object _always = Object();

  /// The subtree to watch.
  final Widget child;

  /// Animate only when this value changes (cheaper on busy screens). Default: after every rebuild.
  final Object? layoutKey;

  /// Spring for movement. Default `snappy`.
  final Spring spring;

  /// Items that are new in a rebuild fade and scale in. Default true.
  final bool animateEnter;

  @override
  State<LayoutGroup> createState() => _LayoutGroupState();
}

class _LayoutGroupState extends State<LayoutGroup> {
  final _items = <Object, _RenderItem>{};
  final _root = GlobalKey();

  /// Boxes taken before the latest rebuild, consumed by each item's next paint.
  Map<Object, Rect>? _before;
  int _generation = 0;

  RenderObject? get _reference => _root.currentContext?.findRenderObject();

  @override
  void didUpdateWidget(LayoutGroup old) {
    super.didUpdateWidget(old);
    if (!identical(widget.layoutKey, LayoutGroup._always) &&
        widget.layoutKey == old.layoutKey) {
      _before = null;
      return;
    }
    final reference = _reference;
    if (reference == null) return;
    final boxes = <Object, Rect>{};
    for (final MapEntry(key: id, value: item) in _items.entries) {
      final box = item._visualBox(reference);
      if (box != null) boxes[id] = box;
    }
    _before = boxes;
    _generation++;
    // Items that didn't repaint still need to compare their new layout.
    for (final item in _items.values) {
      item.markNeedsPaint();
    }
    SchedulerBinding.instance.addPostFrameCallback((_) => _before = null);
  }

  @override
  Widget build(BuildContext context) => _LayoutGroupScope(
    group: this,
    child: KeyedSubtree(key: _root, child: widget.child),
  );
}

class _LayoutGroupScope extends InheritedWidget {
  const _LayoutGroupScope({required this.group, required super.child});
  final _LayoutGroupState group;
  @override
  bool updateShouldNotify(_LayoutGroupScope old) => old.group != group;
}

/// An element a [LayoutGroup] moves (the web kit's `data-lab-layout-id`). Outside a group it still
/// works with [snapshotLayout] and [animateLayoutFrom] through a [GlobalKey].
class LayoutGroupItem extends SingleChildRenderObjectWidget {
  const LayoutGroupItem({
    super.key,
    required this.layoutId,
    this.size = false,
    required super.child,
  });

  /// Identity inside the group; the same id in two places animates between them.
  final Object layoutId;

  /// Also animate the size (`data-lab-layout="size"`): it scales, so use it for media and shapes.
  final bool size;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderItem(
    layoutId: layoutId,
    sized: size,
    group: context
        .dependOnInheritedWidgetOfExactType<_LayoutGroupScope>()
        ?.group,
    reduceMotion: MediaQuery.maybeDisableAnimationsOf(context) ?? false,
  );

  @override
  void updateRenderObject(
    BuildContext context,
    covariant RenderObject renderObject,
  ) => (renderObject as _RenderItem)
    ..layoutId = layoutId
    ..sized = size
    ..group = context
        .dependOnInheritedWidgetOfExactType<_LayoutGroupScope>()
        ?.group
    ..reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

class _Track {
  _Track(this.x, this.y, this.sx, this.sy, this.unsubscribe);
  final MotionValue x, y, sx, sy;
  final List<void Function()> unsubscribe;
  int settled = 0;
  void stop() {
    for (final u in unsubscribe) {
      u();
    }
    for (final v in [x, y, sx, sy]) {
      v.stop();
    }
  }
}

// The render object behind [LayoutGroupItem]: paints its child at the running FLIP transform.
class _RenderItem extends RenderProxyBox {
  _RenderItem({
    required this.layoutId,
    required this.sized,
    required _LayoutGroupState? group,
    required this.reduceMotion,
  }) : _group = group; // ignore: prefer_initializing_formals

  /// Identity inside the group.
  Object layoutId;

  /// Whether size changes animate too.
  bool sized;

  /// Reduced motion skips every animation.
  bool reduceMotion;

  _LayoutGroupState? _group;
  set group(_LayoutGroupState? value) {
    if (value == _group) return;
    if (attached) _unregister();
    _group = value;
    if (attached) _register();
  }

  _Track? _track;
  MotionValue? _enter;
  void Function()? _enterUnsubscribe;
  int _seen = 0;

  /// A pending FLIP from [animateLayoutFrom]: the box before, and whether to animate the size.
  (Rect, bool?, Spring)? _pending;

  /// Current FLIP offset and scale (origin top-left), and the enter progress.
  Offset get _shift =>
      _track == null ? Offset.zero : Offset(_track!.x.get(), _track!.y.get());
  Size get _scale => _track == null
      ? const Size(1, 1)
      : Size(_track!.sx.get(), _track!.sy.get());

  void _register() {
    final group = _group;
    if (group == null) return;
    group._items[layoutId] = this;
    // Mounted by the rebuild being animated: compare (or enter) at the next paint.
    _seen = group._before != null ? -1 : group._generation;
  }

  void _unregister() {
    final group = _group;
    if (group != null && identical(group._items[layoutId], this)) {
      group._items.remove(layoutId);
    }
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _register();
  }

  @override
  void detach() {
    _unregister();
    super.detach();
  }

  @override
  void dispose() {
    _track?.stop();
    _enterUnsubscribe?.call();
    _enter?.stop();
    super.dispose();
  }

  /// The box where this item is drawn now, transforms included, in [reference]'s coordinates
  /// (screen coordinates when null).
  Rect? _visualBox(RenderObject? reference) {
    if (!attached || !hasSize) return null;
    final origin = MatrixUtils.transformPoint(
      getTransformTo(reference),
      Offset.zero,
    );
    final scale = _scale;
    return (origin + _shift) &
        Size(size.width * scale.width, size.height * scale.height);
  }

  Rect? _layoutBox(RenderObject? reference) {
    if (!attached || !hasSize) return null;
    return MatrixUtils.transformPoint(getTransformTo(reference), Offset.zero) &
        size;
  }

  void _consume() {
    final group = _group;
    if (group != null && _seen != group._generation) {
      _seen = group._generation;
      final before = group._before;
      if (before != null && !reduceMotion) {
        final first = before[layoutId];
        final reference = group._reference;
        if (first != null) {
          _flip(first, _layoutBox(reference), sized, group.widget.spring);
        } else if (group.widget.animateEnter && _track == null) {
          _startEnter(group.widget.spring);
        }
      }
    }
    final pending = _pending;
    if (pending != null) {
      _pending = null;
      if (!reduceMotion) {
        _flip(pending.$1, _layoutBox(null), pending.$2 ?? sized, pending.$3);
      }
    }
  }

  void _flip(Rect first, Rect? last, bool withSize, Spring spring) {
    if (last == null) return;
    final old = _track;
    final speed = old == null
        ? null
        : (
            x: old.x.velocity,
            y: old.y.velocity,
            sx: old.sx.velocity,
            sy: old.sy.velocity,
          );
    old?.stop();
    _track = null;
    final dx = first.left - last.left, dy = first.top - last.top;
    final sx = withSize && last.width != 0 ? first.width / last.width : 1.0;
    final sy = withSize && last.height != 0 ? first.height / last.height : 1.0;
    if (dx.abs() < 0.5 &&
        dy.abs() < 0.5 &&
        (sx - 1).abs() < 0.005 &&
        (sy - 1).abs() < 0.005) {
      return;
    }
    final x = MotionValue(dx, 0.25), y = MotionValue(dy, 0.25);
    final scaleX = MotionValue(sx, 0.001), scaleY = MotionValue(sy, 0.001);
    late final _Track track;
    void paint(double _) => markNeedsPaint();
    track = _Track(x, y, scaleX, scaleY, [
      for (final v in [x, y, scaleX, scaleY]) v.subscribe(paint),
    ]);
    _track = track;
    void done(bool arrived) {
      if (!arrived || ++track.settled < 4 || _track != track) return;
      track.stop();
      _track = null;
      markNeedsPaint();
    }

    // Paint this frame from the old box; the springs start once the frame is done.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (_track != track) return;
      x.animateTo(0, spring: spring, velocity: speed?.x ?? 0).then(done);
      y.animateTo(0, spring: spring, velocity: speed?.y ?? 0).then(done);
      scaleX.animateTo(1, spring: spring, velocity: speed?.sx ?? 0).then(done);
      scaleY.animateTo(1, spring: spring, velocity: speed?.sy ?? 0).then(done);
    });
  }

  void _startEnter(Spring spring) {
    _enterUnsubscribe?.call();
    _enter?.stop();
    final p = MotionValue(0, 0.002);
    _enter = p;
    final unsubscribe = p.subscribe((_) => markNeedsPaint());
    _enterUnsubscribe = unsubscribe;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (_enter != p) return;
      p.animateTo(1, spring: spring).then((_) {
        unsubscribe();
        if (_enter != p) return;
        _enter = null;
        _enterUnsubscribe = null;
        markNeedsPaint();
      });
    });
  }

  Matrix4 get _transform {
    final shift = _shift, scale = _scale;
    final matrix = Matrix4.translationValues(shift.dx, shift.dy, 0)
      ..scaleByDouble(scale.width, scale.height, 1, 1);
    final enter = _enter;
    if (enter != null) {
      // Enter: scale(0.94 + 0.06 p) around the centre.
      final s = 0.94 + 0.06 * enter.get();
      final c = size.center(Offset.zero);
      matrix.multiply(
        Matrix4.translationValues(c.dx, c.dy, 0)
          ..scaleByDouble(s, s, 1, 1)
          ..translateByDouble(-c.dx, -c.dy, 0, 1),
      );
    }
    return matrix;
  }

  bool get _identity => _track == null && _enter == null && _pending == null;

  @override
  void paint(PaintingContext context, Offset offset) {
    _consume();
    final box = child;
    if (box == null) return;
    if (_identity) {
      layer = null;
      context.paintChild(box, offset);
      return;
    }
    final enter = _enter;
    void draw(PaintingContext context, Offset offset) {
      if (enter == null) {
        context.paintChild(box, offset);
        return;
      }
      context.pushOpacity(
        offset,
        (enter.get().clamp(0.0, 1.0) * 255).round(),
        (context, offset) => context.paintChild(box, offset),
      );
    }

    layer = context.pushTransform(
      needsCompositing,
      offset,
      _transform,
      draw,
      oldLayer: layer is TransformLayer ? layer as TransformLayer : null,
    );
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    if (!_identity) transform.multiply(_transform);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      _identity
      ? super.hitTestChildren(result, position: position)
      : result.addWithPaintTransform(
          transform: _transform,
          position: position,
          hitTest: (result, position) =>
              super.hitTestChildren(result, position: position),
        );
}

_RenderItem? _itemOf(GlobalKey key) {
  _RenderItem? found;
  final render = key.currentContext?.findRenderObject();
  if (render is _RenderItem) return render;
  // The key may sit above the item (on a widget that wraps it).
  void visit(RenderObject node) {
    if (found != null) return;
    if (node is _RenderItem) {
      found = node;
      return;
    }
    node.visitChildren(visit);
  }

  if (render != null) visit(render);
  return found;
}

/// Where each [LayoutGroupItem] (found through its key) is on screen now, transforms included, to
/// animate from after a change.
Map<GlobalKey, Rect> snapshotLayout(Iterable<GlobalKey> elements) => {
  for (final key in elements) key: ?_itemOf(key)?._visualBox(null),
};

/// FLIP on springs: animates each item from its box in [before] to where layout puts it next.
/// Call it right after the change (after `setState`, before the frame) so the next frame already
/// starts from the old box. Items mid-flight keep their speed. With [size], an item also scales
/// from its old size; without it, each item's own `size` flag decides.
void animateLayoutFrom(
  Map<GlobalKey, Rect> before, {
  Spring spring = Springs.snappy,
  bool Function(GlobalKey key)? size,
}) {
  for (final MapEntry(key: key, value: first) in before.entries) {
    final item = _itemOf(key);
    if (item == null || !item.attached) continue;
    item._pending = (first, size?.call(key), spring);
    item.markNeedsPaint();
  }
}
