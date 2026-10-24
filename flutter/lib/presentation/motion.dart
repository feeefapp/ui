import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme_config.dart';

/// How centred dialogs (Alert, Modal) come and go, like iOS alerts: they open with a spring from a
/// little larger than their size while fading in, and close with a fade only (no scale on exit).
/// Reduced motion crossfades; [Motion.none] is instant. The twin of `POP_MOTION` in
/// `@feeef.dev/ui/presentation`.
abstract final class PopMotion {
  /// Scale the surface opens from.
  static const fromScale = 1.1;

  /// The scale spring (a small overshoot).
  static const spring = Springs.snappy;

  /// Fade-in length.
  static const fadeIn = Duration(milliseconds: 200);

  /// Fade-out length (also the reduced-motion crossfade).
  static const fadeOut = Duration(milliseconds: 200);

  /// The fade's curve, in and out: quick at first and exactly done at its length, with no tail
  /// (`cubic-bezier(0, 0, 0.58, 1)`).
  static const fadeCurve = Cubic(0, 0, 0.58, 1);
}

/// Surface scale at a given open progress (1 = open; past 1 while the spring overshoots).
double popScale(double progress) =>
    PopMotion.fromScale - (PopMotion.fromScale - 1) * progress;

/// [length] scaled to the share of the fade still to run (a fade turned around mid-way keeps its
/// rate).
Duration _remaining(Duration length, double share) =>
    length * share.clamp(0.0, 1.0);

/// Drives the pop motion: [scale] for the surface, [opacity] for the surface and its dimming.
class PopMotionController extends ChangeNotifier {
  PopMotionController() {
    _off = [_progress.subscribe(_changed), _fadeValue.subscribe(_changed)];
  }

  final _progress = MotionValue(0, 0.001);
  final _fadeValue = MotionValue(0, 0.002);
  late final List<void Function()> _off;

  void _changed(double _) => notifyListeners();

  /// The surface's scale now.
  double get scale => popScale(_progress.get());

  /// The surface's (and the dimming's) opacity now, 0–1.
  double get opacity => _fadeValue.get().clamp(0.0, 1.0);

  /// Whether it is moving: the glass inside rides the surface as is meanwhile ([GlassInstant]).
  bool get moving => _progress.isAnimating || _fadeValue.isAnimating;

  /// Opens: a spring from [PopMotion.fromScale] and a fade in; a crossfade when [motion] is
  /// reduced, nothing when it is none. Opened again while fading out, it fades back from there.
  void enter(Motion motion) {
    final length = motionFade(
      motion,
      motion == Motion.full ? PopMotion.fadeIn : PopMotion.fadeOut,
    );
    if (motion == Motion.full) {
      _progress.animateTo(1, spring: PopMotion.spring);
    } else {
      _progress.set(1);
    }
    _fadeValue.easeTo(
      1,
      _remaining(length, 1 - _fadeValue.get()),
      curve: PopMotion.fadeCurve,
    );
  }

  /// Closes with a fade that ends exactly at [PopMotion.fadeOut] (instant under [Motion.none]).
  /// Completes `true` once faded out, `false` when [enter] interrupted it.
  Future<bool> exit(Motion motion) => _fadeValue.easeTo(
    0,
    _remaining(motionFade(motion, PopMotion.fadeOut), _fadeValue.get()),
    curve: PopMotion.fadeCurve,
  );

  @override
  void dispose() {
    for (final off in _off) {
      off();
    }
    _progress.stop();
    _fadeValue.stop();
    super.dispose();
  }
}

/// Paints [child] at [controller]'s scale and opacity.
class PopTransition extends StatelessWidget {
  const PopTransition({
    super.key,
    required this.controller,
    required this.child,
  });
  final PopMotionController controller;
  final Widget child;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: controller,
    child: child,
    // One structure at every scale, so the surface never remounts.
    builder: (context, child) => Opacity(
      opacity: controller.opacity,
      child: Transform.scale(
        scale: controller.scale,
        // The surface paints once and its layer is moved and faded (the web kit's compositor
        // animation): nothing inside, glass included, repaints on motion frames.
        child: GlassInstant(
          instant: controller.moving,
          child: RepaintBoundary(child: child),
        ),
      ),
    ),
  );
}
