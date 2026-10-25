import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart'
    show DeviceGestureSettings, DragStartBehavior;
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/geometry.dart';
import '../glass/press.dart';
import '../physics/spring.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'button.dart' show ControlSize;
import '../glass/lens_glass.dart';
import 'lens.dart';
import 'lens_model.dart';
import 'slider_core.dart';
import 'spring_core.dart';
import 'touch_target.dart';

/// What the `render*` slots receive on every frame of interaction.
class SliderState {
  const SliderState({
    required this.value,
    required this.position,
    required this.fraction,
    required this.dragging,
    required this.disabled,
  });

  /// The committed value, snapped to `step`.
  final double value;

  /// Smooth pointer position, useful for progressive effects between discrete stops.
  final double position;

  /// `position` as 0–1 along the track.
  final double fraction;

  /// True while a pointer drags the thumb.
  final bool dragging;

  /// True when disabled or when the range is empty.
  final bool disabled;
}

/// A stop on the track, optionally labelled under it.
class SliderMark {
  const SliderMark({required this.value, this.label});
  final double value;
  final Widget? label;
}

/// `thick`: the track is the control surface. `thin`: a 4px rail with a round thumb.
enum TrackStyle { thick, thin }

/// A single-value slider with a large touch-friendly track, springy thumb, optional stops and
/// marks, and render slots for custom track, fill and thumb decoration: the twin of `Slider` in
/// `@feeef.dev/ui/primitives/slider`.
class Slider extends StatelessWidget {
  const Slider({
    super.key,
    required this.label,
    this.controlSize = ControlSize.regular,
    this.trackStyle = TrackStyle.thick,
    this.value,
    this.defaultValue,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.disabled = false,
    this.onValueChange,
    this.onValueCommit,
    this.getValueText,
    this.showStops = false,
    this.marks,
    this.renderTrack,
    this.renderFill,
    this.renderThumb,
    this.focusNode,
  });

  /// Accessible name. Not rendered; show a visible label next to the control yourself.
  final String label;

  /// Control height: `regular` (36px) or `small` (30px).
  final ControlSize controlSize;

  /// `thick`: the track is the control surface. `thin`: the iOS slider, a 6px rail with a
  /// 37 × 24 capsule thumb.
  final TrackStyle trackStyle;

  /// The value, for a controlled slider.
  final double? value;

  /// The initial value, for an uncontrolled slider. Defaults to [min].
  final double? defaultValue;
  final double min, max;

  /// Distance between allowed values. Page Up / Page Down move ten steps.
  final double step;
  final bool disabled;

  /// Called on every value change while dragging or pressing keys.
  final ValueChanged<double>? onValueChange;

  /// Called once when the user settles on a value: pointer release or a key press.
  final ValueChanged<double>? onValueCommit;

  /// Turns the value into the text screen readers announce, such as `"1,200 DZD"`.
  final String Function(double value)? getValueText;

  /// Draws a dot at every step (up to 101 steps). Ignored when [marks] is set.
  final bool showStops;

  /// Dots at chosen values; marks with a `label` also show it under the track.
  final List<SliderMark>? marks;

  /// Decoration drawn behind the rail, such as a waveform or gradient.
  final Widget Function(SliderState state)? renderTrack;

  /// Content inside the filled part of the track.
  final Widget Function(SliderState state)? renderFill;

  /// Content inside the thumb, such as an icon or the value.
  final Widget Function(SliderState state)? renderThumb;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => _SliderControl(
    label: label,
    controlSize: controlSize,
    trackStyle: trackStyle,
    value: value,
    defaultValue: defaultValue,
    min: min,
    max: max,
    step: step,
    disabled: disabled,
    onValueChange: onValueChange,
    onValueCommit: onValueCommit,
    getValueText: getValueText,
    showStops: showStops,
    marks: marks,
    renderTrack: renderTrack,
    renderFill: renderFill,
    renderThumb: renderThumb,
    focusNode: focusNode,
  );
}

/// An on/off switch that can be tapped or dragged. It shares the slider's track, thumb and spring;
/// the state maps to 0 and 1.
class SlideSwitch extends StatelessWidget {
  const SlideSwitch({
    super.key,
    required this.label,
    this.checked,
    this.defaultChecked = false,
    this.onCheckedChange,
    this.onCheckedCommit,
    this.onText,
    this.offText,
    this.loading = false,
    this.disabled = false,
    this.trackStyle = TrackStyle.thick,
    this.renderThumb,
    this.focusNode,
  });

  /// Accessible name. Not rendered; show a visible label next to the control yourself.
  final String label;

  /// The state, for a controlled switch.
  final bool? checked;

  /// The initial state, for an uncontrolled switch.
  final bool defaultChecked;

  /// Called whenever the state changes, including mid-drag.
  final ValueChanged<bool>? onCheckedChange;

