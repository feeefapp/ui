import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import 'brand/geometry.dart';
import 'glass/material.dart';
import 'glass/container.dart';
import 'glass/member.dart';
import 'layout/size_reporter.dart';
import 'theme.dart';
import 'theme/light_edge.dart';
import 'theme/surfaces.dart';

/// One glass bubble for related floating controls: the twin of `GlassGroup` in
/// `@feeef.dev/ui/scaffold`. Inside a [GlassContainer] it hands its shape to the container's
/// single material (and merges, splits and morphs with its neighbours); on its own it paints the
/// web kit's glass: fill, 1px line edge, inner light, the 135° specular rim and a soft shadow.
/// Lays out [child] inside a 1px border, like the CSS box.
class GlassGroup extends StatefulWidget {
  const GlassGroup({
    super.key,
    this.glassId,
    this.glassUnion,
    this.glassMotion = GlassMotion.spring,
    this.glassHidden = false,
    this.radius,
    this.padding = EdgeInsets.zero,
    this.as = SurfaceTag.div,
    this.label,
    required this.child,
  });

  /// Element it stands for, so the group can be a landmark (`nav`, `aside`, …), like the web
  /// kit's `as`. Maps to the nearest Flutter semantics role.
  final SurfaceTag as;

  /// Accessible name (`aria-label`). With a label or a landmark [as], the group is its own
  /// semantics node.
  final String? label;

  /// Identity of this bubble inside a GlassContainer. A bubble with the same id moves instead of
  /// reappearing; different ids morph into each other.
  final String? glassId;

  /// Bubbles with the same union name draw as one shape spanning all of them.
  final String? glassUnion;

  /// `follow` for bubbles that animate their own size, so the glass tracks them exactly.
  final GlassMotion glassMotion;

  /// Leaves the container's glass while keeping its place (`data-glass-hidden`).
  final bool glassHidden;

  /// Corner radius; defaults to the theme's glass radius (32, 27 on screens up to 720px wide).
  final double? radius;

  /// Space between the border and [child].
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  State<GlassGroup> createState() => _GlassGroupState();
}

class _GlassGroupState extends State<GlassGroup> {
  @override
  Widget build(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 720;
    final radius =
        widget.radius ?? (narrow ? 27 * s.radiusScale : s.radiusGlass);
    final role = switch (widget.as) {
      SurfaceTag.nav => ui.SemanticsRole.navigation,
      SurfaceTag.aside => ui.SemanticsRole.complementary,
      SurfaceTag.footer => ui.SemanticsRole.contentInfo,
      SurfaceTag.section when widget.label != null => ui.SemanticsRole.region,
      _ => null,
    };
    final group = GlassMemberBox(
      glassId: widget.glassId,
      union: widget.glassUnion,
      motion: widget.glassMotion,
      hidden: widget.glassHidden,
      radius: radius,
      standalone: (child) => GlassSurface(radius: radius, child: child),
      // The CSS border stays in the layout even when the container paints the glass.
      child: Padding(
        padding: const EdgeInsets.all(1),
        child: Padding(padding: widget.padding, child: widget.child),
      ),
    );
    if (role == null && widget.label == null && widget.as == SurfaceTag.div) {
      return group;
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: role,
      label: widget.label,
      child: group,
    );
  }
}

/// The element a [GlassGroup] stands for (the web kit's `as`).
enum SurfaceTag { div, header, aside, nav, section, footer }

/// The kit's glass material on one surface of its own (outside a [GlassContainer]): blur,
/// saturation, veil, rim and shadow from the measured model (`glass/material.dart`). It picks
/// control-sized or panel-sized glass from its shorter side, like the web scene. [GlassGroup]
/// uses it for a lone bubble; use it for any floating glass surface (a composer card, a rail).
class GlassSurface extends StatefulWidget {
  const GlassSurface({super.key, required this.radius, required this.child});

  /// Corner radius (the kit's continuous corners).
  final double radius;
  final Widget child;

  @override
  State<GlassSurface> createState() => _GlassSurfaceState();
}

class _GlassSurfaceState extends State<GlassSurface> {
  double _side = 0;

  @override
  Widget build(BuildContext context) => SizeReporter(
    onSize: (size) {
      final side = math.min(size.width, size.height);
      if ((side - _side).abs() >= 1) setState(() => _side = side);
    },
    child: _material(context),
  );

