import 'dart:async';

import 'package:flutter/scheduler.dart';

import 'spring.dart';

/// One shared frame loop for every running spring (`onAnimationFrame` in the web kit).
final class _FrameLoop {
  static final _callbacks = <void Function(double seconds)>{};
  static bool _scheduled = false;

  /// Time (s) of the latest frame the loop ran, on the frame clock (null before the first).
  static double? last;

  static void Function() add(void Function(double seconds) callback) {
    _callbacks.add(callback);
    _schedule();
    return () => _callbacks.remove(callback);
  }

  static void _schedule() {
    if (_scheduled || _callbacks.isEmpty) return;
    _scheduled = true;
    SchedulerBinding.instance.scheduleFrameCallback((stamp) {
      _scheduled = false;
      final seconds = stamp.inMicroseconds / 1e6;
      last = seconds;
      for (final callback in [..._callbacks]) {
        callback(seconds);
      }
      _schedule();
    });
    SchedulerBinding.instance.scheduleFrame();
  }
}

/// One animatable number with a velocity, driven by springs: the twin of `MotionValue` in
/// `@feeef.dev/ui/physics/motion-value`. Starting a new animation or setting the value interrupts
/// the current one exactly where it is, keeping its speed, so motion never jumps.
class MotionValue {
  MotionValue(double initial, [this.restDelta = 0.001]) : _value = initial;

  /// Distance from the target that counts as arrived, in this value's units.
  final double restDelta;
  double _value;
  double _speed = 0;
  SpringState Function(double t)? _solver;

  /// When the running spring started on the frame clock; null until its first frame.
  double? _started;
  double _target = 0;
  void Function()? _stopFrame;
  Completer<bool>? _settle;
  final _listeners = <void Function(double value)>{};

  double get() => _value;
  double get velocity => _speed;
  bool get isAnimating => _solver != null;
  double get target => _solver != null ? _target : _value;

  /// Calls [listener] with every new value. Returns an unsubscribe function.
  void Function() subscribe(void Function(double value) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  /// Jumps to [value] and stops: no animation, no velocity.
  void set(double value) {
    _finish(false);
    _speed = 0;
    _write(value);
  }

  /// Stops a running animation where it is; keeps the current speed for a following animation.
  void stop() {
    final solver = _solver;
    if (solver != null) {
      final state = solver(_elapsed());
      _speed = state.velocity;
      _finish(false);
      _write(state.position);
      return;
    }
    _finish(false);
  }

  /// Springs to [target]. Completes `true` when it comes to rest there, `false` when interrupted.
  Future<bool> animateTo(
    double target, {
    Spring spring = Springs.smooth,
    double? velocity,
    bool instant = false,
  }) {
    final solver = _solver;
    final v =
        velocity ?? (solver != null ? solver(_elapsed()).velocity : _speed);
    if (solver != null) _write(solver(_elapsed()).position);
    _finish(false);
    if (instant ||
        ((_value - target).abs() <= restDelta && v.abs() <= restDelta * 10)) {
      _speed = 0;
      _write(target);
      return Future.value(true);
    }
    _target = target;
    final next = solveSpring(spring, _value, target, v);
    _solver = next;
    _started = null;
    final settle = Completer<bool>();
    _settle = settle;
    _stopFrame = _FrameLoop.add((time) {
      if (_solver != next) return;
      // A spring starts one frame before its first frame, so that frame already moves.
      final started = _started ??= time - 1 / 60;
      final state = next(time - started);
      if (springAtRest(state, target, restDelta)) {
        _speed = 0;
        _solver = null;
        _write(target);
        _finish(true);
        return;
      }
      _speed = state.velocity;
      _write(state.position);
    });
    return settle.future;
  }

  /// Seconds the running spring has run, as of the latest frame.
  double _elapsed() {
    final started = _started, last = _FrameLoop.last;
    return started == null || last == null ? 0 : (last - started).clamp(0, 60);
  }

  void _write(double value) {
    _value = value;
    for (final listener in [..._listeners]) {
      listener(value);
    }
  }

  void _finish(bool arrived) {
    _stopFrame?.call();
    _stopFrame = null;
    _solver = null;
    final settle = _settle;
    _settle = null;
    if (settle != null && !settle.isCompleted) settle.complete(arrived);
  }
}