  /// Called once when the user settles: a click, a key press or the end of a drag.
  final ValueChanged<bool>? onCheckedCommit;

  /// Short text shown on the track while on. Visual only.
  final String? onText;

  /// Short text shown on the track while off. Visual only.
  final String? offText;

  /// Disables the switch and marks it busy while a change is saving.
  final bool loading;
  final bool disabled;

  /// `thick`: the iOS switch (63 × 28 track, 37 × 24 thumb). `thin`: a rail with the same thumb.
  final TrackStyle trackStyle;
  final Widget Function(SliderState state)? renderThumb;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => _SliderControl(
    label: label,
    switchMode: true,
    disabled: disabled || loading,
    busy: loading,
    trackStyle: trackStyle,
    min: 0,
    max: 1,
    step: 1,
    value: checked == null ? null : (checked! ? 1 : 0),
    defaultValue: defaultChecked ? 1 : 0,
    onValueChange: onCheckedChange == null
        ? null
        : (next) => onCheckedChange!(next == 1),
    onValueCommit: onCheckedCommit == null
        ? null
        : (next) => onCheckedCommit!(next == 1),
    checkedText: (next) => next == 1 ? onText : offText,
    renderThumb: renderThumb,
    focusNode: focusNode,
  );
}

/// A non-interactive switch picture for menu items and rows that already carry the checked
/// semantics. Same geometry and spring, hidden from assistive technology.
class SlideSwitchIndicator extends StatelessWidget {
  const SlideSwitchIndicator({
    super.key,
    required this.checked,
    this.loading = false,
  });

  /// The state to draw.
  final bool checked;

  /// Dims the indicator while a change is saving.
  final bool loading;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: IgnorePointer(
      child: _SliderControl(
        label: '',
        switchMode: true,
        indicator: true,
        disabled: loading,
        min: 0,
        max: 1,
        step: 1,
        value: checked ? 1 : 0,
      ),
    ),
  );
}

class _SliderControl extends StatefulWidget {
  const _SliderControl({
    required this.label,
    this.controlSize = ControlSize.regular,
    this.trackStyle = TrackStyle.thick,
    this.value,
    this.defaultValue,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.disabled = false,
    this.busy = false,
    this.onValueChange,
    this.onValueCommit,
    this.getValueText,
    this.showStops = false,
    this.marks,
    this.renderTrack,
    this.renderFill,
    this.renderThumb,
    this.focusNode,
    this.switchMode = false,
    this.indicator = false,
    this.checkedText,
  });

  final String label;
  final ControlSize controlSize;
  final TrackStyle trackStyle;
  final double? value, defaultValue;
  final double min, max, step;
  final bool disabled, busy, showStops, switchMode, indicator;
  final ValueChanged<double>? onValueChange, onValueCommit;
  final String Function(double value)? getValueText;
  final List<SliderMark>? marks;
  final Widget Function(SliderState state)? renderTrack,
      renderFill,
      renderThumb;
  final FocusNode? focusNode;
  final String? Function(double value)? checkedText;

  @override
  State<_SliderControl> createState() => _SliderControlState();
}

class _Gesture {
  _Gesture(this.start, this.origin) : value = start, thumb = start;
  final double start;

  /// Where the press started, in the control's own pixels.
  final Offset origin;
  double value;
  bool moved = false;

  /// A dragged switch thumb: where it is (0 off … 1 on, rubber-banded past either end).
  double thumb;
}

