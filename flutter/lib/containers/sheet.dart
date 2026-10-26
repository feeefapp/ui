import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../layout/size_reporter.dart';
import '../i18n/i18n.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../presentation/body.dart';
import '../presentation/header.dart';
import '../presentation/host.dart';
import '../presentation/motion.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import 'sheet_model.dart';

export 'sheet_model.dart';

/// What a [Sheet] becomes on wide screens.
enum SheetRegular {
  /// A centered dialog (the default).
  dialog,

  /// Still a bottom sheet, kept a readable width.
  sheet,
}

/// The page behind sheets (`[data-lab-sheet-backdrop]` in the web kit): a modal [Sheet] below it
/// makes it recede (move down, scale back, round its corners) as a large sheet rises. Put it
/// around the page content, below the [Overlay] the sheet presents in.
class SheetBackdrop extends StatefulWidget {
  const SheetBackdrop({super.key, required this.child});

  /// The page.
  final Widget child;

  @override
  State<SheetBackdrop> createState() => _SheetBackdropState();
}

class _SheetBackdropState extends State<SheetBackdrop> {
  final _recede = _Recede();

  @override
  void dispose() {
    _recede.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _BackdropScope(
    recede: _recede,
    child: ValueListenableBuilder<double>(
      valueListenable: _recede,
      child: widget.child,
      builder: (context, q, child) {
        // The same widgets at rest (identity, no clip), so the page below never remounts.
        // transform-origin 50% 0: translate3d(0, 10q px, 0) scale(1 - 0.06q); clip inset(0 round 22q).
        return Transform(
          alignment: Alignment.topCenter,
          transform: Matrix4.translationValues(0, q * 10, 0)
            ..scaleByDouble(1 - q * 0.06, 1 - q * 0.06, 1, 1),
          child: ClipPath(
            clipBehavior: q == 0 ? Clip.none : Clip.antiAlias,
            clipper: _SuperellipseClipper([q * 22, q * 22, q * 22, q * 22]),
            child: child,
          ),
        );
      },
    ),
  );
}

class _Recede extends ValueNotifier<double> {
  _Recede() : super(0);
  bool disposed = false;
  @override
  void dispose() {
    disposed = true;
    super.dispose();
  }
}

class _BackdropScope extends InheritedWidget {
  const _BackdropScope({required this.recede, required super.child});
  final ValueNotifier<double> recede;
  @override
  bool updateShouldNotify(_BackdropScope old) => old.recede != recede;
}

/// A sheet that rises from the bottom, like iOS: the twin of `Sheet` in
/// `@feeef.dev/ui/containers`. It rests at [detents] (half, full, fit or custom heights), follows
/// the finger when dragged, snaps to the detent a flick projects to, and closes when flicked
/// down. Scrolling inside hands off to dragging the sheet at the top. On wide screens it becomes
/// a centered dialog. The page behind dims and, under a full-height sheet, a [SheetBackdrop]
/// recedes. Keep it mounted and toggle [open] so the exit can run, or show it with [showSheet]
/// and close it with `Navigator.pop(context, value)`.
class Sheet extends StatefulWidget {
  const Sheet({
    super.key,
    this.open = true,
    this.onOpenChange,
    required this.label,
    this.title,
    this.leading,
    this.trailing = const [],
    this.showClose = true,
    this.header,
    this.dock,
    required this.child,
    this.detents = const [SheetDetent.large],
    this.detent,
    this.defaultDetent,
    this.onDetentChange,
    this.dismissible = true,
    this.grabber,
    this.modal = true,
    this.regular = SheetRegular.dialog,
    this.regularBreakpoint = 720,
    this.container = false,
    this.recede = true,
    this.contentPadding,
    this.initialFocus,
    this.returnFocus,
  });

  /// Shows the sheet. It animates in and out; keep it mounted and toggle this.
  final bool open;

  /// Called with `false` when the person dismisses it (drag down, scrim, Escape, close bubble),
  /// never `true`.
  final ValueChanged<bool>? onOpenChange;

  /// Accessible name. Also names the close button.
  final String label;

  /// Visible title in the floating header's title bubble.
  final Widget? title;

