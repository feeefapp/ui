import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
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
        // Every tile keeps the same widget type and key in every state (idle, editing, held),
        // so its element, its content's state and the recognizer driving a gesture survive
        // the rebuilds a drag causes. Only the held tile moves to the end (paints on top);
        // keyed reordering keeps its element.
        final slots = <Widget>[];
        final tiles = <Widget>[];
        Widget? held;
        for (final p in shown) {
          final tile = _tile(p.id);
          if (tile == null) continue;
          final rect = _rectOf(p, width, _rtl);
          final active = p.id == _active && floating != null;
          if (active) {
            // Where it will land.
            // animation_level: 1
            slots.add(
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
          }
          // animation_level: 2 — tiles make way; the held one follows the pointer (no tween)
          // and glides into its slot on release.
          final positioned = AnimatedPositioned.fromRect(
            key: ValueKey(p.id),
            rect: active ? floating : rect,
            duration: reduced || active
                ? Duration.zero
                : const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            child: DecoratedBox(
              decoration: ShapeDecoration(
                shape: SuperellipseBorder(radius: radius),
                shadows: [
                  if (active)
                    BoxShadow(
                      color: c.ink.withValues(alpha: 0.16),
                      blurRadius: 28,
                      offset: const Offset(0, 12),
                    ),
                ],
              ),
              child: _framed(tile, active: active),
            ),
          );
          if (active) {
            held = positioned;
          } else {
            tiles.add(positioned);
          }
        }
        final children = [...slots, ...tiles, ?held];
        return SizedBox(
          key: _boardKey,
          height: height,
          child: Stack(clipBehavior: Clip.none, children: children),
        );
      },
    );
  }

  /// Starts moving [id] from a hold (touch) or a drag (mouse). A hold outside editing first
  /// asks to edit, then keeps carrying the tile in the same gesture (iOS home screen).
  void _pickUp(String id) {
    if (_active != null) return;
    HapticFeedback.mediumImpact();
    if (!widget.editing) widget.onEditRequest?.call();
    _start(id, _Gesture.move, _width, _rtl);
  }

  void _drag(String id, Offset global) {
    final last = _lastGlobal;
    if (_active != id || last == null) {
      _lastGlobal = global;
      return;
    }
    _update(global - last, global, _width, _rtl);
  }

  void _drop(String id) {
    if (_active == id) _end();
  }

  /// The gestures on a tile. The recognizer types never change between idle and editing, so a
  /// hold that turns editing on keeps driving the drag (a removed recognizer drops its pointer).
  Map<Type, GestureRecognizerFactory> _tileGestures(DashboardTile tile) {
    final id = tile.id;
    final editing = widget.editing;
    // The idle hold stays wired while it carries this tile (the hold that turned editing on).
    final canHold =
        (!editing && widget.onEditRequest != null) ||
        (editing && _active == id);
    void holdStart(LongPressStartDetails d) {
      _lastGlobal = d.globalPosition;
      _pickUp(id);
    }

    void holdMove(LongPressMoveUpdateDetails d) => _drag(id, d.globalPosition);
    void holdEnd(LongPressEndDetails _) => _drop(id);
    void holdCancel() => _drop(id);
    return {
      // Touch, outside editing: a long press enters editing and picks the tile up. Quick swipes
      // still scroll the page and taps reach the tile's content.
      _IdleHoldRecognizer: GestureRecognizerFactoryWithHandlers<_IdleHoldRecognizer>(
        () => _IdleHoldRecognizer(debugOwner: this),
        (r) => r
          ..onLongPressStart = canHold ? holdStart : null
          ..onLongPressMoveUpdate = canHold ? holdMove : null
          ..onLongPressEnd = canHold ? holdEnd : null
          ..onLongPressCancel = canHold ? holdCancel : null,
      ),
      // Touch, editing: a short hold picks the tile up; a quick swipe scrolls the board.
      _EditHoldRecognizer: GestureRecognizerFactoryWithHandlers<_EditHoldRecognizer>(
        () => _EditHoldRecognizer(debugOwner: this),
        (r) => r
          ..onLongPressStart = editing ? holdStart : null
          ..onLongPressMoveUpdate = editing ? holdMove : null
          ..onLongPressEnd = editing ? holdEnd : null
          ..onLongPressCancel = editing ? holdCancel : null,
      ),
      // Mouse, editing: drag right away (a mouse never scrolls the page by dragging).
      PanGestureRecognizer: GestureRecognizerFactoryWithHandlers<PanGestureRecognizer>(
        () => PanGestureRecognizer(
          debugOwner: this,
          supportedDevices: const {PointerDeviceKind.mouse},
        ),
        (r) => r
          ..onStart = editing
              ? (d) {
                  _lastGlobal = d.globalPosition;
                  _pickUp(id);
                }
              : null
          ..onUpdate = editing ? (d) => _drag(id, d.globalPosition) : null
          ..onEnd = editing ? (_) => _drop(id) : null
          ..onCancel = editing ? () => _drop(id) : null,
      ),
    };
  }

  /// A tile's content with, while editing, its drag surface, remove badge and corner handle.
  ///
  /// The tree is the same in every state (idle, editing, held) so the content keeps its state
  /// (no refetch, no flash) and the gesture in progress survives each rebuild.
  Widget _framed(DashboardTile tile, {required bool active}) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final editing = widget.editing;
    final radius = theme.sizes.radiusPanel;
    // Soft rim like iOS widgets in arrange mode; stronger while this tile is held.
    final rim = editing
        ? BorderSide(
            color: c.ink.withValues(alpha: active ? 0.28 : 0.12),
            width: active ? 1.5 : 1,
          )
        : BorderSide.none;
    final body = Stack(
      fit: StackFit.expand,
      clipBehavior: Clip.none,
      children: [
        // While editing the content is a picture: its own taps and scrolls are off.
        IgnorePointer(
          ignoring: editing,
          child: DecoratedBox(
            position: DecorationPosition.foreground,
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
        if (editing && widget.onRemove != null)
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
        if (editing)
          // iOS widget resize: thick curved stroke on the bottom-trailing corner. It claims the
          // pointer on touch down, so the page's scroll never takes a drag that starts on it.
          PositionedDirectional(
            bottom: 0,
            end: 0,
            child: MouseRegion(
              cursor: _rtl
                  ? SystemMouseCursors.resizeDownLeft
                  : SystemMouseCursors.resizeDownRight,
              child: RawGestureDetector(
                behavior: HitTestBehavior.opaque,
                gestures: {
                  _EagerPanRecognizer:
                      GestureRecognizerFactoryWithHandlers<_EagerPanRecognizer>(
                        () => _EagerPanRecognizer(debugOwner: this),
                        (r) => r
                          ..onStart = (d) {
                            if (_active != null) return;
                            HapticFeedback.selectionClick();
                            _lastGlobal = d.globalPosition;
                            _start(tile.id, _Gesture.resize, _width, _rtl);
                          }
                          ..onUpdate = (d) {
                            if (_active != tile.id) return;
                            _update(d.delta, d.globalPosition, _width, _rtl);
                          }
                          ..onEnd = ((_) => _drop(tile.id))
                          ..onCancel = (() => _drop(tile.id)),
                      ),
                },
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
      child: MouseRegion(
        cursor: !editing
            ? MouseCursor.defer
            : active
            ? SystemMouseCursors.grabbing
            : SystemMouseCursors.grab,
        child: RawGestureDetector(
          behavior: HitTestBehavior.translucent,
          gestures: _tileGestures(tile),
          child: _ArrangeMotion(
            seed: tile.id.hashCode,
            enabled: editing && !active,
            child: body,
          ),
        ),
      ),
    );
  }
}

/// Outside editing: the platform long press (500ms) enters editing.
class _IdleHoldRecognizer extends LongPressGestureRecognizer {
  _IdleHoldRecognizer({super.debugOwner});
}

/// While editing: a short hold picks a tile up; moving sooner scrolls the page instead.
class _EditHoldRecognizer extends LongPressGestureRecognizer {
  _EditHoldRecognizer({super.debugOwner})
    : super(duration: const Duration(milliseconds: 180));
}

/// A pan that wins the arena on pointer down: used by the small resize grip only.
class _EagerPanRecognizer extends PanGestureRecognizer {
  _EagerPanRecognizer({super.debugOwner});

  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    resolvePointer(event.pointer, GestureDisposition.accepted);
  }
}

/// Barely-perceptible jiggle — Apple home-screen amplitude, not a shake. Always in the tree (a
/// still transform when off), so toggling it never rebuilds the tile's content.
///
/// animation_level: 1
class _ArrangeMotion extends StatefulWidget {
  const _ArrangeMotion({
    required this.seed,
    required this.enabled,
    required this.child,
  });

  final int seed;
  final bool enabled;
  final Widget child;

  @override
  State<_ArrangeMotion> createState() => _ArrangeMotionState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('seed', seed))
      ..add(FlagProperty('enabled', value: enabled, ifTrue: 'jiggling'))
      ..add(DiagnosticsProperty<Widget>('child', child));
  }
}

class _ArrangeMotionState extends State<_ArrangeMotion>
    with SingleTickerProviderStateMixin {
  // Slow cycle; repeat + sin() so neighbours stay out of phase without snapping.
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );

  void _sync() {
    final run =
        widget.enabled &&
        !reducedMotionOf(context) &&
        TickerMode.valuesOf(context).enabled;
    if (run && !_ctrl.isAnimating) {
      _ctrl.repeat();
    } else if (!run && (_ctrl.isAnimating || _ctrl.value != 0)) {
      _ctrl
        ..stop()
        ..value = 0;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(_ArrangeMotion old) {
    super.didUpdateWidget(old);
    if (old.enabled != widget.enabled) _sync();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Unique phase + tiny amplitude (~0.3°) so the board reads "editing", not vibrating.
    final phase = (widget.seed % 11) / 11 * 2 * math.pi;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) => Transform.rotate(
        angle: _ctrl.isAnimating
            ? math.sin(_ctrl.value * 2 * math.pi + phase) * 0.0055
            : 0,
        child: child,
      ),
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
