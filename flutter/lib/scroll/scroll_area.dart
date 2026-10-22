import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'gradient_overlay.dart';
import 'metrics.dart';

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
    Widget float(Widget child, bool top) => Positioned(
      left: gap > safe.left ? gap : safe.left,
      right: gap > safe.right ? gap : safe.right,
      top: top ? gap + safe.top : null,
      bottom: top ? null : gap + safe.bottom,
      child: _SizeReporter(
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
                    bottomReserve + safe.bottom,
                  ),
                  child: widget.child,
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

/// Reports its child's size after every layout that changes it.
class _SizeReporter extends SingleChildRenderObjectWidget {
  const _SizeReporter({required this.onSize, super.child});
  final ValueChanged<Size> onSize;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSizeReporter(onSize);

  @override
  void updateRenderObject(BuildContext context, _RenderSizeReporter render) =>
      render.onSize = onSize;
}

class _RenderSizeReporter extends RenderProxyBox {
  _RenderSizeReporter(this.onSize);
  ValueChanged<Size> onSize;
  Size? _reported;

  @override
  void performLayout() {
    super.performLayout();
    if (size == _reported) return;
    _reported = size;
    final reported = size;
    WidgetsBinding.instance.addPostFrameCallback((_) => onSize(reported));
  }
}
