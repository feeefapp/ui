import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart' show DragStartBehavior;
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import 'button.dart' show ControlSize;
import 'slider_core.dart';
import 'spring_core.dart';

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

  /// Track height: `regular` (44px) or `compact` (40px).
  final ControlSize controlSize;
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
    this.controlSize = ControlSize.regular,
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
  final ControlSize controlSize;
  final TrackStyle trackStyle;
  final Widget Function(SliderState state)? renderThumb;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => _SliderControl(
    label: label,
    switchMode: true,
    disabled: disabled || loading,
    busy: loading,
    controlSize: controlSize,
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
    this.controlSize = ControlSize.compact,
  });

  /// The state to draw.
  final bool checked;

  /// Dims the indicator while a change is saving.
  final bool loading;
  final ControlSize controlSize;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: IgnorePointer(
      child: _SliderControl(
        label: '',
        switchMode: true,
        indicator: true,
        disabled: loading,
        controlSize: controlSize,
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
  _Gesture(this.start) : value = start;
  final double start;
  double value;
  bool moved = false;
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

  double get _inset {
    final size = _size;
    return _thin ? 8 : size / 2;
  }

  double get _size {
    final s = ThemeProvider.of(context).sizes;
    return widget.controlSize == ControlSize.compact
        ? s.controlCompact
        : s.controlHeight;
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

  void _end(Offset? local) {
    final active = _gesture;
    if (active == null) return;
    if (widget.switchMode && !active.moved) {
      active.value = _publish(1 - active.start);
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
      _gesture = _Gesture(_current);
    });
    if (!widget.switchMode) _move(local);
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
    final fraction = sliderFraction(displayPosition, r.min, r.max);
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    _motion.retarget(
      target: fraction,
      tracking: _tracking,
      pressed: _pressed,
      thin: _thin,
      disabled: inert,
      reduced: reduced,
      rtl: _rtl,
    );
    final state = SliderState(
      value: current,
      position: displayPosition,
      fraction: fraction,
      dragging: _position != null,
      disabled: inert,
    );
    final size = _size;
    var height = size;
    if (widget.controlSize == ControlSize.compact &&
        theme.coarsePointer(context)) {
      height = theme.sizes.touchTarget;
    }
    final stopCount = ((r.max - r.min) / r.step).ceil() + 1;
    final stops =
        widget.marks ??
        (widget.showStops && stopCount <= 101
            ? [
                for (var i = 0; i < stopCount; i++)
                  SliderMark(value: math.min(r.max, r.min + i * r.step)),
              ]
            : const <SliderMark>[]);
    final geometry = _Geometry(
      size: size,
      height: height,
      thin: _thin,
      inset: _inset,
    );
    final dark = theme.brightness == Brightness.dark;
    final checked = current == 1;
    final offFill = mixSrgb(c.ink, 0.18, c.surface);

    Widget track = SizedBox(
      width: widget.switchMode
          ? (widget.controlSize == ControlSize.compact ? 68 : 76)
          : null,
      height: height,
      child: LayoutBuilder(
        builder: (context, constraints) {
          _width = constraints.maxWidth;
          final width = constraints.maxWidth;
          return ListenableBuilder(
            listenable: _motion,
            builder: (context, _) {
              final f = _motion.position.clamp(0.0, 1.0);
              final travel = width - 2 * geometry.inset;
              final fillWidth = geometry.inset + geometry.fillCap + travel * f;
              final thumbStart =
                  geometry.inset - geometry.thumbSize / 2 + travel * f;
              final trackTop = (height - geometry.trackHeight) / 2;
              final fillColor = widget.switchMode && !checked
                  ? offFill
                  : c.primary;
              final shape = _motion.shape.clamp(-0.18, 1.25);
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
                        focus: _focusVisible ? c.focus : null,
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
                    start: thumbStart,
                    top: (height - geometry.thumbSize) / 2,
                    width: geometry.thumbSize,
                    height: geometry.thumbSize,
                    child: Transform(
                      alignment: AlignmentDirectional(
                        -1 + 2 * f,
                        0,
                      ).resolve(Directionality.of(context)),
                      transform: Matrix4.translationValues(_motion.lean, 0, 0)
                        ..scaleByDouble(
                          1 + shape * 0.18,
                          1 - shape * 0.07,
                          1,
                          1,
                        ),
                      child: _Thumb(
                        size: geometry.thumbSize,
                        fill: dark ? c.ink : c.surface,
                        ink: dark ? c.surface : c.ink,
                        pressed: _pressed && !inert,
                        thin: _thin,
                        child: widget.renderThumb?.call(state),
                      ),
                    ),
                  ),
                  if (widget.switchMode && !_thin)
                    Positioned.fill(
                      child: Padding(
                        padding: EdgeInsetsDirectional.only(
                          start: geometry.thumbSize * (1 - f),
                          end: geometry.thumbSize * f,
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
                if (!widget.switchMode || _gesture!.moved) {
                  _move(details.localPosition);
                }
              },
        onHorizontalDragEnd: inert ? null : (_) => _end(null),
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
        fontSize: 12,
        height: 18 / 12,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w500,
        color: color,
      ),
      maxLines: 1,
      softWrap: false,
      child: CssBaseline(lineHeight: 18, child: Text(text)),
    );
  }
}

/// Sizes derived from the control height, like `slider.css`.
class _Geometry {
  _Geometry({
    required this.size,
    required this.height,
    required this.thin,
    required this.inset,
  }) : thumbSize = thin ? 16 : size - 6,
       trackHeight = thin ? 4 : height,
       fillCap = thin ? 0 : size / 2,
       dot = thin ? 3 : 6;
  final double size, height, inset, thumbSize, trackHeight, fillCap, dot;
  final bool thin;
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
  final Color? focus;
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
      // outline: 2px solid focus, 3px outside the control's rounded box.
      final ring = (Offset.zero & size).inflate(4);
      final radius = size.height / 2 + 4;
      canvas.drawPath(
        superellipsePath(ring, [radius, radius, radius, radius], inset: 1),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = focus!,
      );
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

/// The thumb: surface (ink in dark), 45% superellipse corners, two soft shadows.
class _Thumb extends StatelessWidget {
  const _Thumb({
    required this.size,
    required this.fill,
    required this.ink,
    required this.pressed,
    required this.thin,
    this.child,
  });
  final double size;
  final Color fill, ink;
  final bool pressed, thin;
  final Widget? child;

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _ThumbPainter(
      fill: fill,
      radius: size * 0.45,
      shadows: thin && !pressed
          ? const [(0, 1, 4, 0.18)]
          : pressed
          ? const [(0, 2, 4, 0.18), (0, 4, 12, 0.16)]
          : const [(0, 1, 2, 0.20), (0, 3, 8, 0.12)],
    ),
    child: child == null
        ? null
        : Center(
            child: IconTheme.merge(
              data: IconThemeData(color: ink),
              child: DefaultTextStyle.merge(
                style: TextStyle(color: ink),
                child: child!,
              ),
            ),
          ),
  );
}

class _ThumbPainter extends CustomPainter {
  _ThumbPainter({
    required this.fill,
    required this.radius,
    required this.shadows,
  });
  final Color fill;
  final double radius;

  /// CSS box-shadows as (x, y, blur, black alpha); sigma = blur / 2.
  final List<(double, double, double, double)> shadows;

  @override
  void paint(Canvas canvas, Size size) {
    final shape = superellipsePath(Offset.zero & size, [
      radius,
      radius,
      radius,
      radius,
    ]);
    for (final (x, y, blur, alpha) in shadows) {
      canvas.drawPath(
        shape.shift(Offset(x, y)),
        Paint()
          ..color = Color.from(alpha: alpha, red: 0, green: 0, blue: 0)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur / 2),
      );
    }
    canvas.drawPath(shape, Paint()..color = fill);
  }

  @override
  bool shouldRepaint(_ThumbPainter old) =>
      old.fill != fill || old.radius != radius || old.shadows != shadows;
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

/// One spring clock for fill, thumb travel and deformation (`useSliderMotion` in the web kit).
class _SliderMotion extends ChangeNotifier {
  _SliderMotion(TickerProvider vsync) {
    _ticker = vsync.createTicker(_tick);
  }

  late final Ticker _ticker;
  double position = double.nan;
  double velocity = 0, shape = 0, shapeVelocity = 0, lean = 0;
  Duration? _last;

  double _target = 0;
  bool _tracking = false, _pressed = false, _thin = false;
  bool _disabled = false, _reduced = false, _rtl = false;

  void retarget({
    required double target,
    required bool tracking,
    required bool pressed,
    required bool thin,
    required bool disabled,
    required bool reduced,
    required bool rtl,
  }) {
    if (position.isNaN) position = target;
    _target = target;
    _tracking = tracking;
    _pressed = pressed;
    _thin = thin;
    _disabled = disabled;
    _reduced = reduced;
    _rtl = rtl;
    if (!_ticker.isActive) {
      _last = null;
      _ticker.start();
    }
  }

  void _tick(Duration elapsed) {
    final dt = _last == null
        ? 1 / 60
        : ((elapsed - _last!).inMicroseconds / 1e6).clamp(1 / 240, 0.04);
    _last = elapsed;
    if (_reduced || _disabled) {
      position = _target;
      velocity = 0;
      shape = 0;
      shapeVelocity = 0;
      lean = 0;
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
    final speed = velocity.abs();
    final shapeTarget =
        (_pressed ? 0.25 : 0.0) +
        (_thin && !_pressed ? 0.0 : math.min(1.0, speed * 0.32));
    final s = stepSpring(
      (position: shape, velocity: shapeVelocity),
      shapeTarget,
      dt,
      stiffness: 330,
      damping: 20,
    );
    shape = s.position;
    shapeVelocity = s.velocity;
    lean = (velocity * 0.2).clamp(-1.0, 1.0) * (_rtl ? -1 : 1);
    final moving =
        (position - _target).abs() > 0.0001 ||
        velocity.abs() > 0.002 ||
        (shape - shapeTarget).abs() > 0.001 ||
        shapeVelocity.abs() > 0.01;
    if (!moving) {
      position = _target;
      velocity = 0;
      shape = _pressed ? 0.25 : 0;
      shapeVelocity = 0;
      lean = 0;
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
