import 'package:flutter/widgets.dart';

import '../layout/size_reporter.dart';
import '../theme.dart';
import 'gradient_overlay.dart';
import 'metrics.dart';
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
    this.edgeGap = 12,
    this.sideGap,
    this.contentPadding = 24,
    this.gradient = true,
    this.topFadeHeight,
    this.bottomFadeHeight,
    this.surface,
    this.radius,
    this.controller,
    required this.child,
  });

  /// Accessible name of the scroll region.
  final String label;

  /// Chrome floating over the top edge (toolbar, filter bar).
  final Widget? top;

  /// Chrome floating over the bottom edge (usually a Dock).
  final Widget? bottom;

  /// Space between a float and the area's edges; also added above and below it in the reservation.
  final double edgeGap;

  /// Space between a float and the area's sides, when it differs from [edgeGap] (a scaffold's app
  /// bar uses [SizeTokens.toolbarInset]).
  final double? sideGap;

  /// Content padding: inline sides, and top/bottom when no float is present.
  final double contentPadding;

  /// Paints the dithered edge washes that fade content under the floats.
  final bool gradient;
  final double? topFadeHeight, bottomFadeHeight;

  /// Wash colour: the surface the area sits on (default: the theme surface).
  final Color? surface;

  /// Corner radius of the enclosing panel, which the washes follow (default: the panel radius).
  final double? radius;
  final ScrollController? controller;
  final Widget child;

  @override
  State<ScrollArea> createState() => _ScrollAreaState();
}

class _ScrollAreaState extends State<ScrollArea> {
  late final _own = ScrollController();
  ScrollController get _controller => widget.controller ?? _own;
  double _top = 0, _bottom = 0;

  @override
  void dispose() {
    _own.dispose();
    super.dispose();
  }

  void _measured(bool top, Size size) {
    final height = size.height;
    if ((top ? _top : _bottom) == height) return;
    setState(() => top ? _top = height : _bottom = height);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final gap = widget.edgeGap < 0 ? 0.0 : widget.edgeGap;
    final side = widget.sideGap == null
        ? gap
        : (widget.sideGap! < 0 ? 0.0 : widget.sideGap!);
    final padding = widget.contentPadding < 0 ? 0.0 : widget.contentPadding;
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
    return Stack(
      fit: StackFit.expand,
      clipBehavior: Clip.hardEdge,
      children: [
        Semantics(
          container: true,
          label: widget.label,
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              controller: _controller,
              child: ConstrainedBox(
                // min-height: 100% of the viewport, padding included.
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
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
        if (widget.gradient)
          ScrollGradientOverlay(
            controller: _controller,
            topHeight:
                widget.topFadeHeight ??
                (_top + gap * 2).clamp(100, double.infinity),
            bottomHeight:
                widget.bottomFadeHeight ??
                (_bottom + gap * 2).clamp(140, double.infinity),
            color: widget.surface ?? theme.colors.surface,
            radius: widget.radius ?? theme.sizes.radiusPanel,
          ),
        if (widget.top != null) float(widget.top!, true),
        if (widget.bottom != null) float(widget.bottom!, false),
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
