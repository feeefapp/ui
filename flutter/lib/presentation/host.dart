import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../platform/pointer_shield.dart';

/// What a presentation surface (Alert, Modal, Sheet) reads when [showModal], [showAlert] or
/// [showSheet] hosts it in a route: whether the route is still open, and how to
/// close it (pop the route). Surfaces then render in place, fill the route, and ignore their own
/// `open` / `onOpenChange`. Each surface hides the scope from its own content, so a surface
/// declared inside a routed one is never driven by that route.
class PresentationRouteScope extends InheritedWidget {
  const PresentationRouteScope({
    super.key,
    required this.open,
    required this.dismiss,
    required super.child,
  }) : _active = true;

  /// Hides an enclosing route scope from [child].
  const PresentationRouteScope.none({super.key, required super.child})
    : open = false,
      dismiss = _noop,
      _active = false;

  /// False once the route is popping: the surface plays its exit.
  final bool open;

  /// Pops the route with [result] (the surface asks: Escape, scrim, close bubble, an action).
  final void Function([Object? result]) dismiss;

  final bool _active;

  static void _noop([Object? _]) {}

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'),
      )
      ..add(
        ObjectFlagProperty<void Function([Object? result])>.has(
          'dismiss',
          dismiss,
        ),
      )
      ..add(
        FlagProperty(
          'active',
          value: _active,
          ifFalse: 'hides enclosing route',
          defaultValue: true,
        ),
      );
  }

  /// The scope driving the surface at [context], if a route hosts it.
  static PresentationRouteScope? maybeOf(BuildContext context) {
    final scope = context
        .dependOnInheritedWidgetOfExactType<PresentationRouteScope>();
    return scope != null && scope._active ? scope : null;
  }

  @override
  bool updateShouldNotify(PresentationRouteScope old) =>
      old.open != open || old._active != _active;
}

/// Puts a surface in the nearest [Overlay] while [mounted] (an [OverlayPortal]), or in place,
/// filling its parent, when [inPlace] (a container preview, or a route). The twin of the web host
/// rendering in the top layer or in a container. The glass inside is its own layer: it never
/// merges with the page's glass.
class PresentationLayer extends StatefulWidget {
  const PresentationLayer({
    super.key,
    required this.mounted,
    required this.inPlace,
    required this.builder,
  });

  /// Whether the surface is drawn (open, or running its exit).
  final bool mounted;

  /// Draw in place instead of in the overlay.
  final bool inPlace;

  /// Builds the surface.
  final WidgetBuilder builder;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('mounted', value: mounted, ifTrue: 'mounted'))
      ..add(FlagProperty('inPlace', value: inPlace, ifTrue: 'in place'))
      ..add(ObjectFlagProperty<WidgetBuilder>.has('builder', builder));
  }

  @override
  State<PresentationLayer> createState() => _PresentationLayerState();
}

class _PresentationLayerState extends State<PresentationLayer> {
  final _portal = OverlayPortalController();

  @override
  void initState() {
    super.initState();
    // The portal stays shown; `mounted` decides what it draws (show() can't run during build).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _portal.show();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.inPlace) {
      return widget.mounted
          ? GlassLayer(child: Builder(builder: widget.builder))
          : const SizedBox.shrink();
    }
    return OverlayPortal(
      controller: _portal,
      overlayChildBuilder: (context) => widget.mounted
          ? GlassLayer(child: Builder(builder: widget.builder))
          : const SizedBox.shrink(),
    );
  }
}

/// What every presentation surface shares once it is drawn: Escape, a focus scope (trapping focus
/// when [modal]), the accessible name, and focus in and back out. The twin of `PresentationHost`
/// in `@feeef.dev/ui/presentation`. Keep it mounted until the exit ends; focus returns when it
/// is disposed.
class PresentationHost extends StatefulWidget {
  const PresentationHost({
    super.key,
    required this.label,
    this.modal = true,
    this.alert = false,
    this.onEscape,
    this.initialFocus,
    this.returnFocus,
    required this.child,
  });

  /// Accessible name.
  final String label;

  /// True (default) moves focus inside and keeps it there; false leaves the page usable.
  final bool modal;

  /// An alert dialog (a decision that interrupts), announced as such.
  final bool alert;

  /// Escape was pressed while focus is inside.
  final VoidCallback? onEscape;

  /// Focused once the surface is shown. Default: the surface's focus scope.
  final FocusNode? initialFocus;