class _SliderControlState extends State<_SliderControl>
    with SingleTickerProviderStateMixin {
  late final _motion = _SliderMotion(this);
  late double _internal;
  double? _position;
  bool _pressed = false;
  bool _tracking = false;
  bool _focusVisible = false;
  _Gesture? _gesture;
  bool _cancelPending = false;
  double _width = 0;

  ({double min, double max, double step}) get _range =>
      sliderRange(widget.min, widget.max, widget.step);
  double _normalize(double next) {
    final r = _range;
    return sliderValue(next, r.min, r.max, r.step);
  }

  double get _current => _normalize(widget.value ?? _internal);
  bool get _inert => widget.disabled || _range.max <= _range.min;
  bool get _rtl => Directionality.of(context) == TextDirection.rtl;
  bool get _thin => widget.trackStyle == TrackStyle.thin;

  @override
  void initState() {
    super.initState();
    _internal = _normalize(widget.defaultValue ?? _range.min);
  }

  @override
  void didUpdateWidget(_SliderControl old) {
    super.didUpdateWidget(old);
    if (_inert && _gesture != null) {
      _gesture = null;
      _pressed = false;
      _tracking = false;
      _position = null;
    }
  }

  @override
  void dispose() {
    _motion.dispose();
    _ownFocus.dispose();
    super.dispose();
  }

  double _publish(double next) {
    next = _normalize(next);
    if (next == _current) return next;
    if (widget.value == null) setState(() => _internal = next);
    widget.onValueChange?.call(next);
    return next;
  }

  double get _inset => _geometry(false).inset;

  /// `slider.css` geometry: the thick slider follows the control height, the thin one and the
  /// switch take the iOS thumb (`--lab-thumb-*`) and the switch its track (`--lab-switch-*`).
  _Geometry _geometry(bool coarse) {
    final s = ThemeProvider.of(context).sizes;
    if (widget.switchMode) {
      final h = s.switchHeight;
      return _Geometry(
        size: h,
        height: h,
        width: s.switchWidth,
        thumbWidth: s.thumbWidth,
        thumbHeight: s.thumbHeight,
        thumbRadius: s.thumbHeight / 2,
        trackHeight: _thin ? s.sliderTrack : h,
        inset: _thin
            ? s.thumbWidth / 2
            : s.thumbWidth / 2 + (h - s.thumbHeight) / 2,
        fillCap: _thin ? 0 : h / 2,
        dot: _thin ? 3 : 6,
      );
    }
    final size = widget.controlSize == ControlSize.small
        ? s.controlSmall
        : s.controlHeight;
    final height = widget.controlSize == ControlSize.small && coarse
        ? s.touchTarget
        : size;
    if (_thin) {
      return _Geometry(
        size: size,
        height: height,
        thumbWidth: s.thumbWidth,
        thumbHeight: s.thumbHeight,
        thumbRadius: s.thumbHeight / 2,
        trackHeight: s.sliderTrack,
        inset: s.thumbWidth / 2,
        fillCap: 0,
        dot: 3,
      );
    }
    return _Geometry(
      size: size,
      height: height,
      thumbWidth: size - 6,
      thumbHeight: size - 6,
      thumbRadius: (size - 6) * 0.45,
      trackHeight: height,
      inset: size / 2,
      fillCap: size / 2,
      dot: 6,
    );
  }

  double _atPointer(Offset local) {
    final r = _range;
    return r.min +
        sliderPointer(local.dx, _width, _rtl, _inset) * (r.max - r.min);
  }

  void _move(Offset local) {
    final raw = _atPointer(local);
    setState(() => _position = raw);
    final next = _publish(raw);
    _gesture?.value = next;
  }

  void _cancel() {
    final active = _gesture;
    setState(() {
      _gesture = null;
      _pressed = false;
      _tracking = false;
      _position = null;
    });
    if (active != null) _publish(active.start);
  }

  /// Ends a press: a tap toggles a switch, a dragged switch thumb settles where its momentum
  /// ([velocity], px/s, physical: right is positive) carries it, a slider takes [local].
  void _end(Offset? local, {double velocity = 0}) {
    final active = _gesture;
    if (active == null) return;
    if (widget.switchMode && !active.moved) {
      active.value = _publish(1 - active.start);
    } else if (widget.switchMode) {
      // Settles where the thumb's momentum carries it: a flick toggles.
      final travel = _travel;
      final speed = travel > 0 ? velocity * (_rtl ? -1 : 1) / travel : 0.0;
      active.value = _publish(switchSnap(active.thumb, speed));
    } else if (local != null) {
      _move(local);
    }
    final next = active.value;
    setState(() {
      _pressed = false;
      _tracking = false;
      _gesture = null;
      _position = null;
    });
    widget.onValueCommit?.call(next);
  }

  void _down(Offset local) {
    if (_inert || _gesture != null) return;
    _cancelPending = false;
    setState(() {
      _tracking = false;
      _pressed = true;
      _gesture = _Gesture(_current, local);
    });
    _motion.pointer(_logical(local));
    if (!widget.switchMode) _move(local);
  }

  /// [local] with x measured from the inline start (the glow and the switch drag are logical).
  Offset _logical(Offset local) =>
      _rtl ? Offset(_width - local.dx, local.dy) : local;

  /// How far (px) the switch thumb travels from off to on.
  double get _travel => math.max(0, _width - 2 * _inset);

  /// Drags the switch thumb by the pointer's travel since the press; the state flips at halfway.
  void _dragSwitch(Offset local) {
    final active = _gesture;
    if (active == null) return;
    final dx = (local.dx - active.origin.dx) * (_rtl ? -1 : 1);
    final travel = _travel;
    active.thumb = switchDragPosition(active.start, dx, travel);
    setState(() => _position = active.thumb);
    active.value = _publish(active.thumb);
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (_inert || (event is! KeyDownEvent && event is! KeyRepeatEvent)) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.escape && _gesture != null) {
      _cancel();
      return KeyEventResult.handled;
    }
    final r = _range;
    final current = _current;
    final double? next;
    if (widget.switchMode &&
        (key == LogicalKeyboardKey.space || key == LogicalKeyboardKey.enter)) {
      next = 1 - current;
    } else {
      final name = switch (key) {
        LogicalKeyboardKey.arrowRight => 'ArrowRight',
        LogicalKeyboardKey.arrowLeft => 'ArrowLeft',
        LogicalKeyboardKey.arrowUp => 'ArrowUp',
        LogicalKeyboardKey.arrowDown => 'ArrowDown',
        LogicalKeyboardKey.pageUp => 'PageUp',
        LogicalKeyboardKey.pageDown => 'PageDown',
        LogicalKeyboardKey.home => 'Home',
        LogicalKeyboardKey.end => 'End',
        _ => '',
      };
      next = sliderKey(name, current, r.min, r.max, r.step, _rtl);
    }
    if (next == null) return KeyEventResult.ignored;
    _publish(next);
    widget.onValueCommit?.call(next);
    return KeyEventResult.handled;
  }

  void _step(double direction) {
    final r = _range;
    final next = _normalize(_current + r.step * direction);
    _publish(next);
    widget.onValueCommit?.call(next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final r = _range;
    final current = _current;
    final inert = _inert;
    final displayPosition = inert ? current : (_position ?? current);
    // A dragged switch thumb shows its rubber band; everything else stays on the track.
    final fraction = widget.switchMode && _position != null && !inert
        ? _position!
        : sliderFraction(displayPosition, r.min, r.max);
    final reduced = reducedMotionOf(context);
    _motion.retarget(
      target: fraction,
      tracking: _tracking,
      pressed: _pressed,
      thin: _thin,
      disabled: inert,
      reduced: reduced,
    );
    final state = SliderState(
      value: current,
      position: displayPosition,
      fraction: fraction,
      dragging: _position != null,
      disabled: inert,
    );
    final geometry = _geometry(theme.coarsePointer(context));
    final height = geometry.height;
    final stopCount = ((r.max - r.min) / r.step).ceil() + 1;
    final stops =
        widget.marks ??
        (widget.showStops && stopCount <= 101
            ? [
                for (var i = 0; i < stopCount; i++)
                  SliderMark(value: math.min(r.max, r.min + i * r.step)),
              ]
            : const <SliderMark>[]);
    final dark = theme.brightness == Brightness.dark;
    // A solid thumb where the web kit hides its lens (lens.css): it still grows and stretches.
    final solid = glassStyleOf(context) == GlassStyle.solid;
    final checked = current == 1;
    final offFill = mixSrgb(c.ink, 0.18, c.surface);

    Widget track = SizedBox(
      width: geometry.width,
      height: height,
      child: LayoutBuilder(
        builder: (context, constraints) {
          _width = constraints.maxWidth;
          final width = constraints.maxWidth;
          return ListenableBuilder(
            listenable: _motion,
            builder: (context, _) {
              final f = widget.switchMode
                  ? _motion.position
                  : _motion.position.clamp(0.0, 1.0);
              final travel = width - 2 * geometry.inset;
              _motion
                ..travel = travel
                ..thumbWidth = geometry.thumbWidth;
              final fillWidth = geometry.inset + geometry.fillCap + travel * f;
              final trackTop = (height - geometry.trackHeight) / 2;
              final fillColor = widget.switchMode && !checked
                  ? offFill
                  : c.primary;
              // The drawn thumb: grown by the press and stretched along its travel
              // (pressedShape, like the web kit's --lab-slider-thumb-drawn-*).
              final stretch = _motion.stretch;
              final drawn = pressedShape(
                GlassShape(
                  x: geometry.inset - geometry.thumbWidth / 2 + travel * f,
                  y: (height - geometry.thumbHeight) / 2,
                  width: geometry.thumbWidth,
                  height: geometry.thumbHeight,
                  radius: geometry.thumbRadius,
                ),
                _motion.press,
                stretch,
                0,
              );
              final pointer = _motion.pointerAt;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  if (widget.renderTrack != null)
                    Positioned.fill(child: widget.renderTrack!(state)),
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _TrackPainter(
                        rail: mixSrgb(c.ink, 0.09, c.surface),
                        fill: fillColor,
                        trackTop: trackTop,
                        trackHeight: geometry.trackHeight,
                        fillRadius: height / 2,
                        fillWidth: fillWidth,
                        rtl: _rtl,
                        stops: [
                          for (final mark in stops)
                            if (mark.value >= r.min && mark.value <= r.max)
                              (
                                geometry.inset +
                                    travel *
                                        sliderFraction(
                                          mark.value,
                                          r.min,
                                          r.max,
                                        ),
                                mark.value <= current,
                              ),
                        ],
                        dot: geometry.dot,
                        stop: mixSrgb(c.ink, 0.28, transparent),
                        stopActive: mixSrgb(c.onPrimary, 0.35, transparent),
                        focus: _focusVisible
                            ? FocusRingStyle.of(context)
                            : null,
                      ),
                    ),
                  ),
                  if (widget.renderFill != null)
                    PositionedDirectional(
                      start: 0,
                      top: trackTop,
                      width: fillWidth,
                      height: geometry.trackHeight,
                      child: ClipPath(
                        clipper: _ShapeClipper(height / 2),
                        child: widget.renderFill!(state),
                      ),
                    ),
                  PositionedDirectional(
                    start: drawn.x,
                    top: drawn.y,
                    width: drawn.width,
                    height: drawn.height,
                    child: _Thumb(
                      radius: drawn.radius,
                      fill: dark ? c.ink : c.surface,
                      ink: dark ? c.surface : c.ink,
                      thin: _thin,
                      lens: solid ? 0 : _motion.lens,
                      lensPaint: LensPaint.of(c),
                      // The glow under the pointer, in the thumb's own (physical) pixels.
                      glowAt: pointer == null
                          ? Offset(drawn.width / 2, drawn.height / 2)
                          : Offset(
                              _rtl
                                  ? drawn.x + drawn.width - pointer.dx
                                  : pointer.dx - drawn.x,
                              pointer.dy - drawn.y,
                            ),
                      glowRadius: _motion.glowRadius,
                      glowOpacity: _motion.glowOpacity,
                      child: widget.renderThumb?.call(state),
                    ),
                  ),
                  if (widget.switchMode && !_thin)
                    Positioned.fill(
                      child: Padding(
                        padding: EdgeInsetsDirectional.only(
                          start: geometry.thumbWidth * (1 - f.clamp(0.0, 1.0)),
                          end: geometry.thumbWidth * f.clamp(0.0, 1.0),
                        ),
                        child: Center(
                          child: _switchText(
                            widget.checkedText?.call(current),
                            checked ? c.onPrimary : c.ink,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          );
        },
      ),
    );

    track = AnimatedOpacity(
      opacity: inert ? 0.5 : 1,
      duration: Duration.zero,
      child: track,
    );
    if (widget.indicator) return track;

    track = MouseRegion(
      cursor: inert ? SystemMouseCursors.forbidden : SystemMouseCursors.click,
      // A switch keeps its 63 × 28 look on touch screens and reaches 44px tall (TouchTarget).
      child: TouchTarget(
        minSize: widget.switchMode ? null : 0,
        child: MediaQuery(
          // A switch starts dragging after the web kit's slop (SWITCH_SLOP), not Flutter's 18px.
          data: widget.switchMode
              ? MediaQuery.of(context).copyWith(
                  gestureSettings: const DeviceGestureSettings(
                    touchSlop: switchSlopTouch,
                  ),
                )
              : MediaQuery.of(context),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            dragStartBehavior: DragStartBehavior.down,
            onHorizontalDragDown: inert
                ? null
                : (details) {
                    _focus.requestFocus();
                    _down(details.localPosition);
                  },
            onHorizontalDragStart: inert
                ? null
                : (details) {
                    final active = _gesture;
                    if (active == null) return;
                    active.moved = true;
                    setState(() => _tracking = true);
                  },
            onHorizontalDragUpdate: inert
                ? null
                : (details) {
                    if (_gesture == null) return;
                    _motion.pointer(_logical(details.localPosition));
                    if (!widget.switchMode) {
                      _move(details.localPosition);
                    } else if (_gesture!.moved) {
                      _dragSwitch(details.localPosition);
                    }
                  },
            onHorizontalDragEnd: inert
                ? null
                : (details) =>
                      _end(null, velocity: details.primaryVelocity ?? 0),
            // A press without movement ends the drag recognizer; the tap that follows commits it.
            // Anything else (a scroll took the pointer) reverts to the starting value.
            onHorizontalDragCancel: inert
                ? null
                : () {
                    _cancelPending = true;
                    scheduleMicrotask(() {
                      if (_cancelPending && mounted) {
                        _cancelPending = false;
                        _cancel();
                      }
                    });
                  },
            onTapUp: inert
                ? null
                : (details) {
                    _cancelPending = false;
                    _end(widget.switchMode ? null : details.localPosition);
                  },
            child: track,
          ),
        ),
      ),
    );

    final description = widget.getValueText?.call(current);
    final semantics = widget.switchMode
        ? Semantics(
            label: widget.label,
            toggled: checked,
            enabled: !inert,
            focusable: !inert,
            onTap: inert
                ? null
                : () {
                    final next = _publish(1 - current);
                    widget.onValueCommit?.call(next);
                  },
            child: track,
          )
        : Semantics(
            slider: true,
            label: widget.label,
            enabled: !inert,
            focusable: !inert,
            value: description ?? _format(current),
            increasedValue: _format(_normalize(current + r.step)),
            decreasedValue: _format(_normalize(current - r.step)),
            onIncrease: inert ? null : () => _step(1),
            onDecrease: inert ? null : () => _step(-1),
            child: track,
          );

    Widget result = Focus(
      focusNode: _focus,
      canRequestFocus: !inert,
      skipTraversal: inert,
      onKeyEvent: _onKey,
      onFocusChange: (focused) => setState(
        () => _focusVisible =
            focused &&
            FocusManager.instance.highlightMode ==
                FocusHighlightMode.traditional,
      ),
      child: MergeSemantics(child: semantics),
    );

    final labelled = widget.marks?.any((m) => m.label != null) ?? false;
    if (labelled) {
      result = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          result,
          ExcludeSemantics(
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: SizedBox(
                height: 24,
                child: _Marks(
                  inset: _inset,
                  marks: [
                    for (final mark in widget.marks!)
                      if (mark.value >= r.min && mark.value <= r.max)
                        (sliderFraction(mark.value, r.min, r.max), mark.label),
                  ],
                  color: c.muted,
                ),
              ),
            ),
          ),
        ],
      );
    }
    return result;
  }

  late final FocusNode _ownFocus = FocusNode();
  FocusNode get _focus => widget.focusNode ?? _ownFocus;

  String _format(double value) => value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toString();

  Widget _switchText(String? text, Color color) {
    if (text == null || text.isEmpty) return const SizedBox.shrink();
    return DefaultTextStyle.merge(
      style: TextStyle(
        fontSize: 11,
        height: 14 / 11,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w500,
        color: color,
      ),
      maxLines: 1,
      softWrap: false,
      child: CssBaseline(lineHeight: 14, child: Text(text)),
    );
  }
}

