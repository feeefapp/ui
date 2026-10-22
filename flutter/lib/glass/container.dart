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
import 'press.dart';
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
/// semantics; only the paint moves here. The theme's `glass` and `glassRenderer` set the style.
class GlassContainer extends StatefulWidget {
  const GlassContainer({
    super.key,
    this.spacing = 8,
    this.light = GlassLightMode.pointer,
    this.interactive = true,
    required this.child,
  });

  /// Distance in px at which bubbles start to bend toward each other; they join at half of it.
  final double spacing;
  final GlassLightMode light;

  /// Bubbles respond to a press: they swell, stretch toward a dragging finger, glow from the touch
  /// point onto nearby bubbles and spring back. Off with reduced motion.
  final bool interactive;
  final Widget child;

  @override
  State<GlassContainer> createState() => _GlassContainerState();
}

/// A [GlassContainer] unless one already encloses it, then just [child]. Kit rows (toolbar, dock,
/// search) use it so they share one material without ever nesting containers.
class GlassScope extends StatelessWidget {
  const GlassScope({
    super.key,
    this.spacing = 8,
    this.light = GlassLightMode.pointer,
    this.interactive = true,
    required this.child,
  });

  final double spacing;
  final GlassLightMode light;
  final bool interactive;
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_GlassRegistryScope>() != null
      ? child
      : GlassContainer(
          spacing: spacing,
          light: light,
          interactive: interactive,
          child: child,
        );
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

class _GlassRegistryScope extends InheritedWidget {
  const _GlassRegistryScope({required this.registry, required super.child});
  final GlassMemberRegistry registry;
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
      if (event.kind == PointerDeviceKind.mouse ||
          event.kind == PointerDeviceKind.stylus) {
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

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final liquid = theme.config.glass == GlassStyle.liquid;
    _scene
      ..spacing = math.max(0, widget.spacing)
      ..reduceMotion = reduced
      ..followPointer = widget.light == GlassLightMode.pointer && liquid
      ..interactive = widget.interactive && liquid;
    _scene._requestMeasure();
    final material = _GlassMaterial(
      colors: theme.colors,
      style: theme.config.glass,
      renderer: theme.config.glassRenderer,
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
          widget.child,
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
    required this.renderer,
    required this.brightness,
  });
  final ColorTokens colors;
  final GlassStyle style;
  final GlassRenderer renderer;
  final Brightness brightness;

  bool get blurred =>
      style != GlassStyle.solid && renderer != GlassRenderer.fill;
  Color get fill => style == GlassStyle.solid
      ? colors.surface
      : blurred
      ? colors.glassFill
      : colors.glassFillFlat;
  bool get rim => style != GlassStyle.solid;
}

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
    if (!material.blurred) return paint;
    // Blurred renderers: one backdrop per cluster, clipped to its outline.
    return ListenableBuilder(
      listenable: scene,
      builder: (context, _) => Stack(
        clipBehavior: Clip.none,
        children: [
          for (final path in scene.paths)
            Positioned.fill(
              child: ClipPath(
                clipper: _PathClipper(path.path),
                child: BackdropFilter(
                  // blur(18px) saturate(1.1): the CSS blur length is the standard deviation.
                  filter: ui.ImageFilter.compose(
                    outer: ColorFilter.matrix(_saturate(1.1)),
                    inner: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                  ),
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

/// The CSS `saturate()` matrix.
List<double> _saturate(double s) => [
  0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0, //
  0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0, //
  0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0, //
  0, 0, 0, 1, 0,
];

class _PathClipper extends CustomClipper<Path> {
  _PathClipper(this.path);
  final Path path;
  @override
  Path getClip(Size size) => path;
  @override
  bool shouldReclip(_PathClipper old) => old.path != path;
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
    // A soft shadow outside the glass only (blur 7, 6px down), like the web kit's SVG shadow.
    canvas.save();
    canvas.clipPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(all.getBounds().inflate(64)),
        all,
      ),
    );
    canvas.drawPath(
      all.shift(const Offset(0, 6)),
      Paint()
        ..color = c.glassShadowColor
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
    );
    canvas.restore();
    for (final p in paths) {
      canvas.drawPath(p.path, Paint()..color = material.fill);
    }
    for (final p in paths) {
      // Edge and rim are 2px strokes clipped to the outline: 1px inside, like a CSS border.
      canvas.save();
      canvas.clipPath(p.path);
      canvas.drawPath(
        p.path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = c.line,
      );
      if (material.rim) {
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
                c.glassEdgeLight,
                c.glassEdgeLow,
                const Color(0x00000000),
                const Color(0x00000000),
                c.glassEdgeLow,
              ],
              const [0, 0.22, 0.48, 0.72, 1],
            ),
        );
      }
      canvas.restore();
    }
    final glow = scene.glow;
    if (glow != null && glow.opacity.get() > 0.01 && material.rim) {
      // Light from under the finger, spilling onto every bubble it reaches.
      final radius = math.max(1.0, glow.radius.get());
      canvas.save();
      canvas.clipPath(all);
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
      old.material.fill != material.fill ||
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
    : radius = MotionValue(8, 0.5),
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
    if (!_painting) notifyListeners();
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
    final targets = <String, (Rect, double, _Member?)>{};
    final unions = <String, (Rect, double)>{};
    for (final MapEntry(key: id, value: member) in _members.entries) {
      final render = member.key.currentContext?.findRenderObject();
      if (render is! RenderBox || !render.attached || !render.hasSize) continue;
      if (render.size.isEmpty) continue;
      final rect = MatrixUtils.transformRect(
        render.getTransformTo(box),
        Offset.zero & render.size,
      );
      final radius = member.radius();
      if (member.union != null) {
        final key = 'union:${member.union}';
        final previous = unions[key];
        unions[key] = previous == null
            ? (rect, radius)
            : (
                previous.$1.expandToInclude(rect),
                math.min(previous.$2, radius),
              );
      } else {
        targets[id] = (rect, radius, member);
      }
    }
    for (final MapEntry(key: key, value: union) in unions.entries) {
      targets[key] = (union.$1, union.$2, null);
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
      final follow = target.$3?.motion == GlassMotion.follow;
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
    final key =
        '$spacing|${visuals.map((v) => '${v.x.toStringAsFixed(1)},${v.y.toStringAsFixed(1)},${v.width.toStringAsFixed(1)},${v.height.toStringAsFixed(1)},${v.radius.toStringAsFixed(1)}').join(';')}';
    if (key != _key) {
      _key = key;
      paths = glassPaths(visuals, spacing);
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
      if (content.value != next) {
        if (_painting) {
          // Applied after this frame: a listener rebuilding during paint is not allowed.
          SchedulerBinding.instance.addPostFrameCallback(
            (_) => content.value = next,
          );
        } else {
          content.value = next;
        }
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
      math.max(120, shape.width.get()),
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
