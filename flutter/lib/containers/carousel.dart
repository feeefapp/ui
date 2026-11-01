import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../icons/lucide.dart';
import '../physics/spring.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/tokens.dart';
import '../toolbar.dart';
import 'carousel_model.dart';

export 'carousel_model.dart' show CarouselEffect;

/// A slide's width: a fraction of the carousel or a length in px (the web kit's `slideWidth`,
/// a number or a CSS length).
sealed class SlideWidth {
  const SlideWidth();

  /// A fraction of the carousel: 0.8 shows a peek of the next slide, 1 is one per view.
  const factory SlideWidth.fraction(double value) = _FractionWidth;

  /// A fixed width in px (`'280px'`).
  const factory SlideWidth.px(double value) = _PixelWidth;

  /// The width in px inside a carousel [width] px wide.
  double resolve(double width);
}

class _FractionWidth extends SlideWidth {
  const _FractionWidth(this.value);
  final double value;
  @override
  double resolve(double width) => width * value;
}

class _PixelWidth extends SlideWidth {
  const _PixelWidth(this.value);
  final double value;
  @override
  double resolve(double width) => value;
}

/// Where a resting slide aligns.
enum CarouselAlign { center, start }

/// When the previous/next buttons show: `auto` for mouse and trackpad users on hover or focus.
enum CarouselControls { auto, always, never }

/// A slide's live distance from the center (the web kit's `--lab-carousel-progress`), for custom
/// effects inside a slide: `CarouselProgress.of(context)` rebuilds on every change;
/// [CarouselProgress.listenableOf] gives the notifier for paint-only effects.
class CarouselProgress extends InheritedNotifier<ValueNotifier<double>> {
  const CarouselProgress({
    super.key,
    required this.effect,
    required ValueNotifier<double> progress,
    required super.child,
  }) : super(notifier: progress);

  /// The carousel's effect (parallax media only move under `parallax`).
  final CarouselEffect effect;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<CarouselEffect>('effect', effect))
      ..add(DoubleProperty('progress', notifier?.value));
  }

  /// Signed progress in slide steps, physical axis: 0 centered, ±1 a neighbour's place.
  static double of(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<CarouselProgress>()
          ?.notifier
          ?.value ??
      0;

  /// The progress notifier of the enclosing slide, or null outside a carousel.
  static ValueListenable<double>? listenableOf(BuildContext context) =>
      context.getInheritedWidgetOfExactType<CarouselProgress>()?.notifier;

  static CarouselEffect? _effectOf(BuildContext context) =>
      context.getInheritedWidgetOfExactType<CarouselProgress>()?.effect;
}

/// Media inside a slide that drifts against the scroll under the `parallax` effect (the web kit's
/// `data-lab-parallax`): moved by progress × −22% of its width and scaled 1.25.
class CarouselParallax extends StatelessWidget {
  const CarouselParallax({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final progress = CarouselProgress.listenableOf(context);
    if (progress == null ||
        CarouselProgress._effectOf(context) != CarouselEffect.parallax) {
      return child;
    }
    return ValueListenableBuilder<double>(
      valueListenable: progress,
      builder: (context, p, child) => FractionalTranslation(
        translation: Offset(p * -0.22, 0),
        child: child,
      ),
      child: Transform.scale(scale: 1.25, child: child),
    );
  }
}

/// A horizontal carousel with snap paging: touch and trackpads fling and land on the slide their
/// momentum projects to, a mouse can drag and flick it (never skipping more than three slides),
/// and the wheel settles on the nearest slide when it stops. Slides react to their distance from
/// the center (scale, fade or parallax, plus [CarouselProgress] for custom effects). The twin of
/// `Carousel` in `@feeef.dev/ui/containers/carousel`.
class Carousel extends StatefulWidget {
  const Carousel({
    super.key,
    required this.children,
    required this.label,
    this.slideWidth = const SlideWidth.fraction(0.82),
    this.gap = 12,
    this.align = CarouselAlign.center,
    this.effect = CarouselEffect.scale,
    this.index,
    this.onIndexChange,
    this.dots = true,
    this.controls = CarouselControls.auto,
  });

  /// The slides. Each child becomes one slide.
  final List<Widget> children;

