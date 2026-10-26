/// Shared Lab motion: presence, icon swaps, width-stable labels and auto height. The Dart twin of
/// `@feeef.dev/ui/motion` (+ `motion.css`). Transforms and opacity only, so nothing reflows.
library;

import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import 'theme/tokens.dart';
import 'theme.dart';

/// Whether presence content is shown (`open`) or animating out (`closed`).
enum PresenceState { open, closed }

bool _reduced(BuildContext context) => reducedMotionOf(context);

/// Keeps content mounted while it animates out: the twin of the `usePresence` hook. [builder]
/// gets whether the content is mounted and its state; `state` is the source of truth for the
/// animation and the timer ([exitMs], 0 under reduced motion) for unmounting.
class PresenceBuilder extends StatefulWidget {
  const PresenceBuilder({
    super.key,
    required this.open,
    this.exitMs = 200,
    required this.builder,
  });

  /// Whether the content should be shown.
  final bool open;

  /// How long closed content stays mounted, in milliseconds.
  final int exitMs;

  /// Draws the content for the current presence.
  final Widget Function(BuildContext context, bool mounted, PresenceState state)
  builder;

  @override
  State<PresenceBuilder> createState() => _PresenceBuilderState();
}

class _PresenceBuilderState extends State<PresenceBuilder> {
  late bool _mounted = widget.open;
  late PresenceState _state = widget.open
      ? PresenceState.open
      : PresenceState.closed;
  Timer? _timer;

  @override
  void didUpdateWidget(PresenceBuilder old) {
    super.didUpdateWidget(old);
    if (widget.open == old.open) return;
    _timer?.cancel();
    if (widget.open) {
      _mounted = true;
      _state = PresenceState.open;
      return;
    }
    if (!_mounted) return;
    _state = PresenceState.closed;
    _timer = Timer(
      Duration(milliseconds: _reduced(context) ? 0 : widget.exitMs),
      () {
        if (mounted) setState(() => _mounted = false);
      },
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      widget.builder(context, _mounted, _state);
}

/// Renders the last value while closing so exit frames never flash new content: the twin of the
/// `useLatched` hook. Keep one in a `State` and call [latch] in `build`.
class Latch<T> {
  Latch(this.value);

  /// The latched value.
  T value;

  /// Takes [next] while [hold] is true; otherwise keeps the previous value. Returns the latched one.
  T latch(T next, bool hold) {
    if (hold) value = next;
    return value;
  }
}

/// Mounts [render] while open and through its exit, with the last open output frozen. Where the
/// web kit sets `data-state` on the frozen node, content here reads it with [Presence.stateOf]
/// (or [PresenceTransition]) to animate open and closed.
class Presence extends StatefulWidget {
  const Presence({
    super.key,
    required this.open,
    this.exitMs = 160,
    required this.render,
  });

  /// Whether the content should be shown.
  final bool open;

  /// How long the closing frame stays mounted, in milliseconds. 0 under reduced motion.
  final int exitMs;

  /// Draws the content; called with `open` only, the closing frame reuses the last output.
  final Widget Function(PresenceState state) render;

  /// The presence state of the nearest [Presence] (`open` outside one).
  static PresenceState stateOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_PresenceScope>()?.state ??
      PresenceState.open;

  @override
  State<Presence> createState() => _PresenceState();
}

class _PresenceState extends State<Presence> {
  Widget? _last;

  @override
  Widget build(BuildContext context) => PresenceBuilder(
    open: widget.open,
    exitMs: widget.exitMs,
    builder: (context, mounted, state) {
      if (widget.open) _last = widget.render(PresenceState.open);
      if (!widget.open && !mounted) return const SizedBox.shrink();
      final node = _last;
      if (node == null) return const SizedBox.shrink();
      return _PresenceScope(
        state: widget.open ? PresenceState.open : state,
        child: node,
      );
    },
  );
}

class _PresenceScope extends InheritedWidget {
  const _PresenceScope({required this.state, required super.child});
  final PresenceState state;
  @override
  bool updateShouldNotify(_PresenceScope old) => old.state != state;
}

/// The keyframes of `motion.css` for content that opens and closes.
enum PresenceMotion {
  /// `lab-dialog-in/out`: scale and fade in (300ms), a quicker fade out (180ms).
  dialog,

  /// `lab-sheet-in/out`: dialogs at 720px and below rise from below (360ms in, 220ms out).
  sheet,

  /// `lab-menu-in/out`: menus grow from their trigger (200ms in, 140ms out).
  menu,

  /// `lab-backdrop-in/out`: opacity only, timed like [dialog].
  backdrop,
}

/// One side of a presence animation: the hidden pose the content enters from or exits to
/// (opacity 0, moved [dy] px down, scaled by [scale]) and how long the move takes. Entrances ease
/// out, exits ease in, like `--lab-ease-out` / `--lab-ease-in` keyframes in app CSS.
@immutable
class PresenceFrame {
  const PresenceFrame({required this.duration, this.dy = 0, this.scale = 1});

  /// How long the keyframes run.
  final Duration duration;

  /// Vertical offset of the hidden pose, in logical pixels.
  final double dy;

  /// Scale of the hidden pose.
  final double scale;
}

/// Plays a [PresenceMotion] whenever the surrounding [Presence] state (or [state]) changes: the
/// `[data-state]` animations of `motion.css`. [alignment] is the transform origin. [enter] and
/// [exit] replace the preset's keyframes with an app's own (what a `[data-state]` rule in app CSS
/// does on the web).
class PresenceTransition extends StatefulWidget {
  const PresenceTransition({
    super.key,
    this.motion = PresenceMotion.dialog,
    this.enter,
    this.exit,
    this.state,
    this.alignment = Alignment.center,
    required this.child,
  });

  /// Which keyframes to play.
  final PresenceMotion motion;

  /// Custom entrance keyframes (from this pose to rest); null keeps [motion]'s.
  final PresenceFrame? enter;

  /// Custom exit keyframes (from rest to this pose, held there); null keeps [motion]'s.
  final PresenceFrame? exit;

  /// Overrides the state read from the nearest [Presence].
  final PresenceState? state;

  /// Transform origin of the scale.
  final AlignmentGeometry alignment;
  final Widget child;

  @override
  State<PresenceTransition> createState() => _PresenceTransitionState();
}

class _PresenceTransitionState extends State<PresenceTransition>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this);
  PresenceState? _shown;

