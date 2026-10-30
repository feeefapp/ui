import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'geometry.dart';
import 'refraction.dart';

/// What glass can do on this device, for apps that show or log it (the twin of the web kit's
/// `glassCapabilities()`): `refraction` = Impeller runs the refraction shader as a backdrop filter,
/// `backdropBlur` = backdrop blur works (every Flutter renderer). The kit already uses these checks
/// itself; profiles never need a per-device variant.
({bool refraction, bool backdropBlur}) glassCapabilities() =>
    (refraction: GlassRefraction.supported, backdropBlur: true);

/// The refracting backdrop on Impeller: the blur, the material's colour (saturation and lift),
/// then the measured refraction and the edge (`shaders/glass_refraction.frag`, the twin of the
/// web kit's displacement map and edge terms). The colour is pointwise, so applying it before the
/// bend is the same picture, and lets the shader thin the veil at the edge on coloured pixels.
/// Where shader filters are unsupported (Skia, Flutter web) or the shader is still loading it is
/// the same backdrop without the bend or edge.
class GlassRefraction extends StatefulWidget {
  const GlassRefraction({
    super.key,
    required this.path,
    required this.spacing,
    required this.blur,
    required this.colour,
    this.edge = (k1: 0, k3: 0),
    this.light = const Offset(-0.7071067811865476, -0.7071067811865476),
    this.strength = 1,
    this.lens,
    this.backdropKey,
  });

  /// A control lens ([GlassLens]) over the first shape: bent by the measured [lensBend] profile
  /// of its kind (a pill bounded by its rest pill, the second shape) instead of the container's bezel, eased
  /// in by [strength] (0 … 1). Null for container glass.
  final LensKind? lens;

  /// Lens strength, a share of the measured shift (ThemeConfig `glassRefractionStrength`); for a
  /// control [lens], how much of its bend shows.
  final double strength;

  /// Shared by every cluster of one container: the engine reads the backdrop once for all of
  /// them (they never overlap, and nothing paints between them).
  final BackdropKey? backdropKey;

  /// The cluster to bend: its shapes in the container's own coordinates.
  final GlassPath path;
  final double spacing;

  /// Blur sigma before the bend; 0 for none.
  final double blur;

  /// The colour matrix (`glassBackdropMatrix`).
  final List<double> colour;

  /// The edge terms `x + k1 · x · E + k3 · E` (`glassEdgeTerms`).
  final ({double k1, double k3}) edge;

  /// Toward the light (unit, y down), for the edge mask's angle.
  final Offset light;

  /// Shapes the shader can blend in one cluster; larger clusters bend their first six.
  static const maxShapes = 6;

  /// Whether this engine can run shaders as backdrop filters (Impeller only).
  static bool get supported =>
      !kIsWeb && ui.ImageFilter.isShaderFilterSupported;

  /// Where each refracting backdrop under [root] last told its shader the glass sits (physical
  /// px), next to where it sits now.
  @visibleForTesting
  static List<({Offset painted, Offset actual})> debugOriginsOf(
    BuildContext root,
  ) {
    final found = <({Offset painted, Offset actual})>[];
    void visit(RenderObject object) {
      if (object is _RenderRefraction && object._painted != null) {
        found.add((painted: object._painted!, actual: object._origin()));
      }
      object.visitChildren(visit);
    }

    root.findRenderObject()?.visitChildren(visit);
    return found;
  }

  /// Uses [program] as the loaded shader (a package's own tests load it by its unprefixed path).
  @visibleForTesting
  static set debugProgram(ui.FragmentProgram program) => _loaded = program;

  static Future<ui.FragmentProgram>? _program;
  static ui.FragmentProgram? _loaded;

  static Future<ui.FragmentProgram> _load() =>
      _program ??= ui.FragmentProgram.fromAsset(
        'packages/feeef_ui/shaders/glass_refraction.frag',
      ).then((program) => _loaded = program);

