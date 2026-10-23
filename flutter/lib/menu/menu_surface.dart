import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/material.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import 'anchored_panel.dart';
import 'morph_model.dart';

/// The menu metrics (`--lab-menu-*` in `menu/menu.css`): iOS 26 menus at comfortable density, one
/// step down for compact and thin. Override them for a subtree with [MenuTokensScope].
class MenuTokens {
  const MenuTokens({
    required this.minWidth,
    required this.maxWidth,
    required this.row,
    required this.separator,
    required this.inset,
    required this.rowInline,
    this.radius,
  });

  /// The density's defaults.
  factory MenuTokens.of(BuildContext context) {
    final scoped = context
        .dependOnInheritedWidgetOfExactType<MenuTokensScope>()
        ?.tokens;
    if (scoped != null) return scoped;
    return switch (ThemeProvider.of(context).sizes.density) {
      Density.comfortable => comfortable,
      Density.compact => compact,
      Density.thin => thin,
    };
  }

  static const comfortable = MenuTokens(
    minWidth: 250,
    maxWidth: 360,
    row: 42,
    separator: 21,
    inset: 10,
    rowInline: 14,
  );
  static const compact = MenuTokens(
    minWidth: 220,
    maxWidth: 360,
    row: 34,
    separator: 15,
    inset: 6,
    rowInline: 10,
  );
  static const thin = MenuTokens(
    minWidth: 200,
    maxWidth: 360,
    row: 28,
    separator: 11,
    inset: 4,
    rowInline: 8,
  );

  /// Width bounds, before the room the menu has.
  final double minWidth, maxWidth;

  /// Row height and the height of the band between groups.
  final double row, separator;

  /// Space between the glass edge and the rows, and inside a row.
  final double inset, rowInline;

  /// Corner radius; null is the theme's glass radius (`--lab-radius-glass`).
  final double? radius;

  /// The corner radius in [context]'s theme.
  double radiusIn(BuildContext context) =>
      radius ?? ThemeProvider.of(context).sizes.radiusGlass;
}

/// Replaces the [MenuTokens] for menus below it.
class MenuTokensScope extends InheritedWidget {
  const MenuTokensScope({
    super.key,
    required this.tokens,
    required super.child,
  });
  final MenuTokens tokens;
  @override
  bool updateShouldNotify(MenuTokensScope old) => old.tokens != tokens;
}

/// Menus carry text over anything: their glass is the full regular material (`--lab-menu-tint`).
const double menuGlassTint = 1;

/// The least share of the surface veiling what is under a menu (`--lab-menu-veil`): thicker than
/// the regular material, so content under it never reads as drawn on top of it.
const double menuGlassVeil = 0.88;

/// Backdrop blur of menu glass in px (`--lab-menu-blur`).
const double menuGlassBlur = 20;

/// The kit's menu: one Liquid Glass bubble that grows out of the button that opened it (the button
/// pinches, the bubble springs to the menu's size on `Springs.menu`, the rows sharpen inside it)
/// and flies back into it when it closes. The twin of `MenuSurface` in `@feeef.dev/ui/menu`. Put it
/// in an [AnchoredPanel] (`cover: true`) as the panel; outside one it paints at rest. [child] is
/// the rows ([MenuRow], [MenuSeparator], [MenuLabel] or your own); it scrolls when the menu has
/// less room than it needs. Reduced motion crossfades; `GlassStyle.solid` and more contrast paint
/// it solid.
class MenuSurface extends StatefulWidget {
  const MenuSurface({
    super.key,
    required this.child,
    this.label,
    this.minWidth = 0,
  });

  final Widget child;

  /// Accessible name of the menu.
  final String? label;

  /// A wider minimum than the menu's own, such as the width of the field a select menu covers
  /// (the web kit sets it on the content's class, `.lab-select-menu`). Capped by the room.
  final double minWidth;

  @override
  State<MenuSurface> createState() => _MenuSurfaceState();
}

