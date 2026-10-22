import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/tokens.dart';
import 'navigation_stack.dart';

/// JavaScript's `Math.round`: halves round up (toward +∞), unlike Dart's `round()`.
double jsRound(double value) => (value + 0.5).floorToDouble();

/// The list width a split view commits: [next] clamped to [min]–[max] and rounded like the web
/// kit (`Math.round`).
double splitListWidth(double next, double min, double max) =>
    jsRound(next.clamp(min, max < min ? min : max));

/// A list beside its detail, like Mail on iPad: two columns with a resizable divider on wide
/// screens, collapsing into one [NavigationStack] (list → detail, swipe back) on narrow ones. The
/// same pages render in both. The twin of `SplitView` in `@feeef.dev/ui/containers`.
class SplitView extends StatefulWidget {
  const SplitView({
    super.key,
    required this.list,
    this.detail = const [],
    this.placeholder,
    required this.onBack,
    this.listWidth,
    this.defaultListWidth = 360,
    this.onListWidthChange,
    this.minListWidth = 280,
    this.maxListWidth = 520,
    this.resizable = true,
    this.compactBreakpoint = 720,
    this.label = 'List and detail',
    this.resizeLabel = 'Resize the list',
  });

  /// The list column: usually a NavigationPage with selectable rows.
  final Widget list;

  /// The open item's pages, first page first, each keyed. Empty when nothing is selected. Wide:
  /// they form the detail column's own stack. Narrow: they are pushed on top of the list.
  final List<Widget> detail;

  /// Shown in the detail column while nothing is selected (wide only).
  final Widget? placeholder;

  /// The person went back from the top detail page. Remove it (or clear the selection).
  final VoidCallback onBack;

  /// Controlled list column width in px.
  final double? listWidth;

  /// Initial list column width when uncontrolled.
  final double defaultListWidth;

  /// Called when the divider is dragged or moved with the keyboard; persist it if you like.
  final ValueChanged<double>? onListWidthChange;

  /// Narrowest list column.
  final double minListWidth;

  /// Widest list column.
  final double maxListWidth;

  /// Lets the divider be dragged or moved with the arrow keys.
  final bool resizable;

  /// Below this width (px) the split collapses into one navigation stack.
  final double compactBreakpoint;

  /// Accessible name of the split view.
  final String label;

  /// Accessible name of the divider.
  final String resizeLabel;

  @override
  State<SplitView> createState() => _SplitViewState();
}

class _SplitViewState extends State<SplitView> {
  late double _local = widget.defaultListWidth;

  /// The column width is a motion value: dragging tracks it, release springs it into bounds.
  late final _motion = MotionValue(_width, 0.5);
  late double _painted = _width;
  late final void Function() _unsubscribe;
  final _focus = FocusNode(debugLabel: 'Split divider');
  bool _resizing = false, _hovered = false, _focused = false;
  double _start = 0, _dragged = 0;

  double get _width => widget.listWidth ?? _local;

  @override
  void initState() {
    super.initState();
    _unsubscribe = _motion.subscribe((value) {
      if (mounted && jsRound(value) != _painted) {
        setState(() => _painted = jsRound(value));
      }
    });
  }

  @override
  void didUpdateWidget(SplitView old) {
    super.didUpdateWidget(old);
    if (!_motion.isAnimating && _motion.get() != _width) {
      _motion.set(_width);
      _painted = _width;
    }
  }

  @override
  void dispose() {
    _unsubscribe();
    _motion.stop();
    _focus.dispose();
    super.dispose();
  }

  double _commit(double next) {
    final clamped = splitListWidth(
      next,
      widget.minListWidth,
      widget.maxListWidth,
    );
    if (widget.listWidth == null) setState(() => _local = clamped);
    widget.onListWidthChange?.call(clamped);
    return clamped;
  }

  void _step(double delta) {
    final target = _commit(_width + delta);
    _motion.animateTo(target, spring: Springs.snappy);
  }

