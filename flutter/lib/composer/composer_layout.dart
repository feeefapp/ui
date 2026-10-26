// Render-object setters own their fields; the constructor fills them like any other value.
// ignore_for_file: prefer_initializing_formals
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import 'composer_model.dart';

/// Marks a child of [ComposerCapsuleLayout] with its place (`data-composer-slot`).
class ComposerSlot extends ParentDataWidget<_SlotData> {
  const ComposerSlot({super.key, required this.name, required super.child});

  final ComposerSlotName name;

  @override
  void applyParentData(RenderObject renderObject) {
    final data = renderObject.parentData! as _SlotData;
    if (data.name == name) return;
    data.name = name;
    renderObject.parent?.markNeedsLayout();
  }

  @override
  Type get debugTypicalAncestorWidgetClass => ComposerCapsuleLayout;
}

class _SlotData extends ContainerBoxParentData<RenderBox> {
  ComposerSlotName? name;

  /// Opacity this frame (the tools row fades with the second row).
  double opacity = 1;

  /// Clip height this frame (the field's lines arrive with the capsule's height).
  double? clipHeight;
}

/// The capsule's grid (`.lab-composer-grid` in its padding), the twin of the web kit's grid and
/// `useComposerMotion`. Calm: attachments above `[field] [actions] [send]` on one row, the tools
/// waiting hidden at the bottom. [expanded]: attachments, the field on its own row, then
/// `[tools] … [actions] [send]`. Rows align to their bottom edge, [rowGap] apart, [inset] from the
/// sides and bottom (and the top without attachments); attachments reach the edges. Every layout
/// change (rows, lines, attachments) springs on one `Springs.snappy` progress, mixed in the
/// capsule's own pixels ([composerFrame]); width changes jump. Reduced motion jumps.
class ComposerCapsuleLayout extends MultiChildRenderObjectWidget {
  const ComposerCapsuleLayout({
    super.key,
    required this.expanded,
    this.inset = 0,
    this.rowGap = 0,
    required super.children,
  });

  /// Shows the second row.
  final bool expanded;

  /// Space between the rows and the capsule's edge (its padding).
  final double inset;

  /// Space between the rows.
  final double rowGap;

  @override
  RenderComposerCapsule createRenderObject(BuildContext context) =>
      RenderComposerCapsule(
        expanded: expanded,
        inset: inset,
        rowGap: rowGap,
        textDirection: Directionality.of(context),
        reducedMotion: reducedMotionOf(context),
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderComposerCapsule renderObject,
  ) => renderObject
    ..expanded = expanded
    ..inset = inset
    ..rowGap = rowGap
    ..textDirection = Directionality.of(context)
    ..reducedMotion = reducedMotionOf(context);
}

class RenderComposerCapsule extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _SlotData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _SlotData> {
  RenderComposerCapsule({
    required bool expanded,
    double inset = 0,
    double rowGap = 0,
    required TextDirection textDirection,
    required this.reducedMotion,
  }) : _expanded = expanded,
       _inset = inset,
       _rowGap = rowGap,
       _textDirection = textDirection;

  bool _expanded;
  set expanded(bool value) {
    if (value == _expanded) return;
    _expanded = value;
    markNeedsLayout();
  }

  double _inset;
  set inset(double value) {
    if (value == _inset) return;
    _inset = value;
    markNeedsLayout();
  }

