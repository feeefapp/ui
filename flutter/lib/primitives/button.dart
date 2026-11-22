import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind, kPrimaryButton;
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_loader.dart';
import '../brand/pixel_texture.dart';
import '../glass/container.dart' show GlassMember;
import '../glass/press.dart';
import '../icons/lucide.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/raster.dart';
import '../theme/surfaces.dart';
import 'lens.dart';
import 'lens_model.dart';
import 'square_slot.dart';
import 'touch_target.dart';
import 'tooltip.dart';

/// Emphasis. Use filled for primary actions (the twin of `ButtonVariant` in the web kit).
enum ButtonVariant {
  filled,
  tonal,
  elevated,
  outlined,
  text,
  destructive,
  ghost,
}

/// Height: `small` 30px, `regular` 36px, `large` 52px (iOS control sizes, density-scaled),
/// `inline` fits running text; `icon` is square.
enum ControlSize { small, regular, large, inline, icon }

/// Toolbar controls share their enclosing material instead of adding another raised surface.
enum ButtonAppearance { defaultAppearance, toolbar }

/// Sizes a host imposes on the controls inside it, like the CSS custom properties a toolbar group
/// sets (`--lab-control-height`, the control radius): regular controls take [height], every
/// control takes [radius].
class ControlOverrides extends InheritedWidget {
  const ControlOverrides({
    super.key,
    this.height,
    this.radius,
    this.pressedFill,
    this.pressedEdge,
    this.touchTarget,
    this.fill,
    this.hoverFill,
    this.activeFill,
    this.ink,
    required super.child,
  });
  final double? height, radius;

  /// Paint a host gives its controls at rest, hovered and while held, and their ink: the web kit's
  /// `--lab-control-fill`, `--lab-control-fill-hover`, `--lab-control-fill-pressed` and `color`
  /// (a composer's × badge over a photo). Toggled-on controls keep [pressedFill].
  final Color? fill, hoverFill, activeFill, ink;

  /// The smallest height on touch screens inside this host (`--lab-control-touch-target`); a
  /// toolbar bubble sets its own control height, since the bubble is the target. Null: 44.
  final double? touchTarget;

  /// Fill and edge of toggled-on (pressed) controls, such as an actions bar's checked toggle.
  final Color? pressedFill, pressedEdge;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('height', height, defaultValue: null))
      ..add(DoubleProperty('radius', radius, defaultValue: null))
      ..add(ColorProperty('fill', fill, defaultValue: null))
      ..add(ColorProperty('hoverFill', hoverFill, defaultValue: null))
      ..add(ColorProperty('activeFill', activeFill, defaultValue: null))
      ..add(ColorProperty('ink', ink, defaultValue: null))
      ..add(DoubleProperty('touchTarget', touchTarget, defaultValue: null))
      ..add(ColorProperty('pressedFill', pressedFill, defaultValue: null))
      ..add(ColorProperty('pressedEdge', pressedEdge, defaultValue: null));
  }

  static ControlOverrides? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ControlOverrides>();

  /// These overrides on top of the enclosing ones.
  static Widget merge(
    BuildContext context, {
    double? height,
    double? radius,
    Color? pressedFill,
    Color? pressedEdge,
    double? touchTarget,
    Color? fill,
    Color? hoverFill,
    Color? activeFill,
    Color? ink,
    required Widget child,
  }) {
    final outer = maybeOf(context);
    return ControlOverrides(
      height: height ?? outer?.height,
      radius: radius ?? outer?.radius,
      pressedFill: pressedFill ?? outer?.pressedFill,
      pressedEdge: pressedEdge ?? outer?.pressedEdge,
      touchTarget: touchTarget ?? outer?.touchTarget,
      fill: fill ?? outer?.fill,
      hoverFill: hoverFill ?? outer?.hoverFill,
      activeFill: activeFill ?? outer?.activeFill,
      ink: ink ?? outer?.ink,
      child: child,
    );
  }

  @override
  bool updateShouldNotify(ControlOverrides old) =>
      old.height != height ||
      old.radius != radius ||
      old.touchTarget != touchTarget ||
      old.pressedFill != pressedFill ||
      old.pressedEdge != pressedEdge ||
      old.fill != fill ||
      old.hoverFill != hoverFill ||
      old.activeFill != activeFill ||
      old.ink != ink;
}

