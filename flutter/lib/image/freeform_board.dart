import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../pixel_art.dart';
import '../glass/container.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../scaffold.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/surfaces.dart';
import '../theme/tokens.dart' show MotionTokens;
import 'board_utils.dart';
import 'freeform_frame.dart';
import 'types.dart';

/// Room taken by floating chrome on each edge of the board, in pixels.
typedef Insets = ({double top, double right, double bottom, double left});

/// One take on the board, in world coordinates.
class FreeformCard implements FrameCard {
  const FreeformCard({
    required this.take,
    required this.x,
    required this.y,
    required this.w,
    required this.h,
    required this.number,
  });
  final ImageTake take;
  @override
  final double x;
  final double y;
  @override
  final double w;
  final double h;

  /// 1-based version number, oldest first.
  final int number;
}

/// World height of every card; widths follow each image's proportions.
const double cardHeight = 560;
const double _gap = 72;
const double _minScale = 0.08;
const double _maxScale = 4;

double _clamp(double v, double min, double max) =>
    math.min(max, math.max(min, v));

/// JavaScript `Math.round`: halves go up.
double _jsRound(double value) => (value + 0.5).floorToDouble();

/// Lays the versions out left to right, oldest first, centred on the origin row. [takes] are
/// newest first; [ratios] are measured image proportions by take id.
List<FreeformCard> layoutCards(
  List<ImageTake> takes,
  Map<String, double> ratios,
) {
  var x = 0.0;
  final cards = <FreeformCard>[];
  for (final (i, take) in takes.reversed.indexed) {
    final ratio = _clamp(
      ratios[take.id] ?? stageRatio(null, take.options),
      0.25,
      4,
    );
    final w = _jsRound(cardHeight * ratio);
    cards.add(
      FreeformCard(
        take: take,
        x: x,
        y: -cardHeight / 2,
        w: w,
        h: cardHeight,
        number: i + 1,
      ),
    );
    x += w + _gap;
  }
  return cards;
}

/// Scale and offset that fit a world rect into the visible area between floating panels.
FrameView fitView(
  ({double x, double y, double w, double h}) rect,
  ({double w, double h}) viewport,
  Insets insets, [
  double padding = 28,
  double maxScale = 1,
]) {
  final availW = math.max(
    120.0,
    viewport.w - insets.left - insets.right - padding * 2,
  );
  final availH = math.max(
    120.0,
    viewport.h - insets.top - insets.bottom - padding * 2,
  );
  final scale = _clamp(
    math.min(math.min(availW / rect.w, availH / rect.h), maxScale),
    _minScale,
    _maxScale,
  );
  final cx = insets.left + padding + availW / 2;
  final cy = insets.top + padding + availH / 2;
  return FrameView(
    scale: scale,
    x: cx - (rect.x + rect.w / 2) * scale,
    y: cy - (rect.y + rect.h / 2) * scale,
  );
}

/// An image for a take's `fileUrl`: `data:` URLs with base64 raster data decode in memory,
/// anything else loads over the network. (SVG data URLs need a host [FreeformBoard.imageBuilder].)
ImageProvider imageProviderFor(String url) {
  if (url.startsWith('data:')) {
    final comma = url.indexOf(',');
    final header = comma < 0 ? '' : url.substring(5, comma);
    if (comma >= 0 && header.endsWith(';base64')) {
      return MemoryImage(base64Decode(url.substring(comma + 1)));
    }
  }
  return NetworkImage(url);
}

/// A starter prompt on the empty board.
typedef BoardStarter = ({String label, String prompt});

/// Freeform-style board: an endless dotted canvas behind every panel: the twin of
/// `FreeformBoard` in `@feeef.dev/ui/image/freeform-board`. Versions sit side by side; the
/// selected one glides into the free area between the floating panels. Drag to pan, scroll to
/// pan, pinch or ⌘/Ctrl+scroll to zoom, double-click a card to fit it.
class FreeformBoard extends StatefulWidget {
  const FreeformBoard({
    super.key,
    this.embedded = false,
    required this.takes,
    required this.selectedId,
    required this.onSelect,
    required this.insets,
    required this.now,
    required this.signedIn,
    required this.starters,
    required this.onStarter,
    required this.onRetry,
    required this.onRemove,
    this.emptyContent,
    this.imageBuilder,
  });

  /// Kept for parity with the web kit, where a board without it covers the whole window
  /// (`position: fixed`). A Flutter widget can't leave its parent: the board always fills it.
  final bool embedded;