  /// Accessible name, e.g. “Featured products”.
  final String label;

  /// Slide width. Default 0.82 of the carousel.
  final SlideWidth slideWidth;

  /// Space between slides in px. Default 12.
  final double gap;

  /// Where a resting slide aligns. Default `center`.
  final CarouselAlign align;

  /// Scroll transition applied to each slide as it moves away from the center. Default `scale`.
  final CarouselEffect effect;

  /// Controlled current slide.
  final int? index;

  /// Called when a different slide comes to rest at the center (or start).
  final ValueChanged<int>? onIndexChange;

  /// Page dots under the track. Default true.
  final bool dots;

  /// Previous/next buttons over the track. Default `auto`.
  final CarouselControls controls;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(
        DiagnosticsProperty<SlideWidth>(
          'slideWidth',
          slideWidth,
          description: switch (slideWidth) {
            _FractionWidth(:final value) => '$value of the carousel',
            _PixelWidth(:final value) => '${value}px',
          },
          defaultValue: const SlideWidth.fraction(0.82),
        ),
      )
      ..add(DoubleProperty('gap', gap, defaultValue: 12.0))
      ..add(
        EnumProperty<CarouselAlign>(
          'align',
          align,
          defaultValue: CarouselAlign.center,
        ),
      )
      ..add(
        EnumProperty<CarouselEffect>(
          'effect',
          effect,
          defaultValue: CarouselEffect.scale,
        ),
      )
      ..add(IntProperty('index', index, defaultValue: null))
      ..add(
        ObjectFlagProperty<ValueChanged<int>?>.has(
          'onIndexChange',
          onIndexChange,
        ),
      )
      ..add(
        FlagProperty(
          'dots',
          value: dots,
          ifFalse: 'no dots',
          defaultValue: true,
        ),
      )
      ..add(
        EnumProperty<CarouselControls>(
          'controls',
          controls,
          defaultValue: CarouselControls.auto,
        ),
      );
  }

  @override
  State<Carousel> createState() => _CarouselState();
}

class _CarouselState extends State<Carousel> {
  final _controller = ScrollController();
  final _trackFocus = FocusNode(debugLabel: 'Carousel track');
  final _progress = <ValueNotifier<double>>[];
  late int _current = widget.index ?? 0;
  double _step = 0;
  bool _rtl = false;
  bool _placed = false;
  bool _hovered = false, _focusWithin = false, _focusVisible = false;
  bool _dragging = false, _mouseFlick = false, _wheeling = false;
  Drag? _drag;
  Timer? _wheelTimer;

