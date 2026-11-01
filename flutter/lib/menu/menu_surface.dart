import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../glass/material.dart';
import '../glass/member.dart';
import '../glass/transitions.dart' show glassOriginSprings;
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('minWidth', tokens.minWidth))
      ..add(DoubleProperty('maxWidth', tokens.maxWidth))
      ..add(DoubleProperty('row', tokens.row))
      ..add(DoubleProperty('separator', tokens.separator))
      ..add(DoubleProperty('inset', tokens.inset))
      ..add(DoubleProperty('rowInline', tokens.rowInline))
      ..add(DoubleProperty('radius', tokens.radius, defaultValue: null));
  }

  @override
  bool updateShouldNotify(MenuTokensScope old) => old.tokens != tokens;
}

/// The thick glass menus are made of, for surfaces that paint it themselves (alerts): the
/// container's [GlassKind.menu] material ([glassMenuMaterial]: the full large material at least
/// [glassMenuVeil] veiled and [glassMenuBlur] blurred). `GlassStyle.solid` and more contrast make it
/// opaque. Menus get it from their [GlassContainer].
class MenuMaterial {
  const MenuMaterial._({
    required this.fill,
    required this.filter,
    required this.solid,
    required this.contrast,
  });

  /// The material in [context]'s theme.
  factory MenuMaterial.of(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final solid = glassStyleOf(context) == GlassStyle.solid;
    final material = glassMenuMaterial(
      dark: theme.brightness == Brightness.dark,
    );
    return MenuMaterial._(
      fill: solid ? c.surface : c.surface.withValues(alpha: material.veil),
      filter: ui.ImageFilter.compose(
        outer: ColorFilter.matrix(glassBackdropMatrix(material)),
        inner: ui.ImageFilter.blur(
          sigmaX: glassMenuBlur,
          sigmaY: glassMenuBlur,
        ),
      ),
      solid: solid,
      contrast: glassHighContrastOf(context),
    );
  }

  /// The veil over the blurred backdrop (the surface colour when [solid]).
  final Color fill;

  /// The backdrop filter: blur, then saturation and lift.
  final ui.ImageFilter filter;

  /// Paint [fill] alone, without a backdrop filter.
  final bool solid;

  /// More contrast: an ink outline and no shadow.
  final bool contrast;
}

/// The menu glass's shadow colour ([glassMenuShadow], `--lab-menu-shadow`).
final menuShadowColor = Color.from(
  alpha: glassMenuShadow.alpha,
  red: 0,
  green: 0,
  blue: 0,
);

/// The kit's menu: one glass shape, painted by a [GlassContainer] in the thick menu material (the
/// container's hairline, pointer-following rim light and lens included), born out of the button
/// that opened it ([glassOriginSprings]: a glass button gives its own glass, a plain one a droplet
/// at its centre) with the rows sharpening inside it, and merging back into the button when it
/// closes. The twin of `MenuSurface` in `@feeef.dev/ui/menu`. Put it in an [AnchoredPanel]
/// (`cover: true`) as the panel; outside one it shows at rest. [child] is the rows ([MenuRow],
/// [MenuSeparator], [MenuLabel] or your own); it scrolls when the menu has less room than it needs.
/// Reduced motion shows the glass in place and crossfades the rows; `GlassStyle.solid` and more
/// contrast paint it opaque.
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label, defaultValue: null))
      ..add(DoubleProperty('minWidth', minWidth, defaultValue: 0.0));
  }

  @override
  State<MenuSurface> createState() => _MenuSurfaceState();
}

enum _Phase { opening, open, closing, closed }

