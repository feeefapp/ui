/// How much the kit's effects may cost on this device: the theme's [Performance] setting, resolved
/// once from the platform and the device when it is `auto`.
library;

import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'performance_device_io.dart'
    if (dart.library.js_interop) 'performance_device_web.dart'
    as device;
import 'theme.dart';

/// What the device can do, as far as the kit cares.
@immutable
class DeviceTraits {
  const DeviceTraits({
    required this.web,
    this.cores,
    this.memoryGb,
    this.threaded = false,
    this.softwareGpu = false,
  });

  /// Running in a browser.
  final bool web;

  /// Logical processors, when the platform says.
  final int? cores;

  /// Device memory in GB, when the platform says (Chromium on the web rounds it: 0.25 … 8).
  final double? memoryGb;

  /// The web renderer draws on its own thread (Skwasm in a cross-origin isolated page).
  final bool threaded;

  /// The browser has no usable GPU: WebGL is missing or would run in software (a blocklisted
  /// driver, a remote desktop, an old integrated chip). Every frame is then drawn by the CPU.
  final bool softwareGpu;

  /// This device, read once.
  static final DeviceTraits current = device.readDeviceTraits();
}

/// The effects tier in use (see [Performance]).
enum PerformanceTier {
  /// Everything: bubbles merge and split, the light follows the pointer, the lens bends.
  full,

  /// The full look, with bubbles that never merge: each stays its own shape and appears or leaves
  /// on its own. Merging traces outlines every frame, which the web pays for on the main thread.
  balanced,

  /// For weak devices: no merging, a fixed light, and the ambient pixel field holds still.
  light;

  /// Bubbles within a container's spacing blend into one shape.
  bool get merge => this == full;

  /// The glass light turns toward a mouse or pen.
  bool get pointerLight => this != light;

  /// Ambient decoration (the workspace's pixel field) animates.
  bool get ambientMotion => this != light;

  /// Decorative shaders and textures (grain, washes, auroras) are drawn. Below that a plain
  /// gradient or fill takes their place: on the web every frame repaints every shader pixel.
  bool get decoration => this != light;

  /// Floating glass filters what is behind it (saturation, lift, blur). Below that it is painted
  /// opaque (`GlassStyle.solid`): a backdrop filter reads the page back and filters it again on
  /// every frame anything under the glass moves, which is what weak GPUs drop frames on.
  bool get backdrop => this != light;
}

/// The tier for [mode] on a device with [traits]. `auto`: native devices get everything unless
/// they have fewer than 4 cores; the web never merges bubbles, and steps down to `light` with
/// 4 cores or fewer, or 4 GB of memory or less (unless the renderer has its own thread and the
/// memory is fine), or without a hardware GPU. [slow] (frames measured on this device, see
/// [MeasuredPerformance]) steps `auto` down to `light` anywhere.
PerformanceTier resolvePerformance(
  Performance mode,
  DeviceTraits traits, {
  bool slow = false,
}) {
  switch (mode) {
    case Performance.full:
      return PerformanceTier.full;
    case Performance.balanced:
      return PerformanceTier.balanced;
    case Performance.light:
      return PerformanceTier.light;
    case Performance.auto:
      if (slow) return PerformanceTier.light;
      final cores = traits.cores;
      final memory = traits.memoryGb;
      if (!traits.web) {
        return cores != null && cores < 4
            ? PerformanceTier.light
            : PerformanceTier.full;
      }
      final fewCores = cores != null && cores <= 4 && !traits.threaded;
      final littleMemory = memory != null && memory <= 4;
      return fewCores || littleMemory || traits.softwareGpu
          ? PerformanceTier.light
          : PerformanceTier.balanced;
  }
}

/// The tier the theme around [context] resolves to on this device (`auto` outside every
/// [ThemeProvider]; it follows a [MeasuredPerformanceScope] above [context]).
PerformanceTier performanceOf(BuildContext context) {
  final theme = ThemeProvider.maybeOf(context);
  if (theme != null) return theme.performance;
  return resolvePerformance(
    Performance.auto,
    DeviceTraits.current,
    slow: measuredSlowOf(context),
  );
}

/// [MeasuredPerformance.slow], rebuilding [context] when it changes under a
/// [MeasuredPerformanceScope].
bool measuredSlowOf(BuildContext context) =>
    context
        .dependOnInheritedWidgetOfExactType<MeasuredPerformanceScope>()
        ?.notifier
        ?.value ??
    MeasuredPerformance.slow.value;

/// Rebuilds what reads the effects tier outside a [ThemeProvider] when this device measures slow
/// ([ThemeProvider] already does so below it). Apps whose kit theme isn't above every screen put
/// one at their root.
class MeasuredPerformanceScope extends InheritedNotifier<ValueNotifier<bool>> {
  MeasuredPerformanceScope({super.key, required super.child})
    : super(notifier: MeasuredPerformance.slow);
}

/// What frames actually cost here. Cores and memory don't tell a weak GPU or a busy laptop from a
/// good one, so an app calls [watch] once at start: while the median of a full window of frames
/// takes longer than [slowFrame] twice in a row, [slow] turns true, `auto` themes step down to
/// `light` (every [ThemeProvider] rebuilds once) and the browser remembers it for [remember], so
/// the next visit starts light. Frames only exist while something moves, so idle time never counts;
/// the first [warmUp] (first routes, image decodes, shader compiles) doesn't either.
abstract final class MeasuredPerformance {
  /// True once this device measured too slow for the full look (or remembered so).
  static final ValueNotifier<bool> slow = ValueNotifier(
    device.rememberedSlow(remember),
  );

  /// A frame (vsync to raster done) longer than this misses 40 frames a second.
  static const slowFrame = Duration(milliseconds: 25);

  /// Frames per window.
  static const window = 60;

  /// Frames after [watch] that never count.
  static const warmUp = Duration(seconds: 4);

  /// How long a measured slow device stays light.
  static const remember = Duration(days: 14);

  static bool _watching = false;
  static final _spans = <int>[];
  static int _strikes = 0;
  static final _since = Stopwatch();

  /// Starts measuring (once; later calls do nothing). Nothing to do when already [slow].
  static void watch() {
    if (_watching || slow.value) return;
    _watching = true;
    _since.start();
    SchedulerBinding.instance.addTimingsCallback(_onTimings);
  }

  static void _onTimings(List<FrameTiming> timings) {
    if (_since.elapsed < warmUp) return;
    for (final timing in timings) {
      if (_add(timing.totalSpan)) {
        _watching = false;
        SchedulerBinding.instance.removeTimingsCallback(_onTimings);
        device.rememberSlow();
        slow.value = true;
        return;
      }
    }
  }

  /// Adds one frame; true when it closes the second slow window in a row.
  static bool _add(Duration span) {
    _spans.add(span.inMicroseconds);
    if (_spans.length < window) return false;
    _spans.sort();
    final median = _spans[_spans.length ~/ 2];
    _spans.clear();
    _strikes = median > slowFrame.inMicroseconds ? _strikes + 1 : 0;
    return _strikes >= 2;
  }

  /// Forgets a measured slow device (a settings "try the full look again").
  static void forget() {
    device.forgetSlow();
    _spans.clear();
    _strikes = 0;
    slow.value = false;
  }

  /// Feeds frame spans as if the engine reported them, without the warm-up or the browser (tests).
  @visibleForTesting
  static void debugReport(Iterable<Duration> spans) {
    for (final span in spans) {
      if (_add(span)) {
        slow.value = true;
        return;
      }
    }
  }
}
