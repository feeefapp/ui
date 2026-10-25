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
import 'hairline.dart';
import 'light.dart';
import 'material.dart';
import 'member_bounds.dart';
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
/// parts out of itself; a new bubble is born out of its nearest neighbour (same row first) and a
/// removed one is absorbed into it, so only a lone bubble materializes. Bubbles keep their layout, focus and
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

  /// Whether any of a container's glass springs on its own this frame (moving, growing in,
  /// leaving), rather than resting where its bubbles are.
  @visibleForTesting
  static bool debugMovingOf(BuildContext container) =>
      ((container as StatefulElement).state as _GlassContainerState)
          ._scene
          ._shapes
          .values
          .any((shape) => shape.values.any((value) => value.isAnimating));
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

/// Marks a subtree that moves as one piece (a presentation surface entering or leaving) while
/// [instant] is true: the glass inside takes every layout change at once, with no births, deaths
/// or springs, so it rides the surface's transition and leaves with it in the same frames. The
/// twin of the web kit's `data-glass-instant`.
class GlassInstant extends InheritedWidget {
  const GlassInstant({super.key, required this.instant, required super.child});
  final bool instant;

  /// Whether the glass at [context] sits on a surface that is moving as one piece.
  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<GlassInstant>()?.instant ??
      false;

  @override
  bool updateShouldNotify(GlassInstant old) => old.instant != instant;
}

/// How far (px) glass may reach past its container before it is cut: a member is clamped to the
/// container grown by this (`GLASS_MARGIN`).
const double glassMargin = 32;

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
    bool singleRim = false,
  }) {
    _scene._members[id] = _Member(key, radius, union, motion, singleRim);
    _scene._requestMeasure();
    return GlassMemberHandle._(_scene, id);
  }

  /// Re-measures every bubble after this frame's layout: call it on each frame a host moves its
  /// bubbles itself (a minimizing tab bar), so `follow` bubbles track them exactly. The twin of the
  /// web kit's `requestMeasure()`.
  void requestMeasure() => _scene._requestMeasure();

  /// For [duration], every bubble's glass follows its layout exactly instead of springing after
  /// it: call it when content inside a bubble starts animating its own size (a segmented control
  /// folding into its menu), so it never pokes out of its glass and the neighbours it pushes never
  /// overlap it. The twin of the web kit's `data-glass-follow`.
  void followLayoutFor(Duration duration) {
    final now = SchedulerBinding.instance.currentSystemFrameTimeStamp;
    _scene._followUntil = now + duration;
    _scene._requestMeasure();
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
    final reduced = reducedMotionOf(context);
    final style = glassStyleOf(context);
    final liquid = style == GlassStyle.liquid;
    _scene
      ..spacing = math.max(0, widget.spacing)
      ..reduceMotion = reduced
      ..instant = GlassInstant.of(context)
      ..viewport = MediaQuery.maybeSizeOf(context) ?? Size.zero
      ..followPointer = widget.light == GlassLightMode.pointer && liquid
      ..interactive = widget.interactive && liquid;
    _scene._requestMeasure();
    final material = _GlassMaterial(
      colors: theme.colors,
      style: style,
      tint: theme.colors.glassTint,
      blur: theme.config.glassBlur,
      refraction: theme.config.glassRefraction,
      refractionStrength: theme.config.refractionStrength,
      highlight: theme.config.highlight,
      highlightWidth: theme.config.highlightWidth,
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
    required this.refractionStrength,
    required this.highlight,
    required this.highlightWidth,
    required this.highContrast,
    required this.brightness,
  });
  final ColorTokens colors;
  final GlassStyle style;
  final double tint;
  final bool blur, refraction, highContrast;

  /// ThemeConfig's lens strength, rim light strength and rim light width (shares of the measured).
  final double refractionStrength, highlight, highlightWidth;
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
  /// saturation and the clear lift, after the blur (clear glass always softens a little).
  ui.ImageFilter backdropFor(double side) {
    final colour = ColorFilter.matrix(glassBackdropMatrix(materialFor(side)));
    final sigma = blurFor(side);
    if (sigma <= 0) return colour;
    return ui.ImageFilter.compose(
      outer: colour,
      inner: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
    );
  }

  GlassMaterial materialFor(double side) =>
      glassMaterial(tint, dark: dark, size: glassSize(side));

  /// Blur (std dev, px) for a cluster whose smallest bubble's shorter side is [side] px.
  double blurFor(double side) => glassBlurAt(side, tint, blurOn: blur);

  /// The edge terms (veil thinning, dark clear light) for that cluster.
  ({double k1, double k3}) edgeFor(double side) {
    final s = fillFor(side);
    final terms = glassEdgeTerms(
      tint,
      dark: dark,
      material: materialFor(side),
      surface: 0.2126 * s.r + 0.7152 * s.g + 0.0722 * s.b,
    );
    return (k1: terms.k1 * highlight, k3: terms.k3 * highlight);
  }

  /// The rim at this tint and brightness, at the theme's highlight strength and width.
  GlassRim get rimLight {
    final rim = glassRim(tint, dark: dark);
    return (
      w0: rim.w0 * highlight,
      w1: rim.w1 * highlight,
      p: rim.p,
      width: rim.width * highlightWidth,
    );
  }

  /// The hairline's strengths at this tint and brightness.
  ({double ring, double sliver}) get hairline =>
      glassHairline(tint, dark: dark);
}