  ({Duration duration, double dy, double scale}) _frame(bool entering) {
    final custom = entering ? widget.enter : widget.exit;
    if (custom != null) {
      return (duration: custom.duration, dy: custom.dy, scale: custom.scale);
    }
    return _preset(entering);
  }

  ({Duration duration, double dy, double scale}) _preset(bool entering) =>
      switch ((widget.motion, entering)) {
        (PresenceMotion.dialog, true) => (
          duration: const Duration(milliseconds: 300),
          dy: 14,
          scale: 0.965,
        ),
        (PresenceMotion.dialog, false) => (
          duration: const Duration(milliseconds: 180),
          dy: 8,
          scale: 0.98,
        ),
        (PresenceMotion.sheet, true) => (
          duration: const Duration(milliseconds: 360),
          dy: 32,
          scale: 1,
        ),
        (PresenceMotion.sheet, false) => (
          duration: const Duration(milliseconds: 220),
          dy: 24,
          scale: 1,
        ),
        (PresenceMotion.menu, true) => (
          duration: const Duration(milliseconds: 200),
          dy: -4,
          scale: 0.96,
        ),
        (PresenceMotion.menu, false) => (
          duration: const Duration(milliseconds: 140),
          dy: -3,
          scale: 0.97,
        ),
        (PresenceMotion.backdrop, true) => (
          duration: const Duration(milliseconds: 300),
          dy: 0,
          scale: 1,
        ),
        (PresenceMotion.backdrop, false) => (
          duration: const Duration(milliseconds: 180),
          dy: 0,
          scale: 1,
        ),
      };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(PresenceTransition old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    final state = widget.state ?? Presence.stateOf(context);
    if (state == _shown) return;
    _shown = state;
    final entering = state == PresenceState.open;
    // Under reduced motion the CSS runs the keyframes for 1ms: effectively a jump.
    _controller.duration = _reduced(context)
        ? const Duration(milliseconds: 1)
        : _frame(entering).duration;
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (context, child) {
      final entering = _shown == PresenceState.open;
      final f = _frame(entering);
      // In: from the frame to rest (ease-out). Out: from rest to the frame (ease-in), held there.
      final t = entering
          ? 1 - MotionTokens.easeOut.transform(_controller.value)
          : MotionTokens.easeIn.transform(_controller.value);
      return IgnorePointer(
        ignoring: !entering,
        child: Opacity(
          opacity: 1 - t,
          child: Transform(
            alignment: widget.alignment,
            transform: Matrix4.translationValues(0, f.dy * t, 0)
              ..scaleByDouble(
                1 + (f.scale - 1) * t,
                1 + (f.scale - 1) * t,
                1,
                1,
              ),
            child: child,
          ),
        ),
      );
    },
    child: widget.child,
  );
}

