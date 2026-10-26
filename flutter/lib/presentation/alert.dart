import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../menu/menu_surface.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import 'alert_model.dart';
import 'host.dart';
import 'motion.dart';

export 'alert_model.dart';

/// One choice of an [Alert].
class AlertAction<T> {
  const AlertAction({
    required this.label,
    this.role,
    this.onAction,
    this.value,
    this.disabled = false,
  });

  /// The button text: name the outcome (“Cancel order”, “Keep order”), never “OK”.
  final String label;

  /// [AlertActionRole.cancel] backs out (also run by Escape; it leads a row and ends a stack),
  /// [AlertActionRole.primary] is the one main action (filled), [AlertActionRole.destructive]
  /// deletes or loses something (tinted danger). Null: any other choice.
  final AlertActionRole? role;

  /// Runs when the action is chosen. Return `false` to keep the alert open (to show an error).
  final bool? Function()? onAction;

  /// What [showAlert] completes with when this action closes the alert.
  final T? value;

  /// Disables the button.
  final bool disabled;
}

/// The alert's metrics (`--lab-alert-*`): iOS 26 alerts at comfortable density, one step down
/// for compact and thin.
class AlertTokens {
  const AlertTokens({
    required this.width,
    required this.radius,
    required this.button,
    required this.inset,
  });

  /// The density's metrics in [context]'s theme.
  factory AlertTokens.of(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    final scale = s.radiusScale;
    return switch (s.density) {
      Density.comfortable => AlertTokens(
        width: 320,
        radius: 35 * scale,
        button: 48,
        inset: 16,
      ),
      Density.compact => AlertTokens(
        width: 300,
        radius: 30 * scale,
        button: 40,
        inset: 12,
      ),
      Density.thin => AlertTokens(
        width: 280,
        radius: 26 * scale,
        button: 34,
        inset: 10,
      ),
    };
  }

  /// Width, before the screen's room.
  final double width;

  /// Corner radius.
  final double radius;

  /// Button height (capsules).
  final double button;

  /// Buttons from the sides and bottom; also the least screen margin around the alert.
  final double inset;
}

/// A small centred decision, like an iOS alert: a title, a message and capsule buttons on the
/// thick glass the menus use, over a dimmed page. Choosing an action closes it; Escape runs the
/// cancel action. The twin of `Alert` in `@feeef.dev/ui/presentation`. Declare it with [open] and
/// [onOpenChange], or show it with [showAlert], which completes with the chosen action's value.
class Alert extends StatefulWidget {
  const Alert({
    super.key,
    this.open = true,
    this.onOpenChange,
    required this.title,
    this.message,
    required this.actions,
    this.child,
    this.initialFocus,
    this.returnFocus,
    this.container = false,
  });

  /// Shows the alert. Keep it mounted and toggle this so it can fade out.
  final bool open;

  /// Called with `false` once an action is chosen (or Escape runs the cancel action).
  final ValueChanged<bool>? onOpenChange;

  /// The question or the fact, as a short sentence (“Cancel order #10482?”). Also its name.
  final String title;

  /// One or two sentences: what happens, and whether it can be undone.
  final Widget? message;

  /// The choices, in reading order. Two that fit sit side by side; otherwise they stack.
  final List<AlertAction> actions;

  /// A field the decision needs (a reason), between the message and the actions.
  final Widget? child;

  /// Focused when the alert opens. Default: the cancel action, or the last action.
  final FocusNode? initialFocus;

  /// Focused after it closes, when the control that opened it may be gone.
  final FocusNode? returnFocus;

  /// Renders in place, filling its parent, instead of in the nearest [Overlay] (previews).
  final bool container;

  @override
  State<Alert> createState() => _AlertState();
}

class _AlertState extends State<Alert> with PresentationStateMixin<Alert> {
  final _motion = PopMotionController();
  final _focus = <FocusNode>[];

  @override
  bool get declaredOpen => widget.open;
  @override
  ValueChanged<bool>? get declaredOnOpenChange => widget.onOpenChange;

  @override
  void enter() => _motion.enter(motionOf(context));
  @override
  Future<bool> exit() => _motion.exit(motionOf(context));

  @override
  void didUpdateWidget(Alert old) {
    super.didUpdateWidget(old);
    syncPresentation();
  }

  @override
  void dispose() {
    _motion.dispose();
    for (final node in _focus) {
      node.dispose();
    }
    super.dispose();
  }

  int get _cancel =>
      widget.actions.indexWhere((a) => a.role == AlertActionRole.cancel);

  void _choose(int index) {
    if (!isOpen) return;
    final action = widget.actions[index];
    if (action.onAction?.call() == false) return;
    close(action.value);
  }

  @override
  Widget build(BuildContext context) {
    while (_focus.length < widget.actions.length) {
      _focus.add(FocusNode(debugLabel: 'Alert action'));
    }
    return PresentationLayer(
      mounted: presented,
      inPlace: widget.container || routed,
      builder: _view,
    );
  }