/// Sizes from `slider.css`: [size] is the control height, [height] the box (44 on touch for a
/// small slider), [width] fixed for switches, [inset] the edge-to-thumb-centre distance.
class _Geometry {
  _Geometry({
    required this.size,
    required this.height,
    this.width,
    required this.thumbWidth,
    required this.thumbHeight,
    required this.thumbRadius,
    required this.trackHeight,
    required this.inset,
    required this.fillCap,
    required this.dot,
  });
  final double size, height, inset, trackHeight, fillCap, dot;
  final double thumbWidth, thumbHeight, thumbRadius;
  final double? width;
}

class _TrackPainter extends CustomPainter {
  _TrackPainter({
    required this.rail,
    required this.fill,
    required this.trackTop,
    required this.trackHeight,
    required this.fillRadius,
    required this.fillWidth,
    required this.rtl,
    required this.stops,
    required this.dot,
    required this.stop,
    required this.stopActive,
    required this.focus,
  });
  final Color rail, fill, stop, stopActive;
  final FocusRingStyle? focus;
  final double trackTop, trackHeight, fillRadius, fillWidth, dot;
  final bool rtl;
  final List<(double, bool)> stops;

  double _x(double start, double width, Size size) =>
      rtl ? size.width - start - width : start;

  @override
  void paint(Canvas canvas, Size size) {
    final railRect = Rect.fromLTWH(0, trackTop, size.width, trackHeight);
    final railRadius = trackHeight / 2;
    canvas.drawPath(
      superellipsePath(railRect, [
        railRadius,
        railRadius,
        railRadius,
        railRadius,
      ]),
      Paint()..color = rail,
    );
    final fillRect = Rect.fromLTWH(
      _x(0, fillWidth, size),
      trackTop,
      fillWidth,
      trackHeight,
    );
    canvas.drawPath(
      superellipsePath(fillRect, [
        fillRadius,
        fillRadius,
        fillRadius,
        fillRadius,
      ]),
      Paint()..color = fill,
    );
    for (final (center, active) in stops) {
      canvas.drawCircle(
        Offset(_x(center, 0, size), size.height / 2),
        dot / 2,
        Paint()..color = active ? stopActive : stop,
      );
    }
    if (focus != null) {
      paintFocusRing(canvas, Offset.zero & size, size.height / 2, focus!);
    }
  }

