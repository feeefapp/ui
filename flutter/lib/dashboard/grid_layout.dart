import 'dart:math' as math;

import 'package:flutter/foundation.dart';

/// Where one widget sits on a [DashboardGrid]: column [x] from the start edge, row [y] from the
/// top, [w] columns wide and [h] rows tall.
@immutable
class GridPlacement {
  const GridPlacement({
    required this.id,
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  final String id;
  final int x;
  final int y;
  final int w;
  final int h;

  int get right => x + w;
  int get bottom => y + h;

  bool overlaps(GridPlacement o) =>
      x < o.right && o.x < right && y < o.bottom && o.y < bottom;

  GridPlacement copyWith({int? x, int? y, int? w, int? h}) => GridPlacement(
    id: id,
    x: x ?? this.x,
    y: y ?? this.y,
    w: w ?? this.w,
    h: h ?? this.h,
  );

  Map<String, Object> toJson() => {'id': id, 'x': x, 'y': y, 'w': w, 'h': h};

  static GridPlacement? fromJson(Object? json) {
    if (json is! Map) return null;
    final id = json['id'];
    int? n(String k) => json[k] is int ? json[k] as int : null;
    final x = n('x'), y = n('y'), w = n('w'), h = n('h');
    if (id is! String || x == null || y == null || w == null || h == null) {
      return null;
    }
    return GridPlacement(id: id, x: x, y: y, w: w, h: h);
  }

  @override
  bool operator ==(Object other) =>
      other is GridPlacement &&
      other.id == id &&
      other.x == x &&
      other.y == y &&
      other.w == w &&
      other.h == h;

  @override
  int get hashCode => Object.hash(id, x, y, w, h);

  @override
  String toString() => 'GridPlacement($id $x,$y ${w}x$h)';
}

/// The smallest and largest size a widget may take, in cells.
@immutable
class GridSizeLimits {
  const GridSizeLimits({this.minW = 1, this.minH = 1, this.maxW, this.maxH});

  final int minW;
  final int minH;
  final int? maxW;
  final int? maxH;

  /// [w] × [h] kept within these limits and [columns].
  (int, int) clamp(int w, int h, int columns) {
    final maxW = math.min(this.maxW ?? columns, columns);
    return (
      w.clamp(math.min(minW, maxW), maxW),
      math.max(minH, maxH == null ? h : math.min(h, maxH!)),
    );
  }
}

/// The grid's layout rules, the way gridstack.js plays them with `float: false`: widgets never
/// overlap, a widget moved or resized onto others pushes them down, and everything then rises
/// as far up as it can (gravity), so the board has no holes.
abstract final class GridLayout {
  /// [items] with the widget [id] moved to [target] (position and size); the others make room
  /// and the whole board settles upward.
  static List<GridPlacement> move(
    List<GridPlacement> items,
    String id,
    GridPlacement target, {
    required int columns,
  }) {
    final moving = _fit(target, columns);
    final others = [
      for (final item in items)
        if (item.id != id) _fit(item, columns),
    ]..sort(_readingOrder);
    // The moved widget claims its place first; the rest settle around it, top to bottom.
    final placed = <GridPlacement>[moving];
    for (final item in others) {
      var next = item;
      // Dragged down onto a widget that starts above it: they swap, that widget goes up.
      if (next.overlaps(moving) && next.y < moving.y) {
        final up = next.copyWith(y: moving.y - next.h);
        if (up.y >= 0 && !placed.any(up.overlaps)) next = up;
      }
      while (placed.any(next.overlaps)) {
        next = next.copyWith(y: next.y + 1);
      }
      placed.add(next);
    }
    // Gravity after the push/swap pass — do not pin [id] or it claims y=0 and undoes a swap.
    return compact(placed, columns: columns);
  }

  /// Every widget raised as far as it goes without overlapping one above it. [keepOrderOf]
  /// is settled first (before reading order) so a widget being dragged claims its target cell
  /// before neighbours rise into it. Horizontal gutters are filled by [expandIntoGaps].
  static List<GridPlacement> compact(
    List<GridPlacement> items, {
    required int columns,
    String? keepOrderOf,
  }) {
    final sorted = [for (final item in items) _fit(item, columns)];
    if (keepOrderOf != null) {
      sorted.sort((a, b) {
        if (a.id == keepOrderOf) return -1;
        if (b.id == keepOrderOf) return 1;
        return _readingOrder(a, b);
      });
    } else {
      sorted.sort(_readingOrder);
    }
    final settled = <GridPlacement>[];
    for (final item in sorted) {
      var next = item;
      while (next.y > 0 &&
          !settled.any(next.copyWith(y: next.y - 1).overlaps)) {
        next = next.copyWith(y: next.y - 1);
      }
      while (settled.any(next.overlaps)) {
        next = next.copyWith(y: next.y + 1);
      }
      settled.add(next);
    }
    final order = {for (var i = 0; i < items.length; i++) items[i].id: i};
    return settled..sort((a, b) => order[a.id]!.compareTo(order[b.id]!));
  }

  /// Grow each widget into empty cells on its rows (start and end) so a missing neighbour does
  /// not leave a column gutter. [ids] limits which widgets may grow; omit to allow all.
  static List<GridPlacement> expandIntoGaps(
    List<GridPlacement> items, {
    required int columns,
    Set<String>? ids,
  }) {
    if (items.isEmpty) return items;
    var out = [for (final item in items) _fit(item, columns)];
    for (var i = 0; i < out.length; i++) {
      var item = out[i];
      if (ids != null && !ids.contains(item.id)) continue;
      final others = [for (final o in out) if (o.id != item.id) o];
      while (item.right < columns) {
        final grown = item.copyWith(w: item.w + 1);
        if (others.any(grown.overlaps)) break;
        item = grown;
      }
      while (item.x > 0) {
        final grown = item.copyWith(x: item.x - 1, w: item.w + 1);
        if (others.any(grown.overlaps)) break;
        item = grown;
      }
      out[i] = item;
    }
    return compact(out, columns: columns);
  }

  /// [item] appended at the first free spot, scanning rows top to bottom, start to end.
  static List<GridPlacement> add(
    List<GridPlacement> items,
    GridPlacement item, {
    required int columns,
  }) {
    final fitted = _fit(item, columns);
    for (var y = 0; ; y++) {
      for (var x = 0; x + fitted.w <= columns; x++) {
        final spot = fitted.copyWith(x: x, y: y);
        if (!items.any(spot.overlaps)) return [...items, spot];
      }
    }
  }

  /// Rows the board needs.
  static int height(List<GridPlacement> items) =>
      items.fold(0, (h, item) => math.max(h, item.bottom));

  /// [items] laid out again for a grid of [columns], keeping their reading order: used when
  /// a layout saved for a wide screen is first shown on a narrow one.
  static List<GridPlacement> reflow(
    List<GridPlacement> items, {
    required int columns,
    int Function(GridPlacement item)? widthFor,
  }) {
    final sorted = [...items]..sort(_readingOrder);
    var out = <GridPlacement>[];
    for (final item in sorted) {
      final w = math.min(widthFor?.call(item) ?? item.w, columns);
      out = add(out, item.copyWith(w: w, x: 0, y: 0), columns: columns);
    }
    return compact(out, columns: columns);
  }

  static GridPlacement _fit(GridPlacement item, int columns) {
    final w = item.w.clamp(1, columns);
    return item.copyWith(
      w: w,
      x: item.x.clamp(0, columns - w),
      y: math.max(0, item.y),
      h: math.max(1, item.h),
    );
  }

  static int _readingOrder(GridPlacement a, GridPlacement b) =>
      a.y != b.y ? a.y.compareTo(b.y) : a.x.compareTo(b.x);
}
