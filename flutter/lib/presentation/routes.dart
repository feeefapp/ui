import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../containers/sheet.dart';
import 'alert.dart';
import 'host.dart';
import 'modal.dart';

/// A route that hosts one presentation surface (the [Alert], [Modal] or [Sheet] its
/// builder returns) and completes with the value it is popped with. The surface draws its own
/// scrim and motion: the route only keeps it on screen until its exit has played
/// ([exitDuration]). A [PopupRoute], so it works in a plain [WidgetsApp].
class PresentationRoute<T> extends PopupRoute<T> {
  PresentationRoute({
    required this.builder,
    this.exitDuration = const Duration(milliseconds: 650),
    super.settings,
  });

  /// Builds the surface. Close it with `Navigator.pop(context, value)`.
  final WidgetBuilder builder;

  /// How long the route stays after a pop while the surface plays its exit.
  final Duration exitDuration;

  @override
  Color? get barrierColor => null;

  @override
  bool get barrierDismissible => false;

  @override
  String? get barrierLabel => null;

  @override
  Duration get transitionDuration => Duration.zero;

  @override
  Duration get reverseTransitionDuration => exitDuration;

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => _RouteScope(route: this, animation: animation, builder: builder);
}

class _RouteScope extends StatefulWidget {
  const _RouteScope({
    required this.route,
    required this.animation,
    required this.builder,
  });
  final PresentationRoute<Object?> route;
  final Animation<double> animation;
  final WidgetBuilder builder;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<PresentationRoute<Object?>>('route', route))
      ..add(DiagnosticsProperty<Animation<double>>('animation', animation))
      ..add(ObjectFlagProperty<WidgetBuilder>.has('builder', builder));
  }

  @override
  State<_RouteScope> createState() => _RouteScopeState();
}

class _RouteScopeState extends State<_RouteScope> {
  bool get _open =>
      widget.animation.status != AnimationStatus.reverse &&
      widget.animation.status != AnimationStatus.dismissed;

  late bool _last = _open;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('open', value: _last, ifTrue: 'open', ifFalse: 'closing'),
    );
  }

  void _status(AnimationStatus _) {
    if (_open != _last) setState(() => _last = _open);
  }

  @override
  void initState() {
    super.initState();
    widget.animation.addStatusListener(_status);
  }

  @override
  void dispose() {
    widget.animation.removeStatusListener(_status);
    super.dispose();
  }

  void _dismiss([Object? result]) {
    final route = widget.route;
    if (route.isCurrent) route.navigator?.pop(result);
  }

  @override
  Widget build(BuildContext context) => PresentationRouteScope(
    open: _last,
    dismiss: _dismiss,
    child: Builder(builder: widget.builder),
  );
}

/// Shows a [Modal] in a route and completes with the value it is closed with
/// (`Navigator.pop(context, value)`; null when dismissed). The modal's own `open` and
/// `onOpenChange` are ignored: the route drives it.
Future<T?> showModal<T>(
  BuildContext context, {
  required Modal Function(BuildContext context) builder,
  bool useRootNavigator = false,
  RouteSettings? settings,
}) => Navigator.of(
  context,
  rootNavigator: useRootNavigator,
).push(PresentationRoute<T>(builder: builder, settings: settings));

/// Shows an [Alert] in a route and completes with the chosen action's `value` (null when it has
/// none). The alert's own `open` and `onOpenChange` are ignored: the route drives it.
Future<T?> showAlert<T>(
  BuildContext context, {
  required Alert Function(BuildContext context) builder,
  bool useRootNavigator = false,
  RouteSettings? settings,
}) => Navigator.of(
  context,
  rootNavigator: useRootNavigator,
).push(PresentationRoute<T>(builder: builder, settings: settings));

/// Shows a [Sheet] in a route and completes with the value it is closed with (null when it is
/// dragged down, the scrim is tapped or Escape is pressed).
Future<T?> showSheet<T>(
  BuildContext context, {
  required Sheet Function(BuildContext context) builder,
  bool useRootNavigator = false,
  RouteSettings? settings,
}) => Navigator.of(
  context,
  rootNavigator: useRootNavigator,
).push(PresentationRoute<T>(builder: builder, settings: settings));