  Widget _view(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final dark = theme.brightness == Brightness.dark;
    final tokens = AlertTokens.of(context);
    final actions = widget.actions;
    final cancel = _cancel;
    final focusIndex = cancel >= 0 ? cancel : actions.length - 1;
    final open = isOpen;
    final message = widget.message;
    final child = widget.child;

    Widget surface = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 4,
            children: [
              Semantics(
                header: true,
                child: Text(
                  widget.title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 17,
                    height: 22 / 17,
                    leadingDistribution: TextLeadingDistribution.even,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 17 * -0.01,
                    color: c.ink,
                  ),
                ),
              ),
              if (message != null)
                DefaultTextStyle.merge(
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 20 / 15,
                    leadingDistribution: TextLeadingDistribution.even,
                    color: c.muted,
                  ),
                  child: message,
                ),
            ],
          ),
        ),
        if (child != null)
          Padding(
            padding: EdgeInsetsDirectional.fromSTEB(
              tokens.inset,
              16,
              tokens.inset,
              0,
            ),
            child: child,
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(
            tokens.inset,
            20,
            tokens.inset,
            tokens.inset,
          ),
          child: ControlOverrides.merge(
            context,
            height: tokens.button,
            child: AlertActionsLayout(
              gap: theme.sizes.shellGap,
              roles: [for (final a in actions) a.role],
              children: [
                for (var i = 0; i < actions.length; i++)
                  Button(
                    focusNode: _focus[i],
                    variant: switch (actions[i].role) {
                      AlertActionRole.primary => ButtonVariant.filled,
                      AlertActionRole.destructive => ButtonVariant.destructive,
                      _ => ButtonVariant.elevated,
                    },
                    disabled: actions[i].disabled,
                    onClick: () => _choose(i),
                    children: [
                      Text(
                        actions[i].label,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ],
    );

    final screen = MediaQuery.sizeOf(context);
    surface = ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: math.max(
          0,
          math.min(tokens.width, screen.width - 2 * tokens.inset),
        ),
        minWidth: math.max(
          0,
          math.min(tokens.width, screen.width - 2 * tokens.inset),
        ),
        maxHeight: math.max(0, screen.height - 2 * tokens.inset),
      ),
      child: _AlertMaterial(
        radius: tokens.radius,
        child: SingleChildScrollView(child: surface),
      ),
    );

    return PresentationRouteScope.none(
      child: PresentationHost(
        label: widget.title,
        alert: true,
        onEscape: () {
          if (cancel >= 0) _choose(cancel);
        },
        initialFocus: widget.initialFocus ?? _focus[focusIndex],
        returnFocus: widget.returnFocus,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // The page dims (iOS: 20% black, 48% in dark) and takes no taps: an alert is answered.
            ListenableBuilder(
              listenable: _motion,
              builder: (context, _) => GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {},
                child: ExcludeSemantics(
                  child: Opacity(
                    opacity: _motion.opacity,
                    child: ColoredBox(color: black(dark ? 0.48 : 0.2)),
                  ),
                ),
              ),
            ),
            Center(
              child: IgnorePointer(
                ignoring: !open,
                child: PopTransition(controller: _motion, child: surface),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The alert's thick glass (the menus' [MenuMaterial]): shadow, blurred veil, then a 1px rim with
/// the glass light; opaque under `GlassStyle.solid` and more contrast.
class _AlertMaterial extends StatelessWidget {
  const _AlertMaterial({required this.radius, required this.child});
  final double radius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final glass = MenuMaterial.of(context);
    final radii = [radius, radius, radius, radius];
    final clipper = _RadiiClipper(radii);
    final fill = ColoredBox(color: glass.fill);
    return CustomPaint(
      painter: _ShadowPainter(radii, glass.contrast ? null : menuShadowColor),
      foregroundPainter: _RimPainter(
        radii,
        line: glass.contrast ? c.ink : c.line,
        light: glass.contrast ? null : c.glassEdgeLow,
      ),
      child: ClipPath(
        clipper: clipper,
        child: Stack(
          children: [
            Positioned.fill(
              child: glass.solid
                  ? fill
                  : BackdropFilter(filter: glass.filter, child: fill),
            ),
            child,
          ],
        ),
      ),
    );
  }
}

class _RadiiClipper extends CustomClipper<Path> {
  const _RadiiClipper(this.radii);
  final List<double> radii;
  @override
  Path getClip(Size size) => superellipsePath(Offset.zero & size, radii);
  @override
  bool shouldReclip(_RadiiClipper old) => old.radii.first != radii.first;
}

/// `--lab-menu-shadow` outside the shape only (a box shadow is never drawn under its box).
class _ShadowPainter extends CustomPainter {
  const _ShadowPainter(this.radii, this.color);
  final List<double> radii;
  final Color? color;

  @override
  void paint(Canvas canvas, Size size) {
    final color = this.color;
    final box = Offset.zero & size;
    final spread = box.deflate(12);
    if (color == null || spread.isEmpty) return;
    canvas.saveLayer(box.inflate(80), Paint());
    canvas.drawPath(
      superellipsePath(spread, [
        for (final r in radii) math.max(0.0, r - 12),
      ]).shift(const Offset(0, 14)),
      Paint()
        ..color = color
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20),
    );
    canvas.drawPath(
      superellipsePath(box, radii),
      Paint()..blendMode = BlendMode.clear,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ShadowPainter old) =>
      old.color != color || old.radii.first != radii.first;
}

/// The rim: `--lab-glass-light` (edge-low along the top, 6 % black along the bottom) inside a 1px
/// line.
class _RimPainter extends CustomPainter {
  const _RimPainter(this.radii, {required this.line, this.light});
  final List<double> radii;
  final Color line;
  final Color? light;

  @override
  void paint(Canvas canvas, Size size) {
    final box = Offset.zero & size;
    final light = this.light;
    if (light != null) {
      final inner = superellipsePath(box, radii, inset: 1);
      canvas.save();
      canvas.clipPath(inner);
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, 1)),
        ),
        Paint()..color = light,
      );
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          inner,
          inner.shift(const Offset(0, -1)),
        ),
        Paint()..color = black(0.06),
      );
      canvas.restore();
    }
    canvas.drawPath(
      superellipsePath(box, radii, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = line,
    );
  }

  @override
  bool shouldRepaint(_RimPainter old) =>
      old.line != line || old.light != light || old.radii.first != radii.first;
}