  Widget _material(BuildContext context) {
    final radius = widget.radius;
    final child = widget.child;
    final size = glassSize(_side);
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final style = glassStyleOf(context);
    final translucent = style != GlassStyle.solid;
    final fill = translucent
        ? (size == GlassSize.small ? c.glassFill : c.glassFillLarge)
        : c.surface;
    final painted = CustomPaint(
      painter: _GlassGroupPainter(
        fill: fill,
        line: glassHighContrastOf(context) ? c.ink : c.line,
        edgeLight: c.glassEdgeLight,
        edgeLow: c.glassEdgeLow,
        shadow: glassShadowColor(theme.brightness),
        radius: radius,
        rim: translucent,
      ),
      child: child,
    );
    if (!translucent) return painted;
    // `--lab-glass-saturate` and `--lab-glass-lift` at the tint, after `--lab-glass-blur` when
    // ThemeConfig glassBlur is on. (Refraction needs a GlassContainer.)
    final material = glassMaterial(
      theme.colors.glassTint,
      dark: theme.brightness == Brightness.dark,
      size: size,
    );
    final colour = ColorFilter.matrix(glassBackdropMatrix(material));
    final blur = glassBlur(_side);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: ClipPath(
            clipper: _SuperellipseClipper(radius),
            child: BackdropFilter(
              filter: theme.config.glassBlur
                  ? ui.ImageFilter.compose(
                      outer: colour,
                      inner: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
                    )
                  : colour,
              child: const SizedBox.expand(),
            ),
          ),
        ),
        painted,
      ],
    );
  }
}

class _SuperellipseClipper extends CustomClipper<Path> {
  _SuperellipseClipper(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_SuperellipseClipper old) => old.radius != radius;
}

class _GlassGroupPainter extends CustomPainter {
  _GlassGroupPainter({
    required this.fill,
    required this.line,
    required this.edgeLight,
    required this.edgeLow,
    required this.shadow,
    required this.radius,
    required this.rim,
  });
  final Color fill, line, edgeLight, edgeLow, shadow;
  final double radius;
  final bool rim;

  @override
  void paint(Canvas canvas, Size size) {
    final compactGlass = rim && glassSize(size.shortestSide) == GlassSize.small;
    paintFloatingSurface(
      canvas,
      size,
      radius,
      fill: fill,
      line: compactGlass ? const Color(0x00000000) : line,
      edgeLow: edgeLow,
      shadow: shadow,
      innerLight: !compactGlass,
    );
    if (rim) {
      paintLightEdge(canvas, size, radius, light: edgeLight, low: edgeLow);
    }
  }

  @override
  bool shouldRepaint(_GlassGroupPainter old) =>
      old.fill != fill ||
      old.line != line ||
      old.radius != radius ||
      old.rim != rim ||
      old.edgeLight != edgeLight ||
      old.shadow != shadow;
}

/// Named floating regions (the web kit's `FloatingSlot`). `header` reserves from the top, `rail`
/// from the start, `player` and `notice` from the bottom; notices stack above the other bottom
/// chrome.
enum FloatingSlot { player, header, rail, notice }

/// Page-level host for floating chrome: the twin of `ScaffoldProvider` in
/// `@feeef.dev/ui/scaffold`. Mount it once near the root. [FloatingLayer]s inside it float over
/// the whole window and report their measured size, which [ScaffoldProvider.reserveOf] returns
/// (the web kit's `--lab-<slot>-reserve`), so content can pad itself clear of them.
class ScaffoldProvider extends StatefulWidget {
  const ScaffoldProvider({super.key, required this.child});

  /// The page.
  final Widget child;

  /// The space reserved for [slot] in the nearest provider, in px (0 without one).
  static double reserveOf(BuildContext context, FloatingSlot slot) =>
      context
          .dependOnInheritedWidgetOfExactType<_ScaffoldScope>()
          ?.reserves[slot] ??
      0;

  /// The bottom chrome other than notices (the web kit's `--lab-floating-bottom`).
  static double floatingBottomOf(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<_ScaffoldScope>()
          ?.floatingBottom ??
      0;

  @override
  State<ScaffoldProvider> createState() => _ScaffoldProviderState();
}

class _ScaffoldProviderState extends State<ScaffoldProvider> {
  final _regions = <Object, ({FloatingSlot slot, double size})>{};

  void _reserve(Object id, FloatingSlot slot, double? size) {
    final current = _regions[id];
    if (size == null) {
      if (current == null) return;
      setState(() => _regions.remove(id));
      return;
    }
    if (current?.slot == slot && current?.size == size) return;
    setState(() => _regions[id] = (slot: slot, size: size));
  }

