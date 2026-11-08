import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../theme.dart';
import 'grid_layout.dart';

/// One widget on a [DashboardGrid].
@immutable
class DashboardTile {
  const DashboardTile({
    required this.id,
    required this.label,
    required this.child,
    this.limits = const GridSizeLimits(),
  });

  final String id;

  /// Accessible name, also used by the edit controls ("Move Orders", "Remove Orders").
  final String label;
  final Widget child;
  final GridSizeLimits limits;
}

/// A dashboard of widgets of different sizes on a column grid, the way gridstack.js lays
/// them out: in [editing] mode a widget is dragged anywhere and resized from its bottom-end
/// corner, the others make way and everything settles upward with no holes ([GridLayout]).
/// Outside editing, a long press asks to edit ([onEditRequest]) and widgets behave normally.
///
/// [layout] is controlled: the grid reports each finished move or resize through
/// [onLayoutChanged]. Columns start at the reading start, so the board mirrors in RTL.
class DashboardGrid extends StatefulWidget {
  const DashboardGrid({
    super.key,
    required this.tiles,
    required this.layout,
    required this.columns,
    required this.onLayoutChanged,
    this.editing = false,
    this.rowHeight = 64,
    this.gap = 12,
    this.onEditRequest,
    this.onRemove,
    this.removeLabel = 'Remove',
    this.resizeLabel = 'Resize',
  });

  final List<DashboardTile> tiles;

  /// Where each tile sits. Tiles without a placement are not shown.
  final List<GridPlacement> layout;
  final int columns;
  final ValueChanged<List<GridPlacement>> onLayoutChanged;
  final bool editing;
  final double rowHeight;
  final double gap;
  final VoidCallback? onEditRequest;

  /// Shows a remove button on each tile while editing.
  final ValueChanged<String>? onRemove;
  final String removeLabel;
  final String resizeLabel;

  @override
  State<DashboardGrid> createState() => _DashboardGridState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<DashboardTile>('tiles', tiles))
      ..add(IntProperty('columns', columns))
      ..add(DoubleProperty('rowHeight', rowHeight))
      ..add(DoubleProperty('gap', gap))
      ..add(FlagProperty('editing', value: editing, ifTrue: 'editing'))
      ..add(IterableProperty<GridPlacement>('layout', layout))
      ..add(
        ObjectFlagProperty<ValueChanged<List<GridPlacement>>>.has(
          'onLayoutChanged',
          onLayoutChanged,
        ),
      )
      ..add(
        ObjectFlagProperty<VoidCallback>.has('onEditRequest', onEditRequest),
      )
      ..add(ObjectFlagProperty<ValueChanged<String>>.has('onRemove', onRemove))
      ..add(StringProperty('removeLabel', removeLabel))
      ..add(StringProperty('resizeLabel', resizeLabel));
  }
}

enum _Gesture { move, resize }

class _DashboardGridState extends State<DashboardGrid> {
  final _boardKey = GlobalKey();

  /// The tile being moved or resized, and how.
  String? _active;
  _Gesture? _gesture;

  /// Pixel rect of the active tile while it follows the pointer.
  Rect? _floating;

  /// Where the board would settle if the gesture ended now.
  List<GridPlacement>? _preview;

  Timer? _scroll;
  Offset? _lastGlobal;

  @override
  void dispose() {
    _scroll?.cancel();
    super.dispose();
  }

  List<GridPlacement> get _shown => _preview ?? widget.layout;

  double _colWidth(double width) =>
      (width - widget.gap * (widget.columns - 1)) / widget.columns;

  /// Pixel rect of [p] on a board [width] wide.
  Rect _rectOf(GridPlacement p, double width, bool rtl) {
    final col = _colWidth(width);
    final w = p.w * col + (p.w - 1) * widget.gap;
    final h = p.h * widget.rowHeight + (p.h - 1) * widget.gap;
    final start = p.x * (col + widget.gap);
    final left = rtl ? width - start - w : start;
    return Rect.fromLTWH(left, p.y * (widget.rowHeight + widget.gap), w, h);
  }

  /// The cell a floating [rect] is closest to, for [p]'s size.
  GridPlacement _cellOf(Rect rect, GridPlacement p, double width, bool rtl) {
    final step = _colWidth(width) + widget.gap;
    final start = rtl ? width - rect.right : rect.left;
    return p.copyWith(
      x: (start / step).round(),
      y: (rect.top / (widget.rowHeight + widget.gap)).round(),
    );
  }