/// A button painted by one of the emphasis variants: the Flutter twin of `Button` in
/// `@feeef.dev/ui/primitives/button`. Same props, same sizes, same colours (checked against the
/// browser in `test/tokens_test.dart`), same superellipse corners. A press answers like iOS:
/// toolbar (glass) buttons swell and glow under the finger, filled, tonal, elevated, outlined and
/// destructive buttons grow a little; inside a glass bubble the bubble answers instead. Reduced
/// motion turns it off. On touch screens a button keeps its size and reaches 44 × 44 px
/// ([TouchTarget]).
class Button extends StatefulWidget {
  const Button({
    super.key,
    this.variant = ButtonVariant.text,
    this.controlSize = ControlSize.regular,
    this.iconSize = ControlSize.regular,
    this.appearance = ButtonAppearance.defaultAppearance,
    this.loading = false,
    this.disabled = false,
    this.pressed,
    this.current = false,
    this.onClick,
    this.ariaLabel,
    this.focusNode,
    this.autofocus = false,
    this.padding,
    this.gap = 6,
    this.alignment,
    required this.children,
  });

  /// Emphasis. Use filled for primary actions.
  final ButtonVariant variant;

  /// Height: `small` 30px, `regular` 36px, `large` 52px, `inline` fits running text; `icon` is
  /// square.
  final ControlSize controlSize;

  /// Square icon geometry when [controlSize] is `icon`: `small` 30px, `regular` 36px, `large` 52px.
  final ControlSize iconSize;

  /// Toolbar controls share their enclosing material instead of adding another raised surface.
  final ButtonAppearance appearance;

  /// Shows a loader, sets busy semantics and blocks activation until it clears.
  final bool loading;

  /// Blocks activation and dims the button.
  final bool disabled;

  /// Toggle state (`aria-pressed` / `data-state="on"`): paints the selected surface.
  final bool? pressed;

  /// The current page (`aria-current="page"`): paints the selected surface like [pressed] and is
  /// announced as selected, not as a toggle (a navigation item, a link button).
  final bool current;

  final VoidCallback? onClick;

  /// Accessible name when the content is not text (icon-only buttons).
  final String? ariaLabel;

  final FocusNode? focusNode;
  final bool autofocus;

  /// Inline padding inside the 1px border, where a component's CSS overrides the control's
  /// (`.lab-nav-back` is `padding-inline: 6px 12px`). Null keeps the size's padding.
  final EdgeInsetsDirectional? padding;

  /// Space between the content's icons and text.
  final double gap;

  /// Fills the available width with the content placed here (a full-width row such as a
  /// navigation item); null shrink-wraps the content, centred.
  final AlignmentDirectional? alignment;

  /// Content: icons and text, laid out in a row. A [Text] child is the label: in a bounded width
  /// it shrinks and ends in an ellipsis on one line, while icons keep their size.
  final List<Widget> children;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        EnumProperty<ButtonVariant>(
          'variant',
          variant,
          defaultValue: ButtonVariant.text,
        ),
      )
      ..add(
        EnumProperty<ControlSize>(
          'controlSize',
          controlSize,
          defaultValue: ControlSize.regular,
        ),
      )
      ..add(
        EnumProperty<ControlSize>(
          'iconSize',
          iconSize,
          defaultValue: ControlSize.regular,
        ),
      )
      ..add(
        EnumProperty<ButtonAppearance>(
          'appearance',
          appearance,
          defaultValue: ButtonAppearance.defaultAppearance,
        ),
      )
      ..add(FlagProperty('loading', value: loading, ifTrue: 'loading'))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(DiagnosticsProperty<bool>('pressed', pressed, defaultValue: null))
      ..add(FlagProperty('current', value: current, ifTrue: 'current'))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onClick', onClick))
      ..add(StringProperty('ariaLabel', ariaLabel, defaultValue: null))
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      )
      ..add(FlagProperty('autofocus', value: autofocus, ifTrue: 'autofocus'))
      ..add(
        DiagnosticsProperty<EdgeInsetsDirectional>(
          'padding',
          padding,
          defaultValue: null,
        ),
      )
      ..add(DoubleProperty('gap', gap, defaultValue: 6.0))
      ..add(
        DiagnosticsProperty<AlignmentDirectional>(
          'alignment',
          alignment,
          defaultValue: null,
        ),
      );
  }

  @override
  State<Button> createState() => _ButtonState();
}

/// How a button answers a press (the web kit's `data-press`).
enum _Press { none, glass, content }

class _ButtonState extends State<Button> {
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

  // Press response: scale (1 at rest), the glow's reach and strength, where it is.
  final _scale = MotionValue(1, 0.0005);
  final _glowRadius = MotionValue(glassGlowStart, 0.5);
  final _glowOpacity = MotionValue(0, 0.005);
  final _pressMotion = _PressMotion();
  final _unsubscribe = <void Function()>[];
  Offset _glowAt = Offset.zero;
  int? _pressPointer;
  _Press _press = _Press.none;