/// Label that swaps between known values without changing width: every option is laid out in the
/// same cell and only the active one is visible (180ms fade, 220ms 3px rise, ease-out).
class StableText extends StatelessWidget {
  const StableText({
    super.key,
    required this.value,
    required this.options,
    this.style,
  });

  /// The label to show now.
  final String value;

  /// Every label this slot can show; the widest one sets the width.
  final List<String> options;

  /// Text style over the inherited one (tabular figures are always on).
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final all = options.contains(value) ? options : [...options, value];
    final base = const TextStyle(
      fontFeatures: [ui.FontFeature.tabularFigures()],
    ).merge(style);
    return Stack(
      alignment: AlignmentDirectional.topStart,
      children: [
        for (final option in all)
          _StableOption(
            key: ValueKey(option),
            text: option,
            active: option == value,
            style: base,
          ),
      ],
    );
  }
}

class _StableOption extends StatelessWidget {
  const _StableOption({
    super.key,
    required this.text,
    required this.active,
    required this.style,
  });
  final String text;
  final bool active;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final label = Text(text, style: style, softWrap: false);
    return ExcludeSemantics(
      excluding: !active,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: active ? 0 : 3),
        duration: const Duration(milliseconds: 220),
        curve: MotionTokens.easeOut,
        builder: (context, dy, child) =>
            Transform.translate(offset: Offset(0, dy), child: child),
        child: AnimatedOpacity(
          opacity: active ? 1 : 0,
          duration: const Duration(milliseconds: 180),
          curve: MotionTokens.easeOut,
          child: label,
        ),
      ),
    );
  }
}

/// Animates its own height to follow its content (320ms ease-out), so content that appears,
/// disappears or grows (results, errors, previews) eases instead of jumping. Overflow is clipped
/// 24px outside the box, like `overflow: clip; overflow-clip-margin: 24px`.
class AutoHeight extends StatefulWidget {
  const AutoHeight({super.key, required this.child});

  /// The content whose height the box follows.
  final Widget child;

  @override
  State<AutoHeight> createState() => _AutoHeightState();
}

class _AutoHeightState extends State<AutoHeight>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
  )..addListener(_tick);
  double? _height, _from, _to;

  void _tick() {
    final from = _from, to = _to;
    if (from == null || to == null) return;
    setState(
      () => _height =
          from +
          (to - from) * MotionTokens.easeOut.transform(_controller.value),
    );
  }

  void _measured(double height) {
    if (!mounted) return;
    if (_height == null || _reduced(context)) {
      _controller.stop();
      setState(() => _height = _to = height);
      return;
    }
    if (height == _to) return;
    _from = _height;
    _to = height;
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _HeightBox(
    height: _height,
    onChildHeight: _measured,
    child: widget.child,
  );
}

class _HeightBox extends SingleChildRenderObjectWidget {
  const _HeightBox({
    required this.height,
    required this.onChildHeight,
    super.child,
  });
  final double? height;
  final ValueChanged<double> onChildHeight;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderHeightBox(height, onChildHeight);

  @override
  void updateRenderObject(BuildContext context, _RenderHeightBox render) =>
      render
        ..height = height
        ..onChildHeight = onChildHeight;
}

class _RenderHeightBox extends RenderProxyBox {
  _RenderHeightBox(this._height, this.onChildHeight);
  ValueChanged<double> onChildHeight;
  double? _reported;
  double? _height;
  set height(double? value) {
    if (value == _height) return;
    _height = value;
    markNeedsLayout();
  }

  final _clip = LayerHandle<ClipRectLayer>();