  /// Custom content at the start instead of the title bubble (a search field, a back button with
  /// a heading). The close bubble stays.
  final Widget? leading;

  /// More header bubbles before the close bubble (a Reset, a Done).
  final List<Widget> trailing;

  /// Shows the close bubble at the end of the header. Default true.
  final bool showClose;

  /// Replaces the whole floating header (title, trailing, close).
  final Widget? header;

  /// Floating chrome over the bottom, usually a [PresentationDock] with the sheet's main action.
  final Widget? dock;

  /// Sheet content; it scrolls inside the sheet under the floating header and dock.
  final Widget child;

  /// Heights the sheet rests at, in any order. Default `[SheetDetent.large]`.
  final List<SheetDetent> detents;

  /// Controlled detent. Pair with [onDetentChange].
  final SheetDetent? detent;

  /// Detent to open at when uncontrolled. Default: the first in [detents].
  final SheetDetent? defaultDetent;

  /// Called when the person drags or taps the grabber to another detent.
  final ValueChanged<SheetDetent>? onDetentChange;

  /// Whether dragging down, the scrim and Escape close it. Default true. The close bubble always
  /// does.
  final bool dismissible;

  /// Shows the grabber. Default: when there is more than one detent.
  final bool? grabber;

  /// `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet;
  /// the sheet then has no scrim and no Escape dismissal.
  final bool modal;

  /// What the sheet becomes on wide screens.
  final SheetRegular regular;

  /// Width in px from which the sheet is "regular" (wide). Default 720.
  final double regularBreakpoint;

  /// Renders in place, filling its parent (for example a `Positioned.fill` in a [Stack]), instead
  /// of in the nearest [Overlay]: for embedded previews.
  final bool container;

  /// On phones, let a [SheetBackdrop] behind recede as a large sheet rises. Default true.
  final bool recede;

  /// Content padding (the shell gap G when null; list sections bring their own inset).
  final double? contentPadding;

  /// Focused when the sheet opens. Default: the sheet itself.
  final FocusNode? initialFocus;

  /// Focused after it closes, when the control that opened it may be gone.
  final FocusNode? returnFocus;

  @override
  State<Sheet> createState() => _SheetState();
}

typedef _Key = (bool, Size?, double, double, bool, double, double);

/// Reduced motion: a sheet leaves with this crossfade instead of sliding down.
const _sheetFade = Duration(milliseconds: 160);

class _SheetState extends State<Sheet> {
  final _scroll = ScrollController();
  final _hostKey = GlobalKey();
  final _grabberKey = GlobalKey();
  final _topKey = GlobalKey();
  final _bottomKey = GlobalKey();
  PresentationRouteScope? _route;
  bool _lastOpen = false;

  /// Whether the sheet is presented (open, or running its exit).
  bool _mounted = false;

  // Motion: `visible` is the sheet's visible height (sheet); `shown` 0–1 and `lift` px (dialog).
  final _visible = MotionValue(0, 0.5);
  final _shown = MotionValue(0, 0.004);
  final _lift = MotionValue(0, 0.5);

  /// The dialog's closing fade (1 at rest): a fixed curve that ends on time, like Modal's.
  final _dialogFade = MotionValue(1, 0.002);

  /// Ticks on every motion frame: only the panel's position, fade and the dim rebuild, never the
  /// panel's content.
  final _tick = ValueNotifier(0);
  late final List<void Function()> _unsubscribe;

  Size? _host;

  /// The body's natural height (content + reserved chrome + safe area), from [PresentationBody].
  double? _bodyNatural;
  late int _localIndex;
  bool _presented = false;
  bool _dragging = false;
  bool _fading = false;
  bool _focusVisible = false;
  int _exitGeneration = 0;
  _Key? _synced;
  ValueNotifier<double>? _backdrop;

  // Drag session.
  double _dragOrigin = 0, _dragStart = 0;
  VelocityTracker? _pointerTracker, _valueTracker;

  @override
  void initState() {
    super.initState();
    _localIndex = math.max(
      0,
      widget.detents.indexOf(widget.defaultDetent ?? widget.detents.first),
    );
    _unsubscribe = [
      _visible.subscribe(_paint),
      _shown.subscribe(_paint),
      _lift.subscribe(_paint),
      _dialogFade.subscribe(_paint),
    ];
  }