  @override
  void initState() {
    super.initState();
    for (final value in [_scale, _glowRadius, _glowOpacity]) {
      _unsubscribe.add(value.subscribe((_) => _pressMotion.changed()));
    }
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    for (final value in [_scale, _glowRadius, _glowOpacity]) {
      value.stop();
    }
    _pressMotion.dispose();
    super.dispose();
  }

  /// The press response for this button here: glass for toolbar buttons (liquid glass only),
  /// a small grow for painted buttons in content, nothing inside a glass bubble (the bubble
  /// answers), with reduced motion or while it can't be pressed.
  _Press _pressFor(BuildContext context, bool interactive) {
    final reduced = reducedMotionOf(context);
    if (!interactive || reduced || GlassMember.of(context) != null) {
      return _Press.none;
    }
    if (widget.appearance == ButtonAppearance.toolbar) {
      // The app's glass style: more contrast keeps the swell but drops the glow (below).
      return glassStyleOf(context) == GlassStyle.liquid
          ? _Press.glass
          : _Press.none;
    }
    return switch (widget.variant) {
      ButtonVariant.filled ||
      ButtonVariant.tonal ||
      ButtonVariant.elevated ||
      ButtonVariant.outlined ||
      ButtonVariant.destructive => _Press.content,
      _ => _Press.none,
    };
  }

  void _pressIn(PointerDownEvent event) {
    if (_press == _Press.none || _pressPointer != null) return;
    if (event.kind == PointerDeviceKind.mouse &&
        event.buttons != kPrimaryButton) {
      return;
    }
    _pressPointer = event.pointer;
    final glass = _press == _Press.glass;
    _scale.animateTo(
      glass ? glassPressScale : contentPressScale,
      spring: Springs.snappy,
    );
    if (glass) {
      _glowAt = event.localPosition;
      _glowRadius.set(glassGlowStart);
      _glowOpacity.set(1);
      _glowRadius.animateTo(
        glassGlowRadius(context.size?.width ?? 0),
        spring: Springs.smooth,
      );
    }
  }

  void _pressOut(PointerEvent event) {
    if (event.pointer != _pressPointer) return;
    _pressPointer = null;
    _scale.animateTo(1, spring: Springs.bouncy);
    _glowOpacity.animateTo(0, spring: Springs.smooth);
  }

  bool get _blocked =>
      widget.disabled || widget.loading || widget.onClick == null;