  @override
  void performLayout() {
    final box = child;
    if (box == null) {
      size = constraints.smallest;
      return;
    }
    box.layout(
      constraints.copyWith(minHeight: 0, maxHeight: double.infinity),
      parentUsesSize: true,
    );
    final natural = box.size.height;
    size = constraints.constrain(Size(box.size.width, _height ?? natural));
    if (natural != _reported) {
      _reported = natural;
      // Like a ResizeObserver: the new height is reported after this layout.
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => onChildHeight(natural),
      );
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final box = child;
    if (box == null) return;
    final overflows =
        box.size.height > size.height + 0.01 ||
        box.size.width > size.width + 0.01;
    if (!overflows) {
      _clip.layer = null;
      context.paintChild(box, offset);
      return;
    }
    _clip.layer = context.pushClipRect(
      needsCompositing,
      offset,
      (Offset.zero & size).inflate(24),
      (context, offset) => context.paintChild(box, offset),
      oldLayer: _clip.layer,
    );
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      size.contains(position) &&
      super.hitTestChildren(result, position: position);

  @override
  void dispose() {
    _clip.layer = null;
    super.dispose();
  }
}

/// Cross-fades between keyed icons in one fixed-size cell, so play/pause, mic/stop and similar
/// swaps animate without moving surrounding layout. The new icon turns in from -25° at 55% scale
/// (220ms ease-out), the old one turns out to 25° (160ms ease-in), both through a 2px blur.
class Swap extends StatefulWidget {
  const Swap({super.key, required this.swapKey, required this.child});

  /// Identity of the current child; changing it cross-fades the old child out and the new one in.
  final String swapKey;

  /// The icon to show. Decorative: the cell is excluded from semantics, so label the control
  /// around it.
  final Widget child;

  @override
  State<Swap> createState() => _SwapState();
}

class _SwapItem {
  _SwapItem(this.key, this.child, this.controller);
  final String key;
  Widget child;
  final AnimationController controller;
  Timer? timer;
}

class _SwapState extends State<Swap> with TickerProviderStateMixin {
  late _SwapItem _current = _SwapItem(
    widget.swapKey,
    widget.child,
    AnimationController(vsync: this),
  );
  final _leaving = <_SwapItem>[];
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    // The first icon also plays `lab-swap-in` when it mounts.
    _current.controller
      ..duration = _ms(220)
      ..forward();
  }

  Duration _ms(int ms) => Duration(milliseconds: _reduced(context) ? 1 : ms);

  @override
  void didUpdateWidget(Swap old) {
    super.didUpdateWidget(old);
    if (widget.swapKey == _current.key) {
      _current.child = widget.child;
      return;
    }
    final last = _current;
    for (final item in _leaving.where(
      (item) => item.key == widget.swapKey || item.key == last.key,
    )) {
      _drop(item);
    }
    _leaving.removeWhere(
      (item) => item.key == widget.swapKey || item.key == last.key,
    );
    _leaving.add(last);
    last.controller
      ..duration = _ms(160)
      ..value = 0
      ..forward();
    last.timer = Timer(Duration(milliseconds: _reduced(context) ? 0 : 220), () {
      if (!mounted) return;
      setState(() => _leaving.remove(last));
      _drop(last);
    });
    _current = _SwapItem(
      widget.swapKey,
      widget.child,
      AnimationController(vsync: this, duration: _ms(220))..forward(),
    );
  }

  void _drop(_SwapItem item) {
    item.timer?.cancel();
    item.controller.dispose();
  }

  @override
  void dispose() {
    for (final item in [..._leaving, _current]) {
      _drop(item);
    }
    super.dispose();
  }

  Widget _frame(_SwapItem item, bool entering) => KeyedSubtree(
    key: ValueKey(item.key),
    child: AnimatedBuilder(
      animation: item.controller,
      builder: (context, child) {
        // 1 = fully hidden (opacity 0, scale .55, ±25°, blur 2px), 0 = at rest.
        final t = entering
            ? 1 - MotionTokens.easeOut.transform(item.controller.value)
            : MotionTokens.easeIn.transform(item.controller.value);
        final turn = (entering ? -25 : 25) * t * math.pi / 180;
        Widget result = Transform(
          alignment: Alignment.center,
          transform: Matrix4.rotationZ(turn)
            ..scaleByDouble(1 - 0.45 * t, 1 - 0.45 * t, 1, 1),
          child: child,
        );
        final blur = 2 * t;
        if (blur > 0.01) {
          result = ImageFiltered(
            imageFilter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
            child: result,
          );
        }
        return Opacity(opacity: (1 - t).clamp(0.0, 1.0), child: result);
      },
      child: item.child,
    ),
  );

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Stack(
      alignment: Alignment.center,
      children: [
        for (final item in _leaving) _frame(item, false),
        _frame(_current, true),
      ],
    ),
  );
}