enum _Phase { pending, opening, open, closing, closed }

class _MenuMorph extends ChangeNotifier {
  _Phase phase = _Phase.pending;
  double t = 0;
  bool reduced = false;
  bool morphing = true;
  double fromRadius = 0;
  double toRadius = 0;
  MenuMorphFrame? closingFrom;
  MenuMorphFrame? last;
  AnchoredGeometry? geometry;

  void ping() => notifyListeners();

  /// The frame for a menu of [size] (in its own pixels) at the current time.
  MenuMorphFrame frame(Size size) {
    final full = Offset.zero & size;
    final g = geometry;
    final from = g != null && g.placed && morphing ? g.anchor : null;
    final radius = math.min(toRadius, size.shortestSide / 2);
    final result = switch (phase) {
      _Phase.pending => MenuMorphFrame(
        box: from ?? full,
        radius: radius,
        contentOpacity: 0,
        contentBlur: 0,
        materialOpacity: 0,
        settled: false,
      ),
      _Phase.opening =>
        reduced || from == null
            ? menuFadeFrame(t, true, full, radius)
            : menuOpenFrame(t, from, fromRadius, full, radius),
      _Phase.open => menuRestFrame(full, radius),
      _Phase.closing =>
        reduced || from == null || closingFrom == null
            ? menuFadeFrame(t, false, full, radius)
            : menuCloseFrame(t, closingFrom!, from, fromRadius),
      _Phase.closed => MenuMorphFrame(
        box: from ?? full,
        radius: radius,
        contentOpacity: 0,
        contentBlur: 0,
        materialOpacity: 0,
        settled: true,
      ),
    };
    last = result;
    return result;
  }
}