  void _activate() {
    if (_blocked) return;
    widget.onClick?.call();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final icon = widget.controlSize == ControlSize.icon;
    // The size whose tokens apply: an icon button takes its iconSize.
    final size = icon ? widget.iconSize : widget.controlSize;
    final toolbar = widget.appearance == ButtonAppearance.toolbar;

    // Paint recipe: the shared variants, plus destructive and ghost from system.css.
    late VariantPaint paint;
    var ink = c.ink;
    var raised = false;
    switch (widget.variant) {
      case ButtonVariant.filled:
        paint = c.variant(ControlVariant.filled);
        ink = paint.ink;
        raised = true;
      case ButtonVariant.tonal:
        paint = c.variant(ControlVariant.tonal);
      case ButtonVariant.elevated:
        paint = c.variant(ControlVariant.elevated);
        raised = true;
      case ButtonVariant.outlined:
        paint = c.variant(ControlVariant.outlined);
        ink = c.focus;
      case ButtonVariant.text:
        paint = c.variant(ControlVariant.text);
        ink = c.focus;
      case ButtonVariant.destructive:
        // Prominent glass in the danger colour (below).
        paint = VariantPaint(
          fill: c.danger,
          hover: c.danger,
          pressed: c.danger,
          edge: const Color(0x00000000),
          ink: c.onDanger,
        );
        ink = c.onDanger;
      case ButtonVariant.ghost:
        paint = VariantPaint(
          fill: transparent,
          hover: c.controlHover,
          pressed: c.controlPressed,
          edge: transparent,
          ink: c.ink,
        );
    }
    // Filled (primary) and destructive buttons are iOS 27's prominent glass (FIGMA-27.md): the
    // tint, a bright inner rim at top and bottom, a shaded upper third, a lighter lower edge, the
    // faint glass shadow and two side slivers. They stay prominent in toolbars.
    final prominent =
        widget.variant == ButtonVariant.filled ||
        widget.variant == ButtonVariant.destructive;
    if (prominent) {
      final tint = widget.variant == ButtonVariant.destructive
          ? c.danger
          : c.primary;
      paint = VariantPaint(
        fill: tint,
        hover: mixSrgb(tint, 0.92, const Color(0xFFFFFFFF)),
        pressed: mixSrgb(tint, 0.88, const Color(0xFF000000)),
        edge: const Color(0x00000000),
        ink: paint.ink,
      );
      raised = false;
    }
    if (toolbar && !prominent) {
      paint = VariantPaint(
        fill: transparent,
        hover: paint.hover,
        pressed: paint.pressed,
        edge: transparent,
        ink: paint.ink,
      );
      raised = false;
    }
    final overrides = ControlOverrides.maybeOf(context);
    if (overrides != null &&
        (overrides.fill ??
                overrides.hoverFill ??
                overrides.activeFill ??
                overrides.ink) !=
            null) {
      paint = VariantPaint(
        fill: overrides.fill ?? paint.fill,
        hover: overrides.hoverFill ?? paint.hover,
        pressed: overrides.activeFill ?? paint.pressed,
        edge: paint.edge,
        ink: overrides.ink ?? paint.ink,
      );
      ink = overrides.ink ?? ink;
    }
    final selected = widget.pressed == true || widget.current;
    if (selected) {
      final fill = overrides?.pressedFill;
      paint = VariantPaint(
        fill: fill ?? c.controlSelected,
        hover: fill ?? mixSrgb(c.primary, 0.30, c.surface),
        pressed: fill ?? mixSrgb(c.primary, 0.36, c.surface),
        edge: overrides?.pressedEdge ?? mixSrgb(c.primary, 0.38, c.line),
        ink: c.ink,
      );
      ink = c.ink;
      raised = false;
    }
    final interactive = !widget.disabled && !widget.loading;
    _press = _pressFor(context, interactive && widget.onClick != null);
    final fill = interactive && _down
        ? paint.pressed
        // Keyboard focus also shows the hover fill (`:focus-visible`).
        : interactive && (_hovered || _focusVisible)
        ? paint.hover
        : paint.fill;

    // A host (toolbar group, dock) sets the regular height; small and large keep their tokens.
    final regular = overrides?.height ?? s.controlHeight;
    final height = switch (size) {
      ControlSize.small => s.controlSmall,
      ControlSize.large => s.controlLarge,
      _ => regular,
    };
    // Touch keeps 44px targets without growing (TouchTarget), except inside a toolbar bubble,
    // where the bubble is the target.
    final touch = overrides?.touchTarget ?? s.touchTarget;
    // A capsule: half the control's height, times the radius scale.
    final radius = overrides?.radius ?? height / 2 * s.radiusScale;
    final fontSize = switch (size) {
      ControlSize.small => s.controlFontSmall,
      ControlSize.large => s.controlFontLarge,
      _ => s.controlFont,
    };
    final lineHeight = SizeTokens.controlLine(fontSize);
    final padX = switch (size) {
      ControlSize.small => s.controlPaddingSmall,
      ControlSize.large => s.controlPaddingLarge,
      _ => s.controlPadding,
    };

    final slotStart =
        widget.children.isNotEmpty && widget.children.first is SquareSlot;
    final slotEnd =
        widget.children.isNotEmpty && widget.children.last is SquareSlot;

    // Text labels give way when the button's width is bounded (a dock, a toolbar, a narrow
    // phone) and end in an ellipsis; icons keep their size. Loose flex shrink-wraps when the
    // width is unbounded, so nothing changes where the label fits.
    // While loading, the loader takes the leading icon's place (a first child that is not text,
    // before more content), like the web kit's button.
    final leadingIcon =
        widget.loading &&
        widget.children.length > 1 &&
        widget.children.first is! Text &&
        widget.children.first is! RichText;
    final shown = leadingIcon ? widget.children.skip(1) : widget.children;
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      spacing: widget.gap,
      children: [
        if (widget.loading) PixelLoader(size: 16, decorative: true, color: ink),
        if (!(widget.loading && icon))
          for (final child in shown)
            child is Text || child is RichText ? Flexible(child: child) : child,
      ],
    );