  @override
  bool shouldRepaint(_TrackPainter old) => true;
}

class _ShapeClipper extends CustomClipper<Path> {
  _ShapeClipper(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_ShapeClipper old) => old.radius != radius;
}

/// The thumb: surface (ink in dark), superellipse corners (45 % on the thick slider, a capsule
/// on the switch and the thin slider), soft shadows. Pressed or dragged it turns into real glass
/// ([GlassLens], over the track it bends): the rest paint and shadows fade out as the glass fades
/// in ([lens]).
class _Thumb extends StatelessWidget {
  const _Thumb({
    required this.radius,
    required this.fill,
    required this.ink,
    required this.thin,
    required this.lens,
    required this.lensPaint,
    required this.glowAt,
    required this.glowRadius,
    required this.glowOpacity,
    this.child,
  });
  final double radius, lens, glowRadius, glowOpacity;
  final Color fill, ink;
  final bool thin;
  final LensPaint lensPaint;
  final Offset glowAt;
  final Widget? child;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    clipBehavior: Clip.none,
    children: [
      CustomPaint(
        painter: _ThumbPainter(
          fill: fill,
          radius: radius,
          shadows: thin
              ? const [(0, 1, 4, 0.18)]
              : const [(0, 1, 2, 0.20), (0, 3, 8, 0.12)],
          lens: lens.clamp(0.0, 1.0),
          lensPaint: lensPaint,
        ),
      ),
      GlassLens.fill(
        radius: radius,
        lens: lens,
        magnify: lensMagnify,
        glowAt: glowAt,
        glowRadius: glowRadius,
        glowOpacity: glowOpacity,
      ),
      if (child != null)
        Center(
          child: IconTheme.merge(
            data: IconThemeData(color: ink),
            child: DefaultTextStyle.merge(
              style: TextStyle(color: ink),
              child: child!,
            ),
          ),
        ),
    ],
  );
}