class _MenuSurfaceState extends State<MenuSurface>
    with SingleTickerProviderStateMixin {
  final _morph = _MenuMorph();
  late final Ticker _ticker = createTicker(_tick);
  AnchoredPanelScope? _scope;
  Size _size = Size.zero;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = AnchoredPanelScope.maybeOf(context);
    _morph.reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final theme = ThemeProvider.of(context);
    _morph.toRadius = MenuTokens.of(context).radiusIn(context);
    _morph.fromRadius = theme.sizes.radiusControl;
    if (scope == _scope) return;
    _scope?.open.removeListener(_openChanged);
    _scope?.releaseExit();
    _scope = scope;
    if (scope == null) {
      _morph.phase = _Phase.open;
      _morph.last = menuRestFrame(Offset.zero & _size, _morph.toRadius);
      return;
    }
    _morph.geometry = scope.geometry;
    _morph.morphing = true;
    scope.holdExit();
    scope.open.addListener(_openChanged);
    _morph.phase = scope.open.value ? _Phase.pending : _Phase.closed;
    if (scope.open.value) _start();
  }

  @override
  void dispose() {
    _scope?.open.removeListener(_openChanged);
    _scope?.releaseExit();
    _ticker.dispose();
    _morph.dispose();
    super.dispose();
  }

  void _start() {
    if (_ticker.isActive) _ticker.stop();
    _morph.t = 0;
    _ticker.start();
  }

  void _openChanged() {
    final scope = _scope;
    if (scope == null) return;
    if (scope.open.value) {
      _morph.phase = _Phase.pending;
      _start();
      _morph.ping();
      return;
    }
    if (_morph.phase == _Phase.pending) {
      _morph.phase = _Phase.closed;
      scope.hideTrigger(false);
      _ticker.stop();
      scope.exited();
      return;
    }
    _morph.closingFrom =
        _morph.last ?? menuRestFrame(Offset.zero & _size, _morph.toRadius);
    _morph.phase = _Phase.closing;
    _start();
    _morph.ping();
  }

  void _tick(Duration elapsed) {
    final scope = _scope;
    _morph.t = elapsed.inMicroseconds / 1e6;
    switch (_morph.phase) {
      case _Phase.pending:
        if (scope?.geometry.placed ?? true) {
          final anchor = scope?.geometry.anchor;
          if (anchor != null) {
            _morph.fromRadius = math.min(
              _morph.fromRadius,
              anchor.shortestSide / 2,
            );
          }
          _morph.phase = _Phase.opening;
          _ticker.stop();
          _morph.t = 0;
          _ticker.start();
        }
      case _Phase.opening:
        final frame = _morph.frame(_size);
        if (_morph.reduced || _morph.t >= MenuMorph.hideTrigger) {
          if (scope?.cover ?? false) scope!.hideTrigger(true);
        }
        if (frame.settled) {
          _morph.phase = _Phase.open;
          _ticker.stop();
        }
      case _Phase.closing:
        final frame = _morph.frame(_size);
        if (_morph.reduced || _morph.t >= MenuMorph.revealTrigger) {
          scope?.hideTrigger(false);
        }
        if (frame.settled) {
          _morph.phase = _Phase.closed;
          _ticker.stop();
          scope?.exited();
        }
      case _Phase.open:
      case _Phase.closed:
        _ticker.stop();
    }
    _morph.ping();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final tokens = MenuTokens.of(context);
    final dark = theme.brightness == Brightness.dark;
    final solid = glassStyleOf(context) == GlassStyle.solid;
    final contrast = glassHighContrastOf(context);
    final material = glassMaterial(
      menuGlassTint,
      dark: dark,
      size: GlassSize.large,
    );
    final fill = solid
        ? c.surface
        : c.surface.withValues(alpha: math.max(material.veil, menuGlassVeil));
    final filter = ui.ImageFilter.compose(
      outer: ColorFilter.matrix(glassBackdropMatrix(material)),
      inner: ui.ImageFilter.blur(sigmaX: menuGlassBlur, sigmaY: menuGlassBlur),
    );
    final clipper = _BubbleClipper(_morph);

    final content = LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = math.min(tokens.maxWidth, constraints.maxWidth);
        return ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: math.min(
              math.max(tokens.minWidth, widget.minWidth),
              maxWidth,
            ),
            maxWidth: maxWidth,
            maxHeight: constraints.maxHeight,
          ),
          child: IntrinsicWidth(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(tokens.inset),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  fontSize: 14,
                  height: 20 / 14,
                  leadingDistribution: TextLeadingDistribution.even,
                  color: c.ink,
                ),
                child: IconTheme.merge(
                  data: IconThemeData(color: c.ink, size: 18),
                  child: widget.child,
                ),
              ),
            ),
          ),
        );
      },
    );

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: _SizeProbe(
        onSize: (size) => _size = size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _ShadowPainter(_morph, contrast ? null : _menuShadow),
              ),
            ),
            Positioned.fill(
              child: ListenableBuilder(
                listenable: _morph,
                builder: (context, child) {
                  final opacity = _morph.last?.materialOpacity ?? 0;
                  return Opacity(
                    opacity: opacity.clamp(0.0, 1.0),
                    child: child,
                  );
                },
                child: ClipPath(
                  clipper: clipper,
                  child: solid
                      ? CustomPaint(painter: _FillPainter(_morph, fill))
                      : BackdropFilter(
                          filter: filter,
                          child: CustomPaint(
                            painter: _FillPainter(_morph, fill),
                          ),
                        ),
                ),
              ),
            ),
            ClipPath(
              clipper: clipper,
              child: ListenableBuilder(
                listenable: _morph,
                builder: (context, child) {
                  final frame = _morph.last;
                  final opacity = (frame?.contentOpacity ?? 0).clamp(0.0, 1.0);
                  final blur = frame?.contentBlur ?? 0;
                  Widget out = child!;
                  if (blur > 0.05) {
                    out = ImageFiltered(
                      imageFilter: ui.ImageFilter.blur(
                        sigmaX: blur,
                        sigmaY: blur,
                      ),
                      child: out,
                    );
                  }
                  return Opacity(opacity: opacity, child: out);
                },
                child: content,
              ),
            ),
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _EdgePainter(
                    _morph,
                    line: contrast ? c.ink : c.line,
                    light: c.glassEdgeLow,
                    shade: contrast,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `--lab-menu-shadow: 0 14px 40px -12px rgb(0 0 0 / 24%)`.
const _menuShadow = Color.from(alpha: 0.24, red: 0, green: 0, blue: 0);

/// Reports its size after layout without rebuilding.
class _SizeProbe extends SingleChildRenderObjectWidget {
  const _SizeProbe({required this.onSize, super.child});
  final ValueChanged<Size> onSize;
  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSizeProbe(onSize);
  @override
  void updateRenderObject(
    BuildContext context,
    _RenderSizeProbe renderObject,
  ) => renderObject.onSize = onSize;
}

class _RenderSizeProbe extends RenderProxyBox {
  _RenderSizeProbe(this.onSize);
  ValueChanged<Size> onSize;
  @override
  void performLayout() {
    super.performLayout();
    onSize(size);
  }
}

Path _bubble(MenuMorphFrame frame) => superellipsePath(frame.box, [
  frame.radius,
  frame.radius,
  frame.radius,
  frame.radius,
]);

class _BubbleClipper extends CustomClipper<Path> {
  _BubbleClipper(this.morph) : super(reclip: morph);
  final _MenuMorph morph;
  @override
  Path getClip(Size size) => _bubble(morph.frame(size));
  @override
  bool shouldReclip(_BubbleClipper old) => old.morph != morph;
}

class _FillPainter extends CustomPainter {
  _FillPainter(this.morph, this.fill) : super(repaint: morph);
  final _MenuMorph morph;
  final Color fill;
  @override
  void paint(Canvas canvas, Size size) =>
      canvas.drawPath(_bubble(morph.frame(size)), Paint()..color = fill);
  @override
  bool shouldRepaint(_FillPainter old) => old.fill != fill;
}

class _ShadowPainter extends CustomPainter {
  _ShadowPainter(this.morph, this.color) : super(repaint: morph);
  final _MenuMorph morph;
  final Color? color;
  @override
  void paint(Canvas canvas, Size size) {
    final color = this.color;
    final frame = morph.frame(size);
    if (color == null || frame.materialOpacity <= 0) return;
    final shape = _bubble(frame);
    final spread = frame.box.deflate(12);
    if (spread.isEmpty) return;
    // A box shadow is never drawn under its box: paint it on a layer and clear the shape (a
    // difference clip is not reliable on every backend; the glass above would show it).
    canvas.saveLayer(frame.box.inflate(80), Paint());
    canvas.drawPath(
      superellipsePath(spread, List.filled(4, math.max(0, frame.radius - 12)))
          .shift(const Offset(0, 14)),
      Paint()
        ..color = color.withValues(alpha: color.a * frame.materialOpacity)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20),
    );
    canvas.drawPath(shape, Paint()..blendMode = BlendMode.clear);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ShadowPainter old) => old.color != color;
}