  /// Versions to show, newest first; they are laid out oldest to newest, left to right.
  final List<ImageTake> takes;

  /// The selected take; the board glides it into view. Defaults to the newest.
  final String? selectedId;

  /// Called with a take id when its card is clicked (not dragged).
  final ValueChanged<String> onSelect;

  /// Room taken by floating chrome on each edge, in pixels; cards fit between them.
  final Insets insets;

  /// Current time in ms since the epoch, for the elapsed timer on pending cards. Tick it while
  /// work runs.
  final int now;

  /// Picks the empty-board hint for signed-in or signed-out users.
  final bool signedIn;

  /// Starter prompts on the empty board.
  final List<BoardStarter> starters;

  /// Called with the prompt of the starter the user clicked.
  final ValueChanged<String> onStarter;

  /// Called from a failed card's "Try again".
  final ValueChanged<ImageTake> onRetry;

  /// Called from a failed card's "Remove".
  final ValueChanged<ImageTake> onRemove;

  /// Replaces the default welcome on an empty board (e.g. the poster template gallery).
  final Widget? emptyContent;

  /// Draws a completed take instead of loading its `fileUrl` (for images the host already holds,
  /// or formats Flutter can't decode, such as SVG). Its card keeps the take's aspect ratio.
  final Widget Function(BuildContext context, ImageTake take)? imageBuilder;

  @override
  State<FreeformBoard> createState() => _FreeformBoardState();
}

class _Drag {
  _Drag(this.id, this.start, this.view, this.card);
  final int id;
  final Offset start;
  final FrameView view;
  final String? card;
  bool moved = false;
}

