import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../physics/motion_value.dart';
import '../physics/spring.dart';
import 'adaptive_model.dart';

/// `compact` below the breakpoint, `regular` from it: the element's own width, not the window's.
/// The twin of `SizeClass` / `useSizeClass` in `@feeef.dev/ui/containers/adaptive`; read it below a
/// [SizeClassScope] with [SizeClass.of].
enum SizeClass {
  compact,
  regular;

  /// The size class of the nearest [SizeClassScope]; `regular` when there is none (the web hook
  /// returns `regular` before the first layout).
  static SizeClass of(BuildContext context) =>
      maybeOf(context) ?? SizeClass.regular;

  /// The size class of the nearest [SizeClassScope], or null outside one.
  static SizeClass? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_SizeClassData>()?.sizeClass;
}

/// The size class for an element [width] (null before layout): the rule behind `useSizeClass`.
SizeClass sizeClassFor(double? width, [double breakpoint = 600]) =>
    width != null && width < breakpoint ? SizeClass.compact : SizeClass.regular;

/// Measures its own width and gives everything below it a [SizeClass], like SwiftUI's horizontal
/// size class but measured on the element, so a component in a narrow pane is compact even on a
/// wide screen. The twin of `useSizeClass(ref, breakpoint)` (and `useElementWidth`).
class SizeClassScope extends StatelessWidget {
  const SizeClassScope({super.key, this.breakpoint = 600, required this.child});

  /// Width in px from which the scope is `regular`. Default 600.
  final double breakpoint;
  final Widget child;

  /// Width of the nearest scope's element (the twin of `useElementWidth`), or null outside one or
  /// when its width is unbounded.
  static double? widthOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_SizeClassData>()?.width;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final width = constraints.maxWidth.isFinite ? constraints.maxWidth : null;
      return _SizeClassData(
        width: width,
        sizeClass: sizeClassFor(width, breakpoint),
        child: child,
      );
    },
  );
}

class _SizeClassData extends InheritedWidget {
  const _SizeClassData({
    required this.width,
    required this.sizeClass,
    required super.child,
  });
  final double? width;
  final SizeClass sizeClass;
  @override
  bool updateShouldNotify(_SizeClassData old) =>
      old.width != width || old.sizeClass != sizeClass;
}

/// Cross-axis alignment of an [AdaptiveStack] while horizontal.
enum AdaptiveAlign { start, center, end, stretch }

/// Main-axis distribution of an [AdaptiveStack] while horizontal.
enum AdaptiveJustify { start, center, end, between }

/// A row that becomes a column when there is no room, like SwiftUI's AnyLayout switching an HStack
/// for a VStack: the same children, re-laid out, each flying to its new place on a spring. Use it
/// for a summary card's stats, a form's actions, or a toolbar's groups. The twin of
/// `AdaptiveStack` in `@feeef.dev/ui/containers/adaptive`. Fit mode reads each child's max
/// intrinsic width (CSS `max-content`), so children must support intrinsic sizing.
class AdaptiveStack extends MultiChildRenderObjectWidget {
  const AdaptiveStack({
    super.key,
    required super.children,
    this.breakpoint,
    this.gap = 12,
    this.align = AdaptiveAlign.center,
    this.justify = AdaptiveJustify.start,
    this.onAxisChange,
  });

  /// When to stack vertically: below a width in px, or null (the web kit's `fit`, default)
  /// whenever the items would not fit side by side at their natural width.
  final double? breakpoint;

  /// Space between items in px. Default 12.
  final double gap;

  /// Cross-axis alignment while horizontal. Default `center`.
  final AdaptiveAlign align;

  /// Main-axis distribution while horizontal. Default `start`.
  final AdaptiveJustify justify;

  /// Called when the axis changes.
  final ValueChanged<Axis>? onAxisChange;

