import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import 'geometry.dart';
import 'light.dart';
import 'material.dart';
import 'press.dart';
import 'refraction_filter.dart';
import 'transitions.dart';

/// How a bubble's glass follows its layout: `spring` animates every change (default); `follow`
/// tracks the bubble exactly, for bubbles that animate their own size (dock, search).
enum GlassMotion { spring, follow }

/// Where a container's light comes from: `pointer` turns it toward a mouse or pen, `static` keeps
/// it at the top-left.
enum GlassLightMode { pointer, static }

const _spring = Springs.snappy;

/// Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
/// Apple's GlassEffectContainer: the twin of `GlassContainer` in `@feeef.dev/ui/glass`. Bubbles
/// that come within [spacing] bend toward each other and merge; a bubble that splits grows its
/// parts out of itself; new and removed bubbles materialize. Bubbles keep their layout, focus and
/// semantics; only the paint moves here. The theme's `glass` sets the style; `glassTint`,
/// `glassBlur` and `glassRefraction` set the material. More contrast (MediaQuery) makes it solid.
class GlassContainer extends StatefulWidget {
  const GlassContainer({
    super.key,
    this.spacing = 8,
    this.light = GlassLightMode.pointer,
    this.interactive = true,
    this.adaptive = true,
    required this.child,
  });

  /// Small glass (at most [glassAdaptMaxHeight] tall) over a [GlassBackdrop] of the opposite
  /// tone switches to that tone's glass and ink, like the web kit's adaptive tint.
  final bool adaptive;

  /// Distance in px at which bubbles start to bend toward each other; they join at half of it.
  final double spacing;
  final GlassLightMode light;

  /// Bubbles respond to a press: they swell, stretch toward a dragging finger, glow from the touch
  /// point onto nearby bubbles and spring back. Off with reduced motion.
  final bool interactive;
  final Widget child;

  @override
  State<GlassContainer> createState() => _GlassContainerState();

  /// The clusters a container (its element) paints this frame, with their clips.
  @visibleForTesting
  static List<GlassPath> debugPathsOf(BuildContext container) =>
      ((container as StatefulElement).state as _GlassContainerState)
          ._scene
          .paths;
}

/// A [GlassContainer] unless one already encloses it, then just [child]. Kit rows (toolbar, dock,
/// search) use it so they share one material without ever nesting containers.
class GlassScope extends StatelessWidget {
  const GlassScope({
    super.key,
    this.spacing = 8,
    this.light = GlassLightMode.pointer,
    this.interactive = true,
    this.adaptive = true,
    required this.child,
  });

  final double spacing;
  final GlassLightMode light;
  final bool interactive;
  final bool adaptive;
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      context
              .dependOnInheritedWidgetOfExactType<_GlassRegistryScope>()
              ?.registry !=
          null
      ? child
      : GlassContainer(
          spacing: spacing,
          light: light,
          interactive: interactive,
          adaptive: adaptive,
          child: child,
        );
}

/// The tone of what lies behind glass (the web kit's `GlassTone`).
enum GlassTone { light, dark }

/// Glass taller than this (px) never flips its tone (`GLASS_ADAPT_MAX_HEIGHT`).
const double glassAdaptMaxHeight = 72;

/// Marks a region (a photo, a video, a map) as dark or light, so small glass floating over it
/// adapts: the twin of the web kit's `data-lab-backdrop="dark|light"`. Flutter can't read the
/// pixels behind a widget, so a [GlassContainer] uses the nearest enclosing backdrop.
class GlassBackdrop extends InheritedWidget {
  const GlassBackdrop({super.key, required this.tone, required super.child});
  final GlassTone tone;

  /// The tone of the nearest enclosing backdrop, or null.
  static GlassTone? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<GlassBackdrop>()?.tone;

  @override
  bool updateShouldNotify(GlassBackdrop old) => old.tone != tone;
}

/// What a bubble registers: how to find its box, and its options.
class GlassMemberHandle {
  GlassMemberHandle._(this._scene, this.id);
  final _GlassScene _scene;
  final String id;

  /// Translation and scale the bubble's content takes to ride with its glass.
  ValueListenable<(Offset, double)> get content => _scene._contentFor(id);

  void unregister() => _scene._unregister(id);
}