/// The rim: a 1px line and `--lab-glass-light` (edge-low along the top, 6 % black along the
/// bottom, inside the line).
class _EdgePainter extends CustomPainter {
  _EdgePainter(
    this.morph, {
    required this.line,
    required this.light,
    required this.shade,
  }) : super(repaint: morph);
  final _MenuMorph morph;
  final Color line, light;
  final bool shade;

  @override
  void paint(Canvas canvas, Size size) {
    final frame = morph.frame(size);
    final o = frame.materialOpacity.clamp(0.0, 1.0);
    if (o <= 0) return;
    final r = List.filled(4, frame.radius);
    if (!shade) {
      final inner = superellipsePath(frame.box, r, inset: 1);
      canvas.save();
      canvas.clipPath(inner);
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, 1)),
        ),
        Paint()..color = light.withValues(alpha: light.a * o),
      );
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, -1)),
        ),
        Paint()..color = Color.from(alpha: 0.06 * o, red: 0, green: 0, blue: 0),
      );
      canvas.restore();
    }
    canvas.drawPath(
      superellipsePath(frame.box, r, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = line.withValues(alpha: line.a * o),
    );
  }

  @override
  bool shouldRepaint(_EdgePainter old) =>
      old.line != line || old.light != light || old.shade != shade;
}

