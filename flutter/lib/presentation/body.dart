import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../layout/size_reporter.dart';
import '../scroll/metrics.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';

/// The scrolling body of a presentation surface: a [ScrollArea] whose header and dock float over
/// the content. It hugs the content plus the floating chrome up to the height its parent allows
/// (then it scrolls), or takes all of that height with [fill]. The twin of `PresentationBody` in
/// `@feeef.dev/ui/presentation`.
class PresentationBody extends StatefulWidget {
  const PresentationBody({
    super.key,
    required this.label,
    this.top,
    this.bottom,
    this.fill = false,
    this.edgeGap,
    this.contentPadding,
    this.onNaturalHeight,
    this.controller,
    this.surface,
    this.radius,
    required this.child,
  });

  /// Accessible name of the scroll region.
  final String label;

  /// Chrome floating over the top, usually a [PresentationHeader]. Its height is reserved.
  final Widget? top;

  /// Chrome floating over the bottom, usually a [PresentationDock]. Its height is reserved.
  final Widget? bottom;

  /// False (default): as tall as the content plus its chrome, up to the height allowed, then it
  /// scrolls. True: takes all of that height (lists, full-height panes, sheets).
  final bool fill;

  /// Space between the floats and the edges. Default: the shell gap G.
  final double? edgeGap;

  /// Content padding. Default: the shell gap G; dialogs pass 16 (a card's inside).
  final double? contentPadding;

  /// Called with the natural height (content + reserved chrome) whenever it changes.
  final ValueChanged<double>? onNaturalHeight;

  /// The scroll controller (a sheet reads it to hand a drag over at the top).
  final ScrollController? controller;

  /// The surface colour under the floats' washes. Default: the theme's surface.
  final Color? surface;

  /// Corner radius of the scroll boundary.
  final double? radius;

  /// The content. Don't nest another vertical scroll view in it.
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(FlagProperty('fill', value: fill, ifTrue: 'fill'))
      ..add(DoubleProperty('edgeGap', edgeGap, defaultValue: null))
      ..add(
        DoubleProperty('contentPadding', contentPadding, defaultValue: null),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<double>?>.has(
          'onNaturalHeight',
          onNaturalHeight,
        ),
      )
      ..add(
        DiagnosticsProperty<ScrollController?>(
          'controller',
          controller,
          defaultValue: null,
        ),
      )
      ..add(ColorProperty('surface', surface, defaultValue: null))
      ..add(DoubleProperty('radius', radius, defaultValue: null));
  }

  @override
  State<PresentationBody> createState() => _PresentationBodyState();
}

class _PresentationBodyState extends State<PresentationBody> {
  double? _body;
  double _top = 0, _bottom = 0;
  double? _reported;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('bodyHeight', _body, defaultValue: null))
      ..add(DoubleProperty('topHeight', _top, defaultValue: 0.0))
      ..add(DoubleProperty('bottomHeight', _bottom, defaultValue: 0.0))
      ..add(DoubleProperty('naturalHeight', _reported, defaultValue: null));
  }

  void _set(void Function() update) {
    if (mounted) setState(update);
  }

  /// Body + the content padding (the floats' reservations) + the safe area, at least the floats
  /// with their edge gaps.
  double _natural(double gap, double padding) {
    final safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final top = widget.top == null ? 0.0 : _top;
    final bottom = widget.bottom == null ? 0.0 : _bottom;
    final chrome = top + bottom + (top > 0 ? gap : 0) + (bottom > 0 ? gap : 0);
    final content =
        (_body ?? 0) +
        scrollContentReserve(top, gap, padding) +
        scrollContentReserve(bottom, gap, padding) +
        safe.top +
        safe.bottom;
    return math.max(chrome, content).ceilToDouble();
  }

  @override
  Widget build(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    final gap = widget.edgeGap ?? s.shellGap;
    final padding = widget.contentPadding ?? s.shellGap;
    final natural = _natural(gap, padding);
    if (_body != null && natural != _reported) {
      _reported = natural;
      final report = widget.onNaturalHeight;
      if (report != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) report(natural);
        });
      }
    }
    Widget? measure(Widget? child, void Function(double) onHeight) =>
        child == null
        ? null
        : SizeReporter(
            onSize: (size) => _set(() => onHeight(size.height)),
            child: child,
          );
    final area = ScrollArea(
      label: widget.label,
      controller: widget.controller,
      top: measure(widget.top, (h) => _top = h),
      bottom: measure(widget.bottom, (h) => _bottom = h),
      edgeGap: gap,
      contentPadding: padding,
      surface: widget.surface,
      radius: widget.radius,
      // Measured at its own height (a Column lays it out unbounded), never stretched to the
      // area's min-height.
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizeReporter(
            onSize: (size) => _set(() => _body = size.height),
            child: widget.child,
          ),
        ],
      ),
    );
    if (widget.fill) return area;
    return LayoutBuilder(
      builder: (context, constraints) => SizedBox(
        height: math.max(0, math.min(natural, constraints.maxHeight)),
        child: area,
      ),
    );
  }
}