  int get _count => widget.children.length;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('current', _current))
      ..add(IntProperty('count', _count))
      ..add(DoubleProperty('step', _step, unit: 'px'))
      ..add(FlagProperty('placed', value: _placed, ifFalse: 'not placed yet'))
      ..add(FlagProperty('dragging', value: _dragging, ifTrue: 'dragging'))
      ..add(FlagProperty('wheeling', value: _wheeling, ifTrue: 'wheeling'))
      ..add(FlagProperty('hovered', value: _hovered, ifTrue: 'hovered'))
      ..add(
        FlagProperty(
          'focusWithin',
          value: _focusWithin,
          ifTrue: 'focus within',
        ),
      );
  }

  @override
  void initState() {
    super.initState();
    _controller.addListener(_paint);
  }

  @override
  void didUpdateWidget(Carousel old) {
    super.didUpdateWidget(old);
    final index = widget.index;
    if (index != null && index != _current) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _go(index);
      });
    }
  }

  @override
  void dispose() {
    _wheelTimer?.cancel();
    _controller.dispose();
    _trackFocus.dispose();
    for (final p in _progress) {
      p.dispose();
    }
    super.dispose();
  }

  bool get _reduced => reducedMotionOf(context);

  /// Resting scroll offset of every slide (scroll snap clamps them to the scroll range).
  List<double> _offsets(double max) => [
    for (var i = 0; i < _count; i++) math.min(max, i * _step),
  ];

  bool _takeMouseFlick() {
    final mouse = _mouseFlick;
    _mouseFlick = false;
    return mouse;
  }

  /// Progress of every slide and the current index, after every scroll or layout change.
  void _paint() {
    if (!_controller.hasClients || _step <= 0) return;
    final pixels = _controller.position.pixels;
    final progress = <double>[];
    for (var i = 0; i < _count; i++) {
      final logical = slideProgress(i * _step, pixels, _step);
      final p = _rtl ? -logical : logical;
      progress.add(p);
      if (i < _progress.length) _progress[i].value = p;
    }
    if (progress.isEmpty) return;
    final next = centeredIndex(progress);
    if (next != _current) {
      setState(() => _current = next);
      widget.onIndexChange?.call(next);
    }
  }

  void _go(int index, {bool smooth = true}) {
    if (!_controller.hasClients || _count == 0) return;
    final position = _controller.position;
    final target = index.clamp(0, _count - 1);
    final offset = _offsets(position.maxScrollExtent)[target];
    if (!smooth || _reduced) {
      _controller.jumpTo(offset);
    } else {
      _controller.animateTo(
        offset,
        duration: const Duration(milliseconds: 420),
        curve: MotionTokens.ease,
      );
    }
  }

  void _onWheel(PointerSignalEvent event) {
    if (event is! PointerScrollEvent) return;
    // A wheel scrolls freely; the track settles on the nearest slide once it stops.
    _wheeling = true;
    _wheelTimer?.cancel();
    _wheelTimer = Timer(const Duration(milliseconds: 150), () {
      _wheeling = false;
      if (!mounted || !_controller.hasClients) return;
      final position = _controller.position;
      if (position is ScrollPositionWithSingleContext) position.goBallistic(0);
    });
  }

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    final step = key == LogicalKeyboardKey.arrowRight
        ? (_rtl ? -1 : 1)
        : key == LogicalKeyboardKey.arrowLeft
        ? (_rtl ? 1 : -1)
        : 0;
    if (key == LogicalKeyboardKey.home) {
      _go(0);
    } else if (key == LogicalKeyboardKey.end) {
      _go(_count - 1);
    } else if (step != 0) {
      _go(_current + step);
    } else {
      return KeyEventResult.ignored;
    }
    return KeyEventResult.handled;
  }

  void _syncProgress() {
    while (_progress.length < _count) {
      _progress.add(ValueNotifier(0));
    }
    while (_progress.length > _count) {
      _progress.removeLast().dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    _rtl = Directionality.of(context) == TextDirection.rtl;
    _syncProgress();
    final n = _count;

    final track = LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final slide = math.max(0.0, widget.slideWidth.resolve(width));
        final step = slide + widget.gap;
        final pad = widget.align == CarouselAlign.center
            ? math.max(0.0, (width - slide) / 2)
            : 0.0;
        if (step != _step) {
          _step = step;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            if (!_placed && _controller.hasClients) {
              _placed = true;
              if (_current != 0) _go(_current, smooth: false);
            }
            _paint();
          });
        }
        final reduced = _reduced;
        final slides = [
          for (var i = 0; i < n; i++)
            Semantics(
              container: true,
              label: '${i + 1} of $n',
              child: CarouselProgress(
                effect: widget.effect,
                progress: _progress[i],
                child: _SlideBody(
                  effect: widget.effect,
                  reduced: reduced,
                  progress: _progress[i],
                  radius: theme.sizes.radiusGroup,
                  child: widget.children[i],
                ),
              ),
            ),
        ];
        return SingleChildScrollView(
          controller: _controller,
          scrollDirection: Axis.horizontal,
          physics: _SnapPhysics(carousel: this),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: _SlideRow(
              slideWidth: slide,
              gap: widget.gap,
              padding: pad,
              textDirection: Directionality.of(context),
              children: slides,
            ),
          ),
        );
      },
    );

    // A mouse drags the track 1:1 and flicks it; snapping waits until the flick lands.
    final dragTrack = RawGestureDetector(
      gestures: {
        HorizontalDragGestureRecognizer:
            GestureRecognizerFactoryWithHandlers<
              HorizontalDragGestureRecognizer
            >(
              () => HorizontalDragGestureRecognizer(
                supportedDevices: const {PointerDeviceKind.mouse},
              ),
              (recognizer) => recognizer
                ..onStart = (details) {
                  if (!_controller.hasClients) return;
                  setState(() => _dragging = true);
                  _drag = _controller.position.drag(
                    details,
                    () => _drag = null,
                  );
                }
                ..onUpdate = (details) {
                  _drag?.update(details);
                }
                ..onEnd = (details) {
                  setState(() => _dragging = false);
                  _mouseFlick = true;
                  _drag?.end(details);
                  _mouseFlick = false;
                }
                ..onCancel = () {
                  setState(() => _dragging = false);
                  _drag?.cancel();
                },
            ),
      },
      child: MouseRegion(
        cursor: _dragging ? SystemMouseCursors.grabbing : MouseCursor.defer,
        child: Listener(onPointerSignal: _onWheel, child: track),
      ),
    );

    final focusable = Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: _onKey,
      child: FocusableActionDetector(
        focusNode: _trackFocus,
        onShowFocusHighlight: (v) => setState(() => _focusVisible = v),
        child: Semantics(
          container: true,
          label: '${widget.label}, slide ${_current + 1} of $n',
          child: FocusRing(
            visible: _focusVisible,
            radius: theme.sizes.radiusGroup,
            child: dragTrack,
          ),
        ),
      ),
    );

    Widget frame = focusable;
    final showControls = widget.controls != CarouselControls.never && n > 1;
    final coarse = theme.coarsePointer(context);
    if (showControls && !(widget.controls == CarouselControls.auto && coarse)) {
      final visible =
          widget.controls == CarouselControls.always ||
          _hovered ||
          _focusWithin;
      Widget control(bool start) {
        final previous = start;
        final disabled = previous ? _current == 0 : _current == n - 1;
        final name = previous ? 'Previous slide' : 'Next slide';
        // Pointing back in reading order: the icon flips in right-to-left.
        final left = previous != _rtl;
        // A disabled control fades out with its glass but stays mounted (the web kit's
        // `data-glass-hidden`): each control owns its glass layer so the fade covers it.
        return PositionedDirectional(
          start: start ? 8 : null,
          end: start ? null : 8,
          top: 0,
          bottom: 0,
          child: Center(
            child: AnimatedOpacity(
              opacity: disabled ? 0 : 1,
              duration: _reduced ? Duration.zero : MotionTokens.durationNormal,
              curve: MotionTokens.ease,
              child: IgnorePointer(
                ignoring: disabled,
                child: ExcludeSemantics(
                  excluding: disabled,
                  child: ExcludeFocus(
                    excluding: disabled,
                    child: GlassScope(
                      child: ToolbarGroup(
                        label: name,
                        children: [
                          IconButton(
                            ariaLabel: name,
                            variant: ButtonVariant.text,
                            appearance: ButtonAppearance.toolbar,
                            disabled: disabled,
                            onClick: () => _go(_current + (previous ? -1 : 1)),
                            icon: LucideIcon(
                              left
                                  ? LucideIcons.chevronLeft
                                  : LucideIcons.chevronRight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }

      frame = MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onFocusChange: (v) => setState(() => _focusWithin = v),
          child: Stack(
            children: [
              focusable,
              Positioned.fill(
                child: AnimatedOpacity(
                  opacity: visible ? 1 : 0,
                  duration: _reduced
                      ? Duration.zero
                      : MotionTokens.durationNormal,
                  curve: MotionTokens.ease,
                  child: Stack(children: [control(true), control(false)]),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          frame,
          if (widget.dots && n > 1)
            Semantics(
              container: true,
              explicitChildNodes: true,
              label: '${widget.label} slides',
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                spacing: 2,
                children: [
                  for (var i = 0; i < n; i++)
                    _Dot(index: i, current: i == _current, onTap: () => _go(i)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Snap paging: a release lands on the slide its momentum projects to.
class _SnapPhysics extends ScrollPhysics {
  const _SnapPhysics({required this.carousel, super.parent});
  final _CarouselState carousel;

  @override
  _SnapPhysics applyTo(ScrollPhysics? ancestor) =>
      _SnapPhysics(carousel: carousel, parent: buildParent(ancestor));

  @override
  Simulation? createBallisticSimulation(
    ScrollMetrics position,
    double velocity,
  ) {
    if (position.outOfRange) {
      return super.createBallisticSimulation(position, velocity);
    }
    // A wheel tick or a mouse drag in progress: stay put until it ends.
    if (velocity == 0 && (carousel._wheeling || carousel._dragging)) {
      return null;
    }
    final offsets = carousel._offsets(position.maxScrollExtent);
    if (offsets.isEmpty || carousel._step <= 0) {
      return super.createBallisticSimulation(position, velocity);
    }
    final mouse = carousel._takeMouseFlick();
    final target = flickTarget(
      position.pixels,
      velocity,
      offsets,
      carousel._current,
      mouse ? 3 : offsets.length,
    );
    final to = offsets[target];
    if ((to - position.pixels).abs() < 0.5 && velocity.abs() < 5) return null;
    return _SpringSimulation(Springs.release, position.pixels, to, velocity);
  }

  @override
  bool get allowImplicitScrolling => false;
}

/// A kit spring as a Flutter [Simulation] (rest within 0.5px, like the web track's MotionValue).
class _SpringSimulation extends Simulation {
  _SpringSimulation(Spring spring, double from, this.to, double velocity)
    : _solve = solveSpring(spring, from, to, velocity);
  final double to;
  final SpringState Function(double t) _solve;

  // Once at rest the spring snaps onto its target, so the track lands exactly on the slide.
  @override
  double x(double time) => isDone(time) ? to : _solve(time).position;
  @override
  double dx(double time) => isDone(time) ? 0 : _solve(time).velocity;
  @override
  bool isDone(double time) => springAtRest(_solve(time), to, 0.5);
}

class _SlideBody extends StatelessWidget {
  const _SlideBody({
    required this.effect,
    required this.reduced,
    required this.progress,
    required this.radius,
    required this.child,
  });
  final CarouselEffect effect;
  final bool reduced;
  final ValueNotifier<double> progress;
  final double radius;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<CarouselEffect>('effect', effect))
      ..add(FlagProperty('reduced', value: reduced, ifTrue: 'reduced motion'))
      ..add(DoubleProperty('progress', progress.value))
      ..add(DoubleProperty('radius', radius));
  }

  @override
  Widget build(BuildContext context) {
    // Each slide is its own layer: scrolling the track and scaling or fading a slide move and
    // blend it without painting its content again.
    Widget body = RepaintBoundary(child: child);
    if (!reduced &&
        (effect == CarouselEffect.scale || effect == CarouselEffect.fade)) {
      body = ValueListenableBuilder<double>(
        valueListenable: progress,
        builder: (context, p, child) {
          final fx = slideEffect(effect, p);
          Widget out = Transform.scale(scale: fx.scale, child: child);
          if (fx.opacity != 1) out = Opacity(opacity: fx.opacity, child: out);
          return out;
        },
        child: body,
      );
    }
    if (effect == CarouselEffect.parallax) {
      body = ClipPath(clipper: _SuperellipseClip(radius), child: body);
    }
    return body;
  }
}

class _SuperellipseClip extends CustomClipper<Path> {
  _SuperellipseClip(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_SuperellipseClip old) => old.radius != radius;
}

class _Dot extends StatefulWidget {
  const _Dot({required this.index, required this.current, required this.onTap});
  final int index;
  final bool current;
  final VoidCallback onTap;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('index', index))
      ..add(FlagProperty('current', value: current, ifTrue: 'current'))
      ..add(ObjectFlagProperty<VoidCallback>.has('onTap', onTap));
  }

  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> {
  bool _focusVisible = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('focusVisible', value: _focusVisible, ifTrue: 'focus ring'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final reduced = reducedMotionOf(context);
    return Semantics(
      button: true,
      selected: widget.current,
      label: 'Go to slide ${widget.index + 1}',
      excludeSemantics: true,
      onTap: widget.onTap,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowFocusHighlight: (v) => setState(() => _focusVisible = v),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.onTap(),
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onTap,
          child: FocusRing(
            visible: _focusVisible,
            inside: true,
            radius: 10 * ThemeProvider.of(context).sizes.radiusScale,
            child: SizedBox.square(
              dimension: 20,
              child: Center(
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: widget.current ? 18 : 7),
                  duration: reduced
                      ? Duration.zero
                      : const Duration(milliseconds: 300),
                  curve: const Cubic(0.2, 0.9, 0.25, 1.1),
                  builder: (context, width, child) =>
                      SizedBox(width: width, height: 7, child: child),
                  child: TweenAnimationBuilder<Color?>(
                    tween: PaintColorTween(
                      end: widget.current
                          ? c.primary
                          : mixSrgb(c.ink, 0.25, transparent),
                    ),
                    duration: reduced
                        ? Duration.zero
                        : MotionTokens.durationFast,
                    curve: MotionTokens.ease,
                    builder: (context, color, _) => DecoratedBox(
                      decoration: ShapeDecoration(
                        color: color,
                        shape: const SuperellipseBorder(radius: 4),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The track's flex row: every slide [slideWidth] wide, [gap] apart, [padding] on both ends, all
/// as tall as the tallest (`align-items: stretch`), laid out from the start edge.
class _SlideRow extends MultiChildRenderObjectWidget {
  const _SlideRow({
    required this.slideWidth,
    required this.gap,
    required this.padding,
    required this.textDirection,
    required super.children,
  });
  final double slideWidth, gap, padding;
  final TextDirection textDirection;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('slideWidth', slideWidth))
      ..add(DoubleProperty('gap', gap))
      ..add(DoubleProperty('padding', padding))
      ..add(EnumProperty<TextDirection>('textDirection', textDirection));
  }

  @override
  _RenderSlideRow createRenderObject(BuildContext context) => _RenderSlideRow()
    ..slideWidth = slideWidth
    ..gap = gap
    ..padding = padding
    ..textDirection = textDirection;

  @override
  void updateRenderObject(BuildContext context, _RenderSlideRow renderObject) {
    renderObject
      ..slideWidth = slideWidth
      ..gap = gap
      ..padding = padding
      ..textDirection = textDirection
      ..markNeedsLayout();
  }
}

class _SlideRowParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderSlideRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _SlideRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _SlideRowParentData> {
  double slideWidth = 0, gap = 0, padding = 0;
  TextDirection textDirection = TextDirection.ltr;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('slideWidth', slideWidth))
      ..add(DoubleProperty('gap', gap))
      ..add(DoubleProperty('padding', padding))
      ..add(EnumProperty<TextDirection>('textDirection', textDirection));
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SlideRowParentData) {
      child.parentData = _SlideRowParentData();
    }
  }

  double get _width =>
      padding * 2 + slideWidth * childCount + gap * math.max(0, childCount - 1);

  @override
  double computeMinIntrinsicWidth(double height) => _width;
  @override
  double computeMaxIntrinsicWidth(double height) => _width;

  @override
  double computeMaxIntrinsicHeight(double width) {
    var tallest = 0.0;
    var child = firstChild;
    while (child != null) {
      tallest = math.max(tallest, child.getMaxIntrinsicHeight(slideWidth));
      child = childAfter(child);
    }
    return tallest;
  }

  @override
  double computeMinIntrinsicHeight(double width) =>
      computeMaxIntrinsicHeight(width);

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    var tallest = 0.0;
    var child = firstChild;
    final loose = BoxConstraints(
      minWidth: slideWidth,
      maxWidth: slideWidth,
      maxHeight: constraints.maxHeight,
    );
    while (child != null) {
      tallest = math.max(tallest, child.getDryLayout(loose).height);
      child = childAfter(child);
    }
    return constraints.constrain(Size(_width, tallest));
  }

  @override
  void performLayout() {
    final loose = BoxConstraints(
      minWidth: slideWidth,
      maxWidth: slideWidth,
      maxHeight: constraints.maxHeight,
    );
    var tallest = constraints.minHeight;
    var child = firstChild;
    while (child != null) {
      child.layout(loose, parentUsesSize: true);
      tallest = math.max(tallest, child.size.height);
      child = childAfter(child);
    }
    size = constraints.constrain(Size(_width, tallest));
    final tight = BoxConstraints.tightFor(
      width: slideWidth,
      height: size.height,
    );
    final rtl = textDirection == TextDirection.rtl;
    var x = padding;
    child = firstChild;
    while (child != null) {
      if (child.size.height != size.height) child.layout(tight);
      final data = child.parentData! as _SlideRowParentData;
      data.offset = Offset(rtl ? size.width - x - slideWidth : x, 0);
      x += slideWidth + gap;
      child = data.nextSibling;
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