/// The nearest container, for bubbles: `GlassMember.of(context)` returns null outside one.
abstract final class GlassMember {
  static GlassMemberRegistry? of(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<_GlassRegistryScope>()
      ?.registry;
}

/// Registers bubbles with their container.
class GlassMemberRegistry {
  GlassMemberRegistry._(this._scene);
  final _GlassScene _scene;

  /// Adds a bubble whose box is [key]'s render box, with its corner [radius].
  GlassMemberHandle register(
    String id,
    GlobalKey key, {
    required double Function() radius,
    String? union,
    GlassMotion motion = GlassMotion.spring,
  }) {
    _scene._members[id] = _Member(key, radius, union, motion);
    _scene._requestMeasure();
    return GlassMemberHandle._(_scene, id);
  }
}

/// Marks [child] as answering a press with glass of its own (a segmented control's lens): a press
/// that starts on it doesn't swell, stretch or glow the bubble around it. The twin of the web kit's
/// `data-glass-own-press`.
class GlassOwnPress extends StatelessWidget {
  const GlassOwnPress({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final registry = GlassMember.of(context);
    if (registry == null) return child;
    // Pointer listeners run before the container's global route, so the claim lands first.
    return Listener(
      onPointerDown: (event) => registry._scene._ownPress.add(event.pointer),
      child: child,
    );
  }
}

/// Starts a new glass layer: bubbles below it never join a container above it. Overlays (dialogs,
/// sheets, menus, tooltips) wrap their content in one, because an overlay inherits from the widget
/// that opened it but paints in the browser's top layer, apart from that widget's glass.
class GlassLayer extends StatelessWidget {
  const GlassLayer({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) =>
      _GlassRegistryScope(registry: null, child: child);
}

class _GlassRegistryScope extends InheritedWidget {
  const _GlassRegistryScope({required this.registry, required super.child});
  final GlassMemberRegistry? registry;
  @override
  bool updateShouldNotify(_GlassRegistryScope old) => old.registry != registry;
}

class _GlassContainerState extends State<GlassContainer> {
  late final _scene = _GlassScene();
  late final _registry = GlassMemberRegistry._(_scene);
  final _hostKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _scene.host = () =>
        _hostKey.currentContext?.findRenderObject() as RenderBox?;
    GestureBinding.instance.pointerRouter.addGlobalRoute(_onPointer);
  }

  @override
  void dispose() {
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
    _scene.dispose();
    super.dispose();
  }

  void _onPointer(PointerEvent event) {
    final host = _scene.host();
    if (host == null || !host.attached) return;
    if (event is PointerHoverEvent || event is PointerMoveEvent) {
      // The light only turns for glass on screen: off-screen glass would repaint for nothing
      // on every mouse move (the web skips it the same way).
      if ((event.kind == PointerDeviceKind.mouse ||
              event.kind == PointerDeviceKind.stylus) &&
          _onScreen(host)) {
        _scene.setPointer(host.globalToLocal(event.position));
      }
    }
    if (event is PointerDownEvent) {
      _scene.pressStart(event, host);
    } else if (event is PointerMoveEvent) {
      _scene.pressMove(event, host);
    } else if (event is PointerUpEvent || event is PointerCancelEvent) {
      _scene.pressEnd(event);
    }
  }

  bool _onScreen(RenderBox host) {
    if (!host.hasSize) return false;
    final view = View.maybeOf(context);
    if (view == null) return true;
    final screen = Offset.zero & (view.physicalSize / view.devicePixelRatio);
    return screen.overlaps(host.localToGlobal(Offset.zero) & host.size);
  }

  /// The container's height after the last layout, for the adaptive-tint size rule.
  double? _height;

  void _measureHeight() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final box = _scene.host();
      if (box == null || !box.hasSize) return;
      final small = box.size.height <= glassAdaptMaxHeight;
      if (_height == null || (_height! <= glassAdaptMaxHeight) != small) {
        setState(() => _height = box.size.height);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final backdrop = widget.adaptive ? GlassBackdrop.maybeOf(context) : null;
    if (backdrop == null) return _build(context);
    // Adaptive tint: small glass over the opposite tone takes that tone's glass and ink.
    _measureHeight();
    final theme = ThemeProvider.of(context);
    final mode = theme.brightness == Brightness.dark
        ? GlassTone.dark
        : GlassTone.light;
    final flip = backdrop != mode && (_height ?? 0) <= glassAdaptMaxHeight;
    if (!flip) return _build(context);
    final tone = backdrop == GlassTone.dark
        ? Brightness.dark
        : Brightness.light;
    return ThemeProvider(
      config: theme.config,
      brightness: tone,
      // glass.css's neutral backdrop tokens, not the palette's whole dark or light theme.
      colors: theme.colors.backdrop(tone),
      child: Builder(builder: _build),
    );
  }

