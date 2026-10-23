// Render-object setters own their fields; the constructor fills them like any other value.
// ignore_for_file: prefer_initializing_formals
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../theme/tokens.dart' show MotionTokens;
import '../theme.dart';

/// Whether the composer leaves its one-line layout, the measurement in the web kit's
/// `useComposerLayout`: the field gets the row's width minus every slot and gap and its own
/// inline padding ([available]); it expands when that is narrower than eight `M`s ([minimum]),
/// when the prompt has a line break, or when the prompt is wider than the room.
bool composerExpands({
  required String prompt,
  required double available,
  required double textWidth,
  required double minimum,
}) =>
    available < minimum ||
    prompt.contains('\n') ||
    (prompt.isNotEmpty && textWidth > math.max(0, available) + 0.5);

/// Room the field's text gets in the one-line layout: the row width minus the slots, one gap per
/// slot and the field's inline padding.
double composerAvailableWidth({
  required double rowWidth,
  required List<double> slotWidths,
  required double gap,
  required double fieldPadding,
}) =>
    rowWidth -
    slotWidths.fold(0.0, (sum, width) => sum + width) -
    slotWidths.length * gap -
    fieldPadding;

/// Where a slot sits on its row: before the field (or the free space), or after it.
enum ComposerSlotSide { start, end }

/// A control area of the composer grid (`.lab-pc-slot`): its place in the one-line layout and on
/// the tools row of the expanded layout.
class ComposerSlot extends ParentDataWidget<_ComposerParentData> {
  const ComposerSlot({
    super.key,
    this.compact = ComposerSlotSide.end,
    this.expanded = ComposerSlotSide.end,
    this.fill = false,
    required super.child,
  });

  /// Side in the one-line layout (`tools field send`).
  final ComposerSlotSide compact;

  /// Side on the expanded tools row (`add ladder settings . wand send`).
  final ComposerSlotSide expanded;

  /// On the expanded row the slot takes the free space (`minmax(0, 1fr)`) instead of hugging its
  /// content, like the prompt composer's tools.
  final bool fill;

  @override
  void applyParentData(RenderObject renderObject) {
    final data = renderObject.parentData! as _ComposerParentData;
    if (data.compact == compact &&
        data.expanded == expanded &&
        data.fill == fill &&
        data.slot) {
      return;
    }
    data
      ..slot = true
      ..compact = compact
      ..expanded = expanded
      ..fill = fill;
    renderObject.parent?.markNeedsLayout();
  }

  @override
  Type get debugTypicalAncestorWidgetClass => ComposerLayout;
}

class _ComposerParentData extends ContainerBoxParentData<RenderBox> {
  bool slot = false;
  ComposerSlotSide compact = ComposerSlotSide.end;
  ComposerSlotSide expanded = ComposerSlotSide.end;
  bool fill = false;

  /// Where the slot was before the last change, for its entrance (opacity .5 → 1, 4px rise).
  bool entering = false;
}

/// The composer's grid (`.lab-pc-layout`), measured like `useComposerLayout`: one row
/// (`[start slots] field [end slots]`) while the prompt fits, else the field on its own row above
/// the tools. The first child that is not a [ComposerSlot] is the field. Shrinking eases the
/// height over 220ms and moved slots fade up into their new row; reduced motion skips both.
class ComposerLayout extends MultiChildRenderObjectWidget {
  const ComposerLayout({
    super.key,
    required this.prompt,
    required this.textStyle,
    required this.fieldPadding,
    required this.fieldMinHeight,
    required this.gap,
    this.onExpandedChange,
    required super.children,
  });

  /// The prompt, measured in [textStyle] to decide the layout.
  final String prompt;
  final TextStyle textStyle;

  /// The field's inline padding, both sides together.
  final double fieldPadding;

  /// The field's one-line height (its `min-height`): taller in the one-row layout means the text
  /// wrapped, so the layout expands.
  final double fieldMinHeight;

  /// Column and row gap (`--lab-space-1`).
  final double gap;

