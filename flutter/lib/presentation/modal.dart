import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import 'body.dart';
import 'header.dart';
import 'host.dart';
import 'motion.dart';

/// A centred dialog for a short task with a form: content on an opaque card that hugs it (or
/// fills the height), a floating glass header with the title and a close bubble, and the actions
/// in a floating dock. It opens with a small spring and fades out; focus stays inside and returns
/// to the opener. The twin of `Modal` in `@feeef.dev/ui/presentation`. Declare it with [open] and
/// [onOpenChange], or show it with [showModal] and close it with `Navigator.pop(context, value)`.
class Modal extends StatefulWidget {
  const Modal({
    super.key,
    this.open = true,
    this.onOpenChange,
    required this.label,
    this.title,
    this.trailing = const [],
    this.showClose = true,
    this.header,
    this.dock,
    this.fill = false,
    this.wide = false,
    this.width,
    this.dismissible = true,
    this.edgeGap,
    this.contentPadding = 16,
    this.initialFocus,
    this.returnFocus,
    this.container = false,
    required this.child,
  });

  /// Shows the dialog. Keep it mounted and toggle this so it can fade out.
  final bool open;

  /// Called with `false` by Escape, a backdrop tap and the close bubble.
  final ValueChanged<bool>? onOpenChange;

  /// Accessible name. Also names the close button (“Close Edit delivery address”).
  final String label;

  /// Visible title in the floating header's title bubble.
  final Widget? title;

  /// More header bubbles before the close bubble.
  final List<Widget> trailing;

  /// Shows the close bubble. Default true; set false when a visible Cancel exists.
  final bool showClose;

  /// Replaces the whole floating header (title, trailing, close): a search bar, tabs, a toolbar.
  final Widget? header;

  /// Floating chrome over the bottom, usually a [PresentationDock] with the actions.
  final Widget? dock;

  /// Takes the full height (up to 720) instead of hugging the content.
  final bool fill;

  /// The wider width (980 instead of 560), for side-by-side content.
  final bool wide;

  /// A fixed width instead of 560 / [wide]'s 980, still capped by the screen. The web kit sets it
  /// with a class (the temporal dialog's 400 / 680).
  final double? width;

  /// Whether Escape and a backdrop tap close it. Default true. The close bubble always does.
  final bool dismissible;

  /// Space between the floats and the dialog's edges. Default: the shell gap G.
  final double? edgeGap;

  /// Content padding. Default 16 (a card's inside).
  final double contentPadding;

  /// Focused when the dialog opens.
  final FocusNode? initialFocus;

  /// Focused after it closes, when the control that opened it may be gone.
  final FocusNode? returnFocus;

  /// Renders in place, filling its parent, instead of in the nearest [Overlay] (previews).
  final bool container;

  /// The content. It scrolls under the floating header and dock.
  final Widget child;

  @override
  State<Modal> createState() => _ModalState();
}

class _ModalState extends State<Modal> with PresentationStateMixin<Modal> {
  final _motion = PopMotionController();

  /// The props the dialog shows: latched while open so the exit fades the last open content.
  late Modal _shown = widget;

  @override
  bool get declaredOpen => widget.open;
  @override
  ValueChanged<bool>? get declaredOnOpenChange => widget.onOpenChange;

  @override
  void enter() => _motion.enter(motionOf(context));
  @override
  Future<bool> exit() => _motion.exit(motionOf(context));

  @override
  void didUpdateWidget(Modal old) {
    super.didUpdateWidget(old);
    if (isOpen) _shown = widget;
    syncPresentation();
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  void _dismiss() {
    if (_shown.dismissible) close();
  }

  @override
  Widget build(BuildContext context) {
    if (isOpen) _shown = widget;
    return PresentationLayer(
      mounted: presented,
      inPlace: widget.container || routed,
      builder: _view,
    );
  }

  Widget _view(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final shown = _shown;
    final open = isOpen;
    final screen = MediaQuery.sizeOf(context);
    final margin = 4 * s.shellGap;
    final width = shown.width ?? (shown.wide ? 980.0 : 560.0);
    final maxHeight = math.max(0.0, screen.height - margin);
    final radius = s.radiusPanel;
    final header =
        shown.header ??
        PresentationHeader(
          title: shown.title,
          trailing: shown.trailing,
          onClose: shown.showClose ? close : null,
          closeLabel: I18n.of(
            context,
          ).t('lab.composer.closeLabel', {'label': shown.label}),
          closeDisabled: !open,
        );
    final body = PresentationBody(
      label: shown.label,
      top: header,
      bottom: shown.dock,
      fill: shown.fill,
      edgeGap: shown.edgeGap,
      contentPadding: shown.contentPadding,
      surface: c.surface,
      radius: radius - 1,
      child: shown.child,
    );
    final card = ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: math.max(0, math.min(width, screen.width - margin)),
        maxWidth: math.max(0, math.min(width, screen.width - margin)),
        maxHeight: maxHeight,
      ),
      child: SizedBox(
        height: shown.fill ? math.min(720.0, maxHeight) : null,
        child: DecoratedBox(
          decoration: ShapeDecoration(
            color: c.surface,
            shape: SuperellipseBorder(radius: radius, side: BorderSide(color: c.line)),
            shadows: [
              // 0 30px 80px -24px rgb(0 0 0 / 40%).
              BoxShadow(
                color: black(0.4),
                offset: const Offset(0, 30),
                blurRadius: 80,
                spreadRadius: -24,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(1),
            child: ClipPath(
              clipper: ShapeBorderClipper(
                shape: SuperellipseBorder(radius: radius - 1),
              ),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  fontSize: 15,
                  height: 23 / 15,
                  leadingDistribution: TextLeadingDistribution.even,
                  color: c.ink,
                ),
                // The dialog sits away from the screen edges: no safe-area insets inside it.
                child: MediaQuery.removePadding(
                  context: context,
                  removeTop: true,
                  removeBottom: true,
                  removeLeft: true,
                  removeRight: true,
                  child: body,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return PresentationRouteScope.none(
      child: PresentationHost(
        label: shown.label,
        onEscape: _dismiss,
        initialFocus: shown.initialFocus,
        returnFocus: shown.returnFocus,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ListenableBuilder(
              listenable: _motion,
              builder: (context, _) => GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: open ? _dismiss : null,
                child: ExcludeSemantics(
                  child: Opacity(
                    opacity: _motion.opacity,
                    // --lab-presentation-scrim: 20% black, 48% in dark.
                    child: ColoredBox(
                      color: black(theme.brightness == Brightness.dark ? 0.48 : 0.2),
                    ),
                  ),
                ),
              ),
            ),
            Center(
              child: IgnorePointer(
                ignoring: !open,
                child: PopTransition(
                  controller: _motion,
                  // Taps inside the dialog never reach the backdrop.
                  child: GestureDetector(onTap: () {}, child: card),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
