import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../containers/sheet.dart';
import '../glass/container.dart';
import '../i18n/i18n.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import 'body.dart';
import 'header.dart';
import 'host.dart';

/// The side a [Pane] slides in from.
enum PaneSide {
  /// The inline end: the right in LTR, the left in RTL (the default).
  end,

  /// The inline start.
  start,
}

/// An inspector beside the page: a full-height opaque panel the shell gap G from the screen
/// edges that slides in from the end side (mirrored in RTL), with the close bubble floating beside
/// it, a floating glass header and a dock. Below [compactBreakpoint] the same content is a bottom
/// [Sheet], so you write it once. The twin of `Pane` in `@feeef.dev/ui/presentation`. Declare it
/// with [open] and [onOpenChange], or show it with [showPane] and close it with
/// `Navigator.pop(context, value)`.
class Pane extends StatelessWidget {
  const Pane({
    super.key,
    this.open = true,
    this.onOpenChange,
    required this.label,
    this.title,
    this.trailing = const [],
    this.showClose = true,
    this.header,
    this.dock,
    this.width = 420,
    this.side = PaneSide.end,
    this.modal = true,
    this.fill = false,
    this.dismissible = true,
    this.compactBreakpoint = 720,
    this.edgeGap,
    this.contentPadding = 16,
    this.initialFocus,
    this.returnFocus,
    this.container = false,
    required this.child,
  });

  /// Shows the pane. Keep it mounted and toggle this so it can slide out.
  final bool open;

  /// Called with `false` by Escape, a backdrop tap, the close bubble (and a drag down as a sheet).
  final ValueChanged<bool>? onOpenChange;

  /// Accessible name. Also names the close button.
  final String label;

  /// Visible title in the floating header's title bubble.
  final Widget? title;

  /// More header bubbles (a Save, an Edit, a view switch).
  final List<Widget> trailing;

  /// Shows the close bubble beside the pane (in the header as a sheet). Default true.
  final bool showClose;

  /// Replaces the whole floating header.
  final Widget? header;

  /// Floating chrome over the bottom, usually a [PresentationDock] with the actions.
  final Widget? dock;

  /// Width. Default 420, at most 60% of the window.
  final double width;

  /// The side it slides in from. Default [PaneSide.end].
  final PaneSide side;

  /// True (default) dims the page and traps focus. False leaves the page usable beside it, like
  /// an inspector: no scrim, no focus trap; Escape still closes it while focus is inside.
  final bool modal;

  /// As a sheet on phones: open at full height instead of fitting the content.
  final bool fill;

  /// Whether Escape, a backdrop tap and (as a sheet) a drag down close it. Default true.
  final bool dismissible;

  /// Below this width the same content is a bottom [Sheet]. Default 720.
  final double compactBreakpoint;

  /// Space between the floats and the pane's edges. Default: the shell gap G.
  final double? edgeGap;

  /// Content padding. Default 16 (a card's inside).
  final double contentPadding;

  /// Focused when the pane opens.
  final FocusNode? initialFocus;

  /// Focused after it closes, when the control that opened it may be gone.
  final FocusNode? returnFocus;

  /// Renders in place, filling its parent, instead of in the nearest [Overlay] (previews).
  final bool container;

  /// The content. It scrolls under the floating header and dock.
  final Widget child;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      // The area it presents over: its parent in place, otherwise the window.
      final routed = PresentationRouteScope.maybeOf(context) != null;
      final available = container || routed
          ? constraints.maxWidth
          : MediaQuery.sizeOf(context).width;
      if (available < compactBreakpoint) {
        return Sheet(
          open: open,
          onOpenChange: onOpenChange,
          label: label,
          title: title,
          trailing: trailing,
          showClose: showClose,
          header: header,
          dock: dock,
          detents: [fill ? SheetDetent.large : SheetDetent.fit],
          regular: SheetRegular.sheet,
          modal: modal,
          dismissible: dismissible,
          container: container,
          contentPadding: contentPadding,
          initialFocus: initialFocus,
          returnFocus: returnFocus,
          child: child,
        );
      }
      return _DesktopPane(pane: this);
    },
  );
}

class _DesktopPane extends StatefulWidget {
  const _DesktopPane({required this.pane});
  final Pane pane;

  @override
  State<_DesktopPane> createState() => _DesktopPaneState();
}

/// Reduced motion: the pane crossfades instead of sliding.
const _paneFade = Duration(milliseconds: 200);