class _ThumbPainter extends CustomPainter {
  _ThumbPainter({
    required this.fill,
    required this.radius,
    required this.shadows,
    required this.lens,
    required this.lensPaint,
  });
  final Color fill;
  final double radius, lens;
  final LensPaint lensPaint;

  /// CSS box-shadows as (x, y, blur, black alpha); sigma = blur / 2.
  final List<(double, double, double, double)> shadows;

  @override
  void paint(Canvas canvas, Size size) {
    final r = math.min(radius, math.min(size.width, size.height) / 2);
    final rect = Offset.zero & size;
    final shape = superellipsePath(rect, [r, r, r, r]);
    final rest = 1 - lens;
    if (rest > 0.001) {
      for (final (x, y, blur, alpha) in shadows) {
        canvas.drawPath(
          shape.shift(Offset(x, y)),
          Paint()
            ..color = Color.from(alpha: alpha * rest, red: 0, green: 0, blue: 0)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur / 2),
        );
      }
    }
    lensPaint.paintShadow(canvas, shape, lens);
    if (rest > 0.001) {
      canvas.drawPath(
        shape,
        Paint()..color = fill.withValues(alpha: fill.a * rest),
      );
    }
  }

  @override
  bool shouldRepaint(_ThumbPainter old) =>
      old.fill != fill ||
      old.radius != radius ||
      old.shadows != shadows ||
      old.lens != lens ||
      old.lensPaint != lensPaint;
}

