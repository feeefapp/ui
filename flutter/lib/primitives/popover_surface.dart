import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../menu/anchored_panel.dart';
import '../brand/pixel_noise.dart';
import '../brand/pixel_texture.dart';
import '../theme.dart';
import '../theme/surfaces.dart';

/// The shared opaque material for menus and popovers: surface, border, group corners and a faint
/// breathing pixel grain. Paint only; the owner keeps positioning and interaction. The twin of
/// `PopoverSurface` in `@feeef.dev/ui/primitives/popover-surface`.
class PopoverSurface extends StatefulWidget {
  const PopoverSurface({
    super.key,
    this.seed = 'lab-popover',
    this.padding = EdgeInsets.zero,
    required this.child,
  });

  /// Seed for the decorative pixel grain, so neighbouring surfaces don't look identical.
  final String seed;

  /// Space between the 1px border and [child].
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  State<PopoverSurface> createState() => _PopoverSurfaceState();
}

class _PopoverSurfaceState extends State<PopoverSurface>
    with SingleTickerProviderStateMixin {
  // `lab-pixel-texture-breathe`: 2.8s, ease-in-out, opacity down to 55% and back.
  late final _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2800),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still) {
      _breath.stop();
      _breath.value = 0;
    } else if (!_breath.isAnimating) {
      _breath.repeat();
    }
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = theme.sizes.radiusGroup;
    return CustomPaint(
      painter: _PopoverPainter(
        breath: _breath,
        radius: radius,
        fill: c.surface,
        line: c.line,
        edgeLow: c.glassEdgeLow,
        shadow: glassShadowColor(theme.brightness),
        grain: c.focus,
        seed: widget.seed,
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: c.ink),
        child: Padding(
          padding: const EdgeInsets.all(1),
          child: Padding(padding: widget.padding, child: widget.child),
        ),
      ),
    );
  }
}

class _PopoverPainter extends CustomPainter {
  _PopoverPainter({
    required this.breath,
    required this.radius,
    required this.fill,
    required this.line,
    required this.edgeLow,
    required this.shadow,
    required this.grain,
    required this.seed,
  }) : super(repaint: breath);
  final Animation<double> breath;
  final double radius;
  final Color fill, line, edgeLow, shadow, grain;
  final String seed;

  @override
  void paint(Canvas canvas, Size size) {
    paintFloatingSurface(
      canvas,
      size,
      radius,
      fill: fill,
      line: line,
      edgeLow: edgeLow,
      shadow: shadow,
    );
    // The grain sits inside the border, clipped to the corners, at 6.5% (breathing to 55% of it).
    final box = (Offset.zero & size).deflate(1);
    final t = breath.value;
    final wave = Curves.easeInOut.transform(t < 0.5 ? t * 2 : (1 - t) * 2);
    canvas.save();
    canvas.clipPath(superellipsePath(box, [radius, radius, radius, radius]));
    paintPixelTexture(
      canvas,
      box,
      color: grain,
      opacity: 0.065 * (1 - 0.45 * wave),
      variant: TextureVariant.grain,
      seed: seed,
      density: TextureDensity.sparse,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PopoverPainter old) =>
      old.fill != fill ||
      old.line != line ||
      old.radius != radius ||
      old.seed != seed ||
      old.grain != grain;
}

/// A trigger that opens a floating [PopoverSurface] below it: the Flutter stand-in for a Radix
/// `Popover.Root` + `Trigger` + `Content` on a `PopoverSurface asChild`, as the docs examples use
/// it. It sits [sideOffset] below the trigger (above when there is no room) in an
/// [AnchoredPanel], so it stays [collisionPadding] inside the overlay that hosts it (a
/// [FloatingBoundary], else the app), moves focus into it, and closes on Escape or a press
/// outside, returning focus to the trigger.
class Popover extends StatefulWidget {
  const Popover({
    super.key,
    required this.trigger,
    required this.content,
    this.label,
    this.align = PanelAlign.center,
    this.sideOffset = 0,
    this.collisionPadding = 0,
    this.seed = 'lab-popover',
    this.padding = EdgeInsets.zero,
    this.width,
    this.onOpenChange,
  });

  /// Builds the trigger; call `toggle` from its click handler. `open` reflects the state
  /// (`aria-expanded`).
  final Widget Function(BuildContext context, VoidCallback toggle, bool open)
  trigger;

  /// Builds the panel's content; `close` dismisses it (Radix `Popover.Close`).
  final Widget Function(BuildContext context, VoidCallback close) content;

  /// Accessible name of the panel (`aria-label` on `Popover.Content`).
  final String? label;

  /// Where the panel lines up with the trigger (Radix `align`).
  final PanelAlign align;

  /// Gap between the trigger and the panel.
  final double sideOffset;

  /// Minimum distance between the panel and the edges of its bounds.
  final double collisionPadding;

  /// [PopoverSurface.seed].
  final String seed;

  /// [PopoverSurface.padding].
  final EdgeInsetsGeometry padding;

  /// Panel width, at most the bounds' width minus twice [collisionPadding]. Null shrink-wraps.
  final double? width;
  final ValueChanged<bool>? onOpenChange;

  @override
  State<Popover> createState() => _PopoverState();
}

class _PopoverState extends State<Popover> {
  final _scope = FocusScopeNode(debugLabel: 'Popover');
  bool _open = false;
  FocusNode? _returnTo;

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  void _toggle() => _open ? _close() : _show();

  void _show() {
    _returnTo = FocusManager.instance.primaryFocus;
    setState(() => _open = true);
    widget.onOpenChange?.call(true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_open) return;
      _scope.requestFocus();
      // Like Radix, focus the first focusable element inside the panel.
      _scope.nextFocus();
    });
  }

  void _close() {
    if (!_open) return;
    setState(() => _open = false);
    widget.onOpenChange?.call(false);
    final back = _returnTo;
    if (back != null && back.canRequestFocus) back.requestFocus();
  }

  @override
  Widget build(BuildContext context) => AnchoredPanel(
    open: _open,
    onDismiss: _close,
    align: widget.align,
    sideOffset: widget.sideOffset,
    collisionPadding: widget.collisionPadding,
    panel: (context) {
      final surface = PopoverSurface(
        seed: widget.seed,
        padding: widget.padding,
        child: Builder(builder: (context) => widget.content(context, _close)),
      );
      final panel = LayoutBuilder(
        builder: (context, constraints) => widget.width == null
            ? IntrinsicWidth(child: surface)
            : SizedBox(
                width: math.min(widget.width!, constraints.maxWidth),
                child: surface,
              ),
      );
      return FocusScope(
        node: _scope,
        onKeyEvent: (_, event) {
          if (event is KeyDownEvent &&
              event.logicalKey == LogicalKeyboardKey.escape) {
            _close();
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: Semantics(
          container: true,
          scopesRoute: true,
          namesRoute: widget.label != null,
          explicitChildNodes: true,
          label: widget.label,
          child: panel,
        ),
      );
    },
    child: widget.trigger(context, _toggle, _open),
  );
}
