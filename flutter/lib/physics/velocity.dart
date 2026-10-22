/// Estimates the speed of a pointer-driven value from recent samples, the way a pan gesture reports
/// velocity on release: the twin of `VelocityTracker` in `@feeef.dev/ui/physics`. A least-squares
/// fit over the last [window] ms smooths jitter; a pointer that stopped before lifting reports 0,
/// so a careful drop never flings. (Flutter's gestures library has its own `VelocityTracker`;
/// import one of them with a prefix if you use both.)
class VelocityTracker {
  VelocityTracker({
    this.window = 100,
    this.stopAfter = 60,
    this.maxSpeed = 8000,
  });

  /// How much recent history to fit, in milliseconds.
  final double window;

  /// A gap this long (ms) between the last sample and release means the pointer had stopped.
  final double stopAfter;

  /// Ignores absurd speeds from timer jitter (units per second).
  final double maxSpeed;

  final _samples = <({double time, double value})>[];

  /// Records [value] at [time] (ms, e.g. a pointer event's timestamp).
  void add(double value, double time) {
    if (_samples.isNotEmpty && time <= _samples.last.time) {
      _samples[_samples.length - 1] = (time: _samples.last.time, value: value);
      return;
    }
    _samples.add((time: time, value: value));
    final cutoff = time - window;
    while (_samples.length > 2 && _samples.first.time < cutoff) {
      _samples.removeAt(0);
    }
  }

  /// Units per second at [now] (ms); 0 with too little data or after a pause.
  double velocity([double? now]) {
    if (_samples.length < 2) return 0;
    final last = _samples.last;
    if (now != null && now - last.time > stopAfter) return 0;
    final recent = [
      for (final s in _samples)
        if (s.time >= last.time - window) s,
    ];
    if (recent.length < 2) return 0;
    var meanT = 0.0, meanV = 0.0;
    for (final s in recent) {
      meanT += s.time;
      meanV += s.value;
    }
    meanT /= recent.length;
    meanV /= recent.length;
    var num = 0.0, den = 0.0;
    for (final s in recent) {
      num += (s.time - meanT) * (s.value - meanV);
      den += (s.time - meanT) * (s.time - meanT);
    }
    if (den == 0) return 0;
    return ((num / den) * 1000).clamp(-maxSpeed, maxSpeed);
  }

  void reset() => _samples.clear();
}