  @override
  State<GlassRefraction> createState() => _GlassRefractionState();
}

class _GlassRefractionState extends State<GlassRefraction> {
  @override
  void initState() {
    super.initState();
    if (GlassRefraction._loaded == null) {
      GlassRefraction._load().then((_) {
        if (mounted) setState(() {});
      }, onError: (Object _) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final program = GlassRefraction._loaded;
    final colour = ColorFilter.matrix(widget.colour);
    final fallback = widget.blur > 0
        ? ui.ImageFilter.compose(
            outer: colour,
            inner: ui.ImageFilter.blur(
              sigmaX: widget.blur,
              sigmaY: widget.blur,
            ),
          )
        : colour;
    if (program == null) {
      return BackdropFilter(
        filter: fallback,
        backdropGroupKey: widget.backdropKey,
        child: const SizedBox.expand(),
      );
    }
    return _RefractionBackdrop(
      program: program,
      path: widget.path,
      spacing: widget.spacing,
      blur: widget.blur,
      colour: widget.colour,
      edge: widget.edge,
      light: widget.light,
      strength: widget.strength,
      lens: widget.lens,
      dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
      backdropKey: widget.backdropKey,
    );
  }
}

class _RefractionBackdrop extends LeafRenderObjectWidget {
  const _RefractionBackdrop({
    required this.program,
    required this.path,
    required this.spacing,
    required this.blur,
    required this.colour,
    required this.edge,
    required this.light,
    required this.strength,
    required this.lens,
    required this.dpr,
    required this.backdropKey,
  });
  final ui.FragmentProgram program;
  final GlassPath path;
  final double spacing, blur, strength, dpr;
  final LensKind? lens;
  final List<double> colour;
  final ({double k1, double k3}) edge;
  final Offset light;
  final BackdropKey? backdropKey;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderRefraction(program.fragmentShader())..update(this);

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderRefraction renderObject,
  ) => renderObject.update(this);
}

/// Pushes a backdrop filter layer whose shader knows where the glass sits in the backdrop: the
/// origin is read while painting, so it is current for every frame the glass repaints.
class _RenderRefraction extends RenderBox {
  _RenderRefraction(this._shader);
  final ui.FragmentShader _shader;
  _RefractionBackdrop? _config;
  final _base = LayerHandle<BackdropFilterLayer>();
  final _layer = LayerHandle<BackdropFilterLayer>();

  void update(_RefractionBackdrop config) {
    _config = config;
    markNeedsPaint();
  }

  /// The origin the shader was last given, physical px.
  Offset? _painted;

  /// Where the glass's (0, 0) lies in the surface the bend pass renders into, physical px: the
  /// window, or the texture of an enclosing image filter (Android's overscroll stretch wraps a
  /// scroll view in one while you pull), whose corner FlutterFragCoord then counts from.
  Offset _origin() =>
      localToGlobal(Offset.zero, ancestor: _filterSubpass()) * _config!.dpr;

  RenderObject? _filterSubpass() {
    for (var node = parent; node != null; node = node.parent) {
      // ignore: invalid_use_of_protected_member
      if (node.layer is ImageFilterLayer) return node;
    }
    return null;
  }

  // The shader needs the glass's place on screen, but an ancestor can move it without repainting
  // it (a route sliding in, a page transform, a scroll view around a repaint boundary). After each
  // frame we check, and repaint once if it moved; otherwise the rim refracts where the glass was.
  bool _watching = false;