  @override
  RenderAdaptiveStack createRenderObject(BuildContext context) =>
      RenderAdaptiveStack(
        breakpoint: breakpoint,
        gap: gap,
        align: align,
        justify: justify,
        onAxisChange: onAxisChange,
        textDirection: Directionality.maybeOf(context) ?? TextDirection.ltr,
        reduceMotion: MediaQuery.maybeDisableAnimationsOf(context) ?? false,
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderAdaptiveStack renderObject,
  ) => renderObject
    ..breakpoint = breakpoint
    ..gap = gap
    ..align = align
    ..justify = justify
    ..onAxisChange = onAxisChange
    ..textDirection = Directionality.maybeOf(context) ?? TextDirection.ltr
    ..reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

/// Parent data of an [AdaptiveStack] child: its layout offset plus the FLIP translation it is
/// springing out of.
class AdaptiveStackParentData extends ContainerBoxParentData<RenderBox> {
  /// Share of the row's free room (CSS `flex: <flex> 1 0%`); 0 keeps the natural width.
  double flex = 0;
  MotionValue? _dx, _dy;
  Offset get _shift => Offset(_dx?.get() ?? 0, _dy?.get() ?? 0);
}

/// A child of an [AdaptiveStack] that grows, like CSS `flex: 1 1 0%` on a stack item: while the
/// stack is a row, flex children share the room the other children leave, in proportion to
/// [flex]. In a column every child takes the full width anyway. Whether the row fits is still
/// decided by the child's natural width.
class AdaptiveFlex extends ParentDataWidget<AdaptiveStackParentData> {
  const AdaptiveFlex({super.key, this.flex = 1, required super.child})
    : assert(flex > 0);

  /// Weight of this child's share of the free room. Default 1.
  final double flex;

  @override
  void applyParentData(RenderObject renderObject) {
    final data = renderObject.parentData! as AdaptiveStackParentData;
    if (data.flex == flex) return;
    data.flex = flex;
    renderObject.parent?.markNeedsLayout();
  }

  @override
  Type get debugTypicalAncestorWidgetClass => AdaptiveStack;
}

/// The render object behind [AdaptiveStack].
class RenderAdaptiveStack extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, AdaptiveStackParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, AdaptiveStackParentData> {
  RenderAdaptiveStack({
    this._breakpoint,
    this._gap = 12,
    this._align = AdaptiveAlign.center,
    this._justify = AdaptiveJustify.start,
    this.onAxisChange,
    this._textDirection = TextDirection.ltr,
    this.reduceMotion = false,
  });

  double? _breakpoint;
  double _gap;
  AdaptiveAlign _align;
  AdaptiveJustify _justify;
  TextDirection _textDirection;

  /// Called after a layout that changed the axis.
  ValueChanged<Axis>? onAxisChange;

  /// Skips the FLIP flight (reduced motion).
  bool reduceMotion;

  Axis? _axis;

  /// The axis of the latest layout (horizontal before the first).
  Axis get axis => _axis ?? Axis.horizontal;

  set breakpoint(double? value) {
    if (value == _breakpoint) return;
    _breakpoint = value;
    markNeedsLayout();
  }

  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  set align(AdaptiveAlign value) {
    if (value == _align) return;
    _align = value;
    markNeedsLayout();
  }