  /// Open: the hosting route's state when [showSheet] hosts it, otherwise [Sheet.open].
  bool get _open => _route?.open ?? widget.open;

  /// Asks to close: pops the hosting route, or calls `onOpenChange(false)`.
  void _close() {
    if (!_open) return;
    final route = _route;
    if (route != null) {
      route.dismiss();
    } else {
      widget.onOpenChange?.call(false);
    }
  }

  void _syncOpen() {
    if (_open && !_lastOpen) _enter();
    _lastOpen = _open;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _backdrop = context.getInheritedWidgetOfExactType<_BackdropScope>()?.recede;
    _route = PresentationRouteScope.maybeOf(context);
    _syncOpen();
  }

  @override
  void didUpdateWidget(Sheet old) {
    super.didUpdateWidget(old);
    _syncOpen();
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    _visible.stop();
    _shown.stop();
    _lift.stop();
    _dialogFade.stop();
    _tick.dispose();
    // The tree is locked while it unmounts: release the backdrop after this frame.
    final backdrop = _backdrop;
    if (backdrop is _Recede && backdrop.value != 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!backdrop.disposed) backdrop.value = 0;
      });
    }
    _scroll.dispose();
    super.dispose();
  }

  bool get _reduced => reducedMotionOf(context);

  void _enter() {
    _exitGeneration++;
    _mounted = true;
  }

  void _paint(double _) {
    if (!mounted) return;
    _tick.value++;
    _paintRecede();
  }

  // ---- Measured state ----

  EdgeInsets get _safe => MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
  bool get _ready => _host != null && _bodyNatural != null;
  bool get _showGrabber =>
      _presentation == SheetRegular.sheet &&
      (widget.grabber ?? widget.detents.length > 1);

  SheetRegular get _presentation =>
      _host != null &&
          _host!.width >= widget.regularBreakpoint &&
          widget.regular == SheetRegular.dialog
      ? SheetRegular.dialog
      : SheetRegular.sheet;

  SheetMetrics? get _metrics {
    final host = _host;
    if (host == null) return null;
    final safe = _safe;
    // The grabber row and the body (content, float reservations and safe area).
    final natural = (_showGrabber ? 20 : 0) + (_bodyNatural ?? 0);
    return SheetMetrics(
      hostHeight: host.height,
      topInset: 10 + safe.top,
      natural: natural.ceilToDouble(),
    );
  }

  List<double> get _heights {
    final m = _metrics;
    return m == null ? const [] : detentHeights(widget.detents, m);
  }

  int get _index {
    final controlled = widget.detent;
    if (controlled != null) {
      return math.max(0, widget.detents.indexOf(controlled));
    }
    return math.min(_localIndex, widget.detents.length - 1);
  }

  double get _target {
    final h = _heights;
    final i = _index;
    return i < h.length ? h[i] : 0;
  }

  double get _dialogHeight {
    final m = _metrics;
    return m == null ? 0 : math.min(m.natural, m.hostHeight - 64);
  }

  void _paintRecede() {
    final backdrop = _backdrop, m = _metrics;
    if (backdrop == null || m == null) return;
    final q =
        widget.recede &&
            widget.modal &&
            _mounted &&
            _presentation == SheetRegular.sheet &&
            !_reduced
        ? sheetRecede(_visible.get(), m.hostHeight - m.topInset)
        : 0.0;
    if (backdrop.value != q) backdrop.value = q;
  }

  // ---- Present, follow detent and size changes, and leave ----

  void _scheduleSync() {
    if (!_ready) return;
    final _Key key = (
      _open,
      _host,
      _metrics!.topInset,
      _metrics!.natural,
      _presentation == SheetRegular.dialog,
      _target,
      _dialogHeight,
    );
    if (key == _synced) return;
    _synced = key;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _sync();
    });
  }

  Future<bool> _moveTo(
    double height, [
    Spring spring = Springs.smooth,
    double? velocity,
  ]) => _visible.animateTo(height, spring: spring, velocity: velocity);

  void _sync() {
    if (!_ready || !_mounted) return;
    final reduced = _reduced;
    final dialog = _presentation == SheetRegular.dialog;
    final motion = motionOf(context);
    if (!_open) {
      _presented = false;
      final generation = _exitGeneration;
      // Unmounting the host returns focus.
      void done() {
        if (!mounted || _open || generation != _exitGeneration) return;
        setState(() {
          _mounted = false;
          _fading = false;
          _synced = null;
        });
        _visible.set(0);
        _shown.set(0);
        _lift.set(0);
        _dialogFade.set(1);
        _backdrop?.value = 0;
      }

      if (dialog) {
        // Like Modal: the panel and the dim fade out on one fixed curve that ends exactly at its
        // length (a spring's tail would leave it faintly on screen), while the move eases back.
        final fade = motionFade(motion, PopMotion.fadeOut);
        _shown.animateTo(
          0,
          spring: reduced
              ? Spring(duration: fade.inMicroseconds / 1e6, bounce: 0)
              : Springs.smooth,
          instant: fade == Duration.zero,
        );
        _dialogFade
            .easeTo(0, fade * _dialogFade.get(), curve: PopMotion.fadeCurve)
            .then((arrived) => arrived ? done() : null);
      } else if (reduced) {
        // The panel fades out (_sheetFade), then unmounts once the fade has ended.
        final fade = motionFade(motion, _sheetFade);
        setState(() => _fading = true);
        if (fade == Duration.zero) {
          done();
        } else {
          Timer(fade + const Duration(milliseconds: 10), done);
        }
      } else {
        _visible
            .animateTo(0, spring: Springs.smooth)
            .then((arrived) => arrived ? done() : null);
      }
      return;
    }
    if (_fading) setState(() => _fading = false);
    if (dialog) {
      _paintRecede();
      if (!_presented) {
        _presented = true;
        // Opened again while fading out: the fade turns back from where it is.
        _dialogFade.easeTo(
          1,
          motionFade(motion, PopMotion.fadeIn) * (1 - _dialogFade.get()),
          curve: PopMotion.fadeCurve,
        );
        if (!_shown.isAnimating) _shown.set(0);
        final fade = motionFade(motion, const Duration(milliseconds: 200));
        _shown.animateTo(
          1,
          spring: reduced
              ? Spring(duration: fade.inMicroseconds / 1e6, bounce: 0)
              : Springs.smooth,
          instant: fade == Duration.zero,
        );
      }
      return;
    }
    final target = _target;
    if (!_presented) {
      _presented = true;
      if (reduced) {
        _visible.set(target);
        return;
      }
      // Reopened while still leaving: turn around from where it is.
      if (!_visible.isAnimating) _visible.set(0);
      _moveTo(target);
      return;
    }
    if (_dragging) return;
    if (_visible.isAnimating) {
      // The detent moved while rising (a fit sheet's content measured late): retarget in flight.
      if ((_visible.target - target).abs() >= 1) _moveTo(target);
    } else if ((_visible.get() - target).abs() < 1) {
      _visible.set(target);
    } else {
      _moveTo(target);
    }
  }

  void _setDetentIndex(int next) {
    final current = _index;
    if (widget.detent == null) setState(() => _localIndex = next);
    if (next != current) widget.onDetentChange?.call(widget.detents[next]);
  }

  void _cycle(int step) {
    final heights = _heights;
    if (heights.isEmpty) return;
    final order = [for (var i = 0; i < heights.length; i++) i]
      ..sort((a, b) => heights[a].compareTo(heights[b]));
    final at = order.indexOf(_index);
    _setDetentIndex(order[(at + step + order.length) % order.length]);
  }

  void _requestClose() {
    if (widget.dismissible) _close();
  }

  // ---- Drag ----

  bool _contains(GlobalKey key, Offset global) {
    final box = key.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return false;
    return (Offset.zero & box.size).contains(box.globalToLocal(global));
  }

  /// The grabber row and the floating chrome: a finger there drags, never scrolls.
  bool _isChrome(Offset global) =>
      _contains(_grabberKey, global) ||
      _contains(_topKey, global) ||
      _contains(_bottomKey, global);

  double _localY(Offset global) {
    final box = _hostKey.currentContext?.findRenderObject();
    return box is RenderBox ? box.globalToLocal(global).dy : global.dy;
  }

  bool _canBegin(PointerDeviceKind kind, Offset global) =>
      _open &&
      _ready &&
      (kind == PointerDeviceKind.touch ||
          kind == PointerDeviceKind.stylus ||
          kind == PointerDeviceKind.invertedStylus ||
          _isChrome(global));

  bool _shouldStart(int direction, Offset global) {
    if (_presentation == SheetRegular.dialog) {
      return direction == 1 && widget.dismissible && _isChrome(global);
    }
    if (_isChrome(global)) return true;
    // Down: only when the content is scrolled to the top. Up: while the sheet can still grow.
    if (direction == 1) return !(_scroll.hasClients && _scroll.offset > 1);
    return _visible.get() < _heights.reduce(math.max) - 1;
  }

  void _onStart(PointerEvent event) {
    _dragging = true;
    _dragOrigin = _localY(event.position);
    _pointerTracker = VelocityTracker.withKind(event.kind)
      ..addPosition(event.timeStamp, Offset(0, _dragOrigin));
    final value = _presentation == SheetRegular.dialog ? _lift : _visible;
    value.stop();
    _dragStart = value.get();
    _valueTracker = VelocityTracker.withKind(event.kind)
      ..addPosition(event.timeStamp, Offset(0, _dragStart));
  }

  void _onMove(PointerEvent event) {
    final y = _localY(event.position);
    _pointerTracker?.addPosition(event.timeStamp, Offset(0, y));
    final move = y - _dragOrigin;
    if (_presentation == SheetRegular.dialog) {
      final lift = _dragStart + move;
      _lift.set(lift < 0 ? -rubberBand(-lift, 300) * 0.5 : lift);
      _valueTracker?.addPosition(event.timeStamp, Offset(0, _lift.get()));
      return;
    }
    _visible.set(
      dragHeight(
        _dragStart - move,
        _heights,
        _host?.height ?? 800,
        widget.dismissible,
      ),
    );
    _valueTracker?.addPosition(event.timeStamp, Offset(0, _visible.get()));
  }

  void _onEnd(bool cancelled) {
    _dragging = false;
    final vy = _pointerTracker?.getVelocity().pixelsPerSecond.dy ?? 0;
    final velocity = _valueTracker?.getVelocity().pixelsPerSecond.dy ?? 0;
    _pointerTracker = _valueTracker = null;
    if (_presentation == SheetRegular.dialog) {
      final away =
          !cancelled &&
          widget.dismissible &&
          projectMomentum(_lift.get(), vy, 0.99) > 160;
      if (away) {
        _close();
        _lift.animateTo(0, spring: Springs.smooth);
      } else {
        _lift.animateTo(0, spring: Springs.release, velocity: velocity);
      }
      return;
    }
    final heights = _heights;
    final landing = releaseTarget(
      _visible.get(),
      velocity,
      heights,
      widget.dismissible,
    );
    if (landing.dismiss && !cancelled) {
      // Leave at the finger's speed; the close that follows continues this same motion.
      _visible.animateTo(0, spring: Springs.smooth, velocity: velocity);
      _close();
      // A host that keeps the sheet open gets it back at its detent.
      Timer(const Duration(milliseconds: 400), () {
        if (mounted && _open && !_visible.isAnimating) _moveTo(_target);
      });
      return;
    }
    final next = landing.dismiss ? _index : landing.index;
    _setDetentIndex(next);
    _moveTo(
      next < heights.length ? heights[next] : landing.height,
      Springs.release,
      velocity,
    );
  }

  // ---- Build ----

  @override
  Widget build(BuildContext context) {
    _scheduleSync();
    return PresentationLayer(
      mounted: _mounted,
      inPlace: widget.container || _route != null,
      builder: _hostView,
    );
  }

  Widget _hostView(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final dialog = _presentation == SheetRegular.dialog;
    // Built once per change of state; motion frames only move, size or fade it.
    final content = RepaintBoundary(child: _panel(context, dialog));
    final motion = ListenableBuilder(
      listenable: _tick,
      child: content,
      builder: (context, content) => _motionView(context, content!, dialog),
    );
    Widget view = SizeReporter(
      key: _hostKey,
      onSize: (size) {
        if (size != _host) setState(() => _host = size);
      },
      child: motion,
    );
    if (!widget.modal) {
      // A non-modal sheet leaves the page usable around it: the host only hits the panel.
      view = PassThrough(child: view);
    }
    return PresentationRouteScope.none(
      child: PresentationHost(
        label: widget.label,
        modal: widget.modal,
        onEscape: () {
          if (_open && widget.modal) _requestClose();
        },
        initialFocus: widget.initialFocus,
        returnFocus: widget.returnFocus,
        child: DefaultTextStyle.merge(
          style: TextStyle(color: c.ink),
          child: view,
        ),
      ),
    );
  }

  /// The scrim and the panel at this motion frame.
  Widget _motionView(BuildContext context, Widget content, bool dialog) {
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    final host = _host;
    final v = _visible.get();
    final p = _shown.get().clamp(0.0, 1.0) * _dialogFade.get().clamp(0.0, 1.0);
    final heights = _heights;
    final scrimOpacity = !widget.modal || _fading || !_ready
        ? 0.0
        : dialog
        ? p
        : sheetDim(v, heights);

    // While the panel moves, its glass rides it as is (no springs of its own) and leaves with it.
    Widget panel = GlassInstant(
      instant:
          _visible.isAnimating ||
          _shown.isAnimating ||
          _dialogFade.isAnimating ||
          _dragging,
      child: content,
    );
    if (dialog) {
      final width = host == null ? 0.0 : math.min(560.0, host.width - 48);
      final shown = _shown.get();
      panel = Center(
        child: Opacity(
          opacity: p,
          child: Transform(
            alignment: Alignment.center,
            transform: Matrix4.translationValues(
              0,
              (1 - shown) * 28 + _lift.get(),
              0,
            )..scaleByDouble(0.96 + 0.04 * shown, 0.96 + 0.04 * shown, 1, 1),
            child: SizedBox(
              width: math.max(0, width),
              height: math.max(0, _dialogHeight),
              child: panel,
            ),
          ),
        ),
      );
    } else {
      // Wide screens keep a bottom sheet a readable width.
      final inset = host != null && host.width >= 720
          ? math.max(0.0, (host.width - 680) / 2)
          : 0.0;
      panel = Positioned(
        left: inset,
        right: inset,
        bottom: 0,
        height: math.max(0, v),
        child: AnimatedOpacity(
          opacity: _fading ? 0 : 1,
          duration: motionFade(motionOf(context), _sheetFade),
          child: panel,
        ),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        if (widget.modal)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _open ? _requestClose : null,
              child: ExcludeSemantics(
                child: Opacity(
                  opacity: scrimOpacity.clamp(0.0, 1.0),
                  // --lab-sheet-scrim: rgb(0 0 0 / 0.3), dark 0.55.
                  child: ColoredBox(color: black(dark ? 0.55 : 0.3)),
                ),
              ),
            ),
          ),
        Visibility(
          visible: _ready,
          maintainState: true,
          maintainAnimation: true,
          maintainSize: true,
          child: dialog ? panel : Stack(children: [panel]),
        ),
      ],
    );
  }

  Widget _panel(BuildContext context, bool dialog) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final dark = theme.brightness == Brightness.dark;
    final highContrast = MediaQuery.maybeHighContrastOf(context) ?? false;
    final sheetRadius = 28 * s.radiusScale;
    final radii = dialog
        ? [s.radiusPanel, s.radiusPanel, s.radiusPanel, s.radiusPanel]
        : [sheetRadius, sheetRadius, 0.0, 0.0];
    final header =
        widget.header ??
        PresentationHeader(
          title: widget.title,
          leading: widget.leading,
          trailing: widget.trailing,
          onClose: widget.showClose ? _close : null,
          closeLabel: I18n.of(context)
              .t('lab.composer.closeLabel', {'label': widget.label}),
        );
    final dock = widget.dock;
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_showGrabber) _grabberRow(context),
        Expanded(
          child: PresentationBody(
            label: widget.label,
            controller: _scroll,
            fill: true,
            contentPadding: widget.contentPadding,
            surface: c.surface,
            radius: dialog ? s.radiusPanel : sheetRadius,
            // Keyed so a drag that starts on the chrome is told from one on the content.
            top: KeyedSubtree(key: _topKey, child: header),
            bottom: dock == null
                ? null
                : KeyedSubtree(key: _bottomKey, child: dock),
            onNaturalHeight: (height) {
              if (height != _bodyNatural) setState(() => _bodyNatural = height);
            },
            child: widget.child,
          ),
        ),
      ],
    );
    return RawGestureDetector(
      gestures: {
        _SheetDragRecognizer:
            GestureRecognizerFactoryWithHandlers<_SheetDragRecognizer>(
              () => _SheetDragRecognizer(debugOwner: this),
              (r) => r
                ..canBegin = _canBegin
                ..shouldStart = _shouldStart
                ..onStart = _onStart
                ..onMove = _onMove
                ..onEnd = _onEnd,
            ),
      },
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        child: CustomPaint(
          painter: _PanelPainter(
            radii: radii,
            fill: c.surface,
            border: highContrast ? c.ink : null,
            // Sheet: 0 -10px 40px -12px rgb(0 0 0 / 0.22), dark 0.6.
            // Dialog: 0 30px 80px -24px rgb(0 0 0 / 0.4).
            shadow: dialog ? black(0.4) : black(dark ? 0.6 : 0.22),
            offsetY: dialog ? 30 : -10,
            blur: dialog ? 80 : 40,
            spread: dialog ? -24 : -12,
          ),
          child: ClipPath(
            clipper: _SuperellipseClipper(radii),
            // Taps inside the panel never reach the scrim.
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {},
              // Overflow hidden: while it leaves, the panel can be shorter than its grabber row.
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final height = math.max(constraints.maxHeight, 20.0);
                  return OverflowBox(
                    alignment: Alignment.topCenter,
                    minHeight: height,
                    maxHeight: height,
                    child: content,
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// A short pill; the whole row is a drag handle, the pill is a button that cycles heights.
  Widget _grabberRow(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return SizedBox(
      key: _grabberKey,
      height: 20,
      child: Center(
        child: Semantics(
          button: true,
          label: I18n.of(context).t('lab.sheet.grabber'),
          onIncrease: () => _cycle(1),
          onDecrease: () => _cycle(-1),
          child: FocusableActionDetector(
            mouseCursor: SystemMouseCursors.grab,
            onShowFocusHighlight: (value) =>
                setState(() => _focusVisible = value),
            shortcuts: const {
              SingleActivator(LogicalKeyboardKey.arrowUp): _CycleIntent(1),
              SingleActivator(LogicalKeyboardKey.arrowDown): _CycleIntent(-1),
            },
            actions: {
              ActivateIntent: CallbackAction<ActivateIntent>(
                onInvoke: (_) {
                  _cycle(1);
                  return null;
                },
              ),
              _CycleIntent: CallbackAction<_CycleIntent>(
                onInvoke: (intent) {
                  _cycle(intent.step);
                  return null;
                },
              ),
            },
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => _cycle(1),
              child: CustomPaint(
                size: const Size(64, 20),
                painter: _GrabberPainter(
                  pill: mixSrgb(c.ink, 0.22, transparent),
                  focus: _focusVisible
                      ? FocusRingStyle.of(context, inside: true)
                      : null,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CycleIntent extends Intent {
  const _CycleIntent(this.step);
  final int step;
}

class _SuperellipseClipper extends CustomClipper<Path> {
  const _SuperellipseClipper(this.radii);
  final List<double> radii;

  @override
  Path getClip(Size size) => superellipsePath(Offset.zero & size, radii);

  @override
  bool shouldReclip(_SuperellipseClipper old) => !_sameRadii(old.radii, radii);
}

bool _sameRadii(List<double> a, List<double> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// The panel's outer box-shadow (outside the shape only, like CSS), fill and forced-colors border.
class _PanelPainter extends CustomPainter {
  const _PanelPainter({
    required this.radii,
    required this.fill,
    required this.shadow,
    required this.offsetY,
    required this.blur,
    required this.spread,
    this.border,
  });

  final List<double> radii;
  final Color fill, shadow;
  final Color? border;
  final double offsetY, blur, spread;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    if (rect.isEmpty) return;
    final shape = superellipsePath(rect, radii);
    final shadowRect = rect.inflate(spread);
    if (!shadowRect.isEmpty) {
      canvas.save();
      canvas.clipPath(
        Path.combine(
          PathOperation.difference,
          Path()..addRect(rect.inflate(blur * 2 + offsetY.abs())),
          shape,
        ),
      );
      canvas.drawPath(
        superellipsePath(shadowRect, [
          for (final r in radii) math.max(0.0, r + spread),
        ]).shift(Offset(0, offsetY)),
        Paint()
          ..color = shadow
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur / 2),
      );
      canvas.restore();
    }
    canvas.drawPath(shape, Paint()..color = fill);
    final b = border;
    if (b != null) {
      canvas.drawPath(
        superellipsePath(rect, radii, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = b,
      );
    }
  }

  @override
  bool shouldRepaint(_PanelPainter old) =>
      !_sameRadii(old.radii, radii) ||
      old.fill != fill ||
      old.shadow != shadow ||
      old.border != border ||
      old.offsetY != offsetY ||
      old.blur != blur ||
      old.spread != spread;
}

/// `.lab-sheet-grabber::before`: 36×5 at (14, 7), radius 3; the keyboard focus ring just inside,
/// radius 10.
class _GrabberPainter extends CustomPainter {
  const _GrabberPainter({required this.pill, this.focus});
  final Color pill;
  final FocusRingStyle? focus;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawPath(
      superellipsePath(const Rect.fromLTWH(14, 7, 36, 5), [3, 3, 3, 3]),
      Paint()..color = pill,
    );
    final f = focus;
    if (f != null) paintFocusRing(canvas, Offset.zero & size, 10, f);
  }

  @override
  bool shouldRepaint(_GrabberPainter old) =>
      old.pill != pill || old.focus != focus;
}

/// Vertical drag for the sheet that decides within 4px (before a scroll view's touch slop), so it
/// can take the gesture from the content when the sheet should move, or hand it back.
class _SheetDragRecognizer extends OneSequenceGestureRecognizer {
  _SheetDragRecognizer({super.debugOwner});

  late bool Function(PointerDeviceKind kind, Offset global) canBegin;
  late bool Function(int direction, Offset global) shouldStart;
  late void Function(PointerEvent event) onStart;
  late void Function(PointerEvent event) onMove;
  late void Function(bool cancelled) onEnd;

  int? _pointer;
  Offset _down = Offset.zero;
  bool _decided = false, _started = false;

  @override
  bool isPointerAllowed(PointerDownEvent event) =>
      _pointer == null &&
      super.isPointerAllowed(event) &&
      canBegin(event.kind, event.position);

  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    _pointer = event.pointer;
    _down = event.position;
    _decided = _started = false;
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event.pointer != _pointer) return;
    if (event is PointerMoveEvent) {
      if (_started) {
        onMove(event);
        return;
      }
      if (_decided) return;
      final d = event.position - _down;
      if (d.distance < 4) return;
      _decided = true;
      if (d.dy.abs() < d.dx.abs() || !shouldStart(d.dy >= 0 ? 1 : -1, _down)) {
        resolve(GestureDisposition.rejected);
        stopTrackingPointer(event.pointer);
        return;
      }
      resolve(GestureDisposition.accepted);
      _started = true;
      // Measured from here so the sheet does not jump by the threshold distance.
      onStart(event);
    } else if (event is PointerUpEvent || event is PointerCancelEvent) {
      if (_started) {
        _started = false;
        onEnd(event is PointerCancelEvent);
      } else {
        resolve(GestureDisposition.rejected);
      }
      stopTrackingPointer(event.pointer);
    }
  }

  @override
  void acceptGesture(int pointer) {}

  @override
  void rejectGesture(int pointer) {
    if (_started) {
      _started = false;
      onEnd(true);
    }
    stopTrackingPointer(pointer);
  }

  @override
  void didStopTrackingLastPointer(int pointer) => _pointer = null;

  @override
  String get debugDescription => 'sheet drag';
}