  Widget _build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final style = glassStyleOf(context);
    final liquid = style == GlassStyle.liquid;
    _scene
      ..spacing = math.max(0, widget.spacing)
      ..reduceMotion = reduced
      ..followPointer = widget.light == GlassLightMode.pointer && liquid
      ..interactive = widget.interactive && liquid;
    _scene._requestMeasure();
    final material = _GlassMaterial(
      colors: theme.colors,
      style: style,
      tint: theme.colors.glassTint,
      blur: theme.config.glassBlur,
      refraction: theme.config.glassRefraction,
      highContrast: glassHighContrastOf(context),
      brightness: theme.brightness,
    );
    return _GlassRegistryScope(
      registry: _registry,
      child: Stack(
        key: _hostKey,
        clipBehavior: Clip.none,
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: _GlassLayers(scene: _scene, material: material),
            ),
          ),
          // A scroll view between a bubble and the container moves and clips its glass.
          NotificationListener<ScrollUpdateNotification>(
            onNotification: (notification) {
              _scene.scrolled(notification.context?.findRenderObject());
              return false;
            },
            child: widget.child,
          ),
        ],
      ),
    );
  }
}

/// Colours and choices the material paints with.
class _GlassMaterial {
  const _GlassMaterial({
    required this.colors,
    required this.style,
    required this.tint,
    required this.blur,
    required this.refraction,
    required this.highContrast,
    required this.brightness,
  });
  final ColorTokens colors;
  final GlassStyle style;
  final double tint;
  final bool blur, refraction, highContrast;
  final Brightness brightness;

  /// Every glass but solid reads the backdrop (saturation and lift, then blur and bend if on).
  bool get translucent => style != GlassStyle.solid;
  bool get dark => brightness == Brightness.dark;

  /// The veil over a cluster whose smallest bubble's shorter side is [side] px.
  Color fillFor(double side) => style == GlassStyle.solid
      ? colors.surface
      : glassSize(side) == GlassSize.small
      ? colors.glassFill
      : colors.glassFillLarge;
  bool get rim => style != GlassStyle.solid;

  /// The drawn outline: only solid glass keeps it; liquid glass is defined by rim light and shadow.
  bool get outline => style == GlassStyle.solid;

  /// The outline's colour: the ink when the platform asks for more contrast.
  Color get outlineColor => highContrast ? colors.ink : colors.line;

  /// The backdrop filter for a cluster whose smallest bubble's shorter side is [side] px:
  /// saturation and the clear lift, after the blur when it is on.
  ui.ImageFilter backdropFor(double side) {
    final colour = ColorFilter.matrix(glassBackdropMatrix(materialFor(side)));
    if (!blur) return colour;
    final sigma = glassBlur(side);
    return ui.ImageFilter.compose(
      outer: colour,
      inner: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
    );
  }

  GlassMaterial materialFor(double side) =>
      glassMaterial(tint, dark: dark, size: glassSize(side));
}

/// Shorter side of the smallest bubble in a cluster: the material and bend follow it.
double _smallestSide(GlassPath path) => path.shapes
    .map((s) => math.min(s.width, s.height))
    .fold(double.infinity, math.min);

/// Shadow, backdrop, edge, light and glow, behind the bubbles.
class _GlassLayers extends StatelessWidget {
  const _GlassLayers({required this.scene, required this.material});
  final _GlassScene scene;
  final _GlassMaterial material;

  @override
  Widget build(BuildContext context) {
    final paint = CustomPaint(
      painter: _GlassPainter(scene, material),
      size: Size.infinite,
    );
    if (!material.translucent) return paint;
    // One backdrop per cluster, clipped to its outline: saturation and the clear lift at the
    // theme's tint, the blur sized to the cluster when it is on, and (Impeller) the measured
    // refraction.
    final refract = material.refraction && GlassRefraction.supported;
    return ListenableBuilder(
      listenable: scene,
      builder: (context, _) => Stack(
        clipBehavior: Clip.none,
        children: [
          for (final path in scene.paths)
            Positioned.fill(
              child: ClipPath(
                clipper: _PathClipper(scene, scene.paths.indexOf(path)),
                child: refract
                    ? GlassRefraction(
                        path: path,
                        spacing: scene.spacing,
                        blur: material.blur
                            ? glassBlur(_smallestSide(path))
                            : 0,
                        colour: glassBackdropMatrix(
                          material.materialFor(_smallestSide(path)),
                        ),
                      )
                    : BackdropFilter(
                        filter: material.backdropFor(_smallestSide(path)),
                        child: const SizedBox.expand(),
                      ),
              ),
            ),
          Positioned.fill(child: paint),
        ],
      ),
    );
  }
}

