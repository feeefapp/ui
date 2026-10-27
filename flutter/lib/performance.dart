/// How much the kit's effects may cost on this device: the theme's [Performance] setting, resolved
/// once from the platform and the device when it is `auto`.
library;

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
  });

  /// Running in a browser.
  final bool web;

  /// Logical processors, when the platform says.
  final int? cores;

  /// Device memory in GB, when the platform says (Chromium on the web rounds it: 0.25 … 8).
  final double? memoryGb;

  /// The web renderer draws on its own thread (Skwasm in a cross-origin isolated page).
  final bool threaded;

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
}

/// The tier for [mode] on a device with [traits]. `auto`: native devices get everything unless
/// they have fewer than 4 cores; the web never merges bubbles, and steps down to `light` with
/// 4 cores or fewer, or 4 GB of memory or less (unless the renderer has its own thread and the
/// memory is fine).
PerformanceTier resolvePerformance(Performance mode, DeviceTraits traits) {
  switch (mode) {
    case Performance.full:
      return PerformanceTier.full;
    case Performance.balanced:
      return PerformanceTier.balanced;
    case Performance.light:
      return PerformanceTier.light;
    case Performance.auto:
      final cores = traits.cores;
      final memory = traits.memoryGb;
      if (!traits.web) {
        return cores != null && cores < 4
            ? PerformanceTier.light
            : PerformanceTier.full;
      }
      final fewCores = cores != null && cores <= 4 && !traits.threaded;
      final littleMemory = memory != null && memory <= 4;
      return fewCores || littleMemory
          ? PerformanceTier.light
          : PerformanceTier.balanced;
  }
}

/// The tier the theme around [context] resolves to on this device (`auto` outside every
/// [ThemeProvider]).
PerformanceTier performanceOf(BuildContext context) => resolvePerformance(
  ThemeProvider.maybeOf(context)?.config.performance ?? Performance.auto,
  DeviceTraits.current,
);