class _MenuSurfaceState extends State<MenuSurface>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  final _content = ValueNotifier(
    const MenuContentFrame(opacity: 1, blur: 0, settled: true),
  );
  AnchoredPanelScope? _scope;
  GlassOrigin? _origin;
  _Phase _phase = _Phase.open;
  Motion _motion = Motion.full;
  MenuContentFrame _closingFrom = const MenuContentFrame(
    opacity: 1,
    blur: 0,
    settled: true,
  );

  /// The glass has left (flying back into the trigger).
  bool _leaving = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<_Phase>('phase', _phase))
      ..add(EnumProperty<Motion>('motion', _motion, defaultValue: Motion.full))
      ..add(FlagProperty('anchored', value: _scope != null, ifFalse: 'at rest'))
      ..add(FlagProperty('leaving', value: _leaving, ifTrue: 'leaving'))
      ..add(DoubleProperty('contentOpacity', _content.value.opacity))
      ..add(DoubleProperty('contentBlur', _content.value.blur));
  }

  bool get _reduced => _motion != Motion.full;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _motion = motionOf(context);
    final scope = AnchoredPanelScope.maybeOf(context);
    if (scope == _scope) return;
    _scope?.open.removeListener(_openChanged);
    _scope?.releaseExit();
    _scope = scope;
    if (scope == null) {
      _origin = null;
      _phase = _Phase.open;
      return;
    }
    _origin = GlassOrigin(
      box: () => scope.trigger,
      glass: () => scope.triggerGlass,
    );
    scope.holdExit();
    scope.open.addListener(_openChanged);
    if (scope.open.value) {
      _open();
    } else {
      _phase = _Phase.closed;
      _leaving = true;
    }
  }

  @override
  void dispose() {
    _scope?.open.removeListener(_openChanged);
    _scope?.releaseExit();
    _ticker.dispose();
    _content.dispose();
    super.dispose();
  }

  void _restart() {
    if (_ticker.isActive) _ticker.stop();
    _ticker.start();
  }

  void _open() {
    _phase = _Phase.opening;
    _leaving = false;
    _content.value = menuContentOpenFrame(0, motion: _motion);
    _restart();
  }

  void _openChanged() {
    final scope = _scope;
    if (scope == null) return;
    if (scope.open.value) {
      setState(_open);
      return;
    }
    _closingFrom = _content.value;
    _phase = _Phase.closing;
    // Reduced motion: the glass stays until the rows are gone, then leaves at once.
    if (!_reduced) setState(() => _leaving = true);
    _restart();
  }

  void _tick(Duration elapsed) {
    final scope = _scope;
    final t = elapsed.inMicroseconds / 1e6;
    switch (_phase) {
      case _Phase.opening:
        final frame = menuContentOpenFrame(t, motion: _motion);
        _content.value = frame;
        if (_reduced || t >= MenuMorph.hideTrigger) {
          if (scope?.cover ?? false) scope!.hideTrigger(true);
        }
        if (frame.settled) {
          _phase = _Phase.open;
          _ticker.stop();
        }
      case _Phase.closing:
        final frame = menuContentCloseFrame(t, _closingFrom, motion: _motion);
        _content.value = frame;
        if (_reduced && frame.settled && !_leaving) {
          setState(() => _leaving = true);
        }
        if (_reduced || t >= MenuMorph.revealTrigger) {
          scope?.hideTrigger(false);
        }
        if (t >= menuCloseDuration(_motion) && frame.settled) {
          _phase = _Phase.closed;
          _ticker.stop();
          scope?.exited();
        }
      case _Phase.open:
      case _Phase.closed:
        _ticker.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final tokens = MenuTokens.of(context);
    final radius = tokens.radiusIn(context);

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
      child: GlassContainer(
        material: GlassKind.menu,
        interactive: false,
        adaptive: false,
        child: GlassMemberBox(
          radius: radius,
          hidden: _leaving,
          origin: _origin,
          // A menu always has its container.
          standalone: (child) => child,
          child: ClipRSuperellipse(
            borderRadius: BorderRadius.circular(radius),
            child: ValueListenableBuilder<MenuContentFrame>(
              valueListenable: _content,
              builder: (context, frame, child) {
                final opacity = frame.opacity.clamp(0.0, 1.0);
                if (frame.blur <= 0.05 || opacity <= 0.001) {
                  return Opacity(opacity: opacity, child: child);
                }
                // Blur and fade in one offscreen pass: the opacity rides on the blur's filter as
                // an alpha scale (the matrix works on straight alpha), rather than a second
                // layer over it on every frame of the morph.
                final blur = ui.ImageFilter.blur(
                  sigmaX: frame.blur,
                  sigmaY: frame.blur,
                );
                return ImageFiltered(
                  imageFilter: opacity >= 0.999
                      ? blur
                      : ui.ImageFilter.compose(
                          outer: ColorFilter.matrix([
                            1, 0, 0, 0, 0, //
                            0, 1, 0, 0, 0, //
                            0, 0, 1, 0, 0, //
                            0, 0, 0, opacity, 0, //
                          ]),
                          inner: blur,
                        ),
                  child: child!,
                );
              },
              child: content,
            ),
          ),
        ),
      ),
    );
  }
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
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty(
          'highlighted',
          value: highlighted,
          ifTrue: 'highlighted',
          defaultValue: false,
        ),
      )
      ..add(ColorProperty('fill', fill, defaultValue: null))
      ..add(
        FlagProperty(
          'destructive',
          value: destructive,
          ifTrue: 'destructive',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'enabled',
          value: enabled,
          ifFalse: 'disabled',
          defaultValue: true,
        ),
      )
      ..add(ObjectFlagProperty<VoidCallback?>.has('onTap', onTap))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onHover', onHover));
  }

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
