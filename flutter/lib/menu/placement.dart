import 'dart:math' as math;
import 'dart:ui' show Offset, Rect, Size, TextDirection;

/// Which side of its trigger a floating panel opens on. `start` and `end` follow the reading
/// direction (Radix `side` is physical; the kit resolves it the same way for each direction).
enum PanelSide { top, bottom, start, end }

/// Where a panel lines up with its trigger along the trigger's side (Radix `align`).
enum PanelAlign { start, center, end }

/// A placed panel: its rect in the bounds' coordinates and the side it ended up on.
typedef PanelPlacement = ({Rect rect, PanelSide side});

bool _vertical(PanelSide side) =>
    side == PanelSide.top || side == PanelSide.bottom;

PanelSide _opposite(PanelSide side) => switch (side) {
  PanelSide.top => PanelSide.bottom,
  PanelSide.bottom => PanelSide.top,
  PanelSide.start => PanelSide.end,
  PanelSide.end => PanelSide.start,
};

/// Room for a panel on [side] of [anchor] inside [bounds], along that side's axis. A panel that
/// [cover]s its trigger starts at the trigger's far edge instead of beside it.
double panelSpace(
  Rect bounds,
  Rect anchor,
  PanelSide side, {
  double sideOffset = 0,
  bool cover = false,
  TextDirection direction = TextDirection.ltr,
}) {
  final rtl = direction == TextDirection.rtl;
  final physical = switch (side) {
    PanelSide.start => rtl ? 'right' : 'left',
    PanelSide.end => rtl ? 'left' : 'right',
    PanelSide.top => 'top',
    PanelSide.bottom => 'bottom',
  };
  final gap = cover ? 0.0 : sideOffset;
  // A start outside the bounds (a trigger in the collision padding) counts from the bounds.
  return math.max(0, switch (physical) {
    'bottom' =>
      bounds.bottom -
          math.max(bounds.top, cover ? anchor.top : anchor.bottom + gap),
    'top' =>
      math.min(bounds.bottom, cover ? anchor.bottom : anchor.top - gap) -
          bounds.top,
    'right' =>
      bounds.right -
          math.max(bounds.left, cover ? anchor.left : anchor.right + gap),
    _ =>
      math.min(bounds.right, cover ? anchor.right : anchor.left - gap) -
          bounds.left,
  });
}

/// The largest extent a panel can take along [side]'s axis: the room on that side or the
/// opposite one, whichever is bigger (it flips there when it doesn't fit).
double panelMaxExtent(
  Rect bounds,
  Rect anchor,
  PanelSide side, {
  double sideOffset = 0,
  bool cover = false,
  TextDirection direction = TextDirection.ltr,
}) {
  double room(PanelSide s) => panelSpace(
    bounds,
    anchor,
    s,
    sideOffset: sideOffset,
    cover: cover,
    direction: direction,
  );
  return math.max(room(side), room(_opposite(side)));
}

/// Places a [size]d panel next to [anchor] inside [bounds] like Radix/floating-ui: on [side]
/// ([sideOffset] away, or over the trigger when it [cover]s it: aligned to the trigger's edge on
/// the side it grows from), flipped to the opposite side when it doesn't fit and that side has more
/// room, lined up per [align] (logical, so `start` is the trigger's right edge in RTL), then
/// shifted along both axes to stay inside [bounds]. A panel bigger than [bounds] keeps its start.
///
/// A panel beside its trigger (`start`/`end`) that fits neither side is never squeezed: it drops
/// right below the trigger instead, lined up with the trigger's start edge and shifted inside (a
/// submenu in a narrow window covers its parent menu under its row, like iOS). The result's side
/// is then [PanelSide.bottom]. The web twin is `sidePanelFallback` in `@feeef.dev/ui/menu`.
PanelPlacement placeAnchoredPanel({
  required Rect bounds,
  required Rect anchor,
  required Size size,
  PanelSide side = PanelSide.bottom,
  PanelAlign align = PanelAlign.center,
  double sideOffset = 0,
  bool cover = false,
  TextDirection direction = TextDirection.ltr,
}) {
  final rtl = direction == TextDirection.rtl;
  double room(PanelSide s) => panelSpace(
    bounds,
    anchor,
    s,
    sideOffset: sideOffset,
    cover: cover,
    direction: direction,
  );
  double fit(double v, double min, double extent, double max) =>
      v.clamp(min, math.max(min, max - extent));
  final gap = cover ? 0.0 : sideOffset;
  if (!_vertical(side) &&
      size.width > room(side) &&
      size.width > room(_opposite(side))) {
    final x = rtl ? anchor.right - size.width : anchor.left;
    final y = cover ? anchor.top : anchor.bottom;
    return (
      rect:
          Offset(
            fit(x, bounds.left, size.width, bounds.right),
            fit(y, bounds.top, size.height, bounds.bottom),
          ) &
          size,
      side: PanelSide.bottom,
    );
  }
  final extent = _vertical(side) ? size.height : size.width;
  var placed = side;
  if (extent > room(side) && room(_opposite(side)) > room(side)) {
    placed = _opposite(side);
  }
  double x, y;
  if (_vertical(placed)) {
    y = placed == PanelSide.bottom
        ? (cover ? anchor.top : anchor.bottom + gap)
        : (cover ? anchor.bottom : anchor.top - gap) - size.height;
    final startX = rtl ? anchor.right - size.width : anchor.left;
    final endX = rtl ? anchor.left : anchor.right - size.width;
    x = switch (align) {
      PanelAlign.start => startX,
      PanelAlign.end => endX,
      PanelAlign.center => anchor.center.dx - size.width / 2,
    };
  } else {
    final right = (placed == PanelSide.end) != rtl;
    x = right
        ? (cover ? anchor.left : anchor.right + gap)
        : (cover ? anchor.right : anchor.left - gap) - size.width;
    y = switch (align) {
      PanelAlign.start => anchor.top,
      PanelAlign.end => anchor.bottom - size.height,
      PanelAlign.center => anchor.center.dy - size.height / 2,
    };
  }
  x = fit(x, bounds.left, size.width, bounds.right);
  y = fit(y, bounds.top, size.height, bounds.bottom);
  return (rect: Offset(x, y) & size, side: placed);
}
