import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_loader.dart';
import '../brand/pixel_texture.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/surfaces.dart';

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
    required super.child,
  });
  final double? height, radius;

  /// The smallest height on touch screens inside this host (`--lab-control-touch-target`); a
  /// toolbar bubble sets its own control height, since the bubble is the target. Null: 44.
  final double? touchTarget;

  /// Fill and edge of toggled-on (pressed) controls, such as an actions bar's checked toggle.
  final Color? pressedFill, pressedEdge;

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
    required Widget child,
  }) {
    final outer = maybeOf(context);
    return ControlOverrides(
      height: height ?? outer?.height,
      radius: radius ?? outer?.radius,
      pressedFill: pressedFill ?? outer?.pressedFill,
      pressedEdge: pressedEdge ?? outer?.pressedEdge,
      touchTarget: touchTarget ?? outer?.touchTarget,
      child: child,
    );
  }

  @override
  bool updateShouldNotify(ControlOverrides old) =>
      old.height != height ||
      old.radius != radius ||
      old.touchTarget != touchTarget ||
      old.pressedFill != pressedFill ||
      old.pressedEdge != pressedEdge;
}

/// A button painted by one of the emphasis variants: the Flutter twin of `Button` in
/// `@feeef.dev/ui/primitives/button`. Same props, same sizes, same colours (checked against the
/// browser in `test/tokens_test.dart`), same superellipse corners.
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

  /// Content: icons and text, laid out in a row.
  final List<Widget> children;

  @override
  State<Button> createState() => _ButtonState();
}

class _ButtonState extends State<Button> {
  bool _hovered = false;
  bool _down = false;
  bool _focusVisible = false;

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
    final coarse = theme.coarsePointer(context);
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
        paint = VariantPaint(
          fill: mixSrgb(c.danger, 0.07, c.surface),
          hover: mixSrgb(c.danger, 0.12, c.surface),
          pressed: mixSrgb(c.danger, 0.18, c.surface),
          edge: mixSrgb(c.danger, 0.19, c.surface),
          ink: c.danger,
        );
        ink = c.danger;
      case ButtonVariant.ghost:
        paint = VariantPaint(
          fill: transparent,
          hover: c.controlHover,
          pressed: c.controlPressed,
          edge: transparent,
          ink: c.ink,
        );
    }
    if (toolbar && widget.variant != ButtonVariant.filled) {
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
    if (widget.pressed == true) {
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
    final fill = interactive && _down
        ? paint.pressed
        // Keyboard focus also shows the hover fill (`:focus-visible`).
        : interactive && (_hovered || _focusVisible)
        ? paint.hover
        : paint.fill;

    // A host (toolbar group, dock) sets the regular height; small and large keep their tokens.
    final regular = overrides?.height ?? s.controlHeight;
    double height = switch (size) {
      ControlSize.small => s.controlSmall,
      ControlSize.large => s.controlLarge,
      _ => regular,
    };
    // Touch keeps 44px targets (CSS `pointer: coarse`), except inside a toolbar bubble, where
    // the bubble is the target.
    final touch = overrides?.touchTarget ?? s.touchTarget;
    if (coarse && height < touch) height = touch;
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

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      spacing: widget.gap,
      children: [
        if (widget.loading) PixelLoader(size: 16, decorative: true, color: ink),
        if (!(widget.loading && icon)) ...widget.children,
      ],
    );

    Widget result = _ButtonPaint(
      fill: fill,
      edge: paint.edge,
      radius: radius,
      raised: raised && !(interactive && _down),
      texture: widget.variant == ButtonVariant.filled ? ink : null,
      pressedInset: interactive && _down,
      highlight: c.controlHighlight,
      depth: theme.brightness == Brightness.dark ? 0.18 : 0.08,
      focus: _focusVisible ? FocusRingStyle.of(context) : null,
      child: SizedBox(
        height: height,
        width: icon
            ? height
            : (widget.alignment != null ? double.infinity : null),
        child: Padding(
          // CSS boxes are border-box with a 1px border: it adds to the padding.
          padding: icon
              ? EdgeInsetsDirectional.zero
              : EdgeInsetsDirectional.only(
                  start: (widget.padding?.start ?? padX) + 1,
                  end: (widget.padding?.end ?? padX) + 1,
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
                // Icons in controls use a 1.75 stroke (`.lab-control[data-variant] svg.lucide`).
                child: LucideStroke(
                  width: 1.75,
                  child: CssBaseline(lineHeight: lineHeight, child: content),
                ),
              ),
            ),
          ),
        ),
      ),
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
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: interactive ? (_) => setState(() => _down = true) : null,
          onTapUp: interactive ? (_) => setState(() => _down = false) : null,
          onTapCancel: interactive ? () => setState(() => _down = false) : null,
          onTap: interactive ? _activate : null,
          child: result,
        ),
      ),
    );
  }
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
  });

  final Color fill, edge, highlight;
  final Color? texture;
  final double radius, depth;
  final bool raised, pressedInset;
  final FocusRingStyle? focus;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<Color?>(
      tween: ColorTween(end: fill),
      duration: const Duration(milliseconds: 140),
      curve: const Cubic(0.2, 0.8, 0.2, 1),
      builder: (context, animated, child) => CustomPaint(
        painter: _SurfacePainter(
          fill: animated ?? fill,
          edge: edge,
          radius: radius,
          raised: raised,
          pressedInset: pressedInset,
          highlight: highlight,
          depth: depth,
          focus: focus,
          texture: texture,
        ),
        child: child,
      ),
      child: child,
    );
  }
}

class _SurfacePainter extends CustomPainter {
  _SurfacePainter({
    required this.fill,
    required this.edge,
    required this.radius,
    required this.raised,
    required this.pressedInset,
    required this.highlight,
    required this.depth,
    required this.focus,
    this.texture,
  });

  final Color fill, edge, highlight;
  final double radius, depth;
  final bool raised, pressedInset;
  final FocusRingStyle? focus;

  /// Filled buttons carry the kit's corner pixel texture in their ink colour.
  final Color? texture;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    if (raised) {
      canvas.drawPath(
        shape.shift(const Offset(0, 2)),
        Paint()
          ..color = Color.from(alpha: depth, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
    }
    canvas.drawPath(shape, Paint()..color = fill);
    // CSS inset shadows live inside the 1px border (the padding box).
    final inner = superellipsePath(rect, radii, inset: 1);
    canvas.save();
    canvas.clipPath(inner);
    if (raised) {
      // inset 0 1px 0 highlight: the band between the padding box and itself moved down 1px.
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, 1)),
        ),
        Paint()..color = highlight,
      );
    }
    if (pressedInset) {
      // inset 0 1px 2px rgb(0 0 0 / 10%).
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

  @override
  bool shouldRepaint(_SurfacePainter old) =>
      old.fill != fill ||
      old.edge != edge ||
      old.radius != radius ||
      old.raised != raised ||
      old.pressedInset != pressedInset ||
      old.focus != focus ||
      old.highlight != highlight ||
      old.texture != texture ||
      old.depth != depth;
}

/// Icon-only actions reuse the button emphasis, loading and surface engines (the web kit's
/// `IconButton`). [ariaLabel] is required: the icon is the only content.
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
  Widget build(BuildContext context) => Button(
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
  );
}
