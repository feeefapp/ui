import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
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

/// Where a [Popover] lines up with its trigger, along the trigger's side (Radix `align`).
enum PopoverAlign { start, center, end }

/// A trigger that opens a floating [PopoverSurface] below it: the Flutter stand-in for a Radix
/// `Popover.Root` + `Trigger` + `Content` on a `PopoverSurface asChild`, as the docs examples use
/// it. It positions the panel [sideOffset] below the trigger (above when there is no room), keeps
/// it [collisionPadding] inside the screen, moves focus into it, and closes on Escape or a press
/// outside, returning focus to the trigger.
class Popover extends StatefulWidget {
  const Popover({
    super.key,
    required this.trigger,
    required this.content,
    this.label,
    this.align = PopoverAlign.center,
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
  final PopoverAlign align;

  /// Gap between the trigger and the panel.
  final double sideOffset;

  /// Minimum distance between the panel and the screen edges.
  final double collisionPadding;

  /// [PopoverSurface.seed].
  final String seed;

  /// [PopoverSurface.padding].
  final EdgeInsetsGeometry padding;

  /// Panel width, at most the screen width minus twice [collisionPadding]. Null shrink-wraps.
  final double? width;
  final ValueChanged<bool>? onOpenChange;

  @override
  State<Popover> createState() => _PopoverState();
}

class _PopoverState extends State<Popover> {
  final _portal = OverlayPortalController();
  final _triggerKey = GlobalKey();
  final _scope = FocusScopeNode(debugLabel: 'Popover');
  FocusNode? _returnTo;

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  void _toggle() => _portal.isShowing ? _close() : _open();

  void _open() {
    _returnTo = FocusManager.instance.primaryFocus;
    _portal.show();
    setState(() {});
    widget.onOpenChange?.call(true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_portal.isShowing) return;
      _scope.requestFocus();
      // Like Radix, focus the first focusable element inside the panel.
      _scope.nextFocus();
    });
  }

  void _close() {
    if (!_portal.isShowing) return;
    _portal.hide();
    setState(() {});
    widget.onOpenChange?.call(false);
    final back = _returnTo;
    if (back != null && back.canRequestFocus) back.requestFocus();
  }

  Rect? _triggerRect(BuildContext overlay) {
    final box = _triggerKey.currentContext?.findRenderObject() as RenderBox?;
    final host = overlay.findRenderObject() as RenderBox?;
    if (box == null || !box.attached || !box.hasSize) return null;
    final origin = box.localToGlobal(Offset.zero, ancestor: host);
    return origin & box.size;
  }

  @override
  Widget build(BuildContext context) => OverlayPortal(
    controller: _portal,
    overlayChildBuilder: (overlay) {
      final dir = Directionality.of(context);
      final screen = MediaQuery.sizeOf(overlay);
      final pad = widget.collisionPadding;
      final maxWidth = math.max(0.0, screen.width - pad * 2);
      Widget panel = PopoverSurface(
        seed: widget.seed,
        padding: widget.padding,
        child: Builder(builder: (context) => widget.content(context, _close)),
      );
      panel = widget.width == null
          ? ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: IntrinsicWidth(child: panel),
            )
          : SizedBox(width: math.min(widget.width!, maxWidth), child: panel);
      return GlassLayer(
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _close,
              ),
            ),
            Positioned.fill(
              child: CustomSingleChildLayout(
                delegate: _PopoverLayout(
                  target: _triggerRect(overlay) ?? Rect.zero,
                  align: widget.align,
                  direction: dir,
                  sideOffset: widget.sideOffset,
                  padding: pad,
                ),
                child: FocusScope(
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
                ),
              ),
            ),
          ],
        ),
      );
    },
    child: KeyedSubtree(
      key: _triggerKey,
      child: widget.trigger(context, _toggle, _portal.isShowing),
    ),
  );
}

class _PopoverLayout extends SingleChildLayoutDelegate {
  _PopoverLayout({
    required this.target,
    required this.align,
    required this.direction,
    required this.sideOffset,
    required this.padding,
  });
  final Rect target;
  final PopoverAlign align;
  final TextDirection direction;
  final double sideOffset, padding;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) =>
      BoxConstraints.loose(constraints.biggest)
          .deflate(EdgeInsets.all(padding));

  @override
  Offset getPositionForChild(Size size, Size child) {
    final rtl = direction == TextDirection.rtl;
    final start = rtl ? target.right - child.width : target.left;
    final end = rtl ? target.left : target.right - child.width;
    var x = switch (align) {
      PopoverAlign.start => start,
      PopoverAlign.end => end,
      PopoverAlign.center => target.center.dx - child.width / 2,
    };
    x = x.clamp(padding, math.max(padding, size.width - padding - child.width));
    var y = target.bottom + sideOffset;
    if (y + child.height > size.height - padding &&
        target.top - sideOffset - child.height >= padding) {
      y = target.top - sideOffset - child.height;
    }
    return Offset(x, y);
  }

  @override
  bool shouldRelayout(_PopoverLayout old) =>
      old.target != target ||
      old.align != align ||
      old.direction != direction ||
      old.sideOffset != sideOffset ||
      old.padding != padding;
}
