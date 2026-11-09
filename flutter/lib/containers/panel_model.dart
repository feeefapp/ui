import 'dart:math' as math;

import 'package:flutter/foundation.dart';

/// Constraints for a desktop panel column. Logical pixels, not window fractions.
@immutable
class PanelSizing {
  const PanelSizing({
    this.minWidth = 280,
    this.preferredWidth = 420,
    this.maxWidth = double.infinity,
  }) : assert(minWidth > 0 && minWidth < double.infinity),
       assert(preferredWidth >= minWidth && preferredWidth < double.infinity),
       assert(maxWidth >= preferredWidth);

  final double minWidth;
  final double preferredWidth;
  final double maxWidth;
}

/// Pure local-container allocation. Index zero is the root, then the panel stack.
@immutable
class PanelLayout {
  const PanelLayout({
    required this.compact,
    required this.visibleFrom,
    required this.widths,
  });

  final bool compact;
  final int visibleFrom;
  final List<double> widths;
}

/// Keeps as many of the newest columns as fit their minimum widths. Older columns
/// remain mounted offstage. A single column below [breakpoint] uses sheets instead.
/// Shell gaps include both outside edges and every column boundary.
PanelLayout panelLayout({
  required double width,
  required List<PanelSizing> panels,
  double rootMinWidth = 320,
  double gap = 8,
  double breakpoint = 720,
}) {
  assert(width.isFinite && width >= 0);
  assert(rootMinWidth > 0 && rootMinWidth.isFinite);
  assert(gap >= 0 && gap.isFinite);
  assert(breakpoint > 0 && breakpoint.isFinite);
  final all = [
    PanelSizing(minWidth: rootMinWidth, preferredWidth: rootMinWidth),
    ...panels,
  ];
  var first = 0;
  double minimum(int start) =>
      all.skip(start).fold(0.0, (sum, s) => sum + s.minWidth) +
      gap * (all.length - start + 1);
  while (first < all.length - 1 && minimum(first) > width) {
    first++;
  }
  final compact =
      width < breakpoint || (all.length > 1 && first == all.length - 1);
  if (compact) {
    return PanelLayout(compact: true, visibleFrom: 0, widths: [width]);
  }
  final visible = all.sublist(first);
  final room = math.max(0.0, width - gap * (visible.length + 1));
  final widths = visible.map((s) => s.minWidth).toList();
  var extra = room - widths.fold(0.0, (a, b) => a + b);
  // Details get their preferred readable widths; the oldest visible column owns
  // the flexible remainder (usually the root/list).
  for (var i = visible.length - 1; i >= 0 && extra > 0; i--) {
    final add = math.min(extra, visible[i].preferredWidth - widths[i]);
    widths[i] += add;
    extra -= add;
  }
  for (var i = 0; i < visible.length && extra > 0; i++) {
    final add = math.min(extra, visible[i].maxWidth - widths[i]);
    widths[i] += add;
    extra -= add;
  }
  if (visible.length == 1) widths[0] = room;
  return PanelLayout(
    compact: false,
    visibleFrom: first,
    widths: List.unmodifiable(widths),
  );
}

/// Removes [id] and its descendants. Unknown IDs are deliberately a no-op.
List<T> panelClose<T>(List<T> panels, Object id, Object Function(T) idOf) {
  final index = panels.indexWhere((entry) => idOf(entry) == id);
  return List.unmodifiable(index < 0 ? panels : panels.take(index));
}

/// Pushes after [after], replacing that entry's descendants. Null means root.
/// Reusing an existing ID is rejected rather than silently aliasing live state.
List<T> panelPush<T>(
  List<T> panels,
  T entry,
  Object Function(T) idOf, {
  Object? after,
}) {
  if (panels.any((value) => idOf(value) == idOf(entry))) {
    throw ArgumentError.value(idOf(entry), 'entry', 'Panel IDs must be unique');
  }
  final index = after == null
      ? -1
      : panels.indexWhere((value) => idOf(value) == after);
  if (after != null && index < 0) {
    throw ArgumentError.value(after, 'after', 'Unknown panel');
  }
  return List.unmodifiable([...panels.take(index + 1), entry]);
}
