import 'dart:math' as math;

import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../brand/logo.dart';
import '../theme.dart';
import 'scaffold.dart';

/// Which logo anchor a [MovingBrandAnchor] is: in the sidebar or in the header
/// (`data-tool-brand-anchor="side|header"`).
enum BrandAnchorSlot { side, header }

/// Marks the real, accessible logo link that [MovingBrand] follows (the web kit's
/// `[data-tool-brand-anchor]`). While a MovingBrand is following, the anchor's own logo is hidden
/// (its space and semantics stay) and the moving visual is drawn over it.
class MovingBrandAnchor extends StatefulWidget {
  const MovingBrandAnchor({super.key, required this.slot, required this.child});

  /// `side` in the sidebar (or drawer), `header` in the app bar.
  final BrandAnchorSlot slot;

  /// The logo link.
  final Widget child;

  @override
  State<MovingBrandAnchor> createState() => _MovingBrandAnchorState();
}

class _MovingBrandAnchorState extends State<MovingBrandAnchor> {
  bool _covered = false;

  void _cover(bool value) {
    if (value != _covered && mounted) setState(() => _covered = value);
  }

  @override
  Widget build(BuildContext context) => Visibility(
    visible: !_covered,
    maintainSize: true,
    maintainAnimation: true,
    maintainState: true,
    maintainSemantics: true,
    maintainInteractivity: true,
    child: widget.child,
  );
}

/// Size of the moving logo (104 × 26).
const movingBrandSize = Size(104, 26);

/// The smoothing step of [MovingBrand]: how far toward the goal it moves after [dt] milliseconds
/// (an exponential follow with a 55ms time constant; `dt` is clamped to 1–40ms, and reduced motion
/// jumps).
double movingBrandBlend(double dt, {bool reduced = false}) =>
    reduced ? 1 : 1 - math.exp(-dt.clamp(1, 40) / 55);

/// One persistent visual follows the real, accessible logo links as navigation changes: the twin of
/// `MovingBrand` in `@feeef.dev/ui/workspace/moving-brand`. Place it inside a [Scaffold] (it reads
/// the scaffold's state); [host] is the key of a widget containing the [MovingBrandAnchor]s
/// (`side` in the sidebar, `header` in the app bar). The visual follows the side anchor while the
/// sidebar is expanded or the drawer is open, else the header anchor, gliding for 450ms after
/// each layout change. It is drawn in the overlay above the drawer, ignores the pointer and is
/// hidden from assistive technology; reduced motion jumps.
class MovingBrand extends StatefulWidget {
  const MovingBrand({super.key, required this.host});

  /// Key of the widget containing the logo anchors to follow (the web kit's `host` ref).
  final GlobalKey host;

  @override
  State<MovingBrand> createState() => _MovingBrandState();
}

class _MovingBrandState extends State<MovingBrand>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  final _portal = OverlayPortalController();
  Offset? _position;
  Duration _last = Duration.zero;
  Duration _followUntil = Duration.zero;
  Duration _clock = Duration.zero;
  final _covered = <_MovingBrandAnchorState>{};
  ScaffoldState? _scaffold;
  Size? _screen;
  bool _reduced = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _portal.show();
      _wake();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scaffold = Scaffold.maybeOf(context);
    final screen = MediaQuery.maybeSizeOf(context);
    _reduced = reducedMotionOf(context);
    final drawerOpened =
        scaffold?.drawerOpen == true && _scaffold?.drawerOpen != true;
    if (scaffold != _scaffold || screen != _screen) {
      _scaffold = scaffold;
      _screen = screen;
      // Stay above the drawer that just opened (a top-layer dialog on the web).
      if (drawerOpened && _portal.isShowing) _portal.show();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _wake();
      });
    }
  }

  void _wake() {
    final now = _ticker.isActive ? _clock : Duration.zero;
    _followUntil = now + Duration(milliseconds: _reduced ? 0 : 450);
    if (!_ticker.isActive) {
      _last = Duration.zero;
      _clock = Duration.zero;
      _ticker.start();
    }
  }

  /// The anchors under the host, like `root.querySelectorAll('[data-tool-brand-anchor]')`.
  List<StatefulElement> _anchors() {
    final root = widget.host.currentContext;
    final found = <StatefulElement>[];
    if (root is! Element) return found;
    void visit(Element element) {
      if (element.widget is MovingBrandAnchor && element is StatefulElement) {
        found.add(element);
      }
      element.visitChildren(visit);
    }

    visit(root);
    return found;
  }

  void _tick(Duration elapsed) {
    _clock = elapsed;
    final state = _scaffold;
    final inSidebar =
        state != null &&
        (state.drawerOpen ||
            (!state.compact && state.sideMode == ScaffoldSideMode.expanded));
    final anchors = _anchors();
    final slot = inSidebar ? BrandAnchorSlot.side : BrandAnchorSlot.header;
    final anchor = anchors
        .where((e) => (e.widget as MovingBrandAnchor).slot == slot)
        .firstOrNull;
    final box = anchor?.renderObject;
    final overlay = Overlay.maybeOf(context)?.context.findRenderObject();
    if (box is! RenderBox ||
        !box.attached ||
        !box.hasSize ||
        box.size.isEmpty ||
        overlay is! RenderBox) {
      _ticker.stop();
      return;
    }
    final topLeft = overlay.globalToLocal(box.localToGlobal(Offset.zero));
    final goal =
        topLeft +
        Offset(
          (box.size.width - movingBrandSize.width) / 2,
          (box.size.height - movingBrandSize.height) / 2,
        );
    final current = _position ?? goal;
    final dt = _last == Duration.zero
        ? 16.0
        : (elapsed - _last).inMicroseconds / 1000;
    _last = elapsed;
    final blend = movingBrandBlend(dt, reduced: _reduced);
    final next = current + (goal - current) * blend;
    setState(() => _position = next);
    // `[data-moving-brand='ready'] [data-tool-brand-anchor] .fo-logo { visibility: hidden }`
    for (final element in anchors) {
      final s = element.state as _MovingBrandAnchorState;
      _covered.add(s);
      s._cover(true);
    }
    final settled =
        (next.dx - goal.dx).abs() + (next.dy - goal.dy).abs() <= 0.1;
    if (elapsed >= _followUntil && settled) _ticker.stop();
  }

  @override
  void dispose() {
    _ticker.dispose();
    for (final s in _covered) {
      s._cover(false);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OverlayPortal(
    controller: _portal,
    overlayChildBuilder: (context) {
      final position = _position;
      if (position == null) return const SizedBox.shrink();
      final theme = ThemeProvider.of(context);
      return Positioned(
        left: position.dx,
        top: position.dy,
        width: movingBrandSize.width,
        height: movingBrandSize.height,
        child: IgnorePointer(
          child: ExcludeSemantics(
            child: DefaultTextStyle.merge(
              style: TextStyle(color: theme.colors.ink),
              child: FoAnimatedLogo(
                width: movingBrandSize.width,
                height: movingBrandSize.height,
              ),
            ),
          ),
        ),
      );
    },
  );
}