class _Marks extends StatelessWidget {
  const _Marks({required this.inset, required this.marks, required this.color});
  final double inset;
  final List<(double, Widget?)> marks;
  final Color color;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final travel = constraints.maxWidth - 2 * inset;
      return DefaultTextStyle.merge(
        style: TextStyle(
          fontSize: 12,
          height: 18 / 12,
          leadingDistribution: TextLeadingDistribution.even,
          color: color,
        ),
        maxLines: 1,
        softWrap: false,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            for (final (fraction, label) in marks)
              if (label != null)
                PositionedDirectional(
                  start: inset + travel * fraction,
                  top: 0,
                  child: FractionalTranslation(
                    translation: Offset(
                      Directionality.of(context) == TextDirection.rtl
                          ? 0.5
                          : -0.5,
                      0,
                    ),
                    child: CssBaseline(lineHeight: 18, child: label),
                  ),
                ),
          ],
        ),
      );
    },
  );
}

/// One spring clock for fill, thumb travel and the thumb's glass lens (`useSliderMotion` in the
/// web kit). While pressed the thumb turns into a lens ([lensThumbScale], [lensStretch], the touch
/// glow) and springs back on release, on the segmented pill's springs. Reduced motion and a
/// disabled control skip all of it.
class _SliderMotion extends ChangeNotifier {
  _SliderMotion(TickerProvider vsync) {
    _ticker = vsync.createTicker(_tick);
  }

  static final _snappy = springCoefficients(Springs.snappy);
  static final _bouncy = springCoefficients(Springs.bouncy);
  static final _smooth = springCoefficients(Springs.smooth);
  static final _interactive = springCoefficients(Springs.interactive);

  late final Ticker _ticker;
  double position = double.nan;
  double velocity = 0;
  StepSpringState _press = (position: 1, velocity: 0);
  StepSpringState _lens = (position: 0, velocity: 0);
  StepSpringState _stretch = (position: 0, velocity: 0);
  StepSpringState _glowRadius = (position: glassGlowStart, velocity: 0);
  StepSpringState _glowOpacity = (position: 0, velocity: 0);
  bool _lensing = false;
  Duration? _last;