    Widget result = _ButtonPaint(
      fill: fill,
      edge: paint.edge,
      radius: radius,
      raised: raised && !(interactive && _down),
      texture: widget.variant == ButtonVariant.filled ? ink : null,
      prominent: prominent && !selected,
      shadow: c.glassShadowColor,
      pressedInset: interactive && _down,
      highlight: c.controlHighlight,
      depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
      focus: _focusVisible ? FocusRingStyle.of(context) : null,
      child: SizedBox(
        height: height,
        width: icon
            ? height
            : (widget.alignment != null ? double.infinity : null),
        child: _PressGlow(
          // A pressed glass button glows under the finger, over its fill, under its content.
          visible: _press == _Press.glass && !glassHighContrastOf(context),
          motion: _pressMotion,
          radius: radius,
          color: c.glassGlow,
          at: () => _glowAt,
          glowRadius: _glowRadius.get,
          opacity: _glowOpacity.get,
          child: Padding(
            // CSS boxes are border-box with a 1px border: it adds to the padding. A SquareSlot
            // at either end replaces that side's padding and border (square-slot.css).
            padding: icon
                ? EdgeInsetsDirectional.zero
                : EdgeInsetsDirectional.only(
                    start: slotStart ? 0 : (widget.padding?.start ?? padX) + 1,
                    end: slotEnd ? 0 : (widget.padding?.end ?? padX) + 1,
                  ),
            child: Align(
              alignment: widget.alignment ?? Alignment.center,
              widthFactor: widget.alignment != null ? null : 1,
              child: IconTheme.merge(
                data: IconThemeData(
                  size: size == ControlSize.small ? 18 : (icon ? 20 : 18),
                  color: ink,
                ),
                child: DefaultTextStyle.merge(
                  style: TextStyle(
                    fontSize: fontSize,
                    height: lineHeight / fontSize,
                    leadingDistribution: TextLeadingDistribution.even,
                    fontWeight: FontWeight.w400,
                    color: ink,
                  ),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                  // Icons in controls use a 1.75 stroke (`.lab-control[data-variant] svg.lucide`).
                  child: LucideStroke(
                    width: 1.75,
                    // Square slots are the button's height with an icon button's icon size.
                    child: SquareSlotScope(
                      size: height,
                      iconSize: size == ControlSize.small ? 18 : 20,
                      child: CssBaseline(
                        lineHeight: lineHeight,
                        child: content,
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
    // The press scale, around the centre (the web kit's `scale` on `:active`).
    result = ListenableBuilder(
      listenable: _pressMotion,
      builder: (context, child) {
        final scale = _scale.get();
        return scale == 1
            ? child!
            : Transform.scale(scale: scale, child: child);
      },
      child: result,
    );

    result = AnimatedOpacity(
      // [data-loading] (0.78) is declared after :disabled (0.42) in system.css, so it wins.
      opacity: widget.loading
          ? 0.78
          : widget.disabled
          ? 0.42
          : 1,
      duration: const Duration(milliseconds: 140),
      child: result,
    );
    return Semantics(
      // Its own node: a group's name never merges into the button's.
      container: true,
      button: true,
      enabled: interactive,
      toggled: widget.pressed,
      selected: widget.current ? true : null,
      label: widget.ariaLabel,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        autofocus: widget.autofocus,
        enabled: !widget.disabled,
        mouseCursor: _blocked
            ? SystemMouseCursors.forbidden
            : SystemMouseCursors.click,
        onShowHoverHighlight: (value) => setState(() => _hovered = value),
        onShowFocusHighlight: (value) => setState(() => _focusVisible = value),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => _activate(),
          ),
        },
        child: TouchTarget(
          minSize: touch,
          child: Listener(
            onPointerDown: _pressIn,
            onPointerUp: _pressOut,
            onPointerCancel: _pressOut,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapDown: interactive
                  ? (_) => setState(() => _down = true)
                  : null,
              onTapUp: interactive
                  ? (_) => setState(() => _down = false)
                  : null,
              onTapCancel: interactive
                  ? () => setState(() => _down = false)
                  : null,
              onTap: interactive ? _activate : null,
              child: result,
            ),
          ),
        ),
      ),
    );
  }
}

/// Notifies the press painters whenever a press value moves.
class _PressMotion extends ChangeNotifier {
  void changed() => notifyListeners();
}

/// The touch glow of a pressed glass button ([LensPaint.paintGlow]), painted before [child]: over
/// the button's fill, under its content, like the web kit's `.lab-control[data-press='glass']::after`.
class _PressGlow extends StatelessWidget {
  const _PressGlow({
    required this.visible,
    required this.motion,
    required this.radius,
    required this.color,
    required this.at,
    required this.glowRadius,
    required this.opacity,
    required this.child,
  });
  final bool visible;
  final Listenable motion;
  final double radius;
  final Color color;
  final Offset Function() at;
  final double Function() glowRadius, opacity;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('visible', value: visible, ifFalse: 'hidden'))
      ..add(DiagnosticsProperty<Listenable>('motion', motion))
      ..add(DoubleProperty('radius', radius))
      ..add(ColorProperty('color', color))
      ..add(ObjectFlagProperty<Offset Function()>.has('at', at))
      ..add(ObjectFlagProperty<double Function()>.has('glowRadius', glowRadius))
      ..add(ObjectFlagProperty<double Function()>.has('opacity', opacity));
  }

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: visible ? _PressGlowPainter(this) : null,
    child: child,
  );
}

class _PressGlowPainter extends CustomPainter {
  _PressGlowPainter(this.glow) : super(repaint: glow.motion);
  final _PressGlow glow;

  @override
  void paint(Canvas canvas, Size size) {
    final r = glow.radius;
    LensPaint.paintGlow(
      canvas,
      superellipsePath(Offset.zero & size, [r, r, r, r]),
      glow.color,
      glow.at(),
      glow.glowRadius(),
      glow.opacity(),
    );
  }

  @override
  bool shouldRepaint(_PressGlowPainter old) =>
      old.glow.radius != glow.radius || old.glow.color != glow.color;
}

/// Paints the button surface like the CSS: superellipse fill, 1px inside edge, the raised shadow
/// (`inset 0 1px 0 highlight, 0 2px 6px depth`, CSS blur → sigma = blur / 2), the pressed inset
/// shadow and the keyboard focus ring hugging it. Colours ease over 140ms like the CSS transitions.
class _ButtonPaint extends StatelessWidget {
  const _ButtonPaint({
    required this.fill,
    required this.edge,
    required this.radius,
    required this.raised,
    required this.pressedInset,
    required this.highlight,
    required this.depth,
    required this.focus,
    required this.child,
    this.texture,
    this.prominent = false,
    this.shadow = const Color(0x00000000),
  });

  final Color fill, edge, highlight, shadow;
  final Color? texture;
  final double radius, depth;
  final bool raised, pressedInset, prominent;
  final FocusRingStyle? focus;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ColorProperty('fill', fill))
      ..add(ColorProperty('edge', edge))
      ..add(ColorProperty('highlight', highlight))
      ..add(
        ColorProperty('shadow', shadow, defaultValue: const Color(0x00000000)),
      )
      ..add(ColorProperty('texture', texture, defaultValue: null))
      ..add(DoubleProperty('radius', radius))
      ..add(DoubleProperty('depth', depth))
      ..add(FlagProperty('raised', value: raised, ifTrue: 'raised'))
      ..add(
        FlagProperty(
          'pressedInset',
          value: pressedInset,
          ifTrue: 'pressed inset',
        ),
      )
      ..add(FlagProperty('prominent', value: prominent, ifTrue: 'prominent'))
      ..add(
        DiagnosticsProperty<FocusRingStyle>('focus', focus, defaultValue: null),
      );
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<Color?>(
      tween: PaintColorTween(end: fill),
      duration: const Duration(milliseconds: 140),
      curve: const Cubic(0.2, 0.8, 0.2, 1),
      builder: (context, animated, child) => CustomPaint(
        painter: _SurfacePainter(
          dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
          fill: animated ?? fill,
          edge: edge,
          radius: radius,
          raised: raised,
          pressedInset: pressedInset,
          highlight: highlight,
          depth: depth,
          focus: focus,
          texture: texture,
          prominent: prominent,
          shadow: shadow,
        ),
        child: child,
      ),
      child: child,
    );
  }
}