  double _rowGap;
  set rowGap(double value) {
    if (value == _rowGap) return;
    _rowGap = value;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  bool reducedMotion;

  ComposerLayoutSnapshot? _rest;
  ComposerLayoutSnapshot? _from, _to;
  MotionValue? _progress;
  void Function()? _unsubscribe;
  double? _width;
  bool _clip = false;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SlotData) child.parentData = _SlotData();
  }

  RenderBox? _slot(ComposerSlotName name) {
    var child = firstChild;
    while (child != null) {
      final data = child.parentData! as _SlotData;
      if (data.name == name) return child;
      child = data.nextSibling;
    }
    return null;
  }

  void _stop() {
    _unsubscribe?.call();
    _unsubscribe = null;
    _progress?.stop();
    _progress = null;
    _from = _to = null;
  }

  @override
  void detach() {
    _stop();
    super.detach();
  }

  /// Lays the children out where they belong and returns that layout.
  ComposerLayoutSnapshot _layoutTarget(double width) {
    Size sizeOf(RenderBox? box, BoxConstraints c) {
      if (box == null) return Size.zero;
      box.layout(c, parentUsesSize: true);
      return box.size;
    }

    final p = _inset;
    final inner = math.max(0.0, width - 2 * p);
    final loose = BoxConstraints(maxWidth: inner);
    final attachments = _slot(ComposerSlotName.attachments);
    final field = _slot(ComposerSlotName.field);
    final tools = _slot(ComposerSlotName.tools);
    final actions = _slot(ComposerSlotName.actions);
    final send = _slot(ComposerSlotName.send);
    final sendSize = sizeOf(send, loose);
    final actionsSize = sizeOf(actions, loose);
    final trailing = sendSize.width + actionsSize.width;
    final attachmentsSize = sizeOf(
      attachments,
      BoxConstraints.tightFor(width: width),
    );
    // The first row starts under the attachments (a row gap below them), else at the inset.
    final top = attachments != null ? attachmentsSize.height + _rowGap : p;
    final expanded = _expanded && tools != null;
    final fieldSize = sizeOf(
      field,
      BoxConstraints.tightFor(
        width: math.max(0, expanded ? inner : inner - trailing),
      ),
    );
    final toolsSize = sizeOf(
      tools,
      BoxConstraints(maxWidth: math.max(0, inner - trailing)),
    );
    final slots = <ComposerSlotName, ComposerSlotBox>{};
    void place(
      ComposerSlotName name,
      RenderBox? box,
      double start,
      double y,
      double opacity,
    ) {
      if (box == null) return;
      final x = _textDirection == TextDirection.rtl
          ? width - start - box.size.width
          : start;
      slots[name] = (x: x, y: y, height: box.size.height, opacity: opacity);
    }

    if (attachments != null) {
      place(ComposerSlotName.attachments, attachments, 0, 0, 1);
    }
    final end = width - p;
    double rowTop, row;
    if (expanded) {
      place(ComposerSlotName.field, field, p, top, 1);
      rowTop = top + fieldSize.height + _rowGap;
      row = [
        toolsSize.height,
        actionsSize.height,
        sendSize.height,
      ].reduce(math.max);
      place(
        ComposerSlotName.tools,
        tools,
        p,
        rowTop + row - toolsSize.height,
        1,
      );
    } else {
      rowTop = top;
      row = [
        fieldSize.height,
        actionsSize.height,
        sendSize.height,
      ].reduce(math.max);
      place(
        ComposerSlotName.field,
        field,
        p,
        rowTop + row - fieldSize.height,
        1,
      );
      // The tools wait out of flow at the bottom, hidden, ready to fade in.
      place(
        ComposerSlotName.tools,
        tools,
        p,
        rowTop + row - toolsSize.height,
        0,
      );
    }
    place(
      ComposerSlotName.actions,
      actions,
      end - trailing,
      rowTop + row - actionsSize.height,
      1,
    );
    place(
      ComposerSlotName.send,
      send,
      end - sendSize.width,
      rowTop + row - sendSize.height,
      1,
    );
    return (height: rowTop + row + p, slots: slots);
  }

  void _apply(
    ComposerLayoutSnapshot target,
    ({double height, Map<ComposerSlotName, ComposerSlotFrame> slots})? frame,
  ) {
    var child = firstChild;
    while (child != null) {
      final data = child.parentData! as _SlotData;
      final box = target.slots[data.name];
      final f = frame?.slots[data.name];
      if (box == null) {
        data
          ..offset = Offset.zero
          ..opacity = 0
          ..clipHeight = null;
      } else {
        data
          ..offset = Offset(box.x + (f?.dx ?? 0), box.y + (f?.dy ?? 0))
          ..opacity = f?.opacity ?? box.opacity
          ..clipHeight = f != null && data.name == ComposerSlotName.field
              ? f.height
              : null;
      }
      child = data.nextSibling;
    }
  }

  @override
  void performLayout() {
    final width = constraints.maxWidth.isFinite
        ? constraints.maxWidth
        : constraints.minWidth;
    final target = _layoutTarget(width);
    final widthChanged = _width != null && (_width! - width).abs() > 0.5;
    _width = width;
    final running = _progress;
    if (running != null && _to != null && composerSameLayout(_to!, target)) {
      // Same destination (a keystroke that changed nothing): keep the spring and its speed.
      _to = target;
    } else {
      final from = running != null
          ? composerFrameSnapshot(_from!, _to!, running.get())
          : _rest;
      if (running != null) _stop();
      _rest = target;
      if (from != null &&
          !widthChanged &&
          !reducedMotion &&
          !composerSameLayout(from, target)) {
        final progress = MotionValue(0, 0.001);
        _from = from;
        _to = target;
        _progress = progress;
        _unsubscribe = progress.subscribe((_) => markNeedsLayout());
        progress.animateTo(1, spring: Springs.snappy, velocity: 0).then((
          arrived,
        ) {
          if (!arrived || _progress != progress) return;
          _stop();
          if (attached) markNeedsLayout();
        });
      }
    }
    final progress = _progress;
    if (progress != null && _from != null && _to != null) {
      final frame = composerFrame(_from!, _to!, progress.get());
      _apply(target, frame);
      _clip = true;
      size = constraints.constrain(Size(width, frame.height));
    } else {
      _apply(target, null);
      _clip = false;
      size = constraints.constrain(Size(width, target.height));
    }
  }

  @override
  double computeMinIntrinsicHeight(double width) =>
      computeMaxIntrinsicHeight(width);

  @override
  double computeMaxIntrinsicHeight(double width) {
    double h(ComposerSlotName name) =>
        _slot(name)?.getMaxIntrinsicHeight(width) ?? 0;
    final attachments = _slot(ComposerSlotName.attachments) != null;
    return (attachments ? h(ComposerSlotName.attachments) + _rowGap : _inset) +
        math.max(h(ComposerSlotName.field), h(ComposerSlotName.send)) +
        (_expanded ? _rowGap + h(ComposerSlotName.send) : 0) +
        _inset;
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      constraints.constrain(Size(constraints.maxWidth, _rest?.height ?? 0));

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    var child = lastChild;
    while (child != null) {
      final data = child.parentData! as _SlotData;
      if (data.opacity > 0.01) {
        final hit = result.addWithPaintOffset(
          offset: data.offset,
          position: position,
          hitTest: (result, transformed) =>
              child!.hitTest(result, position: transformed),
        );
        if (hit) return true;
      }
      child = data.previousSibling;
    }
    return false;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    void children(PaintingContext context, Offset offset) {
      var child = firstChild;
      while (child != null) {
        final data = child.parentData! as _SlotData;
        final at = offset + data.offset;
        final box = child;
        void draw(PaintingContext context, Offset at) {
          if (data.clipHeight != null) {
            context.pushClipRect(
              needsCompositing,
              at,
              Offset.zero & Size(box.size.width, data.clipHeight!),
              (context, offset) => context.paintChild(box, offset),
            );
          } else {
            context.paintChild(box, at);
          }
        }

        if (data.opacity >= 0.999) {
          draw(context, at);
        } else if (data.opacity > 0.01) {
          context.pushOpacity(at, (data.opacity * 255).round(), (
            context,
            offset,
          ) {
            draw(context, offset);
          });
        }
        child = data.nextSibling;
      }
    }

    if (_clip) {
      context.pushClipRect(
        needsCompositing,
        offset,
        Offset.zero & size,
        children,
      );
    } else {
      children(context, offset);
    }
  }
}