  /// The thumb's travel (px), set at layout: turns the speed into the lens stretch.
  double travel = 0;

  /// The thumb's rest width (px), set at layout: the glow spreads to [glassGlowRadius] of it.
  double thumbWidth = 0;

  /// Where the pointer is (x from the inline start), for the glow; null when not pressed.
  Offset? pointerAt;

  double get press => _press.position;
  double get lens => _lens.position.clamp(0.0, 1.0);
  double get stretch => _stretch.position;
  double get glowRadius => _glowRadius.position;
  double get glowOpacity => _glowOpacity.position.clamp(0.0, 1.0);

  double _target = 0;
  bool _tracking = false, _pressed = false, _thin = false;
  bool _disabled = false, _reduced = false;

  void retarget({
    required double target,
    required bool tracking,
    required bool pressed,
    required bool thin,
    required bool disabled,
    required bool reduced,
  }) {
    if (position.isNaN) position = target;
    _target = target;
    _tracking = tracking;
    _pressed = pressed;
    _thin = thin;
    _disabled = disabled;
    _reduced = reduced;
    if (!pressed) pointerAt = null;
    _wake();
  }

  /// Moves the touch glow to [at] (x from the inline start).
  void pointer(Offset at) {
    pointerAt = at;
    _wake();
  }

  void _wake() {
    if (!_ticker.isActive) {
      _last = null;
      _ticker.start();
    }
  }

  static StepSpringState _step(
    StepSpringState value,
    double to,
    double dt,
    ({double stiffness, double damping}) spring,
  ) => stepSpring(
    value,
    to,
    dt,
    stiffness: spring.stiffness,
    damping: spring.damping,
  );

  static bool _resting(StepSpringState value, double to, double delta) =>
      (value.position - to).abs() <= delta &&
      value.velocity.abs() <= delta * 10;

  void _tick(Duration elapsed) {
    final dt = _last == null
        ? 1 / 60
        : ((elapsed - _last!).inMicroseconds / 1e6).clamp(1 / 240, 0.04);
    _last = elapsed;
    if (_reduced || _disabled) {
      position = _target;
      velocity = 0;
      _press = (position: 1, velocity: 0);
      _lens = (position: 0, velocity: 0);
      _stretch = (position: 0, velocity: 0);
      _glowOpacity = (position: 0, velocity: 0);
      _lensing = false;
      _stop();
      return;
    }
    final previous = position;
    if (_tracking) {
      position = _target;
      velocity = (_target - previous) / dt;
    } else {
      final next = stepSpring(
        (position: position, velocity: velocity),
        _target,
        dt,
        stiffness: _thin ? 700 : 420,
        damping: _thin ? 48 : 28,
      );
      position = next.position;
      velocity = next.velocity;
    }
    // The lens: in on a press (the glow starts small under the finger and spreads), out on release.
    if (_pressed && !_lensing) {
      _lensing = true;
      _glowRadius = (position: glassGlowStart, velocity: 0);
      _glowOpacity = (position: 1, velocity: 0);
    } else if (!_pressed) {
      _lensing = false;
    }
    final lensing = _lensing;
    final glowTo = glassGlowRadius(thumbWidth);
    _press = _step(
      _press,
      lensing ? lensThumbScale : 1,
      dt,
      lensing ? _snappy : _bouncy,
    );
    _lens = _step(_lens, lensing ? 1 : 0, dt, _snappy);
    final stretchTarget = lensing ? lensStretch(velocity * travel) : 0.0;
    _stretch = _step(
      _stretch,
      stretchTarget,
      dt,
      lensing ? _interactive : _bouncy,
    );
    _glowRadius = _step(_glowRadius, glowTo, dt, _smooth);
    _glowOpacity = _step(_glowOpacity, lensing ? 1 : 0, dt, _smooth);
    final moving =
        (position - _target).abs() > 0.0001 ||
        velocity.abs() > 0.002 ||
        !_resting(_press, lensing ? lensThumbScale : 1, 0.0005) ||
        !_resting(_lens, lensing ? 1 : 0, 0.002) ||
        !_resting(_stretch, stretchTarget, 0.05) ||
        !_resting(_glowOpacity, lensing ? 1 : 0, 0.005) ||
        (lensing && !_resting(_glowRadius, glowTo, 0.5));
    if (!moving) {
      position = _target;
      velocity = 0;
      _press = (position: lensing ? lensThumbScale : 1, velocity: 0);
      _lens = (position: lensing ? 1 : 0, velocity: 0);
      _stretch = (position: 0, velocity: 0);
      _glowOpacity = (position: lensing ? 1 : 0, velocity: 0);
      _stop();
      return;
    }
    notifyListeners();
  }

  void _stop() {
    _ticker.stop();
    _last = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }
}