class _SurfacePainter extends CustomPainter {
  _SurfacePainter({
    required this.dpr,
    required this.fill,
    required this.edge,
    required this.radius,
    required this.raised,
    required this.pressedInset,
    required this.highlight,
    required this.depth,
    required this.focus,
    this.texture,
    this.prominent = false,
    this.shadow = const Color(0x00000000),
  });

  final Color fill, edge, highlight, shadow;

  /// The device pixel ratio the still shadows are rendered at.
  final double dpr;
  final double radius, depth;
  final bool raised, pressedInset, prominent;
  final FocusRingStyle? focus;

  /// Filled buttons carry the kit's corner pixel texture in their ink colour.
  final Color? texture;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    if (raised) {
      // The soft drop shadow, rendered once per size ([paintStill]).
      paintStill(
        canvas,
        key: ('raised', size.width, size.height, radius, depth),
        bounds: rect.shift(const Offset(0, 2)).inflate(9),
        dpr: dpr,
        draw: (canvas) => canvas.drawPath(
          shape.shift(const Offset(0, 2)),
          Paint()
            ..color = Color.from(alpha: depth, red: 0, green: 0, blue: 0)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
        ),
      );
    }
    if (prominent) _paintProminentBehind(canvas, rect, radii, shape);
    canvas.drawPath(shape, Paint()..color = fill);
    // CSS inset shadows live inside the 1px border (the padding box).
    final inner = superellipsePath(rect, radii, inset: 1);
    if (prominent) _paintProminentFace(canvas, rect, radii, shape, inner);
    canvas.save();
    canvas.clipPath(inner);
    if (raised) {
      // inset 0 1px 0 highlight: the band between the padding box and itself moved down 1px.
      canvas.drawPath(
        outlineBand(rect, radii, inset: 1, by: const Offset(0, 1)),
        Paint()..color = highlight,
      );
    }
    if (pressedInset) {
      // inset 0 1px 2px rgb(0 0 0 / 10%), rendered once per size.
      paintStill(
        canvas,
        key: ('button-pressed', size.width, size.height, radius),
        bounds: rect,
        dpr: dpr,
        draw: (canvas) {
          canvas.save();
          canvas.clipPath(inner);
          canvas.drawPath(
            Path.combine(
              PathOperation.difference,
              Path()..addRect(rect.inflate(8)),
              inner.shift(const Offset(0, 1)),
            ),
            Paint()
              ..color = const Color.from(alpha: 0.10, red: 0, green: 0, blue: 0)
              ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1),
          );
          canvas.restore();
        },
      );
    }
    canvas.restore();
    if (texture != null) {
      // `.lab-app .lab-control > .lab-pixel-texture`: fills the padding box, clipped to it with
      // the control radius, at 8% for filled buttons.
      final box = rect.deflate(1);
      canvas.save();
      canvas.clipRRect(RRect.fromRectAndRadius(box, Radius.circular(radius)));
      paintPixelTexture(
        canvas,
        box,
        color: texture!,
        opacity: 0.08,
        seed: 'control',
      );
      canvas.restore();
    }
    if (edge.a > 0) {
      canvas.drawPath(
        superellipsePath(rect, radii, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = edge,
      );
    }
    if (focus != null) paintFocusRing(canvas, rect, radius, focus!);
  }

  /// Under the prominent fill (control-variants.css): the faint glass shadow (y 8, blur 15) and
  /// the side slivers, the shape moved 1.25px left and right and pulled in by 0.75px.
  void _paintProminentBehind(
    Canvas canvas,
    Rect rect,
    List<double> radii,
    Path shape,
  ) {
    paintStill(
      canvas,
      key: (
        'button-prominent',
        rect.width,
        rect.height,
        radii.first,
        shadow.toARGB32(),
      ),
      bounds: rect.shift(const Offset(0, 8)).inflate(23),
      dpr: dpr,
      draw: (canvas) => canvas.drawPath(
        shape.shift(const Offset(0, 8)),
        Paint()
          ..color = shadow
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7.5),
      ),
    );
    canvas.drawPath(
      _prominentSlivers(rect, radii, shape),
      Paint()
        ..color = const Color.from(alpha: 0.098, red: 0, green: 0, blue: 0),
    );
  }

  /// Over the prominent fill: the shaded upper third, the lighter lower edge (inset 0 -8px 8px
  /// -4px white 6 %) and the bright rim in the 1px border, white 55 % at top and bottom and 15 %
  /// at the sides (the web kit's border colours, which meet at 45° on a capsule).
  void _paintProminentFace(
    Canvas canvas,
    Rect rect,
    List<double> radii,
    Path shape,
    Path inner,
  ) {
    canvas.save();
    canvas.clipPath(shape);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: const [
            Color(0x00000000),
            Color.from(alpha: 0.05, red: 0, green: 0, blue: 0),
            Color(0x00000000),
          ],
          stops: const [0.06, 0.24, 0.46],
        ).createShader(rect),
    );
    canvas.restore();
    // A CSS inset shadow (inset 0 -8px 8px -4px white 6 %): paint outside the padding box
    // grown by -spread, moved by offset, inside the padding box. Rendered once per size.
    paintStill(
      canvas,
      key: ('button-prominent-inset', rect.width, rect.height, radii.first),
      bounds: rect,
      dpr: dpr,
      draw: (canvas) {
        canvas.save();
        canvas.clipPath(inner);
        final hole = superellipsePath(
          rect,
          radii,
          inset: 1 - 4,
        ).shift(const Offset(0, -8));
        canvas.drawPath(
          Path.combine(
            PathOperation.difference,
            Path()..addRect(rect.inflate(24)),
            hole,
          ),
          Paint()
            ..color = const Color.from(alpha: 0.06, red: 1, green: 1, blue: 1)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
        );
        canvas.restore();
      },
    );
    // The rim: the 1px border ring (a stroke at 0.5px, like the edge), its top and bottom
    // quarters brighter: on a capsule the CSS border's sides meet at the 45° point of each end
    // arc, whose centre is half the height in from the end.
    final ring = superellipsePath(rect, radii, inset: 0.5);
    Paint stroke(double alpha) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = Color.from(alpha: alpha, red: 1, green: 1, blue: 1);
    canvas.drawPath(ring, stroke(0.15));
    final c = rect.center;
    final half = rect.height / 2;
    final reach = rect.width + rect.height;
    final quarters = Path()
      ..addPolygon([
        Offset(rect.left + half, c.dy),
        Offset(rect.left + half - reach, c.dy - reach),
        Offset(rect.right - half + reach, c.dy - reach),
        Offset(rect.right - half, c.dy),
      ], true)
      ..addPolygon([
        Offset(rect.left + half, c.dy),
        Offset(rect.left + half - reach, c.dy + reach),
        Offset(rect.right - half + reach, c.dy + reach),
        Offset(rect.right - half, c.dy),
      ], true);
    canvas.save();
    canvas.clipPath(quarters);
    canvas.drawPath(ring, stroke(0.47));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SurfacePainter old) =>
      old.dpr != dpr ||
      old.fill != fill ||
      old.edge != edge ||
      old.prominent != prominent ||
      old.shadow != shadow ||
      old.radius != radius ||
      old.raised != raised ||
      old.pressedInset != pressedInset ||
      old.focus != focus ||
      old.highlight != highlight ||
      old.texture != texture ||
      old.depth != depth;
}