  void _watch() {
    if (_watching || !attached) return;
    _watching = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _watching = false;
      if (!attached || _config == null) return;
      if (_painted != null && _origin() != _painted) markNeedsPaint();
      _watch();
    });
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _watch();
  }

  @override
  bool get sizedByParent => true;

  @override
  Size computeDryLayout(BoxConstraints constraints) => constraints.biggest;

  @override
  bool get alwaysNeedsCompositing => true;

  @override
  void paint(PaintingContext context, Offset offset) {
    final config = _config!;
    final shapes = config.path.shapes.take(GlassRefraction.maxShapes).toList();
    if (shapes.isEmpty) return;
    final side = shapes
        .map((s) => math.min(s.width, s.height))
        .reduce(math.min);
    final scale = refractionScale(side);
    final bezel = math.min(glassBezel * scale, side / 2);
    // The backdrop texture is in physical pixels of the layer the filter paints into.
    final origin = _painted = _origin();
    final blends = <double>[
      for (var i = 0; i < shapes.length; i++)
        i == 0
            ? 0
            : mergeWidth(
                [for (var j = 0; j < i; j++) rectGap(shapes[i], shapes[j])]
                    .reduce(math.min),
                config.spacing,
              ),
    ];
    var index = 2; // 0 and 1 are uSize, set by the engine.
    void set(double value) => _shader.setFloat(index++, value);
    set(origin.dx);
    set(origin.dy);
    set(config.dpr);
    set(bezel);
    // The gentle lens (iOS 27): no mirrored band at the rim. A control lens's bend is its own
    // measured profile, eased in by the strength.
    final lens = config.lens;
    set(
      lens != null
          ? config.strength
          : gentleRefractionShift(side) * config.strength,
    );
    set(shapes.length.toDouble());
    for (var i = 0; i < GlassRefraction.maxShapes; i++) {
      final s = i < shapes.length ? shapes[i] : null;
      set(s?.x ?? 0);
      set(s?.y ?? 0);
      set(s?.width ?? 0);
      set(s?.height ?? 0);
    }
    for (var i = 0; i < 8; i++) {
      set(i < shapes.length ? clampRadius(shapes[i]) : 0);
    }
    for (var i = 0; i < 8; i++) {
      set(i < shapes.length ? blends[i] : 0);
    }
    set(config.light.dx);
    set(config.light.dy);
    set(config.edge.k1);
    set(config.edge.k3);
    set(switch (lens) {
      null => 0,
      LensKind.pill => 1,
      LensKind.thumb => 2,
      LensKind.switchThumb => 3,
    });
    // Two passes, never one composed filter: blur and colour first (sharing the container's
    // backdrop read), then the bend alone, which reads that result. Under a composed filter
    // Impeller may crop the shader's input to the clip and count FlutterFragCoord from the
    // crop's corner, depending on the engine; a plain shader pass always counts in the surface
    // frame, which is what [_origin] measures.
    final colour = ColorFilter.matrix(config.colour);
    if (config.blur <= 0 && _isIdentity(config.colour)) {
      // Nothing to blur or tint (a control lens): the bend alone.
      _base.layer = null;
    } else {
      _base.layer = (_base.layer ?? BackdropFilterLayer())
        // Without blur the colour reads the backdrop itself: no blur stage at all.
        ..filter = config.blur > 0
            ? ui.ImageFilter.compose(
                outer: colour,
                inner: ui.ImageFilter.blur(
                  sigmaX: config.blur,
                  sigmaY: config.blur,
                ),
              )
            : colour
        ..backdropKey = config.backdropKey;
      context.pushLayer(_base.layer!, (context, offset) {}, offset);
    }
    // No shared key: the bend must see the blurred glass beneath it, not the page.
    _layer.layer = (_layer.layer ?? BackdropFilterLayer())
      ..filter = ui.ImageFilter.shader(_shader);
    context.pushLayer(_layer.layer!, (context, offset) {}, offset);
  }

  static bool _isIdentity(List<double> matrix) {
    for (var i = 0; i < 20; i++) {
      if (matrix[i] != (i % 6 == 0 ? 1.0 : 0.0)) return false;
    }
    return true;
  }

  @override
  void dispose() {
    _base.layer = null;
    _layer.layer = null;
    _shader.dispose();
    super.dispose();
  }
}
