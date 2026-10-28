part of 'sheet.dart';

/// `regular: SheetRegular.pane`: the side panel from the breakpoint, a bottom sheet below it.
class _PaneSwitch extends StatelessWidget {
  const _PaneSwitch({required this.sheet});
  final Sheet sheet;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      // The area it presents over: its parent in place, otherwise the window.
      final routed = PresentationRouteScope.maybeOf(context) != null;
      final available = sheet.container || routed
          ? constraints.maxWidth
          : MediaQuery.sizeOf(context).width;
      return available < sheet.regularBreakpoint
          ? _BottomSheet(sheet: sheet)
          : _DesktopPane(pane: sheet);
    },
  );
}

/// A sheet's pane presentation on wide screens: a full-height opaque panel the shell gap G from
/// the screen edges that slides in from [Sheet.paneSide] (mirrored in RTL), with the close bubble
/// floating beside it, a floating glass header and a dock.
class _DesktopPane extends StatefulWidget {
  const _DesktopPane({required this.pane});
  final Sheet pane;

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

  /// Ticks on every motion frame: only the slide, the fade and the dim rebuild, never the pane.
  final _tick = ValueNotifier(0);
  late final List<void Function()> _off;
  late Sheet _shown = widget.pane;

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
    if (mounted) _tick.value++;
  }

  @override
  void enter() {
    final motion = motionOf(context);
    if (motion != Motion.full) {
      _shownValue.set(1);
      if (!_fade.isAnimating) _fade.set(0);
      _fade.easeTo(
        1,
        motionFade(motion, _paneFade) * (1 - _fade.get()),
        curve: PopMotion.fadeCurve,
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
      return _fade.easeTo(
        0,
        motionFade(motion, _paneFade) * _fade.get(),
        curve: PopMotion.fadeCurve,
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
    _tick.dispose();
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
    final i18n = I18n.of(context);
    final closeLabel = i18n.t('lab.composer.closeLabel', {'label': pane.label});

    final header =
        pane.header ??
        PresentationHeader(
          title: pane.title,
          leading: pane.leading,
          trailing: pane.trailing,
        );
    // At most 60% of the area it presents over (`--lab-pane-max-share`).
    final surface = Builder(
      builder: (context) {
        return SizedBox(
          width: math.min(pane.paneWidth, area * 0.6),
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
                    contentPadding: pane.contentPadding ?? 16,
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
            child: CloseBubble(label: closeLabel, onClose: () => this.close()),
          )
        : null;
    final end = pane.paneSide == SheetPaneSide.end;
    final outward = (end ? 1.0 : -1.0) * (rtl ? -1.0 : 1.0);
    final dim = black(theme.brightness == Brightness.dark ? 0.48 : 0.2);
    // The frame: [close][pane] at the end side, [pane][close] at the start side, G inside. Built
    // and painted once per change; motion frames only move or fade its layer.
    final row = RepaintBoundary(
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
    );

    Widget view = ListenableBuilder(
      listenable: _tick,
      child: row,
      builder: (context, row) {
        final p = _shownValue.get();
        final opacity = _fade.get().clamp(0.0, 1.0);
        return Stack(
          fit: StackFit.expand,
          children: [
            if (pane.modal)
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: open ? _dismiss : null,
                child: ExcludeSemantics(
                  child: Opacity(
                    opacity: (p.clamp(0.0, 1.0) * opacity).toDouble(),
                    child: ColoredBox(color: dim),
                  ),
                ),
              ),
            Align(
              alignment: end
                  ? AlignmentDirectional.centerEnd
                  : AlignmentDirectional.centerStart,
              child: IgnorePointer(
                ignoring: !open,
                child: _PaneFrame(
                  progress: p,
                  outward: outward,
                  child: Opacity(
                    opacity: opacity,
                    // While it slides or fades, its glass rides it as is and leaves with it.
                    child: GlassInstant(
                      instant: _shownValue.isAnimating || _fade.isAnimating,
                      child: PointerShield(child: row!),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
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