  /// Called after layout when the layout switches between one row and two.
  final ValueChanged<bool>? onExpandedChange;

  @override
  RenderComposerLayout createRenderObject(BuildContext context) =>
      RenderComposerLayout(
        prompt: prompt,
        textStyle: textStyle,
        fieldPadding: fieldPadding,
        fieldMinHeight: fieldMinHeight,
        gap: gap,
        textDirection: Directionality.of(context),
        textScaler:
            MediaQuery.maybeTextScalerOf(context) ?? TextScaler.noScaling,
        reducedMotion: reducedMotionOf(context),
        onExpandedChange: onExpandedChange,
      );

  @override
  void updateRenderObject(
    BuildContext context,
    RenderComposerLayout renderObject,
  ) => renderObject
    ..prompt = prompt
    ..textStyle = textStyle
    ..fieldPadding = fieldPadding
    ..fieldMinHeight = fieldMinHeight
    ..gap = gap
    ..textDirection = Directionality.of(context)
    ..textScaler = MediaQuery.maybeTextScalerOf(context) ?? TextScaler.noScaling
    ..reducedMotion = reducedMotionOf(context)
    ..onExpandedChange = onExpandedChange;
}

/// The render object behind [ComposerLayout].
class RenderComposerLayout extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _ComposerParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _ComposerParentData> {
  RenderComposerLayout({
    required String prompt,
    required TextStyle textStyle,
    required double fieldPadding,
    required double fieldMinHeight,
    required double gap,
    required TextDirection textDirection,
    required TextScaler textScaler,
    required bool reducedMotion,
    this.onExpandedChange,
  }) : _prompt = prompt,
       _textStyle = textStyle,
       _fieldPadding = fieldPadding,
       _fieldMinHeight = fieldMinHeight,
       _gap = gap,
       _textDirection = textDirection,
       _textScaler = textScaler,
       _reducedMotion = reducedMotion;

  String _prompt;
  set prompt(String value) {
    if (value == _prompt) return;
    _prompt = value;
    markNeedsLayout();
  }

  TextStyle _textStyle;
  set textStyle(TextStyle value) {
    if (value == _textStyle) return;
    _textStyle = value;
    markNeedsLayout();
  }

  double _fieldPadding;
  set fieldPadding(double value) {
    if (value == _fieldPadding) return;
    _fieldPadding = value;
    markNeedsLayout();
  }

  double _fieldMinHeight;
  set fieldMinHeight(double value) {
    if (value == _fieldMinHeight) return;
    _fieldMinHeight = value;
    markNeedsLayout();
  }

  double _gap;
  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  TextScaler _textScaler;
  set textScaler(TextScaler value) {
    if (value == _textScaler) return;
    _textScaler = value;
    markNeedsLayout();
  }

  bool _reducedMotion;
  set reducedMotion(bool value) {
    _reducedMotion = value;
    if (value) _finish();
  }

  ValueChanged<bool>? onExpandedChange;

  /// Whether the last layout put the field on its own row.
  bool get expanded => _expanded;
  bool _expanded = false;
  bool? _reportedExpanded;