/// The prominent face's side slivers per size: two path operations otherwise run on every paint.
final _slivers = <(double, double, double), Path>{};

Path _prominentSlivers(Rect rect, List<double> radii, Path shape) {
  final key = (rect.width, rect.height, radii.first);
  final kept = _slivers[key];
  if (kept != null) return kept;
  if (_slivers.length >= 128) _slivers.clear();
  final pulled = superellipsePath(rect, radii, inset: 0.75);
  return _slivers[key] = Path.combine(
    PathOperation.difference,
    Path.combine(
      PathOperation.union,
      pulled.shift(const Offset(1.25, 0)),
      pulled.shift(const Offset(-1.25, 0)),
    ),
    shape,
  );
}

/// Icon-only actions reuse the button emphasis, loading and surface engines (the web kit's
/// `IconButton`). [ariaLabel] is required: the icon is the only content. The kit's
/// tooltip also shows that name on hover or keyboard focus without duplicating semantics.
class IconButton extends StatelessWidget {
  const IconButton({
    super.key,
    required this.ariaLabel,
    required this.icon,
    this.variant = ButtonVariant.text,
    this.controlSize = ControlSize.regular,
    this.appearance = ButtonAppearance.defaultAppearance,
    this.loading = false,
    this.disabled = false,
    this.pressed,
    this.onClick,
    this.focusNode,
  });

