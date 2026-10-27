import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/semantics.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart' show GlassBar;
import '../i18n/i18n.dart';
import '../layout/size_reporter.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import 'gradient_overlay.dart';
import 'metrics.dart';
import 'pull_refresh.dart';
import 'pull_refresh_model.dart';
import 'reveal.dart';

/// Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes: the
/// twin of `ScrollArea` in `@feeef.dev/ui/scroll`. Fills its parent, which must have a bounded
/// height. Floats are measured, and their height (plus the edge gap on both sides) is reserved as
/// content padding, so nothing hides under them at the ends.
class ScrollArea extends StatefulWidget {
  const ScrollArea({
    super.key,
    required this.label,
    this.top,
    this.bottom,
    this.edgeGap,
    this.sideGap,
    this.contentPadding,
    this.gradient = true,
    this.topFadeHeight,
    this.bottomFadeHeight,
    this.surface,
    this.radius,
    this.controller,
    this.onRefresh,
    this.refreshController,
    required this.child,
  });

  /// Accessible name of the scroll region.
  final String label;

  /// Chrome floating over the top edge (toolbar, filter bar).
  final Widget? top;

  /// Chrome floating over the bottom edge (usually a Dock).
  final Widget? bottom;

  /// Space between a float and the area's edges; also added above and below it in the reservation.
  /// Default: the shell gap G ([SizeTokens.shellGap], 8).
  final double? edgeGap;

  /// Space between a float and the area's sides, when it differs from [edgeGap] (a scaffold's app
  /// bar uses [SizeTokens.toolbarInset]).
  final double? sideGap;

  /// Content padding: inline sides, and top/bottom when no float is present. Default: the shell
  /// gap G ([SizeTokens.shellGap], 8); cards bring their own inner padding.
  final double? contentPadding;

  /// Paints the dithered edge washes that fade content under the floats.
  final bool gradient;
  final double? topFadeHeight, bottomFadeHeight;

  /// Wash colour: the surface the area sits on (default: the theme surface).
  final Color? surface;

  /// Corner radius of the enclosing panel, which the washes follow (default: the panel radius).
  final double? radius;
  final ScrollController? controller;

  /// Turns on pull to refresh: on a touch screen, pulling down at the top past the threshold runs
  /// it, and the content stays open over a loader until the future completes. Screen readers get
  /// a Refresh action. A mouse never pulls, so also offer a Refresh button ([refreshController]).
  final Future<void> Function()? onRefresh;

  /// Runs [onRefresh] from code with the same loader and announcements, for a Refresh button.
  final RefreshController? refreshController;
  final Widget child;

  @override
  State<ScrollArea> createState() => _ScrollAreaState();
}

class _ScrollAreaState extends State<ScrollArea> {
  late final _own = ScrollController();
  ScrollController get _controller => widget.controller ?? _own;
  double _top = 0, _bottom = 0;

  /// Ticks when the scroll view's size or content changes, so the washes follow it.
  final _metrics = _Tick();

  // Pull to refresh: the pull (px), whether a refresh runs, and the touch that may become a pull.
  final _pull = MotionValue(0, 0.1);
  final _pullDistance = ValueNotifier<double>(0);
  late final void Function() _unsubscribePull;
  final _gate = PullGate();
  bool _refreshing = false;
  int? _pointer;
  Offset? _start;
  double? _origin;

  @override
  void initState() {
    super.initState();
    FocusManager.instance.addListener(_onFocus);
    _unsubscribePull = _pull.subscribe((v) => _pullDistance.value = v);
    widget.refreshController?.attachRefresh(_refresh);
  }

