import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'performance.dart';
import 'theme.dart';

/// A looping phase (0 … 1 every [period]) for ambient motion: decoration and looping
/// illustrations that run while nothing else happens (the workspace's pixel field, moving
/// gradients, a demo loop on a card). Ambient motion must never cost the page around it:
/// - on the web every running loop steps on ONE shared beat, 30 a second. Each web frame
///   re-draws the whole page, so loops on their own tickers or timers would add up to a frame
///   on every display refresh; on one beat they share their frames. A loop with [maxFps] below
///   30 steps on every n-th beat (15 → every second beat);
/// - natively each loop follows the display (its frames coalesce with the others'), or steps
///   [maxFps] times a second;
/// - [allowed] says when it may run: not where tickers are muted (an offstage route or tab), not
///   under reduced motion, not when the effects tier holds ambient motion still
///   (`PerformanceTier.light`).
///
/// It is an [Animation], so `AnimatedBuilder`, transitions and `CustomPainter(repaint:)` take it
/// as they take an `AnimationController`. Paint from it rather than rebuild where you can: a
/// rebuild under a `LayoutBuilder` relayouts and repaints everything up to the page.
///
/// [fade] is a 0 … 1 progress for a change started with [startFade] (a colour blend), on the
/// same beat, so it needs no ticker of its own.
class AmbientLoop extends Animation<double>
    with
        AnimationEagerListenerMixin,
        AnimationLocalListenersMixin,
        AnimationLocalStatusListenersMixin {
  AmbientLoop({
    required TickerProvider vsync,
    required this.period,
    this.maxFps,
  }) {
    _ticker = vsync.createTicker((_) => _advance());
  }

  /// One full loop.
  final Duration period;

  /// The most steps a second; null follows the display (30 a second on the web).
  final double? maxFps;

  /// On the web, step on every [webStride]-th beat of the shared 30-a-second clock.
  int get webStride => maxFps == null ? 1 : math.max(1, (30 / maxFps!).round());

  late final Ticker _ticker;
  Timer? _timer;
  final _watch = Stopwatch();
  double _value = 0;
  bool _running = false;
  Duration? _fadeStart;
  Duration _fadeLength = Duration.zero;

  @override
  double get value => _value;

  @override
  AnimationStatus get status => AnimationStatus.forward;

  bool get running => _running;

  /// Time the loop has run (it pauses while stopped).
  Duration get elapsed => _watch.elapsed;

  /// Progress of the last [startFade]; 1 when none is running.
  double get fade {
    final start = _fadeStart;
    if (start == null || _fadeLength == Duration.zero) return 1;
    final t =
        (_watch.elapsed - start).inMicroseconds / _fadeLength.inMicroseconds;
    if (t >= 1) {
      _fadeStart = null;
      return 1;
    }
    return t.clamp(0.0, 1.0);
  }

  /// Starts a change of [length] that [fade] follows from 0 to 1. A stopped loop has no fade.
  void startFade(Duration length) {
    if (!_running) return;
    _fadeStart = _watch.elapsed;
    _fadeLength = length;
  }

  /// Whether ambient motion may run around [context]. [performance] overrides the theme's
  /// setting (for apps whose kit theme isn't above every screen).
  static bool allowed(BuildContext context, {Performance? performance}) {
    final tier = performance == null
        ? performanceOf(context)
        : resolvePerformance(
            performance,
            DeviceTraits.current,
            slow: measuredSlowOf(context),
          );
    return !reducedMotionOf(context) &&
        TickerMode.valuesOf(context).enabled &&
        tier.ambientMotion;
  }

  /// Starts or stops the loop; it resumes where it stopped.
  void run(bool on) {
    if (on == _running) return;
    _running = on;
    if (on) {
      _watch.start();
      if (kIsWeb) {
        _AmbientBeat.add(this);
      } else if (maxFps != null) {
        _timer = Timer.periodic(
          Duration(microseconds: (1000000 / maxFps!).round()),
          (_) => _advance(),
        );
      } else {
        _ticker.start();
      }
    } else {
      _watch.stop();
      _fadeStart = null;
      _AmbientBeat.remove(this);
      _timer?.cancel();
      _timer = null;
      if (_ticker.isActive) _ticker.stop();
    }
  }

  void _advance() {
    _value = (_watch.elapsedMicroseconds / period.inMicroseconds) % 1;
    notifyListeners();
  }

  @override
  void dispose() {
    _AmbientBeat.remove(this);
    _timer?.cancel();
    _ticker.dispose();
    super.dispose();
  }
}

/// The web's one clock for every running [AmbientLoop]. It rests after [idleAfter] without input
/// (pointer, wheel or key), holding every loop still, and starts again on the next input: ambient
/// motion is for someone looking at the page, and each web frame re-draws all of it.
abstract final class _AmbientBeat {
  static const _step = Duration(microseconds: 1000000 ~/ 30);
  static const idleAfter = Duration(seconds: 10);
  static final _loops = <AmbientLoop>{};
  static Timer? _timer;
  static int _beat = 0;
  static final _sinceInput = Stopwatch()..start();
  static bool _listening = false;

  static void add(AmbientLoop loop) {
    _loops.add(loop);
    _listen();
    _start();
  }

  static void remove(AmbientLoop loop) {
    _loops.remove(loop);
    if (_loops.isEmpty) _stop();
  }

  static void _start() {
    if (_timer != null || _loops.isEmpty) return;
    _timer = Timer.periodic(_step, (_) {
      if (_sinceInput.elapsed > idleAfter) {
        // Resting: the loops' clocks stop too, so they resume where they were.
        for (final loop in _loops) {
          loop._watch.stop();
        }
        _stop();
        return;
      }
      _beat++;
      for (final loop in _loops.toList()) {
        if (_beat % loop.webStride == 0) loop._advance();
      }
    });
  }

  static void _stop() {
    _timer?.cancel();
    _timer = null;
  }

  static void _listen() {
    if (_listening) return;
    _listening = true;
    GestureBinding.instance.pointerRouter.addGlobalRoute((_) => _input());
    HardwareKeyboard.instance.addHandler((_) {
      _input();
      return false;
    });
  }

  static void _input() {
    _sinceInput
      ..reset()
      ..start();
    if (_timer == null && _loops.isNotEmpty) {
      for (final loop in _loops) {
        if (loop._running) loop._watch.start();
      }
      _start();
    }
  }
}