/// The outline of cluster [index], cut to its clip, read while painting: a scroll moves the
/// glass on the same frame as its bubbles.
class _PathClipper extends CustomClipper<Path> {
  _PathClipper(this.scene, this.index) : super(reclip: scene);
  final _GlassScene scene;
  final int index;
  @override
  Path getClip(Size size) {
    scene.measureInPaint();
    final paths = scene.paths;
    return index < paths.length ? paths[index].visiblePath : Path();
  }

  @override
  bool shouldReclip(_PathClipper old) => true;
}

class _GlassPainter extends CustomPainter {
  _GlassPainter(this.scene, this.material) : super(repaint: scene);
  final _GlassScene scene;
  final _GlassMaterial material;

  @override
  void paint(Canvas canvas, Size size) {
    scene.measureInPaint();
    final paths = scene.paths;
    if (paths.isEmpty) return;
    final c = material.colors;
    final all = Path();
    for (final p in paths) {
      all.addPath(p.path, Offset.zero);
    }
    // Glass in a scroll view or clip is cut straight at its edge, shadow included.
    void scissor(GlassPath p) {
      canvas.save();
      if (p.clip != null) canvas.clipRect(p.clip!);
    }

    // A wide, soft shadow outside the glass only (7.5px down, blur 19.5), lighter under
    // control-sized glass, like the web kit's SVG shadow.
    canvas.save();
    canvas.clipPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(
          all.getBounds().inflate(glassShadowBlur * 3 + glassShadowDy),
        ),
        all,
      ),
    );
    for (final p in paths) {
      scissor(p);
      canvas.drawPath(
        p.path.shift(const Offset(0, glassShadowDy)),
        Paint()
          ..color = glassSize(_smallestSide(p)) == GlassSize.small
              ? c.glassShadowSmall
              : c.glassShadowColor
          ..maskFilter = const MaskFilter.blur(
            BlurStyle.normal,
            glassShadowBlur,
          ),
      );
      canvas.restore();
    }
    canvas.restore();
    for (final p in paths) {
      scissor(p);
      canvas.drawPath(
        p.path,
        Paint()..color = material.fillFor(_smallestSide(p)),
      );
      canvas.restore();
    }
    for (final p in paths) {
      // Edge and rim are 2px strokes clipped to the outline: 1px inside, like a CSS border.
      scissor(p);
      canvas.clipPath(p.path);
      if (material.outline) {
        canvas.drawPath(
          p.path,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = material.outlineColor,
        );
      }
      if (material.rim) {
        // A base rim all round, plus light at both ends of the light axis (cos² of the angle).
        canvas.drawPath(
          p.path,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = c.glassEdgeLow,
        );
        final (start, end) = rimGradient(p.bounds, scene.lightFor(p.bounds));
        canvas.drawPath(
          p.path,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..shader = ui.Gradient.linear(
              start,
              end,
              [
                for (final (_, share) in glassRimStops)
                  c.glassEdgeLight.withValues(
                    alpha: c.glassEdgeLight.a * share,
                  ),
              ],
              [for (final (offset, _) in glassRimStops) offset],
            ),
        );
      }
      canvas.restore();
    }
    final glow = scene.glow;
    if (glow != null && glow.opacity.get() > 0.01 && material.rim) {
      // Light from under the finger, spilling onto every bubble it reaches.
      final radius = math.max(1.0, glow.radius.get());
      final visible = Path();
      for (final p in paths) {
        visible.addPath(p.visiblePath, Offset.zero);
      }
      canvas.save();
      canvas.clipPath(visible);
      canvas.drawCircle(
        glow.at,
        radius,
        Paint()
          ..shader = ui.Gradient.radial(glow.at, radius, [
            c.glassGlow.withValues(alpha: c.glassGlow.a * glow.opacity.get()),
            c.glassGlow.withValues(alpha: 0),
          ]),
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_GlassPainter old) =>
      old.scene != scene ||
      old.material.style != material.style ||
      old.material.tint != material.tint ||
      old.material.highContrast != material.highContrast ||
      old.material.rim != material.rim ||
      old.material.colors != material.colors;
}