/// Shorter side of the smallest bubble in a cluster: the material and bend follow it.
double _smallestSide(GlassPath path) => path.shapes
    .map((s) => math.min(s.width, s.height))
    .fold(double.infinity, math.min);

/// The side that picks [path]'s material: a toolbar's glass (single rim) stays control-sized
/// however wide its label makes it, so a wide rail never takes the panel's veil and light edge.
double _materialSide(_GlassScene scene, GlassPath path) {
  final side = _smallestSide(path);
  return scene.singleRim(path) ? math.min(side, glassSmallSide) : side;
}

/// Shadow, backdrop, edge, light and glow, behind the bubbles.
class _GlassLayers extends StatelessWidget {
  const _GlassLayers({required this.scene, required this.material});
  final _GlassScene scene;
  final _GlassMaterial material;

  @override
  Widget build(BuildContext context) {
    final paint = CustomPaint(
      painter: _GlassPainter(
        scene,
        material,
        MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
      ),
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
                        backdropKey: scene.backdropKey,
                        blur: material.blurFor(_materialSide(scene, path)),
                        strength: material.refractionStrength,
                        colour: glassBackdropMatrix(
                          material.materialFor(_materialSide(scene, path)),
                        ),
                        edge: material.edgeFor(_materialSide(scene, path)),
                        light: scene.lightFor(path.bounds),
                      )
                    : BackdropFilter(
                        filter: material.backdropFor(
                          _materialSide(scene, path),
                        ),
                        backdropGroupKey: scene.backdropKey,
                        child: const SizedBox.expand(),
                      ),
              ),
            ),
          // The dark hairline iOS 27 draws outside every glass shape, small or large (the web
          // kit's GLASS_HAIRLINE): it is what defines the edge over light content.
          for (final path in scene.paths)
            for (final sliver in const [false, true])
              Positioned.fill(
                child: ClipPath(
                  clipper: _HairlineClipper(
                    scene,
                    scene.paths.indexOf(path),
                    sliver: sliver,
                  ),
                  child: BackdropFilter(
                    filter: ColorFilter.matrix(
                      subtractMatrix(
                        sliver
                            ? material.hairline.sliver
                            : material.hairline.ring,
                      ),
                    ),
                    backdropGroupKey: scene.backdropKey,
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

/// Cluster [index]'s hairline band (the ring, or with [sliver] the side slivers), cut to its
/// clip, cached per outline.
class _HairlineClipper extends CustomClipper<Path> {
  _HairlineClipper(this.scene, this.index, {required this.sliver})
    : super(reclip: scene);
  final _GlassScene scene;
  final int index;
  final bool sliver;

  static final _bands =
      Expando<({List<List<Offset>> ring, List<List<Offset>> sliver})>();

  @override
  Path getClip(Size size) {
    if (index < 0 || index >= scene.paths.length) return Path();
    final path = scene.paths[index];
    final bands = _bands[path] ??= hairlineBands(path.shapes, scene.spacing);
    final band = bandPath(sliver ? bands.sliver : bands.ring);
    final clip = path.clip;
    return clip == null
        ? band
        : Path.combine(PathOperation.intersect, band, Path()..addRect(clip));
  }

  @override
  bool shouldReclip(_HairlineClipper old) =>
      old.index != index || old.sliver != sliver || old.scene != scene;
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
  _GlassPainter(this.scene, this.material, this.dpr) : super(repaint: scene);
  final _GlassScene scene;
  final _GlassMaterial material;
  final double dpr;

  /// Each cluster's faint shadow (iOS 27: y 8, std dev 7.5), cut at its clip.
  void _shadows(Canvas canvas, List<GlassPath> paths) {
    final c = material.colors;
    for (final p in paths) {
      canvas.save();
      if (p.clip != null) canvas.clipRect(p.clip!);
      canvas.drawPath(
        p.path.shift(const Offset(0, glassShadowDy)),
        Paint()
          ..color = c.glassShadowColor
          ..maskFilter = const MaskFilter.blur(
            BlurStyle.normal,
            glassShadowBlur,
          ),
      );
      canvas.restore();
    }
  }

  /// The shadows of still glass from an image rendered once, so the engine doesn't blur every
  /// cluster again on every frame (Impeller has no raster cache; content scrolling behind or
  /// past the glass repaints it each frame). Moving glass, or glass under a scaled or rotated
  /// ancestor, draws them live. Returns false when the caller must draw them live.
  bool _cachedShadows(Canvas canvas, List<GlassPath> paths, Rect region) {
    final c = material.colors;
    final key = '${scene._key}|${c.glassShadowColor.toARGB32()}|$dpr';
    final still = key == scene._shadowKey;
    scene._shadowKey = key;
    final cached = scene._shadowImage;
    if (cached != null && cached.key == key) {
      cached.draw(canvas);
      return true;
    }
    // Rendered only once the glass has painted the same way twice (never during motion), and by
    // one container per frame, so a page of glass coming to rest doesn't render them all at once.
    if (!still || !_ShadowImage.claimFrame()) return false;
    final host = scene.host();
    final transform = host != null && host.attached
        ? host.getTransformTo(null)
        : null;
    final at = transform == null
        ? null
        : MatrixUtils.getAsTranslation(transform);
    if (at == null) return false;
    // Line the image up with the physical pixel grid where the glass sits now.
    final left = ((at.dx + region.left) * dpr).floorToDouble() / dpr - at.dx;
    final top = ((at.dy + region.top) * dpr).floorToDouble() / dpr - at.dy;
    final width = ((region.right - left) * dpr).ceil();
    final height = ((region.bottom - top) * dpr).ceil();
    if (width <= 0 || height <= 0 || width * height > 16e6) return false;
    final recorder = ui.PictureRecorder();
    final offscreen = Canvas(recorder)
      ..scale(dpr)
      ..translate(-left, -top);
    _shadows(offscreen, paths);
    final picture = recorder.endRecording();
    final image = picture.toImageSync(width, height);
    picture.dispose();
    scene._shadowImage?.image.dispose();
    final next = _ShadowImage(
      key,
      image,
      Rect.fromLTWH(left, top, width / dpr, height / dpr),
    );
    scene._shadowImage = next;
    next.draw(canvas);
    return true;
  }

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
    final region = all.getBounds().inflate(glassShadowBlur * 3 + glassShadowDy);
    canvas.save();
    canvas.clipPath(
      Path.combine(PathOperation.difference, Path()..addRect(region), all),
    );
    if (!_cachedShadows(canvas, paths, region)) _shadows(canvas, paths);
    canvas.restore();
    for (final p in paths) {
      scissor(p);
      canvas.drawPath(
        p.path,
        Paint()..color = material.fillFor(_materialSide(scene, p)),
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
        // A layer of white inside the outline (clipped above), lit at both ends of the light
        // axis by the edge normal: glassRim / rimLayer, drawn as a band of vertices.
        final rim = _rimVertices(
          p.path,
          scene.lightFor(p.bounds),
          material.rimLight,
        );
        if (rim != null) {
          canvas.drawVertices(rim, BlendMode.dst, Paint());
          rim.dispose();
        }
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
      old.material.highlight != material.highlight ||
      old.material.highlightWidth != material.highlightWidth ||
      old.material.colors != material.colors ||
      old.dpr != dpr;
}

/// Still glass's shadows, rendered once at device resolution (see `_cachedShadows`).
class _ShadowImage {
  _ShadowImage(this.key, this.image, this.rect);

  static bool _rendered = false;

  /// True for the first container that asks in a frame.
  static bool claimFrame() {
    if (_rendered) return false;
    _rendered = true;
    SchedulerBinding.instance.addPostFrameCallback((_) => _rendered = false);
    return true;
  }

  final String key;
  final ui.Image image;

  /// Where it goes, in the container's pixels.
  final Rect rect;

  void draw(Canvas canvas) => canvas.drawImageRect(
    image,
    Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()),
    rect,
    Paint()..filterQuality = FilterQuality.low,
  );
}

class _Member {
  _Member(this.key, this.radius, this.union, this.motion, this.singleRim);
  final GlobalKey key;
  final double Function() radius;
  final String? union;
  final GlassMotion motion;
  final bool singleRim;
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
  bool singleRim = false;
  Rect? layout;

  /// The visible part of the container this bubble may paint in (null: unclipped).
  Rect? clip;

  /// Content follows the glass only for moves of the same bubble, not while growing out of another.
  bool carry = true;

  /// Growing out of a neighbour: springs to its place even when its bubble follows its layout.
  bool growing = false;
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

  /// On a surface moving as one piece ([GlassInstant]): layout changes apply at once.
  bool instant = false;

  /// The window, for the absurd-size rule ([glassMemberRect]).
  Size viewport = Size.zero;
  bool followPointer = true;
  bool interactive = true;

  /// One backdrop read for all of this container's clusters: they never overlap and nothing paints
  /// between their backdrops (the edge and light paint above them all), so sharing changes nothing
  /// drawn and saves the engine a full backdrop copy per extra cluster on every frame.
  final backdropKey = BackdropKey();

  final _members = <String, _Member>{};
  final _shapes = <String, _Shape>{};
  final _contents = <String, ValueNotifier<(Offset, double)>>{};

  /// Content offsets set while painting, applied after the frame unless a newer value lands first.
  final _pendingContent = <String, (Offset, double)>{};
  final _unsubscribe = <String, List<void Function()>>{};
  List<GlassPath> paths = const [];
  Map<GlassShape, bool> _singleRims = {};

  bool singleRim(GlassPath path) =>
      path.shapes.every((shape) => _singleRims[shape] == true);
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

  /// The shadows of still glass ([_GlassPainter]) and the geometry key of the last paint.
  _ShadowImage? _shadowImage;
  String? _shadowKey;

  ValueNotifier<(Offset, double)> _contentFor(String id) =>
      _contents.putIfAbsent(id, () => ValueNotifier((Offset.zero, 1)));

  void _unregister(String id) {
    _members.remove(id);
    _requestMeasure();
  }

  /// Until when every bubble follows its layout instead of springing (frame time).
  Duration? _followUntil;

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
      // A broken layout (an error widget overflowing by thousands of px) is not glass, and
      // nothing is drawn past the material's reach around the container.
      final rect = glassMemberRect(
        MatrixUtils.transformRect(
          render.getTransformTo(box),
          Offset.zero & render.size,
        ),
        box.size,
        viewport,
        glassMargin,
      );
      if (rect == null) continue;
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
        reduceMotion ||
        this.instant ||
        !_measured ||
        (now - first).inMilliseconds < 300;
    var dirty = false;
    // Content resizing itself smoothly inside a bubble (a segmented control folding): every bubble
    // follows the layout exactly, the neighbours it pushes included (`followLayoutFor`).
    final followAll = _followUntil != null && now < _followUntil!;
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
      shape.growing = grow;
      // A bubble growing out of a neighbour crosses the space between them: no clip (a slot's
      // clip would cut it off at the slot's edge) until it arrives.
      shape.clip = grow ? null : target.$4.clip;
      _shapes[birth.id] = shape;
      _watch(birth.id, shape);
      dirty = true;
    }
    for (final death in plan.deaths) {
      final shape = _shapes[death.id];
      if (shape == null || shape.leaving) continue;
      shape.leaving = true;
      shape.layout = null;
      // It travels into its neighbour: free of its old slot's clip.
      if (death is GlassAbsorb) shape.clip = null;
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
      final singleRim =
          target.$3?.singleRim ??
          _members.values
              .where(
                (member) =>
                    member.union != null && 'union:${member.union}' == id,
              )
              .every((member) => member.singleRim);
      if (shape.singleRim != singleRim) {
        shape.singleRim = singleRim;
        dirty = true;
      }
      if (shape.radius != target.$2) {
        shape.radius = target.$2;
        dirty = true;
      }
      final clip = shape.growing ? null : target.$4.clip;
      if (shape.clip != clip) {
        shape.clip = clip;
        dirty = true;
      }
      // Bubbles moved by a scroll view ride with it exactly, like content.
      final follow =
          !shape.growing &&
          (target.$3?.motion == GlassMotion.follow ||
              target.$4.scrolled ||
              followAll);
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
          if (arrived && shape.token == token) {
            shape.carry = true;
            shape.growing = false;
            shape.clip = target.$4.clip;
          }
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
        '${_shapes.values.map((s) => s.singleRim).join(',')}|$spacing|${visuals.map((v) => '${v.x.toStringAsFixed(1)},${v.y.toStringAsFixed(1)},${v.width.toStringAsFixed(1)},${v.height.toStringAsFixed(1)},${v.radius.toStringAsFixed(1)}').join(';')}|${clips.map((c) => c == null ? '' : '${c.left.toStringAsFixed(1)},${c.top.toStringAsFixed(1)},${c.right.toStringAsFixed(1)},${c.bottom.toStringAsFixed(1)}').join(';')}';
    if (key != _key) {
      _key = key;
      _singleRims = {
        for (final (index, shape) in _shapes.values.indexed)
          visuals[index]: shape.singleRim,
      };
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
    _shadowImage?.image.dispose();
    _shadowImage = null;
    super.dispose();
  }
}

/// Glass bars floating over scrolling content (a ScrollArea's app bar and dock, a TabView's tab
/// bar): their labels sit on moving content, so every glass below is at least [glassBarTint]
/// tinted and blurred with the measured blur, whatever the theme's `glassTint` and `glassBlur`
/// (glass elsewhere keeps them), as iOS bars are. The twin of `GlassBar` in `@feeef.dev/ui/glass`.
class GlassBar extends StatelessWidget {
  const GlassBar({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final config = theme.config;
    if (!config.glassBarBoost ||
        (config.tint >= glassBarTint && config.glassBlur)) {
      return child;
    }
    return ThemeProvider(
      config: config.copyWith(
        glassTint: math.max(config.tint, glassBarTint),
        glassBlur: true,
      ),
      brightness: theme.brightness,
      child: child,
    );
  }
}

/// The rim as a triangle band along [outline]: at each sample along the outline the alpha of
/// `rimLayer` at depth 0, ⅔ of the rim's width and its full width, by the outward normal there
/// against [light]. Clipped to the outline by the caller, so nothing paints outside.
ui.Vertices? _rimVertices(Path outline, Offset light, GlassRim rim) {
  const step = 1.5;
  final positions = <Offset>[];
  final colors = <Color>[];
  final indices = <int>[];
  const depths = [0.0, 2 / 3, 1.0];
  for (final metric in outline.computeMetrics()) {
    final count = math.max(3, (metric.length / step).ceil());
    // The outward side: probe once per contour (union outlines are simple closed loops).
    final probe = metric.getTangentForOffset(0);
    if (probe == null) continue;
    final n0 = Offset(probe.vector.dy, -probe.vector.dx);
    final outward = outline.contains(probe.position + n0 * 0.75) ? -1.0 : 1.0;
    final first = positions.length;
    for (var i = 0; i <= count; i++) {
      final tangent = metric.getTangentForOffset(metric.length * i / count);
      if (tangent == null) continue;
      final normal = Offset(tangent.vector.dy, -tangent.vector.dx) * outward;
      final cosine = normal.dx * light.dx + normal.dy * light.dy;
      for (final depth in depths) {
        final d = depth * rim.width;
        positions.add(tangent.position - normal * d);
        colors.add(
          const Color(0xFFFFFFFF).withValues(alpha: rimLayer(d, cosine, rim)),
        );
      }
    }
    final rows = (positions.length - first) ~/ depths.length;
    for (var i = 0; i + 1 < rows; i++) {
      for (var k = 0; k + 1 < depths.length; k++) {
        final a = first + i * depths.length + k;
        final b = a + depths.length;
        indices.addAll([a, b, a + 1, a + 1, b, b + 1]);
      }
    }
  }
  if (indices.isEmpty) return null;
  return ui.Vertices(
    ui.VertexMode.triangles,
    positions,
    colors: colors,
    indices: indices,
  );
}