/// One row of a [MenuSurface] (`.lab-menu__item`): the menu's row height (44 on touch), inline
/// padding, an 18px leading slot, the label, an optional trailing widget; highlighted rows get an
/// ink wash with corners inset from the menu's. Destructive rows are red.
class MenuRow extends StatelessWidget {
  const MenuRow({
    super.key,
    this.leading,
    required this.label,
    this.trailing,
    this.highlighted = false,
    this.fill,
    this.destructive = false,
    this.enabled = true,
    this.onTap,
    this.onHover,
  });

  /// 18px slot before the label (an icon, a check); omit to drop the slot.
  final Widget? leading;
  final Widget label;
  final Widget? trailing;

  /// Keyboard or pointer highlight.
  final bool highlighted;

  /// Overrides the resting/highlight fill (for selected options).
  final Color? fill;
  final bool destructive, enabled;
  final VoidCallback? onTap;
  final VoidCallback? onHover;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final tokens = MenuTokens.of(context);
    final ink = destructive ? c.danger : c.ink;
    final background =
        fill ??
        (highlighted ? c.ink.withValues(alpha: 0.08) : const Color(0x00000000));
    final height = theme.coarsePointer(context)
        ? math.max(tokens.row, 44.0)
        : tokens.row;
    Widget row = DecoratedBox(
      decoration: ShapeDecoration(
        color: background,
        shape: SuperellipseBorder(
          radius: math.max(0, tokens.radiusIn(context) - tokens.inset),
        ),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: height),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.rowInline),
          child: IconTheme.merge(
            data: IconThemeData(size: 18, color: ink),
            child: DefaultTextStyle.merge(
              style: TextStyle(color: ink),
              child: Row(
                spacing: 12,
                children: [
                  if (leading != null)
                    SizedBox.square(
                      dimension: 18,
                      child: Center(child: leading),
                    ),
                  Expanded(child: CssBaseline(lineHeight: 20, child: label)),
                  ?trailing,
                ],
              ),
            ),
          ),
        ),
      ),
    );
    if (!enabled) row = Opacity(opacity: 0.5, child: row);
    return MouseRegion(
      onEnter: enabled && onHover != null ? (_) => onHover!() : null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: enabled ? onTap : null,
        child: row,
      ),
    );
  }
}

/// The band between groups of a [MenuSurface] (`.lab-menu__separator`): the separator token's
/// height with a hairline in its middle, inset 24px from the glass edge.
class MenuSeparator extends StatelessWidget {
  const MenuSeparator({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = MenuTokens.of(context);
    final c = ThemeProvider.of(context).colors;
    final inset = math.max(0.0, 24 - tokens.inset);
    return ExcludeSemantics(
      child: SizedBox(
        height: tokens.separator,
        child: Center(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: inset),
            child: SizedBox(
              height: 1,
              width: double.infinity,
              child: ColoredBox(color: c.line),
            ),
          ),
        ),
      ),
    );
  }
}

/// A group heading in a [MenuSurface] (`.lab-menu__label`): 12/16, muted.
class MenuLabel extends StatelessWidget {
  const MenuLabel({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = MenuTokens.of(context);
    final c = ThemeProvider.of(context).colors;
    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.rowInline, 6, tokens.rowInline, 2),
      child: DefaultTextStyle.merge(
        style: TextStyle(fontSize: 12, height: 16 / 12, color: c.muted),
        child: CssBaseline(lineHeight: 16, child: child),
      ),
    );
  }
}