  DashboardTile? _tile(String id) {
    for (final t in widget.tiles) {
      if (t.id == id) return t;
    }
    return null;
  }

  GridPlacement? _placement(String id) {
    for (final p in widget.layout) {
      if (p.id == id) return p;
    }
    return null;
  }

  void _start(String id, _Gesture gesture, double width, bool rtl) {
    final p = _placement(id);
    if (p == null) return;
    setState(() {
      _active = id;
      _gesture = gesture;
      _floating = _rectOf(p, width, rtl);
      _preview = widget.layout;
    });
  }

  void _update(Offset delta, Offset global, double width, bool rtl) {
    final id = _active, rect = _floating, p = _placement(id ?? '');
    if (id == null || rect == null || p == null) return;
    _lastGlobal = global;
    final step = _colWidth(width) + widget.gap;
    final rowStep = widget.rowHeight + widget.gap;
    late final Rect next;
    late final GridPlacement target;
    if (_gesture == _Gesture.move) {
      next = rect.shift(delta);
      target = _cellOf(next, p, width, rtl);
    } else {
      // The grip sits on the bottom-end corner: in RTL it grows toward the left.
      final dw = rtl ? -delta.dx : delta.dx;
      final w = math.max(_colWidth(width) * 0.5, rect.width + dw);
      final h = math.max(widget.rowHeight * 0.5, rect.height + delta.dy);
      next = rtl
          ? Rect.fromLTWH(rect.right - w, rect.top, w, h)
          : Rect.fromLTWH(rect.left, rect.top, w, h);
      final current = _preview?.firstWhere((e) => e.id == id) ?? p;
      final (cw, ch) = (_tile(id)?.limits ?? const GridSizeLimits()).clamp(
        ((w + widget.gap) / step).round(),
        ((h + widget.gap) / rowStep).round(),
        widget.columns,
      );
      target = current.copyWith(w: cw, h: ch);
    }
    final preview = GridLayout.move(
      widget.layout,
      id,
      target,
      columns: widget.columns,
    );
    setState(() {
      _floating = next;
      _preview = preview;
    });
    _autoScroll();
  }

  void _end() {
    _scroll?.cancel();
    _scroll = null;
    final preview = _preview;
    final changed = preview != null && !listEquals(preview, widget.layout);
    setState(() {
      _active = null;
      _gesture = null;
      _floating = null;
      _preview = null;
    });
    if (changed) widget.onLayoutChanged(preview);
  }

  /// Near the top or bottom of the scroll view, keep scrolling while the pointer stays there.
  void _autoScroll() {
    final position = Scrollable.maybeOf(context)?.position;
    final global = _lastGlobal;
    final box = Scrollable.maybeOf(context)?.context.findRenderObject();
    if (position == null || global == null || box is! RenderBox) return;
    final local = box.globalToLocal(global);
    const edge = 72.0;
    final speed = local.dy < edge
        ? -(edge - local.dy) / 4
        : local.dy > box.size.height - edge
        ? (local.dy - (box.size.height - edge)) / 4
        : 0.0;
    _scroll?.cancel();
    if (speed == 0) return;
    _scroll = Timer.periodic(const Duration(milliseconds: 16), (_) {
      final to = (position.pixels + speed).clamp(
        position.minScrollExtent,
        position.maxScrollExtent,
      );
      if (to == position.pixels) return;
      position.jumpTo(to);
      if (_gesture == _Gesture.move) {
        _update(Offset(0, speed), _lastGlobal!, _width, _rtl);
      }
    });
  }