class _Member {
  _Member(this.key, this.radius, this.union, this.motion);
  final GlobalKey key;
  final double Function() radius;
  final String? union;
  final GlassMotion motion;
}

/// One bubble's glass: an animated rect, its corner radius and, while alive, its content offset.
class _Shape {
  _Shape(Rect rect, [double scale = 1])
    : x = MotionValue(rect.left, 0.05),
      y = MotionValue(rect.top, 0.05),
      width = MotionValue(rect.width, 0.05),
      height = MotionValue(rect.height, 0.05),
      scale = MotionValue(scale, 0.001);

  final MotionValue x, y, width, height, scale;
  final press = MotionValue(1, 0.0005);
  final stretchX = MotionValue(0, 0.05);
  final stretchY = MotionValue(0, 0.05);
  double radius = 0;
  Rect? layout;

  /// The visible part of the container this bubble may paint in (null: unclipped).
  Rect? clip;

  /// Content follows the glass only for moves of the same bubble, not while growing out of another.
  bool carry = true;
  bool leaving = false;
  int token = 0;

  Rect rect() => Rect.fromLTWH(x.get(), y.get(), width.get(), height.get());

  /// The shape drawn this frame (scaled around its centre while materializing, then pressed).
  GlassShape visual() {
    final s = math.max(0.0, scale.get());
    final w = width.get() * s, h = height.get() * s;
    return pressedShape(
      GlassShape(
        x: x.get() + (width.get() - w) / 2,
        y: y.get() + (height.get() - h) / 2,
        width: w,
        height: h,
        radius: radius * s,
      ),
      press.get(),
      stretchX.get(),
      stretchY.get(),
    );
  }

  List<MotionValue> get values => [
    x,
    y,
    width,
    height,
    scale,
    press,
    stretchX,
    stretchY,
  ];

  void set(Rect rect) {
    x.set(rect.left);
    y.set(rect.top);
    width.set(rect.width);
    height.set(rect.height);
  }

  Future<bool> animate(Rect rect, {bool instant = false}) async {
    final done = await Future.wait([
      x.animateTo(rect.left, spring: _spring, instant: instant),
      y.animateTo(rect.top, spring: _spring, instant: instant),
      width.animateTo(rect.width, spring: _spring, instant: instant),
      height.animateTo(rect.height, spring: _spring, instant: instant),
    ]);
    return done.every((d) => d);
  }
}

class _Glow {
  _Glow(this.at)
    : radius = MotionValue(glassGlowStart, 0.5),
      opacity = MotionValue(1, 0.005);
  Offset at;
  final MotionValue radius, opacity;
}

/// The engine behind GlassContainer (`GlassScene` in the web kit): tracks bubbles, springs their
/// glass between layouts, plans splits and merges, and exposes the outlines to paint.
class _GlassScene extends ChangeNotifier {
  RenderBox? Function() host = () => null;
  double spacing = 8;
  bool reduceMotion = false;
  bool followPointer = true;
  bool interactive = true;

  final _members = <String, _Member>{};
  final _shapes = <String, _Shape>{};
  final _contents = <String, ValueNotifier<(Offset, double)>>{};

  /// Content offsets set while painting, applied after the frame unless a newer value lands first.
  final _pendingContent = <String, (Offset, double)>{};
  final _unsubscribe = <String, List<void Function()>>{};
  List<GlassPath> paths = const [];
  String _key = '';
  bool _measured = false;
  bool _measureQueued = false;
  bool _painting = false;
  bool _disposed = false;

  /// Frame time of the first measurement: bubbles present in the first 300ms just appear.
  Duration? _firstMeasure;
  Offset? _pointer;
  _Glow? glow;
  final _timers = <Timer>{};
  ({String id, int pointer, Offset start})? _pressed;

  /// Pointers that went down on a [GlassOwnPress].
  final _ownPress = <int>{};

  /// Scroll views that scrolled since the last measure: bubbles inside them follow exactly.
  final _scrolled = <RenderObject>{};
  bool _paintMeasured = false;
  bool _notifyQueued = false;

  ValueNotifier<(Offset, double)> _contentFor(String id) =>
      _contents.putIfAbsent(id, () => ValueNotifier((Offset.zero, 1)));