class _DesktopPaneState extends State<_DesktopPane>
    with PresentationStateMixin<_DesktopPane> {
  // 0 = off screen, 1 = in place. `fade` replaces the slide under reduced motion.
  final _shownValue = MotionValue(0, 0.001);
  final _fade = MotionValue(0, 0.002);
  late final List<void Function()> _off;
  late Pane _shown = widget.pane;

  @override
  bool get declaredOpen => widget.pane.open;
  @override
  ValueChanged<bool>? get declaredOnOpenChange => widget.pane.onOpenChange;

  @override
  void initState() {
    super.initState();
    _off = [_shownValue.subscribe(_paint), _fade.subscribe(_paint)];
  }

  void _paint(double _) {
    if (mounted) setState(() {});
  }

  @override
  void enter() {
    final motion = motionOf(context);
    if (motion != Motion.full) {
      _shownValue.set(1);
      if (!_fade.isAnimating) _fade.set(0);
      final length = motionFade(motion, _paneFade);
      _fade.animateTo(
        1,
        spring: Spring(duration: length.inMicroseconds / 1e6, bounce: 0),
        instant: length == Duration.zero,
      );
      return;
    }
    _fade.set(1);
    _shownValue.animateTo(1, spring: Springs.smooth);
  }

  @override
  Future<bool> exit() {
    final motion = motionOf(context);
    if (motion != Motion.full) {
      final length = motionFade(motion, _paneFade);
      return _fade.animateTo(
        0,
        spring: Spring(duration: length.inMicroseconds / 1e6, bounce: 0),
        instant: length == Duration.zero,
      );
    }
    return _shownValue.animateTo(0, spring: Springs.smooth);
  }

  @override
  void didUpdateWidget(_DesktopPane old) {
    super.didUpdateWidget(old);
    if (isOpen) _shown = widget.pane;
    syncPresentation();
  }

  @override
  void dispose() {
    for (final off in _off) {
      off();
    }
    _shownValue.stop();
    _fade.stop();
    super.dispose();
  }

  void _dismiss() {
    if (_shown.dismissible) close();
  }

  @override
  Widget build(BuildContext context) {
    if (isOpen) _shown = widget.pane;
    return PresentationLayer(
      mounted: presented,
      inPlace: widget.pane.container || routed,
      builder: _view,
    );
  }

  Widget _view(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => _layout(context, constraints.maxWidth),
  );

  /// The pane over an area [area] wide.
  Widget _layout(BuildContext context, double area) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final pane = _shown;
    final open = isOpen;
    final g = s.shellGap;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final p = _shownValue.get();
    final opacity = _fade.get().clamp(0.0, 1.0);
    final i18n = I18n.of(context);
    final closeLabel = i18n.t('lab.composer.closeLabel', {'label': pane.label});

    final header =
        pane.header ??
        PresentationHeader(title: pane.title, trailing: pane.trailing);
    // At most 60% of the area it presents over (`--lab-pane-max-share`).
    final surface = Builder(
      builder: (context) {
        return SizedBox(
          width: math.min(pane.width, area * 0.6),
          height: double.infinity,
          child: DecoratedBox(
            decoration: ShapeDecoration(
              color: c.surface,
              shape: SuperellipseBorder(
                radius: s.radiusPanel,
                side: BorderSide(color: c.line),
              ),
              shadows: [
                // 0 20px 60px -24px rgb(0 0 0 / 35%).
                BoxShadow(
                  color: black(0.35),
                  offset: const Offset(0, 20),
                  blurRadius: 60,
                  spreadRadius: -24,
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(1),
              child: ClipPath(
                clipper: ShapeBorderClipper(
                  shape: SuperellipseBorder(radius: s.radiusPanel - 1),
                ),
                child: MediaQuery.removePadding(
                  context: context,
                  removeTop: true,
                  removeBottom: true,
                  removeLeft: true,
                  removeRight: true,
                  child: PresentationBody(
                    label: pane.label,
                    top: header,
                    bottom: pane.dock,
                    fill: true,
                    edgeGap: pane.edgeGap,
                    contentPadding: pane.contentPadding,
                    surface: c.surface,
                    radius: s.radiusPanel - 1,
                    child: pane.child,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
    final close = pane.showClose
        ? GlassScope(
            child: CloseBubble(
              label: closeLabel,
              disabled: !open,
              onClose: () => this.close(),
            ),
          )
        : null;
    final end = pane.side == PaneSide.end;
    // The frame: [close][pane] at the end side, [pane][close] at the start side, G inside.
    final frame = _PaneFrame(
      progress: p,
      outward: (end ? 1.0 : -1.0) * (rtl ? -1.0 : 1.0),
      child: Opacity(
        opacity: opacity,
        child: Padding(
          padding: EdgeInsets.all(g),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: g,
            children: end
                ? [?close, Flexible(child: surface)]
                : [Flexible(child: surface), ?close],
          ),
        ),
      ),
    );

    Widget view = Stack(
      fit: StackFit.expand,
      children: [
        if (pane.modal)
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: open ? _dismiss : null,
            child: ExcludeSemantics(
              child: Opacity(
                opacity: (p.clamp(0.0, 1.0) * opacity).toDouble(),
                child: ColoredBox(
                  color: black(theme.brightness == Brightness.dark ? 0.48 : 0.2),
                ),
              ),
            ),
          ),
        Align(
          alignment: end ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
          child: IgnorePointer(ignoring: !open, child: frame),
        ),
      ],
    );
    if (!pane.modal) view = PassThrough(child: view);
    return PresentationRouteScope.none(
      child: PresentationHost(
        label: pane.label,
        modal: pane.modal,
        onEscape: _dismiss,
        initialFocus: pane.initialFocus,
        returnFocus: pane.returnFocus,
        child: DefaultTextStyle.merge(
          style: TextStyle(color: c.ink),
          child: view,
        ),
      ),
    );
  }
}

/// Full height; slides by its own width times (1 − [progress]) toward [outward] (+1 = right).
class _PaneFrame extends StatelessWidget {
  const _PaneFrame({
    required this.progress,
    required this.outward,
    required this.child,
  });
  final double progress, outward;
  final Widget child;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: double.infinity,
    child: FractionalTranslation(
      translation: Offset((1 - progress) * outward, 0),
      child: child,
    ),
  );
}