  set justify(AdaptiveJustify value) {
    if (value == _justify) return;
    _justify = value;
    markNeedsLayout();
  }

  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! AdaptiveStackParentData) {
      child.parentData = AdaptiveStackParentData();
    }
  }

  @override
  void detach() {
    _eachChild((data) {
      data._dx?.stop();
      data._dy?.stop();
    });
    super.detach();
  }

  void _eachChild(void Function(AdaptiveStackParentData data) visit) {
    var child = firstChild;
    while (child != null) {
      final data = child.parentData! as AdaptiveStackParentData;
      visit(data);
      child = data.nextSibling;
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

  double get _gaps => _gap * math.max(0, childCount - 1);

  @override
  double computeMinIntrinsicWidth(double height) {
    var widest = 0.0;
    for (final child in _children) {
      widest = math.max(widest, child.getMinIntrinsicWidth(double.infinity));
    }
    return widest;
  }

  @override
  double computeMaxIntrinsicWidth(double height) {
    var sum = _gaps;
    for (final child in _children) {
      sum += child.getMaxIntrinsicWidth(double.infinity);
    }
    return sum;
  }

  @override
  double computeMinIntrinsicHeight(double width) =>
      computeMaxIntrinsicHeight(width);

  @override
  double computeMaxIntrinsicHeight(double width) {
    var sum = _gaps;
    for (final child in _children) {
      sum += child.getMaxIntrinsicHeight(width);
    }
    return sum;
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      _layout(constraints, dry: true);

  @override
  void performLayout() {
    final before = <RenderBox, Offset>{};
    final previous = _axis;
    for (final child in _children) {
      final data = child.parentData! as AdaptiveStackParentData;
      if (child.hasSize) before[child] = data.offset + data._shift;
    }
    size = _layout(constraints, dry: false);
    final axis = _axis!;
    // The web stack starts horizontal, so a first vertical layout reports a change too.
    if ((previous ?? Axis.horizontal) != axis) {
      final callback = onAxisChange;
      if (callback != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => callback(axis));
      }
    }
    if (previous == null || previous == axis) return;
    // FLIP: each child flies from where it was drawn to its new place (snappy, keeps its speed).
    for (final MapEntry(key: child, value: from) in before.entries) {
      final data = child.parentData! as AdaptiveStackParentData;
      final delta = from - data.offset;
      if (reduceMotion || (delta.dx.abs() < 0.5 && delta.dy.abs() < 0.5)) {
        data._dx?.set(0);
        data._dy?.set(0);
        continue;
      }
      MotionValue value(MotionValue? existing, double start) {
        final v =
            existing ??
            (MotionValue(0, 0.5)..subscribe((_) => markNeedsPaint()));
        final speed = v.velocity;
        v
          ..set(start)
          ..animateTo(0, spring: Springs.snappy, velocity: speed);
        return v;
      }

      data._dx = value(data._dx, delta.dx);
      data._dy = value(data._dy, delta.dy);
    }
  }

  Size _layout(BoxConstraints constraints, {required bool dry}) {
    final children = _children;
    final available = constraints.maxWidth;
    final natural = [
      for (final child in children) child.getMaxIntrinsicWidth(double.infinity),
    ];
    final bool vertical;
    final breakpoint = _breakpoint;
    if (breakpoint == null) {
      final row = natural.fold(_gaps, (a, b) => a + b);
      vertical = available.isFinite && row > available + 0.5;
    } else {
      vertical = available.isFinite && available < breakpoint;
    }
    if (!dry) {
      _axis = vertical ? Axis.vertical : Axis.horizontal;
    }
    Size measure(RenderBox child, BoxConstraints c) => dry
        ? child.getDryLayout(c)
        : (child..layout(c, parentUsesSize: true)).size;

    if (vertical) {
      // A column: every child takes the full width (align-items: stretch).
      final width = available;
      var y = 0.0;
      for (final child in children) {
        final s = measure(child, BoxConstraints.tightFor(width: width));
        if (!dry) {
          (child.parentData! as AdaptiveStackParentData).offset = Offset(0, y);
        }
        y += s.height + _gap;
      }
      final height = children.isEmpty ? 0.0 : y - _gap;
      return constraints.constrain(Size(width, height));
    }

    // A row. Children keep their natural width and shrink in proportion when it is too narrow
    // (flex-shrink: 1 with min-width: 0); AdaptiveFlex children start at 0 and share what the
    // others leave (flex: 1 1 0%).
    final flexes = [
      for (final child in children)
        (child.parentData! as AdaptiveStackParentData).flex,
    ];
    final totalFlex = flexes.fold(0.0, (a, b) => a + b);
    var sum = 0.0;
    for (var i = 0; i < children.length; i++) {
      if (flexes[i] == 0) sum += natural[i];
    }
    final room = available.isFinite ? math.max(0.0, available - _gaps) : sum;
    final shrink = sum > room && sum > 0 ? room / sum : 1.0;
    final flexRoom = math.max(0.0, room - sum * shrink);
    final widths = <double>[];
    final heights = <double>[];
    for (var i = 0; i < children.length; i++) {
      final c = flexes[i] > 0
          ? BoxConstraints.tightFor(
              width: available.isFinite
                  ? flexRoom * flexes[i] / totalFlex
                  : natural[i],
            )
          : shrink < 1
          ? BoxConstraints.tightFor(width: natural[i] * shrink)
          : BoxConstraints(
              maxWidth: available.isFinite ? available : double.infinity,
            );
      final s = measure(children[i], c);
      widths.add(s.width);
      heights.add(s.height);
    }
    var lineHeight = heights.fold(0.0, math.max);
    lineHeight = math.max(lineHeight, constraints.minHeight);
    if (_align == AdaptiveAlign.stretch) {
      for (var i = 0; i < children.length; i++) {
        if (heights[i] == lineHeight) continue;
        measure(
          children[i],
          BoxConstraints.tightFor(width: widths[i], height: lineHeight),
        );
        heights[i] = lineHeight;
      }
    }
    final used = widths.fold(0.0, (a, b) => a + b) + _gaps;
    final width = available.isFinite ? available : used;
    final free = math.max(0.0, width - used);
    var lead = 0.0, between = _gap;
    switch (_justify) {
      case AdaptiveJustify.start:
        break;
      case AdaptiveJustify.center:
        lead = free / 2;
      case AdaptiveJustify.end:
        lead = free;
      case AdaptiveJustify.between:
        if (children.length > 1) between += free / (children.length - 1);
    }
    if (!dry) {
      final rtl = _textDirection == TextDirection.rtl;
      var x = lead;
      for (var i = 0; i < children.length; i++) {
        final y = switch (_align) {
          AdaptiveAlign.start || AdaptiveAlign.stretch => 0.0,
          AdaptiveAlign.center => (lineHeight - heights[i]) / 2,
          AdaptiveAlign.end => lineHeight - heights[i],
        };
        final left = rtl ? width - x - widths[i] : x;
        (children[i].parentData! as AdaptiveStackParentData).offset = Offset(
          left,
          y,
        );
        x += widths[i] + between;
      }
    }
    return constraints.constrain(Size(width, lineHeight));
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    var child = firstChild;
    while (child != null) {
      final data = child.parentData! as AdaptiveStackParentData;
      context.paintChild(child, offset + data.offset + data._shift);
      child = data.nextSibling;
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    var child = lastChild;
    while (child != null) {
      final data = child.parentData! as AdaptiveStackParentData;
      final at = data.offset + data._shift;
      final hit = result.addWithPaintOffset(
        offset: at,
        position: position,
        hitTest: (result, transformed) =>
            child!.hitTest(result, position: transformed),
      );
      if (hit) return true;
      child = data.previousSibling;
    }
    return false;
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    final data = child.parentData! as AdaptiveStackParentData;
    final at = data.offset + data._shift;
    transform.translateByDouble(at.dx, at.dy, 0, 1);
  }
}

/// Shows the first child that fits the available width, like SwiftUI's ViewThatFits: “Call
/// customer · Send SMS · Copy number”, else icons only, else one menu button. Every option is
/// measured at its natural (max intrinsic) width; the shown one swaps with a short fade. Only the
/// shown option is laid out, painted, hit and announced. The twin of `ViewThatFits` in
/// `@feeef.dev/ui/containers/adaptive`.
class ViewThatFits extends MultiChildRenderObjectWidget {
  const ViewThatFits({super.key, required super.children});

  @override
  RenderViewThatFits createRenderObject(BuildContext context) =>
      RenderViewThatFits(
        textDirection: Directionality.maybeOf(context) ?? TextDirection.ltr,
        reduceMotion: MediaQuery.maybeDisableAnimationsOf(context) ?? false,
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderViewThatFits renderObject,
  ) => renderObject
    ..textDirection = Directionality.maybeOf(context) ?? TextDirection.ltr
    ..reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

/// Parent data of a [ViewThatFits] option.
class ViewThatFitsParentData extends ContainerBoxParentData<RenderBox> {}

/// The render object behind [ViewThatFits].
class RenderViewThatFits extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, ViewThatFitsParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, ViewThatFitsParentData> {
  RenderViewThatFits({
    this._textDirection = TextDirection.ltr,
    this.reduceMotion = false,
  });

  TextDirection _textDirection;

  /// Skips the swap fade (reduced motion).
  bool reduceMotion;

  int? _index;

  /// Index of the shown option after the latest layout.
  int get shownIndex => _index ?? 0;

  late final _fade = MotionValue(1, 0.01)..subscribe((_) => markNeedsPaint());
  final _opacity = LayerHandle<OpacityLayer>();

  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! ViewThatFitsParentData) {
      child.parentData = ViewThatFitsParentData();
    }
  }

  @override
  void detach() {
    _fade.set(1);
    super.detach();
  }

  @override
  void dispose() {
    _opacity.layer = null;
    super.dispose();
  }

  RenderBox? _childAt(int index) {
    var child = firstChild;
    for (var i = 0; child != null && i < index; i++) {
      child = childAfter(child);
    }
    return child;
  }

  int _pick(double available) {
    final widths = <double>[];
    var child = firstChild;
    while (child != null) {
      widths.add(child.getMaxIntrinsicWidth(double.infinity));
      child = childAfter(child);
    }
    return math.max(0, pickFitting(widths, available));
  }

  RenderBox? get _shown => _childAt(shownIndex);

  @override
  double computeMinIntrinsicWidth(double height) {
    final last = lastChild;
    return last?.getMinIntrinsicWidth(height) ?? 0;
  }

  @override
  double computeMaxIntrinsicWidth(double height) =>
      firstChild?.getMaxIntrinsicWidth(height) ?? 0;

  @override
  double computeMinIntrinsicHeight(double width) =>
      _childAt(_pick(width))?.getMinIntrinsicHeight(width) ?? 0;

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _childAt(_pick(width))?.getMaxIntrinsicHeight(width) ?? 0;

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final child = _childAt(_pick(constraints.maxWidth));
    final s = child?.getDryLayout(constraints.loosen()) ?? Size.zero;
    return constraints.constrain(
      Size(
        constraints.maxWidth.isFinite ? constraints.maxWidth : s.width,
        s.height,
      ),
    );
  }

  @override
  void performLayout() {
    final next = _pick(constraints.maxWidth);
    final previous = _index;
    _index = next;
    if (previous != null && previous != next && !reduceMotion) {
      _fade
        ..set(0)
        ..animateTo(1, spring: const Spring(duration: 0.2, bounce: 0));
    }
    final child = _shown;
    final s = child == null
        ? Size.zero
        : (child..layout(constraints.loosen(), parentUsesSize: true)).size;
    final width = constraints.maxWidth.isFinite
        ? constraints.maxWidth
        : s.width;
    size = constraints.constrain(Size(width, s.height));
    if (child != null) {
      (child.parentData! as ViewThatFitsParentData).offset = Offset(
        _textDirection == TextDirection.rtl ? size.width - s.width : 0,
        0,
      );
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final child = _shown;
    if (child == null) return;
    final shift = (child.parentData! as ViewThatFitsParentData).offset;
    final alpha = (_fade.get().clamp(0.0, 1.0) * 255).round();
    if (alpha >= 255) {
      _opacity.layer = null;
      context.paintChild(child, offset + shift);
      return;
    }
    _opacity.layer = context.pushOpacity(
      offset,
      alpha,
      (context, origin) => context.paintChild(child, origin + shift),
      oldLayer: _opacity.layer,
    );
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    final child = _shown;
    if (child == null) return false;
    final data = child.parentData! as ViewThatFitsParentData;
    return result.addWithPaintOffset(
      offset: data.offset,
      position: position,
      hitTest: (result, transformed) =>
          child.hitTest(result, position: transformed),
    );
  }

  @override
  void visitChildrenForSemantics(RenderObjectVisitor visitor) {
    final child = _shown;
    if (child != null) visitor(child);
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    final data = child.parentData! as ViewThatFitsParentData;
    transform.translateByDouble(data.offset.dx, data.offset.dy, 0, 1);
  }
}