  void _unregister(String id) {
    _members.remove(id);
    _requestMeasure();
  }

  void _requestMeasure() {
    if (_measureQueued || _disposed) return;
    _measureQueued = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _measureQueued = false;
      if (!_disposed) _measure();
    });
    SchedulerBinding.instance.ensureVisualUpdate();
  }

  /// Paint already knows the final layout: measure there too, so glass appears on the same frame
  /// as its bubbles. Nothing may notify while painting.
  void measureInPaint() {
    // Backdrop clips and the painter all read it: once per frame.
    if (_paintMeasured) return;
    _paintMeasured = true;
    SchedulerBinding.instance.addPostFrameCallback(
      (_) => _paintMeasured = false,
    );
    _painting = true;
    try {
      _measure();
    } finally {
      _painting = false;
    }
  }

  void _changed() {
    if (_disposed) return;
    _rebuildPaths();
    if (!_painting) {
      notifyListeners();
    } else if (!_notifyQueued) {
      // Backdrops built before this paint catch up on the next frame.
      _notifyQueued = true;
      SchedulerBinding.instance.addPostFrameCallback((_) {
        _notifyQueued = false;
        if (!_disposed) notifyListeners();
      });
      SchedulerBinding.instance.ensureVisualUpdate();
    }
  }

  /// A scroll view inside the container scrolled: its bubbles move and their clip changes. The
  /// next paint re-measures them; at rest nothing listens.
  void scrolled(RenderObject? scrollable) {
    if (_disposed) return;
    if (scrollable != null) _scrolled.add(scrollable);
    if (SchedulerBinding.instance.schedulerPhase ==
        SchedulerPhase.persistentCallbacks) {
      _requestMeasure();
    } else {
      notifyListeners();
    }
  }

  /// The part of the container [render] is visible in (the paint clips of every render object
  /// between them: viewports, ClipRect, ClipRRect, …), and whether one of those scrolled.
  (Rect?, bool) _clipOf(RenderObject render, RenderBox host) {
    final clips = <Rect>[];
    var scrolled = false;
    var child = render;
    for (
      var parent = render.parent;
      parent != null && parent != host;
      child = parent, parent = parent.parent
    ) {
      if (_scrolled.contains(parent)) scrolled = true;
      final clip = parent.describeApproximatePaintClip(child);
      if (clip != null) {
        clips.add(MatrixUtils.transformRect(parent.getTransformTo(host), clip));
      }
    }
    return (intersectClips(clips), scrolled);
  }

  void _watch(String id, _Shape shape) {
    _unsubscribe[id]?.forEach((u) => u());
    _unsubscribe[id] = [
      for (final v in shape.values) v.subscribe((_) => _changed()),
    ];
  }

  void _drop(String id) {
    _unsubscribe.remove(id)?.forEach((u) => u());
    for (final v in _shapes[id]?.values ?? const <MotionValue>[]) {
      v.stop();
    }
    _shapes.remove(id);
  }

  /// Reads every bubble's layout box and moves the glass toward it.
  void _measure() {
    final box = host();
    if (box == null || !box.attached || !box.hasSize) return;
    final targets =
        <String, (Rect, double, _Member?, ({Rect? clip, bool scrolled}))>{};
    final unions = <String, (Rect, double, ({Rect? clip, bool scrolled}))>{};
    for (final MapEntry(key: id, value: member) in _members.entries) {
      final render = member.key.currentContext?.findRenderObject();
      if (render is! RenderBox || !render.attached || !render.hasSize) continue;
      if (render.size.isEmpty) continue;
      final rect = MatrixUtils.transformRect(
        render.getTransformTo(box),
        Offset.zero & render.size,
      );
      final radius = member.radius();
      final (clip, scrolled) = _clipOf(render, box);
      final view = (clip: clip, scrolled: scrolled);
      if (member.union != null) {
        final key = 'union:${member.union}';
        final previous = unions[key];
        unions[key] = previous == null
            ? (rect, radius, view)
            : (
                previous.$1.expandToInclude(rect),
                math.min(previous.$2, radius),
                (
                  clip: previous.$3.clip == null || clip == null
                      ? null
                      : previous.$3.clip!.expandToInclude(clip),
                  scrolled: previous.$3.scrolled || scrolled,
                ),
              );
      } else {
        targets[id] = (rect, radius, member, view);
      }
    }
    _scrolled.clear();
    for (final MapEntry(key: key, value: union) in unions.entries) {
      targets[key] = (union.$1, union.$2, null, union.$3);
    }
    final now = SchedulerBinding.instance.currentSystemFrameTimeStamp;
    final first = _firstMeasure ??= now;
    final instant =
        reduceMotion || !_measured || (now - first).inMilliseconds < 300;
    var dirty = false;
    final previous = {
      for (final MapEntry(key: id, value: s) in _shapes.entries) id: s.rect(),
    };
    final next = {for (final e in targets.entries) e.key: e.value.$1};
    final plan = planGlassTransition(previous, next, spacing);
    for (final birth in plan.births) {
      final target = targets[birth.id]!;
      final grow = birth is GlassGrow && !instant;
      final shape = _Shape(
        grow ? birth.from : target.$1,
        grow || instant ? 1 : 0,
      );
      shape.carry = !grow;
      shape.clip = target.$4.clip;
      _shapes[birth.id] = shape;
      _watch(birth.id, shape);
      dirty = true;
    }
    for (final death in plan.deaths) {
      final shape = _shapes[death.id];
      if (shape == null || shape.leaving) continue;
      shape.leaving = true;
      shape.layout = null;
      _contents[death.id]?.value = (Offset.zero, 1);
      dirty = true;
      final token = ++shape.token;
      Timer? fallback;
      void done([_]) {
        fallback?.cancel();
        _timers.remove(fallback);
        if (shape.token == token &&
            shape.leaving &&
            _shapes[death.id] == shape) {
          _drop(death.id);
          _changed();
        }
      }

      if (instant) {
        _drop(death.id);
      } else {
        switch (death) {
          case GlassAbsorb(:final into):
            shape.animate(into).then(done);
          case GlassDematerialize():
            shape.scale.animateTo(0, spring: _spring).then(done);
        }
        // Never leave a departed bubble's glass behind for long, even when frames stop.
        fallback = Timer(const Duration(milliseconds: 900), done);
        _timers.add(fallback);
      }
    }
    for (final MapEntry(key: id, value: target) in targets.entries) {
      final shape = _shapes[id]!;
      shape.leaving = false;
      if (shape.radius != target.$2) {
        shape.radius = target.$2;
        dirty = true;
      }
      if (shape.clip != target.$4.clip) {
        shape.clip = target.$4.clip;
        dirty = true;
      }
      // Bubbles moved by a scroll view ride with it exactly, like content.
      final follow =
          target.$3?.motion == GlassMotion.follow || target.$4.scrolled;
      final changed =
          shape.layout == null || !sameRect(shape.layout!, target.$1);
      shape.layout = target.$1;
      if (shape.scale.target != 1) {
        shape.scale.animateTo(1, spring: _spring, instant: instant);
      }
      if (follow || instant) {
        if (!sameRect(shape.rect(), target.$1) || changed) {
          shape.set(target.$1);
          dirty = true;
        }
      } else if (changed || !sameRect(shape.rect(), target.$1)) {
        final token = ++shape.token;
        shape.animate(target.$1).then((arrived) {
          if (arrived && shape.token == token) shape.carry = true;
          _changed();
        });
      }
    }
    _measured = true;
    if (dirty) _changed();
  }

  void _rebuildPaths() {
    final visuals = <GlassShape>[
      for (final shape in _shapes.values) shape.visual(),
    ];
    final clips = <Rect?>[for (final shape in _shapes.values) shape.clip];
    final key =
        '$spacing|${visuals.map((v) => '${v.x.toStringAsFixed(1)},${v.y.toStringAsFixed(1)},${v.width.toStringAsFixed(1)},${v.height.toStringAsFixed(1)},${v.radius.toStringAsFixed(1)}').join(';')}|${clips.map((c) => c == null ? '' : '${c.left.toStringAsFixed(1)},${c.top.toStringAsFixed(1)},${c.right.toStringAsFixed(1)},${c.bottom.toStringAsFixed(1)}').join(';')}';
    if (key != _key) {
      _key = key;
      paths = clippedGlassPaths(visuals, clips, spacing);
    }
    // Content rides with its glass (centre to centre) while the bubble moves.
    for (final MapEntry(key: id, value: shape) in _shapes.entries) {
      final layout = shape.layout;
      final content = _contents[id];
      if (content == null || layout == null || shape.leaving) continue;
      final dx = shape.carry
          ? shape.x.get() + shape.width.get() / 2 - layout.center.dx
          : 0.0;
      final dy = shape.carry
          ? shape.y.get() + shape.height.get() / 2 - layout.center.dy
          : 0.0;
      final fx = dx + shape.stretchX.get() * glassContentFollow;
      final fy = dy + shape.stretchY.get() * glassContentFollow;
      final offset = Offset(fx.abs() < 0.05 ? 0 : fx, fy.abs() < 0.05 ? 0 : fy);
      final press = shape.press.get();
      final next = (offset, (press - 1).abs() < 0.001 ? 1.0 : press);
      if (_painting) {
        // Applied after this frame: a listener rebuilding during paint is not allowed. A newer
        // value set directly in the meantime wins (it clears the pending one).
        if (content.value != next || _pendingContent.containsKey(id)) {
          _pendingContent[id] = next;
          SchedulerBinding.instance.addPostFrameCallback((_) {
            final pending = _pendingContent.remove(id);
            if (pending != null) content.value = pending;
          });
        }
      } else {
        _pendingContent.remove(id);
        content.value = next;
      }
    }
  }

  /// Light for a cluster: the default, turned toward a fine pointer when the light follows it.
  Offset lightFor(Rect bounds) {
    if (!followPointer || reduceMotion || _pointer == null) {
      return defaultGlassLight;
    }
    return glassLightToward(bounds.center, _pointer);
  }

  void setPointer(Offset? point) {
    if (!followPointer || reduceMotion) return;
    final last = _pointer;
    // Sub-pixel moves don't turn the light visibly.
    if (last != null && point != null && (point - last).distanceSquared < 1) {
      return;
    }
    _pointer = point;
    if (!_painting) notifyListeners();
  }

  String? _memberAt(Offset local) {
    String? found;
    for (final MapEntry(key: id, value: shape) in _shapes.entries) {
      if (shape.leaving) continue;
      if (shape.rect().contains(local)) found = id;
    }
    return found;
  }

  void pressStart(PointerDownEvent event, RenderBox host) {
    if (_ownPress.contains(event.pointer)) return;
    if (!interactive || reduceMotion || _pressed != null) return;
    if (event.kind == PointerDeviceKind.mouse &&
        event.buttons != kPrimaryButton) {
      return;
    }
    final local = host.globalToLocal(event.position);
    final id = _memberAt(local);
    final shape = id == null ? null : _shapes[id];
    if (id == null || shape == null) return;
    _pressed = (id: id, pointer: event.pointer, start: event.position);
    // Large surfaces (docks, panels) glow but don't swell.
    if (shape.height.get() <= 64) {
      shape.press.animateTo(glassPressScale, spring: _spring);
    }
    final g = _Glow(local);
    glow = g;
    g.radius.subscribe((_) => _changed());
    g.opacity.subscribe((_) => _changed());
    g.radius.animateTo(
      glassGlowRadius(shape.width.get()),
      spring: Springs.smooth,
    );
    _changed();
  }

  void pressMove(PointerMoveEvent event, RenderBox host) {
    final pressed = _pressed;
    if (pressed == null || event.pointer != pressed.pointer) return;
    final shape = _shapes[pressed.id];
    if (shape == null) return;
    final d = event.position - pressed.start;
    final stretch = glassStretch(d.dx, d.dy);
    shape.stretchX.set(stretch.x);
    shape.stretchY.set(stretch.y);
    glow?.at = host.globalToLocal(event.position);
    _changed();
  }

  void pressEnd(PointerEvent event) {
    _ownPress.remove(event.pointer);
    final pressed = _pressed;
    if (pressed == null || event.pointer != pressed.pointer) return;
    _pressed = null;
    final shape = _shapes[pressed.id];
    if (shape != null) {
      shape.press.animateTo(1, spring: Springs.bouncy);
      shape.stretchX.animateTo(0, spring: Springs.bouncy);
      shape.stretchY.animateTo(0, spring: Springs.bouncy);
    }
    final g = glow;
    if (g != null) {
      g.opacity.animateTo(0, spring: Springs.smooth).then((_) {
        if (glow == g) glow = null;
        _changed();
      });
    }
  }

  @override
  void dispose() {
    _disposed = true;
    for (final timer in _timers) {
      timer.cancel();
    }
    for (final id in [..._shapes.keys]) {
      _drop(id);
    }
    for (final content in _contents.values) {
      content.dispose();
    }
    super.dispose();
  }
}
