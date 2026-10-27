/// Keeps the pointer for Flutter where it paints over a web platform view.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'pointer_shield_stub.dart'
    if (dart.library.js_interop) 'pointer_shield_web.dart'
    as impl;

/// On the web a platform view that takes the pointer (an iframe, a video) keeps every pointer event
/// over its area, even where Flutter paints on top of it: the browser hands the event to the
/// topmost element, and an iframe's events never reach Flutter. A [PointerShield] puts an
/// invisible element of the page under [child], so the pointer over [child] goes to Flutter again
/// (the `pointer_interceptor` technique). Once [retain] has been called, a press that starts on
/// Flutter also keeps its moves and release when the pointer crosses the embedded page (a drag out
/// of a sheet, a canvas pan). Elsewhere it is just [child].
///
/// The kit's floating surfaces (glass bubbles, sheets, dialogs, panes, popups) shield themselves
/// while a platform view has asked for it with [retain], so apps only call [retain] when they
/// show one (an embedded preview) and wrap their own opaque chrome over it in a shield.
class PointerShield extends StatelessWidget {
  const PointerShield({
    super.key,
    required this.child,
    this.always = false,
    this.enabled = true,
  });

  /// What keeps the pointer.
  final Widget child;

  /// Shields even when no platform view has called [retain].
  final bool always;

  /// False lets the pointer through to the page again (a layer that stopped taking taps).
  final bool enabled;

  static final ValueNotifier<int> _views = ValueNotifier(0);

  /// A platform view that takes the pointer is on screen: shields are on until the returned
  /// callback runs (call it when the view goes away). Several views may hold it at once.
  static VoidCallback retain() {
    if (kIsWeb) impl.installPointerCapture();
    _change(1);
    var released = false;
    return () {
      if (released) return;
      released = true;
      _change(-1);
    };
  }

  /// Views come and go while widgets build: the shields follow once the frame is done.
  static void _change(int delta) {
    final scheduler = SchedulerBinding.instance;
    if (scheduler.schedulerPhase == SchedulerPhase.idle ||
        scheduler.schedulerPhase == SchedulerPhase.postFrameCallbacks) {
      _views.value += delta;
    } else {
      scheduler.addPostFrameCallback((_) => _views.value += delta);
      scheduler.scheduleFrame();
    }
  }

  /// How many platform views hold the shields on.
  static ValueListenable<int> get active => _views;

  @override
  Widget build(BuildContext context) {
    if (!kIsWeb) return child;
    // One shape whatever [enabled] and [always] are, so [child] keeps its state as they change.
    return ValueListenableBuilder<int>(
      valueListenable: _views,
      child: child,
      builder: (context, views, child) =>
          _Shielded(on: enabled && (always || views > 0), child: child!),
    );
  }
}

/// One tree whether the shield is on or off, so [child] keeps its state when it toggles.
class _Shielded extends StatelessWidget {
  const _Shielded({required this.on, required this.child});
  final bool on;
  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.passthrough,
    children: [
      Positioned.fill(child: on ? impl.shieldElement() : const SizedBox()),
      child,
    ],
  );
}