  /// Accessible name: the icon is the button's only content.
  final String ariaLabel;
  final Widget icon;
  final ButtonVariant variant;

  /// Square size: `small` 30px, `regular` 36px, `large` 52px, `inline` for text runs.
  final ControlSize controlSize;
  final ButtonAppearance appearance;
  final bool loading, disabled;
  final bool? pressed;
  final VoidCallback? onClick;
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('ariaLabel', ariaLabel))
      ..add(
        EnumProperty<ButtonVariant>(
          'variant',
          variant,
          defaultValue: ButtonVariant.text,
        ),
      )
      ..add(
        EnumProperty<ControlSize>(
          'controlSize',
          controlSize,
          defaultValue: ControlSize.regular,
        ),
      )
      ..add(
        EnumProperty<ButtonAppearance>(
          'appearance',
          appearance,
          defaultValue: ButtonAppearance.defaultAppearance,
        ),
      )
      ..add(FlagProperty('loading', value: loading, ifTrue: 'loading'))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(DiagnosticsProperty<bool>('pressed', pressed, defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onClick', onClick))
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) => Tooltip(
    label: ariaLabel,
    side: TooltipSide.bottom,
    child: Button(
      variant: variant,
      controlSize: ControlSize.icon,
      iconSize: controlSize,
      appearance: appearance,
      loading: loading,
      disabled: disabled,
      pressed: pressed,
      onClick: onClick,
      ariaLabel: ariaLabel,
      focusNode: focusNode,
      children: [icon],
    ),
  );
}
