import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
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
    this.backdropKey,
  });

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
    required this.dpr,
    required this.backdropKey,
  });
  final ui.FragmentProgram program;
  final GlassPath path;
  final double spacing, blur, dpr;
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
  final _layer = LayerHandle<BackdropFilterLayer>();

  void update(_RefractionBackdrop config) {
    _config = config;
    markNeedsPaint();
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
    final origin = localToGlobal(Offset.zero) * config.dpr;
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
    // The gentle lens (iOS 27): no mirrored band at the rim.
    set(gentleRefractionShift(side));
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
    final bend = ui.ImageFilter.shader(_shader);
    final colour = ColorFilter.matrix(config.colour);
    final filter = ui.ImageFilter.compose(
      outer: bend,
      // Without blur the colour reads the backdrop itself: no blur stage at all.
      inner: config.blur > 0
          ? ui.ImageFilter.compose(
              outer: colour,
              inner: ui.ImageFilter.blur(
                sigmaX: config.blur,
                sigmaY: config.blur,
              ),
            )
          : colour,
    );
    _layer.layer = (_layer.layer ?? BackdropFilterLayer())
      ..filter = filter
      ..backdropKey = config.backdropKey;
    context.pushLayer(_layer.layer!, (context, offset) {}, offset);
  }

  @override
  void dispose() {
    _layer.layer = null;
    _shader.dispose();
    super.dispose();
  }
}
