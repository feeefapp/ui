import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import 'geometry.dart';
import 'material.dart';
import 'refraction.dart';

/// The canvas renderer's backdrop on Impeller: blur sized to the cluster, the measured refraction
/// (`shaders/glass_refraction.frag`, the twin of the web kit's displacement map) and saturation.
/// Where shader filters are unsupported (Skia, Flutter web) or the shader is still loading it is a
/// plain blurred, saturated backdrop, like the `css` renderer.
class GlassRefraction extends StatefulWidget {
  const GlassRefraction({
    super.key,
    required this.path,
    required this.spacing,
    required this.blur,
    required this.saturate,
  });

  /// The cluster to bend: its shapes in the container's own coordinates.
  final GlassPath path;
  final double spacing;
  final double blur;
  final double saturate;

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
    final fallback = ui.ImageFilter.compose(
      outer: ColorFilter.matrix(saturateMatrix(widget.saturate)),
      inner: ui.ImageFilter.blur(sigmaX: widget.blur, sigmaY: widget.blur),
    );
    if (program == null) {
      return BackdropFilter(filter: fallback, child: const SizedBox.expand());
    }
    return _RefractionBackdrop(
      program: program,
      path: widget.path,
      spacing: widget.spacing,
      blur: widget.blur,
      saturate: widget.saturate,
      dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
    );
  }
}

class _RefractionBackdrop extends LeafRenderObjectWidget {
  const _RefractionBackdrop({
    required this.program,
    required this.path,
    required this.spacing,
    required this.blur,
    required this.saturate,
    required this.dpr,
  });
  final ui.FragmentProgram program;
  final GlassPath path;
  final double spacing, blur, saturate, dpr;

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
    set(glassRefraction * scale);
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
    final filter = ui.ImageFilter.compose(
      outer: ColorFilter.matrix(saturateMatrix(config.saturate)),
      inner: ui.ImageFilter.compose(
        outer: ui.ImageFilter.shader(_shader),
        inner: ui.ImageFilter.blur(sigmaX: config.blur, sigmaY: config.blur),
      ),
    );
    _layer.layer = (_layer.layer ?? BackdropFilterLayer())..filter = filter;
    context.pushLayer(_layer.layer!, (context, offset) {}, offset);
  }

  @override
  void dispose() {
    _layer.layer = null;
    _shader.dispose();
    super.dispose();
  }
}