  bool get _rtl => Directionality.of(context) == TextDirection.rtl;

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (!widget.resizable || event is KeyUpEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.arrowRight) {
      final toward = (key == LogicalKeyboardKey.arrowRight) != _rtl;
      _step(toward ? 24 : -24);
    } else if (key == LogicalKeyboardKey.home) {
      _step(widget.minListWidth - _width);
    } else if (key == LogicalKeyboardKey.end) {
      _step(widget.maxListWidth - _width);
    } else {
      return KeyEventResult.ignored;
    }
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final compact = constraints.maxWidth < widget.compactBreakpoint;
      if (compact) {
        return Semantics(
          container: true,
          explicitChildNodes: true,
          label: widget.label,
          child: NavigationStack(
            label: widget.label,
            onBack: widget.onBack,
            children: [widget.list, ...widget.detail],
          ),
        );
      }
      return _wide(context);
    },
  );

  Widget _wide(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final width = _painted;
    final strong = _resizing || _focused;
    final lineWidth = strong || (_hovered && widget.resizable) ? 3.0 : 1.0;
    final lineColor = strong
        ? c.primary
        : _hovered && widget.resizable
        ? mixSrgb(c.primary, 0.55, c.line)
        : c.line;
    final detail = widget.detail.isEmpty
        ? widget.placeholder ?? const SizedBox.shrink()
        : NavigationStack(
            label: '${widget.label}: detail',
            onBack: widget.onBack,
            children: widget.detail,
          );
    Widget divider = Center(
      child: AnimatedContainer(
        duration: MotionTokens.durationFast,
        curve: MotionTokens.ease,
        width: lineWidth,
        color: lineColor,
      ),
    );
    if (widget.resizable) {
      divider = Semantics(
        label: widget.resizeLabel,
        value: '${width.round()}',
        increasedValue:
            '${splitListWidth(width + 24, widget.minListWidth, widget.maxListWidth).round()}',
        decreasedValue:
            '${splitListWidth(width - 24, widget.minListWidth, widget.maxListWidth).round()}',
        onIncrease: () => _step(24),
        onDecrease: () => _step(-24),
        child: Focus(
          focusNode: _focus,
          onKeyEvent: _onKey,
          onFocusChange: (focused) => setState(
            () => _focused =
                focused &&
                FocusManager.instance.highlightMode ==
                    FocusHighlightMode.traditional,
          ),
          child: MouseRegion(
            cursor: SystemMouseCursors.resizeColumn,
            onEnter: (_) => setState(() => _hovered = true),
            onExit: (_) => setState(() => _hovered = false),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              dragStartBehavior: DragStartBehavior.down,
              onDoubleTap: () => _step(widget.defaultListWidth - _width),
              onHorizontalDragStart: (_) {
                // A press focuses the divider, like the web kit's focusable separator.
                _focus.requestFocus();
                _motion.stop();
                _start = _motion.get();
                _dragged = 0;
                setState(() => _resizing = true);
              },
              onHorizontalDragUpdate: (details) {
                _dragged += details.delta.dx;
                final raw = _start + (_rtl ? -_dragged : _dragged);
                _motion.set(
                  rubberBandClamp(
                    raw,
                    widget.minListWidth,
                    widget.maxListWidth,
                    240,
                  ),
                );
              },
              onHorizontalDragEnd: (details) {
                setState(() => _resizing = false);
                final raw = _start + (_rtl ? -_dragged : _dragged);
                final inside =
                    raw >= widget.minListWidth && raw <= widget.maxListWidth;
                final v = (details.primaryVelocity ?? 0) * (_rtl ? -1 : 1);
                final target = _commit(_motion.get());
                _motion.animateTo(
                  target,
                  spring: Springs.release,
                  velocity: inside ? v : 0,
                );
              },
              onHorizontalDragCancel: () {
                if (!_resizing) return;
                setState(() => _resizing = false);
                _motion.animateTo(
                  _commit(_motion.get()),
                  spring: Springs.release,
                );
              },
              child: divider,
            ),
          ),
        ),
      );
    } else {
      divider = IgnorePointer(child: divider);
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: MouseRegion(
        cursor: _resizing ? SystemMouseCursors.resizeColumn : MouseCursor.defer,
        child: ColoredBox(
          color: c.surface,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: width,
                    child: ClipRect(child: widget.list),
                  ),
                  Expanded(child: ClipRect(child: detail)),
                ],
              ),
              // A 12px invisible grip around the hairline, above both columns.
              PositionedDirectional(
                start: width - 6,
                top: 0,
                bottom: 0,
                width: 12,
                child: divider,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Quiet centered message for an empty detail column: the twin of `SplitPlaceholder`.
class SplitPlaceholder extends StatelessWidget {
  const SplitPlaceholder({
    super.key,
    this.icon,
    required this.title,
    this.child,
  });

  /// A large, muted icon.
  final Widget? icon;

  /// One line: what to do ("Select an order").
  final Widget title;

  /// Optional help under the title.
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: DefaultTextStyle.merge(
          textAlign: TextAlign.center,
          style: TextStyle(color: c.muted),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 8,
            children: [
              if (icon != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: DecoratedBox(
                    decoration: ShapeDecoration(
                      color: mixSrgb(c.ink, 0.05, c.surface),
                      shape: SuperellipseBorder(
                        radius: theme.sizes.radiusGroup,
                      ),
                    ),
                    child: SizedBox.square(
                      dimension: 56,
                      child: Center(
                        child: IconTheme.merge(
                          data: IconThemeData(size: 26, color: c.muted),
                          child: icon!,
                        ),
                      ),
                    ),
                  ),
                ),
              DefaultTextStyle.merge(
                style: TextStyle(
                  color: c.ink,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                child: title,
              ),
              if (child != null)
                ConstrainedBox(
                  // 34ch at 14px: the width of 34 zeros (0.55em each).
                  constraints: const BoxConstraints(maxWidth: 34 * 14 * 0.55),
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                    child: child!,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