  @override
  Widget build(BuildContext context) {
    final reserves = <FloatingSlot, double>{};
    var bottom = 0.0;
    for (final r in _regions.values) {
      reserves[r.slot] = math.max(reserves[r.slot] ?? 0, r.size);
      if (r.slot == FloatingSlot.player) bottom = math.max(bottom, r.size);
    }
    return _ScaffoldScope(
      state: this,
      reserves: reserves,
      floatingBottom: bottom,
      child: widget.child,
    );
  }
}

class _ScaffoldScope extends InheritedWidget {
  const _ScaffoldScope({
    required this.state,
    required this.reserves,
    required this.floatingBottom,
    required super.child,
  });
  final _ScaffoldProviderState state;
  final Map<FloatingSlot, double> reserves;
  final double floatingBottom;

  @override
  bool updateShouldNotify(_ScaffoldScope old) =>
      old.floatingBottom != floatingBottom ||
      old.reserves.length != reserves.length ||
      reserves.entries.any((e) => old.reserves[e.key] != e.value);
}

/// Floats [child] over the whole window, above the page (the web kit's viewport-fixed portal),
/// and reserves its measured size under [slot] in the nearest [ScaffoldProvider]: the twin of
/// `FloatingLayer` in `@feeef.dev/ui/scaffold`. The layer fills the window and only [child]
/// takes input; position the child yourself (a `Positioned` or an `Align`). A `notice` is placed
/// for you like the web kit's `.lab-floating-layer--notice > *`: centred, the shell gap G above
/// the other bottom chrome, at most the window width minus 24px.
class FloatingLayer extends StatefulWidget {
  const FloatingLayer({
    super.key,
    required this.slot,
    this.active = true,
    this.gap,
    required this.child,
  });

  /// Which reservation the surface counts toward.
  final FloatingSlot slot;

  /// Set false to keep it shown but stop reserving space.
  final bool active;

  /// Extra px added to the reservation, between the surface and the content. Default: the shell
  /// gap G ([SizeTokens.shellGap], 8).
  final double? gap;

  /// The floating surface. Its box (not the layer's) is measured.
  final Widget child;

  @override
  State<FloatingLayer> createState() => _FloatingLayerState();
}

class _FloatingLayerState extends State<FloatingLayer> {
  final _portal = OverlayPortalController();
  final _surface = GlobalKey();
  _ScaffoldProviderState? _provider;

  @override
  void initState() {
    super.initState();
    _portal.show();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final next = context.getInheritedWidgetOfExactType<_ScaffoldScope>()?.state;
    if (next != _provider) {
      _provider?._reserve(this, widget.slot, null);
      _provider = next;
    }
  }

  @override
  void dispose() {
    final provider = _provider;
    if (provider != null && provider.mounted) {
      // Not during the provider's own build: report after this frame.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (provider.mounted) provider._reserve(this, widget.slot, null);
      });
    }
    super.dispose();
  }

  void _measure(BuildContext overlay) {
    final gap = widget.gap ?? ThemeProvider.of(context).sizes.shellGap;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _provider == null) return;
      final box = _surface.currentContext?.findRenderObject() as RenderBox?;
      final host = overlay.findRenderObject() as RenderBox?;
      if (!widget.active ||
          box == null ||
          host == null ||
          !box.attached ||
          !box.hasSize ||
          box.size.isEmpty) {
        _provider!._reserve(this, widget.slot, null);
        return;
      }
      final rect = box.localToGlobal(Offset.zero, ancestor: host) & box.size;
      final view = host.size;
      final size = switch (widget.slot) {
        FloatingSlot.header => rect.bottom,
        FloatingSlot.rail =>
          Directionality.of(context) == TextDirection.rtl
              ? view.width - rect.left
              : rect.right,
        FloatingSlot.player || FloatingSlot.notice => view.height - rect.top,
      };
      _provider!._reserve(
        this,
        widget.slot,
        math.max(0, (size + gap).ceilToDouble()),
      );
    });
  }

  @override
  Widget build(BuildContext context) => OverlayPortal(
    controller: _portal,
    overlayChildBuilder: (overlay) {
      _measure(overlay);
      Widget surface = KeyedSubtree(key: _surface, child: widget.child);
      if (widget.slot == FloatingSlot.notice) {
        final width = MediaQuery.sizeOf(overlay).width;
        surface = Positioned(
          left: 0,
          right: 0,
          bottom:
              ScaffoldProvider.floatingBottomOf(context) +
              ThemeProvider.of(context).sizes.shellGap,
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: math.max(0, width - 24)),
              child: surface,
            ),
          ),
        );
      }
      return GlassLayer(
        child: DefaultTextStyle.merge(
          // `.lab-floating-root`: 13px / 20px in the ink colour.
          style: TextStyle(
            fontSize: 13,
            height: 20 / 13,
            color: ThemeProvider.of(context).colors.ink,
          ),
          child: Stack(fit: StackFit.expand, children: [surface]),
        ),
      );
    },
    child: const SizedBox.shrink(),
  );
}
