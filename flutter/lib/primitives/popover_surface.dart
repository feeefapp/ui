import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart' show GlassContainer;
import '../glass/material.dart' show GlassKind;
import '../glass/member.dart' show GlassMemberBox;
import '../menu/anchored_panel.dart';
import '../theme.dart';

/// The shared material for popovers (pickers, editors, settings panels, the model ladder): one
/// glass shape in the thick menu material ([GlassKind.menu]: hairline, rim light and lens, veiled
/// enough to carry text over anything) behind the content. Paint only; the owner keeps positioning
/// and interaction. The twin of `PopoverSurface` in `@feeef.dev/ui/primitives/popover-surface`.
class PopoverSurface extends StatelessWidget {
  const PopoverSurface({
    super.key,
    this.padding = EdgeInsets.zero,
    required this.child,
  });

  /// Space between the 1px edge and [child].
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = theme.sizes.radiusGroup;
    return GlassContainer(
      material: GlassKind.menu,
      interactive: false,
      adaptive: false,
      child: GlassMemberBox(
        radius: radius,
        // A popover always has its container.
        standalone: (child) => child,
        child: DefaultTextStyle.merge(
          style: TextStyle(color: theme.colors.ink),
          child: Padding(
            padding: const EdgeInsets.all(1),
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
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