  @override
  void didUpdateWidget(ScrollArea old) {
    super.didUpdateWidget(old);
    if (old.refreshController != widget.refreshController) {
      old.refreshController?.attachRefresh(null);
      widget.refreshController?.attachRefresh(_refresh);
    }
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_onFocus);
    widget.refreshController?.attachRefresh(null);
    _unsubscribePull();
    _pull.stop();
    _pullDistance.dispose();
    _metrics.dispose();
    _own.dispose();
    super.dispose();
  }

  void _announce(String key) {
    if (!mounted) return;
    SemanticsService.sendAnnouncement(
      View.of(context),
      I18n.of(context).t(key),
      Directionality.of(context),
    );
  }

  /// Opens the loader, runs [ScrollArea.onRefresh], then closes on the kit springs (instantly
  /// under reduced motion).
  Future<void> _refresh() async {
    final refresh = widget.onRefresh;
    if (refresh == null || _refreshing) return;
    setState(() => _refreshing = true);
    widget.refreshController?.setRefreshing(true);
    _announce('lab.refresh.refreshing');
    final instant = reducedMotionOf(context);
    _pull.animateTo(pullRefreshHold, spring: Springs.release, instant: instant);
    try {
      await refresh();
    } catch (_) {
      // The app reports its own failures; the loader still closes.
    }
    if (!mounted) return;
    setState(() => _refreshing = false);
    widget.refreshController?.setRefreshing(false);
    _announce('lab.refresh.done');
    await _pull.animateTo(
      0,
      spring: Springs.smooth,
      instant: reducedMotionOf(context),
    );
  }

  ScrollPosition? get _position =>
      _controller.hasClients ? _controller.positions.last : null;

  void _pointerDown(PointerDownEvent event) {
    final position = _position;
    // Touch and stylus only: a mouse never pulls.
    if (_pointer != null ||
        event.kind == PointerDeviceKind.mouse ||
        event.kind == PointerDeviceKind.trackpad ||
        _refreshing ||
        position == null ||
        position.pixels > position.minScrollExtent + 0.5) {
      return;
    }
    _pointer = event.pointer;
    _start = event.position;
    _origin = null;
    _gate.touching = true;
  }

  void _pointerMove(PointerMoveEvent event) {
    if (event.pointer != _pointer || _start == null) return;
    final dy = event.position.dy - _start!.dy;
    if (_origin == null) {
      final dx = event.position.dx - _start!.dx;
      final position = _position;
      if (position == null ||
          position.pixels > position.minScrollExtent + 0.5 ||
          dy < -pullRefreshSlop ||
          dx.abs() > (dy > pullRefreshSlop ? dy : pullRefreshSlop)) {
        _endTouch();
        return;
      }
      if (dy <= pullRefreshSlop) return;
      // Travel counts from here, so crossing the slop never jumps.
      _origin = event.position.dy;
      _gate.pulling = true;
    }
    final box = context.findRenderObject() as RenderBox?;
    _pull.track(
      pullDistance(
        event.position.dy - _origin!,
        box?.size.height ?? 600,
        reduced: reducedMotionOf(context),
      ),
      event.timeStamp.inMicroseconds / 1000,
    );
  }

  void _pointerUp(PointerEvent event) {
    if (event.pointer != _pointer) return;
    final pulled = _origin != null;
    _endTouch();
    if (!pulled) return;
    // A cancelled pointer (the system took it) never refreshes.
    if (event is PointerUpEvent && pullRelease(_pull.get()).refresh) {
      _refresh();
    } else {
      _pull.animateTo(
        0,
        spring: Springs.release,
        instant: reducedMotionOf(context),
      );
    }
  }

  void _endTouch() {
    _pointer = null;
    _start = null;
    _origin = null;
    _gate
      ..touching = false
      ..pulling = false;
  }

  /// Keyboard focus moving to something under a float scrolls it clear, like the web
  /// viewport's `scroll-padding`. Flutter's own traversal only brings it to the viewport edge,
  /// so this runs after that, in the next frame. Pointer focus never scrolls.
  void _onFocus() {
    final manager = FocusManager.instance;
    if (manager.highlightMode != FocusHighlightMode.traditional) return;
    final target = manager.primaryFocus?.context;
    if (target == null || !_controller.hasClients) return;
    if (Scrollable.maybeOf(target)?.position != _position) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !target.mounted) return;
      revealScrollChild(_controller, target);
    });
  }

  void _measured(bool top, Size size) {
    final height = size.height;
    if ((top ? _top : _bottom) == height) return;
    setState(() => top ? _top = height : _bottom = height);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final shellGap = theme.sizes.shellGap;
    final edgeGap = widget.edgeGap ?? shellGap;
    final gap = edgeGap < 0 ? 0.0 : edgeGap;
    final side = widget.sideGap == null
        ? gap
        : (widget.sideGap! < 0 ? 0.0 : widget.sideGap!);
    final contentPadding = widget.contentPadding ?? shellGap;
    final padding = contentPadding < 0 ? 0.0 : contentPadding;
    final topReserve = scrollContentReserve(
      widget.top == null ? 0 : _top,
      gap,
      padding,
    );
    final bottomReserve = scrollContentReserve(
      widget.bottom == null ? 0 : _bottom,
      gap,
      padding,
    );
    final safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    // Space a host's own floating chrome (a tab bar) takes over this area's bottom edge.
    final extra = ScrollExtraBottom.of(context);
    Widget float(Widget child, bool top) => Positioned(
      left: side > safe.left ? side : safe.left,
      right: side > safe.right ? side : safe.right,
      top: top ? gap + safe.top : null,
      bottom: top ? null : gap + extra + safe.bottom,
      child: SizeReporter(
        onSize: (size) => _measured(top, size),
        child: Center(heightFactor: 1, child: child),
      ),
    );
    final refreshable = widget.onRefresh != null;
    Widget viewport = Semantics(
      container: true,
      label: widget.label,
      // Screen readers refresh without a gesture.
      customSemanticsActions: refreshable
          ? {
              CustomSemanticsAction(
                label: I18n.of(context).t('lab.refresh.action'),
              ): _refresh,
            }
          : null,
      child: LayoutBuilder(
        builder: (context, constraints) =>
            NotificationListener<ScrollMetricsNotification>(
              onNotification: (_) {
                _metrics.tick();
                return false;
              },
              child: SingleChildScrollView(
                controller: _controller,
                physics: refreshable ? PullScrollPhysics(_gate) : null,
                // The content is its own layer: a scroll step moves it instead of painting all of
                // it again (a SingleChildScrollView adds no boundary of its own, unlike lists).
                child: RepaintBoundary(
                  child: ConstrainedBox(
                    // min-height: 100% of the viewport, padding included.
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                        padding,
                        topReserve + safe.top,
                        padding,
                        bottomReserve + extra + safe.bottom,
                      ),
                      // Nested areas start from zero (.lab-scroll-content > * resets it).
                      child: ScrollRevealPadding(
                        // scroll-padding: what revealScrollChild keeps clear.
                        padding: EdgeInsets.only(
                          top: topReserve + safe.top,
                          bottom: bottomReserve + extra + safe.bottom,
                        ),
                        child: ScrollExtraBottom(
                          value: 0,
                          child: ScrollTopReserve(
                            value: topReserve + safe.top,
                            child: widget.child,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
      ),
    );
    if (refreshable) {
      // The pull moves the whole viewport down (transform only); the loader waits in the gap.
      viewport = Listener(
        onPointerDown: _pointerDown,
        onPointerMove: _pointerMove,
        onPointerUp: _pointerUp,
        onPointerCancel: _pointerUp,
        child: ValueListenableBuilder<double>(
          valueListenable: _pullDistance,
          // Always the same Transform, so the scroll view keeps its state when a pull starts.
          builder: (context, distance, child) =>
              Transform.translate(offset: Offset(0, distance), child: child),
          child: viewport,
        ),
      );
    }
    return Stack(
      fit: StackFit.expand,
      clipBehavior: Clip.hardEdge,
      children: [
        viewport,
        if (widget.gradient)
          ScrollGradientOverlay(
            controller: _controller,
            metrics: _metrics,
            topHeight:
                widget.topFadeHeight ??
                (_top + gap * 2).clamp(100, double.infinity),
            bottomHeight:
                widget.bottomFadeHeight ??
                (_bottom + gap * 2).clamp(140, double.infinity),
            color: widget.surface ?? theme.colors.surface,
            radius: widget.radius ?? theme.sizes.radiusPanel,
          ),
        // Over the washes, under the floats.
        if (refreshable)
          Positioned(
            left: 0,
            right: 0,
            top: topReserve + safe.top,
            child: IgnorePointer(
              child: Align(
                alignment: Alignment.topCenter,
                heightFactor: 1,
                child: ValueListenableBuilder<double>(
                  valueListenable: _pullDistance,
                  builder: (context, distance, _) => PullRefreshIndicator(
                    distance: distance,
                    refreshing: _refreshing,
                  ),
                ),
              ),
            ),
          ),
        if (widget.top != null) float(GlassBar(child: widget.top!), true),
        if (widget.bottom != null)
          float(GlassBar(child: widget.bottom!), false),
      ],
    );
  }
}

/// Extra bottom space a host reserves inside its scroll areas for its own floating chrome (a tab
/// bar): the twin of the web kit's `--lab-scroll-extra-bottom`. A [TabView] provides it to every
/// panel; a ScrollArea adds it to its bottom reservation and lifts its bottom float by it, and
/// resets it to 0 for nested content (`ScrollExtraBottom(value: 0, …)`).
class ScrollExtraBottom extends InheritedWidget {
  const ScrollExtraBottom({
    super.key,
    required this.value,
    required super.child,
  });

  /// Extra bottom space in px, on top of the area's own reserve and the safe area.
  final double value;

  /// The nearest reservation, or 0 when there is none.
  static double of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ScrollExtraBottom>()?.value ??
      0;

  @override
  bool updateShouldNotify(ScrollExtraBottom old) => old.value != value;
}

/// The space a [ScrollArea] reserves at its top for its top float (plus the safe area): the twin
/// of the web kit's `--lab-scroll-top-reserve`, for content that positions sticky or floating
/// parts below the area's top chrome.
class ScrollTopReserve extends InheritedWidget {
  const ScrollTopReserve({
    super.key,
    required this.value,
    required super.child,
  });

  /// Reserved top space in px.
  final double value;

  /// The nearest reservation, or 0 when there is none.
  static double of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ScrollTopReserve>()?.value ??
      0;

  @override
  bool updateShouldNotify(ScrollTopReserve old) => old.value != value;
}

class _Tick extends ChangeNotifier {
  void tick() => notifyListeners();
}