/// Lays out an alert's buttons: two that fit sit side by side (the cancel action leading),
/// anything else stacks full width (the cancel action last), [gap] apart. Children are given in
/// the actions' order; [roles] says which one cancels. The rule is [alertActionsFit] /
/// [alertActionOrder], shared with the web kit.
class AlertActionsLayout extends MultiChildRenderObjectWidget {
  const AlertActionsLayout({
    super.key,
    required this.gap,
    required this.roles,
    required super.children,
  });

  final double gap;
  final List<AlertActionRole?> roles;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      RenderAlertActions(gap, roles, Directionality.of(context));

  @override
  void updateRenderObject(
    BuildContext context,
    RenderAlertActions renderObject,
  ) {
    renderObject
      ..gap = gap
      ..roles = roles
      ..textDirection = Directionality.of(context);
  }
}

class _AlertActionData extends ContainerBoxParentData<RenderBox> {}

/// The render object behind [AlertActionsLayout]; [sideBySide] tells how it laid out last.
class RenderAlertActions extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _AlertActionData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _AlertActionData> {
  RenderAlertActions(this._gap, this._roles, this._textDirection);

  double _gap;
  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  List<AlertActionRole?> _roles;
  set roles(List<AlertActionRole?> value) {
    _roles = value;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  /// Whether the last layout put the actions side by side.
  bool sideBySide = false;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _AlertActionData) {
      child.parentData = _AlertActionData();
    }
  }

  List<RenderBox> get _children {
    final list = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      list.add(child);
      child = childAfter(child);
    }
    return list;
  }

  @override
  void performLayout() {
    final children = _children;
    final width = constraints.maxWidth;
    final widths = [
      for (final child in children) child.getMaxIntrinsicWidth(double.infinity),
    ];
    sideBySide = alertActionsFit(widths, width, _gap);
    final roles = [
      for (var i = 0; i < children.length; i++)
        i < _roles.length ? _roles[i] : null,
    ];
    final order = alertActionOrder(roles, sideBySide);
    var height = 0.0;
    if (sideBySide) {
      final cell = (width - _gap) / 2;
      var x = 0.0;
      for (final index in order) {
        final child = children[index];
        child.layout(
          BoxConstraints.tightFor(width: cell),
          parentUsesSize: true,
        );
        final left = _textDirection == TextDirection.rtl ? width - x - cell : x;
        (child.parentData! as _AlertActionData).offset = Offset(left, 0);
        x += cell + _gap;
        height = math.max(height, child.size.height);
      }
    } else {
      for (final index in order) {
        final child = children[index];
        if (height > 0) height += _gap;
        child.layout(
          BoxConstraints.tightFor(width: width),
          parentUsesSize: true,
        );
        (child.parentData! as _AlertActionData).offset = Offset(0, height);
        height += child.size.height;
      }
    }
    size = constraints.constrain(Size(width, height));
  }

  @override
  double computeMinIntrinsicHeight(double width) => _intrinsicHeight();
  @override
  double computeMaxIntrinsicHeight(double width) => _intrinsicHeight();

  double _intrinsicHeight() {
    final children = _children;
    if (children.isEmpty) return 0;
    final h = children
        .map((c) => c.getMaxIntrinsicHeight(double.infinity))
        .reduce(math.max);
    return children.length == 2
        ? h
        : h * children.length + _gap * (children.length - 1);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);
}