  /// Focused when the surface goes away; default whatever had focus before it opened.
  final FocusNode? returnFocus;

  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(
        FlagProperty(
          'modal',
          value: modal,
          ifFalse: 'non-modal',
          defaultValue: true,
        ),
      )
      ..add(
        FlagProperty(
          'alert',
          value: alert,
          ifTrue: 'alert',
          defaultValue: false,
        ),
      )
      ..add(ObjectFlagProperty<VoidCallback?>.has('onEscape', onEscape))
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'initialFocus',
          initialFocus,
          defaultValue: null,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'returnFocus',
          returnFocus,
          defaultValue: null,
        ),
      );
  }

  @override
  State<PresentationHost> createState() => _PresentationHostState();
}

class _PresentationHostState extends State<PresentationHost> {
  final _scope = FocusScopeNode(debugLabel: 'Presentation');
  FocusNode? _previous;

  @override
  void initState() {
    super.initState();
    _previous = FocusManager.instance.primaryFocus;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final first = widget.initialFocus;
      if (first != null && (first.context?.mounted ?? false)) {
        first.requestFocus();
      } else if (widget.modal) {
        _scope.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    final preferred = widget.returnFocus;
    final previous = _previous;
    final inside = _scope.hasFocus;
    _scope.dispose();
    if (inside || widget.modal) {
      // The tree is locked while it unmounts: move focus after this frame, to a node that is
      // still in the tree then (the whole app may be going away).
      WidgetsBinding.instance.addPostFrameCallback((_) {
        for (final target in [preferred, previous]) {
          if (target != null && (target.context?.mounted ?? false)) {
            target.requestFocus();
            return;
          }
        }
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Shortcuts(
    shortcuts: const {
      SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
    },
    child: Actions(
      actions: {
        DismissIntent: CallbackAction<DismissIntent>(
          onInvoke: (_) {
            widget.onEscape?.call();
            return null;
          },
        ),
      },
      child: FocusScope(
        node: _scope,
        child: Semantics(
          scopesRoute: widget.modal,
          namesRoute: true,
          role: widget.alert ? SemanticsRole.alertDialog : SemanticsRole.dialog,
          explicitChildNodes: true,
          label: widget.label,
          // A modal surface owns the whole area, over any embedded web page too.
          child: widget.modal
              ? PointerShield(child: widget.child)
              : widget.child,
        ),
      ),
    ),
  );
}

/// Draws its child where the child paints, and lets every other position through to what is
/// below (CSS `pointer-events: none` on a host, `auto` on its surface): non-modal surfaces.
class PassThrough extends SingleChildRenderObjectWidget {
  const PassThrough({super.key, super.child});
  @override
  RenderObject createRenderObject(BuildContext context) => _RenderPassThrough();
}

class _RenderPassThrough extends RenderProxyBox {
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) =>
      hitTestChildren(result, position: position);
}

/// The open/close bookkeeping every presentation surface shares: whether it is drawn
/// ([presented], true from opening until its exit ends), the open state from the widget or from
/// a hosting route ([PresentationRouteScope]), and closing through either ([close]).
mixin PresentationStateMixin<T extends StatefulWidget> on State<T> {
  PresentationRouteScope? _route;
  bool? _handled;

  /// Whether the surface is drawn: open, or running its exit.
  bool presented = false;

  /// The widget's `open`.
  bool get declaredOpen;

  /// The widget's `onOpenChange`.
  ValueChanged<bool>? get declaredOnOpenChange;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty('open', value: isOpen, ifTrue: 'open', ifFalse: 'closed'),
      )
      ..add(FlagProperty('presented', value: presented, ifTrue: 'presented'))
      ..add(FlagProperty('routed', value: routed, ifTrue: 'routed'));
  }

  /// Whether the surface is open: its route's state when a route hosts it.
  bool get isOpen => _route?.open ?? declaredOpen;

  /// True when a route hosts the surface: it then fills the route in place.
  bool get routed => _route != null;

  /// Starts the entrance (called as the surface opens; [presented] is already true).
  void enter();

  /// Plays the exit; completes `true` once it has ended, `false` if it was interrupted.
  Future<bool> exit();

  /// Asks to close: pops the hosting route with [result], or calls `onOpenChange(false)`.
  void close([Object? result]) {
    if (!isOpen) return;
    final route = _route;
    if (route != null) {
      route.dismiss(result);
    } else {
      declaredOnOpenChange?.call(false);
    }
  }

  /// Starts the entrance or the exit when the open state changed. Call from [didUpdateWidget].
  void syncPresentation() {
    final open = isOpen;
    if (open == _handled) return;
    final first = _handled == null;
    _handled = open;
    if (open) {
      presented = true;
      enter();
    } else if (!first) {
      exit().then((done) {
        if (done && mounted && !isOpen) setState(() => presented = false);
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _route = PresentationRouteScope.maybeOf(context);
    syncPresentation();
  }
}
