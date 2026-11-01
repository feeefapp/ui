import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/pixel_loader.dart';
import '../theme.dart';
import 'pull_refresh_model.dart';

/// Starts a [ScrollArea]'s refresh from code (a Refresh button, a keyboard shortcut) with the same
/// loader a pull shows, and tells whether one is running: the twin of `RefreshController` in
/// `@feeef.dev/ui/scroll`. Pass it as the area's `refreshController`; it notifies its listeners
/// when [refreshing] changes.
class RefreshController extends ChangeNotifier {
  Future<void> Function()? _run;
  bool _refreshing = false;

  /// True while a refresh runs.
  bool get refreshing => _refreshing;

  /// Runs the area's `onRefresh` with the loader showing; completes when it settles. Does nothing
  /// while one is running or when no area is attached.
  Future<void> refresh() => _run?.call() ?? Future.value();

  void _changed() => notifyListeners();
}

/// What a [ScrollArea] gives its [RefreshController]: the run, and its busy state. Internal to
/// the kit (not exported).
extension RefreshControllerHost on RefreshController {
  /// The area that runs refreshes (null detaches it).
  void attachRefresh(Future<void> Function()? run) => _run = run;

  /// Reports a refresh starting or ending.
  void setRefreshing(bool value) {
    if (value == _refreshing) return;
    _refreshing = value;
    _changed();
  }
}

/// Whether a pull owns the finger right now, shared by a [ScrollArea] and its [PullScrollPhysics].
class PullGate {
  /// A touch that may become a pull is down on the area.
  bool touching = false;

  /// The pull owns the finger: the scroll view stays put under it.
  bool pulling = false;
}

/// The scroll physics of an area with pull to refresh: while a finger is down it never overscrolls
/// past the top (the pull moves the content instead of the platform bounce or stretch), and while
/// the pull owns the finger the content does not scroll. Flings keep the platform's own physics.
class PullScrollPhysics extends ScrollPhysics {
  const PullScrollPhysics(this.gate, {super.parent});
  final PullGate gate;

  @override
  PullScrollPhysics applyTo(ScrollPhysics? ancestor) =>
      PullScrollPhysics(gate, parent: buildParent(ancestor));

  @override
  double applyPhysicsToUserOffset(ScrollMetrics position, double offset) =>
      gate.pulling ? 0 : super.applyPhysicsToUserOffset(position, offset);

  @override
  double applyBoundaryConditions(ScrollMetrics position, double value) {
    if (gate.touching) {
      final min = position.minScrollExtent;
      if (value < position.pixels && position.pixels <= min) {
        return value - position.pixels;
      }
      if (value < min && min < position.pixels) return value - min;
    }
    return super.applyBoundaryConditions(position, value);
  }
}

/// The loader in the gap a pull opens, just below the area's top reservation: squares light up as
/// the pull nears its threshold, then the wave runs while refreshing.
class PullRefreshIndicator extends StatelessWidget {
  const PullRefreshIndicator({
    super.key,
    required this.distance,
    required this.refreshing,
  });

  /// The current pull (px).
  final double distance;
  final bool refreshing;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('distance', distance))
      ..add(
        FlagProperty('refreshing', value: refreshing, ifTrue: 'refreshing'),
      );
  }

  @override
  Widget build(BuildContext context) {
    if (distance <= 0.5 && !refreshing) return const SizedBox.shrink();
    final progress = pullProgress(distance);
    return Transform.translate(
      offset: Offset(0, pullLoaderTop(distance)),
      child: Opacity(
        opacity: refreshing ? 1 : (progress * 2).clamp(0.0, 1.0),
        child: PixelLoader(
          size: pullRefreshLoader,
          decorative: true,
          progress: refreshing ? null : progress,
          color: ThemeProvider.of(context).colors.muted,
        ),
      ),
    );
  }
}