  double _width = 0;
  bool _rtl = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final reduced = reducedMotionOf(context);
    _rtl = Directionality.of(context) == TextDirection.rtl;
    return LayoutBuilder(
      builder: (context, box) {
        final width = _width = box.maxWidth;
        final shown = _shown;
        var rows = GridLayout.height(shown);
        final floating = _floating;
        if (floating != null) {
          rows = math.max(
            rows,
            ((floating.bottom + widget.gap) / (widget.rowHeight + widget.gap))
                .ceil(),
          );
        }
        final height = rows == 0
            ? 0.0
            : rows * (widget.rowHeight + widget.gap) - widget.gap;
        final radius = theme.sizes.radiusPanel;
        final children = <Widget>[];
        String? activeTileId;
        for (final p in shown) {
          final tile = _tile(p.id);
          if (tile == null) continue;
          final rect = _rectOf(p, width, _rtl);
          if (p.id == _active) {
            activeTileId = p.id;
            // Where it will land.
            children.add(
              AnimatedPositioned.fromRect(
                key: ValueKey('slot:${p.id}'),
                rect: rect,
                duration: reduced
                    ? Duration.zero
                    : const Duration(milliseconds: 160),
                curve: Curves.easeOutCubic,
                child: DecoratedBox(
                  decoration: ShapeDecoration(
                    color: c.ink.withValues(alpha: 0.05),
                    shape: SuperellipseBorder(
                      radius: radius,
                      side: BorderSide(color: c.ink.withValues(alpha: 0.25)),
                    ),
                  ),
                ),
              ),
            );
            continue;
          }
          children.add(
            AnimatedPositioned.fromRect(
              key: ValueKey(p.id),
              rect: rect,
              duration: reduced
                  ? Duration.zero
                  : const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              child: _framed(tile, width),
            ),
          );
        }
        if (activeTileId != null && floating != null) {
          final tile = _tile(activeTileId)!;
          children.add(
            Positioned.fromRect(
              key: ValueKey(activeTileId),
              rect: floating,
              child: DecoratedBox(
                decoration: ShapeDecoration(
                  shape: SuperellipseBorder(radius: radius),
                  shadows: [
                    BoxShadow(
                      color: c.ink.withValues(alpha: 0.16),
                      blurRadius: 28,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: _framed(tile, width),
              ),
            ),
          );
        }
        return SizedBox(
          key: _boardKey,
          height: height,
          child: Stack(clipBehavior: Clip.none, children: children),
        );
      },
    );
  }

  /// A tile's content with, while editing, its drag surface, remove badge and corner handle.
  Widget _framed(DashboardTile tile, double width) {
    if (!widget.editing) {
      if (widget.onEditRequest == null) return tile.child;
      return GestureDetector(
        onLongPress: () {
          HapticFeedback.mediumImpact();
          widget.onEditRequest!();
        },
        child: tile.child,
      );
    }
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final active = tile.id == _active;
    final radius = theme.sizes.radiusPanel;
    // Soft rim like iOS widgets in arrange mode; stronger while this tile is held.
    final rim = BorderSide(
      color: c.ink.withValues(alpha: active ? 0.28 : 0.12),
      width: active ? 1.5 : 1,
    );
    // animation_level: 1 — barely-there jiggle; the minus + corner handle carry the mode
    final body = Stack(
      fit: StackFit.expand,
      clipBehavior: Clip.none,
      children: [
        IgnorePointer(
          child: DecoratedBox(
            decoration: ShapeDecoration(
              shape: SuperellipseBorder(radius: radius, side: rim),
            ),
            child: ClipPath(
              clipper: ShapeBorderClipper(
                shape: SuperellipseBorder(radius: radius),
              ),
              child: tile.child,
            ),
          ),
        ),
        MouseRegion(
          cursor: active
              ? SystemMouseCursors.grabbing
              : SystemMouseCursors.grab,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onPanStart: (_) {
              HapticFeedback.selectionClick();
              _start(tile.id, _Gesture.move, width, _rtl);
            },
            onPanUpdate: (d) =>
                _update(d.delta, d.globalPosition, width, _rtl),
            onPanEnd: (_) => _end(),
            onPanCancel: _end,
          ),
        ),
        if (widget.onRemove != null)
          // iOS: grey (−) badge on the top-leading corner, half outside the tile.
          PositionedDirectional(
            top: -6,
            start: -6,
            child: _RemoveBadge(
              label: '${widget.removeLabel} ${tile.label}',
              onTap: () {
                HapticFeedback.lightImpact();
                widget.onRemove!(tile.id);
              },
              color: c,
            ),
          ),
        // iOS widget resize: thick curved stroke on the bottom-trailing corner.
        PositionedDirectional(
          bottom: 0,
          end: 0,
          child: MouseRegion(
            cursor: _rtl
                ? SystemMouseCursors.resizeDownLeft
                : SystemMouseCursors.resizeDownRight,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onPanStart: (_) {
                HapticFeedback.selectionClick();
                _start(tile.id, _Gesture.resize, width, _rtl);
              },
              onPanUpdate: (d) =>
                  _update(d.delta, d.globalPosition, width, _rtl),
              onPanEnd: (_) => _end(),
              onPanCancel: _end,
              child: Semantics(
                label: '${widget.resizeLabel} ${tile.label}',
                child: SizedBox.square(
                  dimension: 44,
                  child: CustomPaint(
                    painter: _CornerHandlePainter(
                      color: c.ink.withValues(alpha: 0.45),
                      rtl: _rtl,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
    return Semantics(
      label: tile.label,
      child: active
          ? body
          : _ArrangeMotion(seed: tile.id.hashCode, child: body),
    );
  }
}

/// Barely-perceptible jiggle — Apple home-screen amplitude, not a shake.
///
/// animation_level: 1
class _ArrangeMotion extends StatefulWidget {
  const _ArrangeMotion({required this.seed, required this.child});

  final int seed;
  final Widget child;

  @override
  State<_ArrangeMotion> createState() => _ArrangeMotionState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('seed', seed))
      ..add(DiagnosticsProperty<Widget>('child', child));
  }
}

class _ArrangeMotionState extends State<_ArrangeMotion>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  bool? _reduced;

  @override
  void initState() {
    super.initState();
    // Slow cycle; reverse:false + sin() so neighbours stay out of phase without snapping.
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced =
        reducedMotionOf(context) || !TickerMode.valuesOf(context).enabled;
    if (_reduced == reduced) return;
    _reduced = reduced;
    if (reduced) {
      _ctrl
        ..stop()
        ..value = 0;
    } else if (!_ctrl.isAnimating) {
      _ctrl.repeat();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (reducedMotionOf(context)) return widget.child;
    // Unique phase + tiny amplitude (~0.3°) so the board reads "editing", not vibrating.
    final phase = (widget.seed % 11) / 11 * 2 * math.pi;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final t = _ctrl.value * 2 * math.pi + phase;
        return Transform.rotate(
          angle: math.sin(t) * 0.0055,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// (−) remove control — feeef [Button] icon size, frosted so it reads like iOS home-screen.
class _RemoveBadge extends StatelessWidget {
  const _RemoveBadge({
    required this.label,
    required this.onTap,
    required this.color,
  });

  final String label;
  final VoidCallback onTap;
  final ColorTokens color;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(ObjectFlagProperty<VoidCallback>.has('onTap', onTap))
      ..add(DiagnosticsProperty<ColorTokens>('color', color));
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Color.alphaBlend(
          color.ink.withValues(alpha: 0.18),
          color.surface,
        ),
        shape: BoxShape.circle,
        border: Border.all(
          color: color.surface.withValues(alpha: 0.75),
          width: 1.5,
        ),
      ),
      child: Button(
        variant: ButtonVariant.ghost,
        controlSize: ControlSize.icon,
        iconSize: ControlSize.small,
        ariaLabel: label,
        onClick: onTap,
        children: const [LucideMinus()],
      ),
    );
  }
}

/// Thick rounded stroke hugging the bottom-trailing corner — Apple widget resize handle.
class _CornerHandlePainter extends CustomPainter {
  _CornerHandlePainter({required this.color, required this.rtl});

  final Color color;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    // Arc sits inset so the stroke centres on the tile's rounded corner.
    const inset = 5.0;
    const arm = 22.0;
    final r = 14.0;
    final path = Path();
    if (rtl) {
      // Bottom-start corner in RTL.
      path
        ..moveTo(inset, size.height - inset - arm)
        ..lineTo(inset, size.height - inset - r)
        ..arcToPoint(
          Offset(inset + r, size.height - inset),
          radius: Radius.circular(r),
          clockwise: false,
        )
        ..lineTo(inset + arm, size.height - inset);
    } else {
      path
        ..moveTo(size.width - inset - arm, size.height - inset)
        ..lineTo(size.width - inset - r, size.height - inset)
        ..arcToPoint(
          Offset(size.width - inset, size.height - inset - r),
          radius: Radius.circular(r),
          clockwise: true,
        )
        ..lineTo(size.width - inset, size.height - inset - arm);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_CornerHandlePainter old) =>
      old.color != color || old.rtl != rtl;
}