  // Transition state: the height before a shrink, and the 220ms clock.
  double? _width;
  double? _fromHeight;
  double _toHeight = 0;
  Map<RenderBox, Offset> _previous = {};
  Ticker? _ticker;
  double _t = 1;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _ComposerParentData) {
      child.parentData = _ComposerParentData();
    }
  }

  @override
  void detach() {
    _ticker?.dispose();
    _ticker = null;
    super.detach();
  }

  void _finish() {
    _ticker?.stop();
    if (_t < 1) {
      _t = 1;
      _fromHeight = null;
      for (final child in _children()) {
        (child.parentData! as _ComposerParentData).entering = false;
      }
      markNeedsLayout();
    }
  }

  Iterable<RenderBox> _children() sync* {
    var child = firstChild;
    while (child != null) {
      yield child;
      child = (child.parentData! as _ComposerParentData).nextSibling;
    }
  }

  RenderBox? get _field {
    for (final child in _children()) {
      if (!(child.parentData! as _ComposerParentData).slot) return child;
    }
    return null;
  }

  double _measure(String text) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: _textStyle),
      textDirection: _textDirection,
      textScaler: _textScaler,
      maxLines: 1,
    )..layout();
    final width = painter.maxIntrinsicWidth;
    painter.dispose();
    return width;
  }

  @override
  double computeMinIntrinsicWidth(double height) => 0;
  @override
  double computeMaxIntrinsicWidth(double height) => 0;
  @override
  double computeMinIntrinsicHeight(double width) => 0;
  @override
  double computeMaxIntrinsicHeight(double width) => 0;

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      constraints.constrain(Size(constraints.maxWidth, 40));

  @override
  void performLayout() {
    final width = constraints.maxWidth.isFinite
        ? constraints.maxWidth
        : constraints.minWidth;
    final field = _field;
    final slots = [
      for (final child in _children())
        if (child != field) child,
    ];
    final loose = BoxConstraints(maxWidth: math.max(0, width));
    final slotSizes = <RenderBox, Size>{};
    for (final slot in slots) {
      slot.layout(loose, parentUsesSize: true);
      slotSizes[slot] = slot.size;
    }
    final available = composerAvailableWidth(
      rowWidth: width,
      slotWidths: [for (final slot in slots) slotSizes[slot]!.width],
      gap: _gap,
      fieldPadding: _fieldPadding,
    );
    var expanded = composerExpands(
      prompt: _prompt,
      available: available,
      textWidth: _prompt.isEmpty ? 0 : _measure(_prompt),
      minimum: _measure('MMMMMMMM'),
    );
    final rtl = _textDirection == TextDirection.rtl;
    double place(double x, double w) => rtl ? width - x - w : x;
    final positions = <RenderBox, Offset>{};
    double height;

    if (!expanded && field != null) {
      final fieldWidth = math.max(0.0, available + _fieldPadding);
      field.layout(
        BoxConstraints.tightFor(width: fieldWidth),
        parentUsesSize: true,
      );
      // The browser's wrapping is authoritative when the measurements disagree.
      final single = field.size.height;
      if (_prompt.isNotEmpty && single > _fieldMinHeight + 1) {
        expanded = true;
      } else {
        final start = [
          for (final s in slots)
            if (_data(s).compact == ComposerSlotSide.start) s,
        ];
        final end = [
          for (final s in slots)
            if (_data(s).compact == ComposerSlotSide.end) s,
        ];
        height = [
          single,
          for (final s in slots) slotSizes[s]!.height,
        ].reduce(math.max);
        var x = 0.0;
        for (final s in start) {
          final size = slotSizes[s]!;
          positions[s] = Offset(
            place(x, size.width),
            (height - size.height) / 2,
          );
          x += size.width + _gap;
        }
        positions[field] = Offset(place(x, fieldWidth), (height - single) / 2);
        x += fieldWidth + _gap;
        for (final s in end) {
          final size = slotSizes[s]!;
          positions[s] = Offset(
            place(x, size.width),
            (height - size.height) / 2,
          );
          x += size.width + _gap;
        }
        return _commit(width, height, false, positions);
      }
    }

    // Expanded: the field across the top, the tools row below it.
    var top = 0.0;
    if (field != null) {
      field.layout(BoxConstraints.tightFor(width: width), parentUsesSize: true);
      positions[field] = Offset.zero;
      top = field.size.height + (slots.isEmpty ? 0 : _gap);
    }
    final start = [
      for (final s in slots)
        if (_data(s).expanded == ComposerSlotSide.start) s,
    ];
    final end = [
      for (final s in slots)
        if (_data(s).expanded == ComposerSlotSide.end) s,
    ];
    final filler = slots.where((s) => _data(s).fill).firstOrNull;
    // Columns: every slot, plus the free column when no slot takes it.
    final columns = slots.length + (filler == null ? 1 : 0);
    var fixed = 0.0;
    for (final s in slots) {
      if (s != filler) fixed += slotSizes[s]!.width;
    }
    final free = math.max(0.0, width - fixed - math.max(0, columns - 1) * _gap);
    if (filler != null) {
      filler.layout(BoxConstraints.tightFor(width: free), parentUsesSize: true);
      slotSizes[filler] = filler.size;
    }
    final row = slots.isEmpty
        ? 0.0
        : slots.map((s) => slotSizes[s]!.height).reduce(math.max);
    var x = 0.0;
    void put(RenderBox s) {
      final size = slotSizes[s]!;
      positions[s] = Offset(
        place(x, size.width),
        top + (row - size.height) / 2,
      );
      x += size.width + _gap;
    }

    for (final s in start) {
      put(s);
    }
    if (filler == null) x += free + _gap;
    for (final s in end) {
      put(s);
    }
    height = top + row;
    _commit(width, height, true, positions);
  }

  _ComposerParentData _data(RenderBox child) =>
      child.parentData! as _ComposerParentData;

  void _commit(
    double width,
    double height,
    bool expanded,
    Map<RenderBox, Offset> positions,
  ) {
    final previous = _previous;
    final sameWidth = _width != null && (_width! - width).abs() <= 0.5;
    final animate = !_reducedMotion && sameWidth && previous.isNotEmpty;
    var started = false;
    if (animate) {
      final before = _fromHeight != null && _t < 1
          ? _fromHeight! + (_toHeight - _fromHeight!) * _ease(_t)
          : (hasSize ? size.height : height);
      if (before > height + 0.5) {
        _fromHeight = before;
        started = true;
      } else if (!(_t < 1)) {
        _fromHeight = null;
      }
      final field = _field;
      for (final entry in positions.entries) {
        if (entry.key == field) continue;
        final from = previous[entry.key];
        final moved =
            from != null &&
            ((from.dx - entry.value.dx).abs() > 0.5 ||
                (from.dy - entry.value.dy).abs() > 0.5);
        if (moved) {
          _data(entry.key).entering = true;
          started = true;
        }
      }
    } else if (!sameWidth || _reducedMotion) {
      _fromHeight = null;
      for (final child in positions.keys) {
        _data(child).entering = false;
      }
    }
    for (final entry in positions.entries) {
      _data(entry.key).offset = entry.value;
    }
    _previous = positions;
    _width = width;
    _toHeight = height;
    if (started) {
      _t = 0;
      _ticker ??= Ticker(_tick, debugLabel: 'ComposerLayout');
      _ticker!.stop();
      // Start after this frame: layout can't notify listeners.
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (attached && _t == 0 && !(_ticker?.isActive ?? true)) {
          _ticker?.start();
        }
      });
    }
    final shown = _fromHeight != null && _t < 1
        ? _fromHeight! + (height - _fromHeight!) * _ease(_t)
        : height;
    _expanded = expanded;
    size = constraints.constrain(Size(width, shown));
    if (_reportedExpanded != expanded) {
      _reportedExpanded = expanded;
      final callback = onExpandedChange;
      if (callback != null) {
        SchedulerBinding.instance.addPostFrameCallback(
          (_) => callback(expanded),
        );
      }
    }
  }

  static double _ease(double t) => MotionTokens.ease.transform(t.clamp(0, 1));

  void _tick(Duration elapsed) {
    _t = math.min(1, elapsed.inMicroseconds / 220000);
    if (_t >= 1) {
      _ticker?.stop();
      _fromHeight = null;
      for (final child in _children()) {
        _data(child).entering = false;
      }
    }
    if (_fromHeight != null || _t >= 1) markNeedsLayout();
    markNeedsPaint();
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final eased = _ease(_t);
    for (final child in _children()) {
      final data = _data(child);
      if (data.entering && _t < 1) {
        final alpha = (0.5 + 0.5 * eased).clamp(0.0, 1.0);
        context.pushOpacity(
          offset + data.offset + Offset(0, 4 * (1 - eased)),
          (alpha * 255).round(),
          (context, origin) => context.paintChild(child, origin),
        );
      } else {
        context.paintChild(child, offset + data.offset);
      }
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