class _FreeformBoardState extends State<FreeformBoard>
    with SingleTickerProviderStateMixin {
  Size _size = const Size(1280, 800);
  FrameView? _view;
  late final _glide = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );
  FrameView _from = const FrameView(x: 0, y: 0, scale: 1);
  FrameView _to = const FrameView(x: 0, y: 0, scale: 1);
  final Map<String, double> _ratios = {};
  final Map<int, Offset> _points = {};
  final Set<int> _swallowed = {};
  _Drag? _drag;
  bool _grabbing = false;
  String? _fitKey;
  ({int time, Offset at})? _lastClick;
  List<FreeformCard> _cards = const [];

  FrameView get _current => _view ?? const FrameView(x: 0, y: 0, scale: 1);

  @override
  void initState() {
    super.initState();
    _glide.addListener(() {
      setState(
        () => _view = FrameView.lerp(
          _from,
          _to,
          MotionTokens.easeOut.transform(_glide.value),
        ),
      );
    });
  }

  @override
  void dispose() {
    _glide.dispose();
    super.dispose();
  }

  bool get _reduced => reducedMotionOf(context);

  void _glideTo(FrameView next) {
    if (_reduced || _view == null) {
      _glide.stop();
      setState(() => _view = next);
      return;
    }
    _from = _current;
    _to = next;
    _glide.forward(from: 0);
  }

  void _set(FrameView next) {
    _glide.stop();
    setState(() => _view = next);
  }

  FreeformCard? get _selected {
    for (final card in _cards) {
      if (card.take.id == widget.selectedId) return card;
    }
    return _cards.isEmpty ? null : _cards.last;
  }

  ({double w, double h}) get _viewport => (w: _size.width, h: _size.height);

  FrameView _fitted(FreeformCard card) {
    // The zoom rail floats 14px inside the right inset; a fitted card stays clear of it.
    final rail = 14 + ThemeProvider.of(context).sizes.toolbarItem + 8;
    final insets = (
      top: widget.insets.top,
      right: widget.insets.right + rail,
      bottom: widget.insets.bottom,
      left: widget.insets.left,
    );
    final fitted = fitView(
      (x: card.x, y: card.y, w: card.w, h: card.h),
      _viewport,
      insets,
      28,
      card.take.status == TakeStatus.completed ? 1.4 : 1,
    );
    // Centering the selection leaves the poster beside it under the rail whenever the free area
    // is wider than the card. Pull that neighbor clear.
    return revealCovered(
      fitted,
      _cards,
      card,
      (w: _size.width),
      (left: insets.left, right: insets.right),
      28,
    );
  }

  void _fitCard(FreeformCard? card) {
    if (card != null) _glideTo(_fitted(card));
  }

  FrameView _home() {
    final insets = widget.insets;
    return FrameView(
      x: insets.left + (_size.width - insets.left - insets.right) / 2,
      y: insets.top + (_size.height - insets.top - insets.bottom) / 2,
      scale: 1,
    );
  }

  void _fitAll() {
    if (_cards.isEmpty) return;
    final last = _cards.last;
    _glideTo(
      fitView(
        (x: 0, y: -cardHeight / 2, w: last.x + last.w, h: cardHeight),
        _viewport,
        widget.insets,
      ),
    );
  }

  void _zoomAt(double factor, Offset at) {
    final old = _current;
    final scale = _clamp(old.scale * factor, _minScale, _maxScale);
    final k = scale / old.scale;
    _set(
      FrameView(
        scale: scale,
        x: at.dx - (at.dx - old.x) * k,
        y: at.dy - (at.dy - old.y) * k,
      ),
    );
  }

  void _zoomCentre(double factor) {
    final insets = widget.insets;
    _zoomAt(
      factor,
      Offset(
        insets.left + (_size.width - insets.left - insets.right) / 2,
        insets.top + (_size.height - insets.top - insets.bottom) / 2,
      ),
    );
  }

  /// The card under a board point, if any.
  String? _cardAt(Offset point) {
    final view = _current;
    final world = Offset(
      (point.dx - view.x) / view.scale,
      (point.dy - view.y) / view.scale,
    );
    for (final card in _cards.reversed) {
      if (Rect.fromLTWH(card.x, card.y, card.w, card.h).contains(world)) {
        return card.take.id;
      }
    }
    return null;
  }

  // Pointer handling -----------------------------------------------------------------------

  void _down(PointerDownEvent event) {
    if (_swallowed.contains(event.pointer)) return;
    if (event.kind == PointerDeviceKind.mouse &&
        event.buttons & (kPrimaryMouseButton | kMiddleMouseButton) == 0) {
      return;
    }
    _points[event.pointer] = event.localPosition;
    if (_points.length == 1) {
      _drag = _Drag(
        event.pointer,
        event.localPosition,
        _current,
        _cardAt(event.localPosition),
      );
    }
    _glide.stop();
  }

  void _move(PointerMoveEvent event) {
    if (!_points.containsKey(event.pointer)) return;
    final before = _points.values.toList();
    _points[event.pointer] = event.localPosition;
    if (_points.length == 2) {
      final after = _points.values.toList();
      final a = before[0], b = before[1], c = after[0], d = after[1];
      _zoomAt((c - d).distance / math.max(1, (a - b).distance), (c + d) / 2);
      _drag?.moved = true;
      return;
    }
    final drag = _drag;
    if (drag == null || drag.id != event.pointer) return;
    final delta = event.localPosition - drag.start;
    if (!drag.moved && delta.distance < 4) return;
    drag.moved = true;
    if (!_grabbing) setState(() => _grabbing = true);
    _set(
      drag.view.copyWith(x: drag.view.x + delta.dx, y: drag.view.y + delta.dy),
    );
  }

  void _up(PointerEvent event) {
    _swallowed.remove(event.pointer);
    _points.remove(event.pointer);
    final drag = _drag;
    if (drag?.id != event.pointer) return;
    _drag = null;
    if (_grabbing) setState(() => _grabbing = false);
    if (drag!.moved || event is PointerCancelEvent) return;
    // A click (no drag) on a card selects it; a second one soon after fits it (double-click).
    final card = drag.card;
    if (card != null) widget.onSelect(card);
    final now = event.timeStamp.inMilliseconds;
    final last = _lastClick;
    if (last != null &&
        now - last.time < 400 &&
        (last.at - event.localPosition).distance < 8) {
      _lastClick = null;
      for (final row in _cards) {
        if (row.take.id == card) _fitCard(row);
      }
    } else {
      _lastClick = (time: now, at: event.localPosition);
    }
  }

  void _signal(PointerSignalEvent event) {
    if (event is PointerScrollEvent) {
      GestureBinding.instance.pointerSignalResolver.register(event, (event) {
        final scroll = event as PointerScrollEvent;
        final keys = HardwareKeyboard.instance;
        if (keys.isControlPressed || keys.isMetaPressed) {
          _zoomAt(
            math.exp(-scroll.scrollDelta.dy * 0.0045),
            scroll.localPosition,
          );
        } else {
          final old = _current;
          _set(
            old.copyWith(
              x: old.x - scroll.scrollDelta.dx,
              y: old.y - scroll.scrollDelta.dy,
            ),
          );
        }
      });
    } else if (event is PointerScaleEvent) {
      GestureBinding.instance.pointerSignalResolver.register(event, (event) {
        _zoomAt((event as PointerScaleEvent).scale, event.localPosition);
      });
    }
  }

  // Trackpad gestures (desktop): two-finger pans and pinches.
  double _panScale = 1;
  void _panZoomStart(PointerPanZoomStartEvent event) {
    _panScale = 1;
    _glide.stop();
  }

  void _panZoomUpdate(PointerPanZoomUpdateEvent event) {
    final old = _current;
    _set(
      old.copyWith(
        x: old.x + event.localPanDelta.dx,
        y: old.y + event.localPanDelta.dy,
      ),
    );
    if (event.scale != _panScale && _panScale > 0) {
      _zoomAt(event.scale / _panScale, event.localPosition);
      _panScale = event.scale;
    }
  }

  /// Pointers that start on the board's own controls never pan it (`stopPropagation`).
  Widget _stop(Widget child) => Listener(
    onPointerDown: (event) => _swallowed.add(event.pointer),
    child: child,
  );

  void _measured(ImageTake take, double ratio) {
    if (!ratio.isFinite || ((_ratios[take.id] ?? 0) - ratio).abs() <= 0.01) {
      return;
    }
    setState(() => _ratios[take.id] = ratio);
  }

  @override
  Widget build(BuildContext context) {
    final i18n = I18n.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(
          constraints.maxWidth.isFinite ? constraints.maxWidth : 1280,
          constraints.maxHeight.isFinite ? constraints.maxHeight : 800,
        );
        _size = size;
        _cards = layoutCards(widget.takes, _ratios);
        final selected = _selected;
        final insets = widget.insets;
        // Bring the selection (or a new version) into the free area whenever it, the panels or
        // the window change.
        final key = [
          selected?.take.id,
          for (final card in _cards) '${card.take.id}:${card.x}:${card.w}',
          '${size.width}x${size.height}',
          '${insets.left},${insets.top},${insets.right},${insets.bottom}',
        ].join('|');
        // Unmeasured or hidden (a viewport no bigger than the chrome around it): nothing to fit
        // yet, so the first real layout snaps straight to the right view instead of gliding from
        // a fit made for a zero-size board.
        final degenerate =
            size.width - insets.left - insets.right <= 56 ||
            size.height - insets.top - insets.bottom <= 56;
        if (!degenerate && key != _fitKey) {
          _fitKey = key;
          final target = selected != null ? _fitted(selected) : _home();
          if (_view == null) {
            _view = target;
          } else {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _fitKey == key) _glideTo(target);
            });
          }
        }
        final view = _current;
        return _board(context, i18n, size, view, selected);
      },
    );
  }

  Widget _board(
    BuildContext context,
    I18n i18n,
    Size size,
    FrameView view,
    FreeformCard? selected,
  ) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final insets = widget.insets;
    final t = i18n.t;
    final children = <Widget>[
      Positioned.fill(
        child: CustomPaint(
          painter: _DotsPainter(
            view: view,
            ground: c.ground,
            dot: mixSrgb(c.ink, 0.16, transparent),
          ),
        ),
      ),
    ];
    for (final card in _cards) {
      final current = card.take.id == selected?.take.id;
      children.add(
        Positioned(
          left: view.x + card.x * view.scale,
          top: view.y + card.y * view.scale,
          width: card.w * view.scale,
          height: card.h * view.scale,
          child: FittedBox(
            fit: BoxFit.fill,
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: card.w,
              height: card.h,
              child: _CardView(
                key: ValueKey(card.take.id),
                take: card.take,
                current: current,
                now: widget.now,
                imageBuilder: widget.imageBuilder,
                onRatio: (ratio) => _measured(card.take, ratio),
                onRetry: () => widget.onRetry(card.take),
                onRemove: () => widget.onRemove(card.take),
                stop: _stop,
              ),
            ),
          ),
        ),
      );
      // The caption stays 12px whatever the zoom (`transform: scale(1 / view.scale)`).
      children.add(
        Positioned(
          left: view.x + (card.x + 4) * view.scale,
          top: view.y + (card.y + card.h + 10) * view.scale,
          child: IgnorePointer(
            child: _CardLabel(
              take: card.take,
              number: card.number,
              current: current,
            ),
          ),
        ),
      );
    }
    if (_cards.isEmpty) {
      children.add(
        Positioned(
          top: insets.top,
          right: insets.right,
          bottom: insets.bottom,
          left: insets.left,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: _stop(
                widget.emptyContent ??
                    _Welcome(
                      signedIn: widget.signedIn,
                      starters: widget.starters,
                      onStarter: widget.onStarter,
                    ),
              ),
            ),
          ),
        ),
      );
    } else {
      final ghost = ControlOverrides.maybeOf(context);
      children.add(
        Positioned(
          top: 0,
          bottom: 0,
          right: insets.right + 14,
          child: Center(
            child: _stop(
              GlassScope(
                child: Semantics(
                  container: true,
                  explicitChildNodes: true,
                  label: t('lab.board.zoom'),
                  child: GlassGroup(
                    radius: 24,
                    padding: const EdgeInsets.all(4),
                    child: ControlOverrides(
                      height: ghost?.height,
                      radius: ghost?.radius,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        spacing: 4,
                        children: [
                          IconButton(
                            variant: ButtonVariant.ghost,
                            appearance: ButtonAppearance.toolbar,
                            ariaLabel: t('lab.board.zoomOut'),
                            onClick: () => _zoomCentre(1 / 1.25),
                            icon: const LucideIcon(LucideIcons.minus),
                          ),
                          Button(
                            variant: ButtonVariant.ghost,
                            appearance: ButtonAppearance.toolbar,
                            controlSize: ControlSize.icon,
                            ariaLabel: t('lab.board.fitSelection'),
                            onClick: () => _fitCard(selected),
                            children: [
                              // The label may be wider than the square button; it overflows
                              // centred, like the web's visible overflow.
                              SizedBox(
                                width: 24,
                                child: OverflowBox(
                                  maxWidth: double.infinity,
                                  child: Text(
                                    '${_jsRound(view.scale * 100).toInt()}%',
                                    style: const TextStyle(
                                      fontFeatures: [
                                        FontFeature.tabularFigures(),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            variant: ButtonVariant.ghost,
                            appearance: ButtonAppearance.toolbar,
                            ariaLabel: t('lab.board.zoomIn'),
                            onClick: () => _zoomCentre(1.25),
                            icon: const LucideIcon(LucideIcons.plus),
                          ),
                          IconButton(
                            variant: ButtonVariant.ghost,
                            appearance: ButtonAppearance.toolbar,
                            ariaLabel: t('lab.board.showAllVersions'),
                            disabled: _cards.length < 2,
                            onClick: _fitAll,
                            icon: const LucideIcon(LucideIcons.maximize),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: t('lab.board.canvasHint'),
      child: MouseRegion(
        cursor: _grabbing
            ? SystemMouseCursors.grabbing
            : SystemMouseCursors.grab,
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: _down,
          onPointerMove: _move,
          onPointerUp: _up,
          onPointerCancel: _up,
          onPointerSignal: _signal,
          onPointerPanZoomStart: _panZoomStart,
          onPointerPanZoomUpdate: _panZoomUpdate,
          child: ClipRect(
            child: SizedBox(
              width: size.width,
              height: size.height,
              child: Stack(clipBehavior: Clip.none, children: children),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-workspace-canvas`: the ground with a 24px dot grid (`radial-gradient(circle, ink 16%
/// 1.1px, transparent 1.3px)`) that pans and scales with the view.
class _DotsPainter extends CustomPainter {
  _DotsPainter({required this.view, required this.ground, required this.dot});
  final FrameView view;
  final Color ground, dot;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = ground);
    final step = 24 * view.scale;
    if (step < 1.5) return;
    double start(double origin) =>
        origin - (origin / step).floorToDouble() * step;
    final x0 = start(view.x), y0 = start(view.y);
    final points = <Offset>[];
    for (var y = y0 - step; y < size.height + step; y += step) {
      for (var x = x0 - step; x < size.width + step; x += step) {
        points.add(Offset(x + step / 2, y + step / 2));
      }
    }
    // A 1.2px disc (solid to 1.1px, fading to 1.3px).
    canvas.drawPoints(
      ui.PointMode.points,
      points,
      Paint()
        ..color = dot
        ..strokeWidth = 2.4
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_DotsPainter old) =>
      old.view != view || old.ground != ground || old.dot != dot;
}

/// `.lab-ff-label`: operation, version number, a star when starred, a cross when failed.
class _CardLabel extends StatelessWidget {
  const _CardLabel({
    required this.take,
    required this.number,
    required this.current,
  });
  final ImageTake take;
  final int number;
  final bool current;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final t = I18n.of(context).t;
    final ink = current ? c.ink : c.muted;
    return IconTheme.merge(
      data: IconThemeData(size: 11, color: ink),
      child: DefaultTextStyle.merge(
        style: TextStyle(
          fontSize: 12,
          height: 1,
          fontWeight: FontWeight.w500,
          color: ink,
        ),
        maxLines: 1,
        softWrap: false,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: 5,
          children: [
            if (take.starred) _FilledStar(color: ink),
            Text('${t('lab.canvas.op_${take.operation.name}')} #$number'),
            if (take.status == TakeStatus.failed)
              const LucideIcon(LucideIcons.x),
          ],
        ),
      ),
    );
  }
}

/// `.lab-ff-card`: the image, a loader while the take works, or the failure with its actions.
class _CardView extends StatefulWidget {
  const _CardView({
    super.key,
    required this.take,
    required this.current,
    required this.now,
    required this.imageBuilder,
    required this.onRatio,
    required this.onRetry,
    required this.onRemove,
    required this.stop,
  });
  final ImageTake take;
  final bool current;
  final int now;
  final Widget Function(BuildContext, ImageTake)? imageBuilder;
  final ValueChanged<double> onRatio;
  final VoidCallback onRetry, onRemove;
  final Widget Function(Widget) stop;

  @override
  State<_CardView> createState() => _CardViewState();
}

class _CardViewState extends State<_CardView> with TickerProviderStateMixin {
  // `lab-ff-sheen`: 1800ms linear, forever, while the take works.
  late final _sheen = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  );
  // `lab-ff-in`: the image fades and grows in over 520ms.
  late final _enter = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );
  ImageStream? _stream;
  ImageStreamListener? _listener;

  bool get _busy =>
      widget.take.status == TakeStatus.pending ||
      widget.take.status == TakeStatus.processing;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
    _resolve();
  }

  @override
  void didUpdateWidget(_CardView old) {
    super.didUpdateWidget(old);
    _sync();
    if (old.take.fileUrl != widget.take.fileUrl ||
        old.take.status != widget.take.status ||
        old.imageBuilder != widget.imageBuilder) {
      _resolve();
    }
  }

  void _sync() {
    final reduced = reducedMotionOf(context);
    if (_busy && !reduced) {
      if (!_sheen.isAnimating) _sheen.repeat();
    } else {
      _sheen.stop();
      _sheen.value = 0;
    }
  }

  void _resolve() {
    _unlisten();
    final take = widget.take;
    if (take.status != TakeStatus.completed ||
        widget.imageBuilder != null ||
        take.fileUrl.isEmpty) {
      return;
    }
    final stream = imageProviderFor(take.fileUrl)
        .resolve(createLocalImageConfiguration(context));
    final listener = ImageStreamListener((info, _) {
      final ratio = info.image.width / math.max(1, info.image.height);
      if (mounted) widget.onRatio(ratio);
    }, onError: (_, _) {});
    stream.addListener(listener);
    _stream = stream;
    _listener = listener;
  }

  void _unlisten() {
    final listener = _listener;
    if (listener != null) _stream?.removeListener(listener);
    _stream = null;
    _listener = null;
  }

  @override
  void initState() {
    super.initState();
    _enter.value = 0;
  }

  @override
  void dispose() {
    _unlisten();
    _sheen.dispose();
    _enter.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final t = I18n.of(context).t;
    final take = widget.take;
    final reduced = reducedMotionOf(context);
    const radius = 22.0;
    Widget? content;
    if (take.status == TakeStatus.completed) {
      if (!reduced && _enter.value == 0 && !_enter.isAnimating) {
        _enter.forward();
      } else if (reduced) {
        _enter.value = 1;
      }
      final image =
          widget.imageBuilder?.call(context, take) ??
          (take.fileUrl.isEmpty
              ? const SizedBox.expand()
              : Image(
                  image: imageProviderFor(take.fileUrl),
                  fit: BoxFit.cover,
                  semanticLabel: take.prompt.isNotEmpty
                      ? take.prompt
                      : t('lab.board.generatedImage'),
                  gaplessPlayback: true,
                  errorBuilder: (_, _, _) => const SizedBox.expand(),
                ));
      content = AnimatedBuilder(
        animation: _enter,
        builder: (context, child) {
          final p = MotionTokens.easeOut.transform(_enter.value);
          return Opacity(
            opacity: p,
            child: Transform.scale(scale: 0.98 + 0.02 * p, child: child),
          );
        },
        child: ClipPath(
          clipper: _ShapeClipper(radius),
          child: SizedBox.expand(
            child: widget.imageBuilder != null
                ? Semantics(
                    image: true,
                    label: take.prompt.isNotEmpty
                        ? take.prompt
                        : t('lab.board.generatedImage'),
                    child: image,
                  )
                : image,
          ),
        ),
      );
    } else {
      content = _StateView(
        take: take,
        busy: _busy,
        now: widget.now,
        onRetry: widget.onRetry,
        onRemove: widget.onRemove,
        stop: widget.stop,
      );
    }
    return Semantics(
      selected: widget.current,
      container: true,
      child: AnimatedBuilder(
        animation: _sheen,
        builder: (context, child) => CustomPaint(
          painter: _CardPainter(
            radius: radius,
            surface: c.surface,
            shadow: glassShadowColor(theme.brightness),
            sheen: _busy ? mixSrgb(c.primary, 0.20, transparent) : null,
            sheenProgress: _sheen.isAnimating ? _sheen.value : null,
            outline: widget.current ? c.primary : null,
          ),
          child: child,
        ),
        child: content,
      ),
    );
  }
}

class _ShapeClipper extends CustomClipper<Path> {
  _ShapeClipper(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_ShapeClipper old) => old.radius != radius;
}

/// Card paint: the glass shadow (0 8px 24px -14px), the surface, the moving sheen while the take
/// works, and the 2px primary outline 3px outside when it is the selection.
class _CardPainter extends CustomPainter {
  _CardPainter({
    required this.radius,
    required this.surface,
    required this.shadow,
    required this.sheen,
    required this.sheenProgress,
    required this.outline,
  });
  final double radius;
  final Color surface, shadow;
  final Color? sheen, outline;

  /// Animation progress, or null when the sheen is still (reduced motion).
  final double? sheenProgress;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    List<double> r(double v) => [v, v, v, v];
    final shape = superellipsePath(rect, r(radius));
    final spread = rect.deflate(14);
    if (!spread.isEmpty) {
      canvas.drawPath(
        superellipsePath(
          spread,
          r(math.max(0, radius - 14)),
        ).shift(const Offset(0, 8)),
        Paint()
          ..color = shadow
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
      );
    }
    canvas.drawPath(shape, Paint()..color = surface);
    if (sheen != null) {
      // linear-gradient(100deg, transparent 30%, sheen 50%, transparent 70%) 0 0 / 220% 100%,
      // moving from background-position 160% to -60%; still at 0 under reduced motion.
      final tileW = size.width * 2.2;
      final position = sheenProgress == null ? 0.0 : 1.6 - 2.2 * sheenProgress!;
      final left = (size.width - tileW) * position;
      final tile = Rect.fromLTWH(left, 0, tileW, size.height);
      const angle = 100 * math.pi / 180;
      final direction = Offset(math.sin(angle), -math.cos(angle));
      final half =
          (tileW * math.sin(angle).abs() +
              size.height * math.cos(angle).abs()) /
          2;
      canvas.save();
      canvas.clipPath(shape);
      canvas.drawRect(
        tile,
        Paint()
          ..shader = ui.Gradient.linear(
            tile.center - direction * half,
            tile.center + direction * half,
            [transparent, sheen!, transparent],
            const [0.3, 0.5, 0.7],
          ),
      );
      canvas.restore();
    }
    if (outline != null) {
      canvas.drawPath(
        superellipsePath(rect.inflate(5), r(radius + 5), inset: 1),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = outline!,
      );
    }
  }

  @override
  bool shouldRepaint(_CardPainter old) =>
      old.radius != radius ||
      old.surface != surface ||
      old.sheen != sheen ||
      old.sheenProgress != sheenProgress ||
      old.outline != outline;
}

/// `.lab-ff-state`: loader, title and timer while the take works; the failure and its actions.
class _StateView extends StatelessWidget {
  const _StateView({
    required this.take,
    required this.busy,
    required this.now,
    required this.onRetry,
    required this.onRemove,
    required this.stop,
  });
  final ImageTake take;
  final bool busy;
  final int now;
  final VoidCallback onRetry, onRemove;
  final Widget Function(Widget) stop;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final t = I18n.of(context).t;
    final vw = MediaQuery.maybeSizeOf(context)?.width ?? 800;
    // `font-size: clamp(14px, 2.4vw, 22px); line-height: round(1.2em, 1px)`.
    final title = _clamp(vw * 0.024, 14, 22);
    final titleStyle = TextStyle(
      fontSize: title,
      height: (title * 1.2).roundToDouble() / title,
      fontWeight: FontWeight.w500,
      color: c.ink,
    );
    final smallStyle = TextStyle(fontSize: 12, height: 16 / 12, color: c.muted);
    final children = busy
        ? <Widget>[
            Semantics(
              liveRegion: true,
              child: PixelLoader(size: 40, label: t('lab.board.creating')),
            ),
            Text(t('lab.board.takingShape'), style: titleStyle),
            Text(
              '${elapsed(take.createdAt, now)} · ${t('lab.board.usually')}',
              style: smallStyle,
            ),
          ]
        : <Widget>[
            Text(t('lab.board.didntWork'), style: titleStyle),
            Text(
              takeErrorText(
                (error: take.error, errorCode: take.errorCode),
                t,
                t('lab.board.tryAnother'),
              ),
              style: smallStyle,
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: stop(
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Button(
                      variant: ButtonVariant.elevated,
                      onClick: onRetry,
                      children: [
                        const LucideIcon(LucideIcons.refreshCw),
                        Text(t('lab.canvas.tryAgain')),
                      ],
                    ),
                    Button(
                      variant: ButtonVariant.destructive,
                      onClick: onRemove,
                      children: [
                        const LucideIcon(LucideIcons.trash2),
                        Text(t('lab.canvas.remove')),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ];
    return Semantics(
      liveRegion: !busy,
      container: true,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: DefaultTextStyle.merge(
              textAlign: TextAlign.center,
              style: TextStyle(color: c.ink),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                spacing: 8,
                children: children,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-ff-empty`: the orbit artwork, the welcome and the starter prompts.
class _Welcome extends StatelessWidget {
  const _Welcome({
    required this.signedIn,
    required this.starters,
    required this.onStarter,
  });
  final bool signedIn;
  final List<BoardStarter> starters;
  final ValueChanged<String> onStarter;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final t = I18n.of(context).t;
    final vw = MediaQuery.maybeSizeOf(context)?.width ?? 800;
    final title = _clamp(vw * 0.03, 20, 26);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 460),
      child: DefaultTextStyle.merge(
        textAlign: TextAlign.center,
        style: TextStyle(color: c.ink),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 10,
          children: [
            const PixelArtwork(
              variant: PixelVariant.orbit,
              seed: 'image-canvas',
              size: 84,
              tone: PixelTone.muted,
              animated: true,
            ),
            Text(
              t('lab.board.endless'),
              style: TextStyle(
                fontSize: title,
                // `line-height: round(1.15em, 1px)`.
                height: (title * 1.15).roundToDouble() / title,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.03 * title,
              ),
            ),
            Text(
              signedIn
                  ? t('lab.board.describeBelow')
                  : t('lab.board.describeSignIn'),
              style: TextStyle(fontSize: 14, height: 1.5, color: c.muted),
            ),
            if (starters.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final starter in starters)
                      Button(
                        variant: ButtonVariant.elevated,
                        onClick: () => onStarter(starter.prompt),
                        children: [Text(starter.label)],
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Lucide's star, filled (`<Star fill="currentColor">`).
class _FilledStar extends StatelessWidget {
  const _FilledStar({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: IconTheme.of(context).size ?? 11,
    child: CustomPaint(painter: _StarPainter(color)),
  );
}

class _StarPainter extends CustomPainter {
  _StarPainter(this.color);
  final Color color;
  static const _points = [
    (12.0, 2.0),
    (15.09, 8.26),
    (22.0, 9.27),
    (17.0, 14.14),
    (18.18, 21.02),
    (12.0, 17.77),
    (5.82, 21.02),
    (7.0, 14.14),
    (2.0, 9.27),
    (8.91, 8.26),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 24;
    final path = Path()
      ..addPolygon([for (final (x, y) in _points) Offset(x * k, y * k)], true);
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2 * k
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_StarPainter old) => old.color != color;
}
