import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../glass/member.dart';
import 'morph_model.dart' show menuAlign;
import 'placement.dart';
import '../platform/pointer_shield.dart';

export 'placement.dart';

/// Minimum distance between a floating panel and the edges of its bounds (`MENU_COLLISION_PADDING`).
const double menuCollisionPadding = 12;

/// The bounds of an app that does not fill the window (a phone frame, an embedded preview, a
/// resizable pane): the twin of `FloatingBoundary` in `@feeef.dev/ui/menu`. Menus, selects,
/// popovers and tooltips opened inside it lay out inside it (it hosts their [Overlay]) and never
/// cross its edges; outside one they stay inside the app's overlay.
class FloatingBoundary extends StatelessWidget {
  const FloatingBoundary({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Overlay.wrap(child: child);
}

/// Where an [AnchoredPanel] put its panel, written during layout and read while painting (so a
/// morph always paints against the current layout): the trigger relative to the panel, the
/// panel's size and the side it ended up on.
class AnchoredGeometry {
  /// The trigger's rect in the panel's coordinates.
  Rect anchor = Rect.zero;

  /// The panel's size.
  Size panel = Size.zero;

  /// The side the panel opened on, after flipping.
  PanelSide side = PanelSide.bottom;

  /// False until the first layout.
  bool placed = false;
}

/// What an [AnchoredPanel] shares with the panel it shows ([MenuSurface] uses it to morph out of
/// the trigger and to keep the panel mounted while it flies back).
class AnchoredPanelScope extends InheritedWidget {
  const AnchoredPanelScope._({required this._state, required super.child});
  final _AnchoredPanelState _state;

  /// The nearest panel scope, or null outside an [AnchoredPanel].
  static AnchoredPanelScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AnchoredPanelScope>();

  /// Whether the panel is open; false while it leaves.
  ValueListenable<bool> get open => _state._openNotifier;

  /// Where the panel was placed.
  AnchoredGeometry get geometry => _state._geometry;

  /// Whether the panel [cover]s its trigger.
  bool get cover => _state.widget.cover;

  /// The trigger's render box, for its corner radius.
  RenderBox? get trigger =>
      (_state.widget.anchor ?? _state._anchor).currentContext
              ?.findRenderObject()
          as RenderBox?;

  /// The glass bubble the trigger sits in (a toolbar button's), or null when it is not glass: a
  /// menu is born out of that glass ([GlassOrigin.glass]).
  RenderBox? get triggerGlass {
    final context = (_state.widget.anchor ?? _state._anchor).currentContext;
    return context == null ? null : GlassMemberBox.glassOf(context);
  }

  /// Keeps the panel mounted after it closes until [exited] is called.
  void holdExit() => _state._holds++;

  /// Undoes [holdExit] (the holder is gone).
  void releaseExit() {
    _state._holds--;
    if (_state._holds <= 0) _state._exited();
  }

  /// The panel finished leaving; remove it.
  void exited() => _state._exited();

  /// Hides the trigger while the panel covers it.
  void hideTrigger(bool hide) => _state._triggerHidden.value = hide;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty(
          'open',
          value: open.value,
          ifTrue: 'open',
          ifFalse: 'closed',
        ),
      )
      ..add(FlagProperty('cover', value: cover, ifTrue: 'covers trigger'))
      ..add(
        FlagProperty(
          'placed',
          value: geometry.placed,
          ifFalse: 'not placed yet',
        ),
      )
      ..add(EnumProperty<PanelSide>('placedSide', geometry.side))
      ..add(DiagnosticsProperty<RenderBox?>('trigger', trigger))
      ..add(
        DiagnosticsProperty<RenderBox?>(
          'triggerGlass',
          triggerGlass,
          defaultValue: null,
        ),
      );
  }

  @override
  bool updateShouldNotify(AnchoredPanelScope old) => false;
}

/// A panel anchored to its trigger ([child]) in the nearest [Overlay]: the kit's one floating-panel
/// primitive (menus, selects, popovers, tooltips), the Flutter side of Radix Popper. It lays out
/// inside the overlay that hosts it (minus its safe area and [collisionPadding]), not the screen;
/// opens on [side] ([sideOffset] away, or over the trigger when it [cover]s it), flips to the
/// other side when there is no room, shifts along both axes to stay inside, caps its height to the
/// room it has (the panel scrolls), follows the trigger when it scrolls and mirrors in RTL. A
/// panel beside its trigger keeps its natural width and drops below the trigger when neither side
/// fits it ([placeAnchoredPanel]).
/// [onDismiss] runs on a press outside. Focus and keys belong to the panel's owner.
class AnchoredPanel extends StatefulWidget {
  const AnchoredPanel({
    super.key,
    required this.open,
    required this.panel,
    required this.child,
    this.onDismiss,
    this.anchor,
    this.side = PanelSide.bottom,
    this.align = PanelAlign.center,
    this.sideOffset = 0,
    this.cover = false,
    this.collisionPadding = menuCollisionPadding,
  });

  /// Shows the panel. When it turns false the panel leaves (after its exit, see
  /// [AnchoredPanelScope.holdExit]).
  final bool open;

  /// Builds the panel. It gets loose constraints no bigger than the room it has.
  final WidgetBuilder panel;

  /// The trigger.
  final Widget child;

  /// Called on a press outside the panel. Without it nothing blocks the page (tooltips).
  final VoidCallback? onDismiss;

  /// Anchors the panel to another widget than [child] (one of several triggers inside it, Radix
  /// `Popover.Anchor`). Null anchors it to [child].
  final GlobalKey? anchor;
  final PanelSide side;

  /// Where the panel lines up with the trigger. Null lines it up with the trigger's edge on the
  /// side of the bounds the trigger sits on, so it grows into the page (toolbar menus).
  final PanelAlign? align;

  /// Gap between the trigger and the panel (ignored when it [cover]s the trigger).
  final double sideOffset;

  /// The panel covers its trigger, aligned to the trigger's edge on the side it grows from
  /// (menus).
  final bool cover;

  /// Minimum distance between the panel and the edges of its bounds.
  final double collisionPadding;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'),
      )
      ..add(ObjectFlagProperty<WidgetBuilder>.has('panel', panel))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onDismiss', onDismiss))
      ..add(
        DiagnosticsProperty<GlobalKey?>('anchor', anchor, defaultValue: null),
      )
      ..add(
        EnumProperty<PanelSide>('side', side, defaultValue: PanelSide.bottom),
      )
      ..add(
        EnumProperty<PanelAlign?>(
          'align',
          align,
          defaultValue: PanelAlign.center,
        ),
      )
      ..add(DoubleProperty('sideOffset', sideOffset, defaultValue: 0.0))
      ..add(
        FlagProperty(
          'cover',
          value: cover,
          ifTrue: 'covers trigger',
          defaultValue: false,
        ),
      )
      ..add(
        DoubleProperty(
          'collisionPadding',
          collisionPadding,
          defaultValue: menuCollisionPadding,
        ),
      );
  }

  @override
  State<AnchoredPanel> createState() => _AnchoredPanelState();
}

class _AnchoredPanelState extends State<AnchoredPanel>
    with WidgetsBindingObserver {
  final _portal = OverlayPortalController();
  final _anchor = GlobalKey(debugLabel: 'AnchoredPanel trigger');
  final _openNotifier = ValueNotifier<bool>(false);
  final _triggerHidden = ValueNotifier<bool>(false);
  final _geometry = AnchoredGeometry();
  final _relayout = _Relayout();
  final _positions = <ScrollPosition>[];
  int _holds = 0;

  /// Whether the overlay child shows the panel (open, or leaving). The portal itself stays
  /// attached for the widget's whole life: an [OverlayPortalController] can't be shown or hidden
  /// while the tree builds, and `open` arrives during a build.
  bool _visible = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('visible', value: _visible, ifTrue: 'visible'))
      ..add(
        FlagProperty(
          'open',
          value: _openNotifier.value,
          ifTrue: 'open',
          ifFalse: 'closed',
        ),
      )
      ..add(
        FlagProperty(
          'triggerHidden',
          value: _triggerHidden.value,
          ifTrue: 'trigger hidden',
        ),
      )
      ..add(IntProperty('exitHolds', _holds, defaultValue: 0))
      ..add(IntProperty('scrollPositions', _positions.length, defaultValue: 0));
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (Overlay.maybeOf(context) != null) _portal.show();
    if (widget.open) _show();
  }

  @override
  void didUpdateWidget(AnchoredPanel old) {
    super.didUpdateWidget(old);
    if (widget.open != old.open) widget.open ? _show() : _hide();
    if (widget.side != old.side ||
        widget.align != old.align ||
        widget.cover != old.cover ||
        widget.sideOffset != old.sideOffset ||
        widget.collisionPadding != old.collisionPadding) {
      _relayout.ping();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_visible) _follow();
  }

  @override
  void didChangeMetrics() => _relayout.ping();

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _unfollow();
    _openNotifier.dispose();
    _triggerHidden.dispose();
    _relayout.dispose();
    super.dispose();
  }

  void _show() {
    _openNotifier.value = true;
    _geometry.placed = false;
    _visible = true;
    _follow();
    // Raise it above panels opened before it, once the frame is built.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && _visible && Overlay.maybeOf(context) != null) {
        _portal.show();
      }
    });
  }

  /// Called from [didUpdateWidget]: the build that follows drops the panel unless something
  /// holds its exit.
  void _hide() {
    _openNotifier.value = false;
    if (_holds > 0) return;
    _visible = false;
    _triggerHidden.value = false;
    _unfollow();
  }

  void _exited() {
    if (_openNotifier.value || !mounted || !_visible) return;
    void clear() {
      if (!mounted || _openNotifier.value || !_visible) return;
      _triggerHidden.value = false;
      _unfollow();
      setState(() => _visible = false);
    }

    // Mid-frame (a holder disposed while the tree is locked): clear once the frame is done.
    if (SchedulerBinding.instance.schedulerPhase ==
        SchedulerPhase.persistentCallbacks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => clear());
    } else {
      clear();
    }
  }

  /// Follows every scrollable the trigger sits in.
  void _follow() {
    _unfollow();
    var scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      _positions.add(scrollable.position..addListener(_moved));
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
  }

  void _unfollow() {
    for (final position in _positions) {
      position.removeListener(_moved);
    }
    _positions.clear();
  }

  void _moved() => _relayout.ping();

  @override
  Widget build(BuildContext context) {
    final direction = Directionality.of(context);
    return OverlayPortal(
      controller: _portal,
      overlayChildBuilder: (overlayContext) {
        if (!_visible) return const SizedBox.shrink();
        final overlay = Overlay.maybeOf(overlayContext);
        final safe = overlay == null
            ? EdgeInsets.zero
            : MediaQuery.maybePaddingOf(overlay.context) ?? EdgeInsets.zero;
        return GlassLayer(
          child: ValueListenableBuilder<bool>(
            valueListenable: _openNotifier,
            builder: (context, open, panel) => Stack(
              children: [
                // Always in the tree (ignored while leaving) so the panel never changes slot.
                if (widget.onDismiss != null)
                  Positioned.fill(
                    child: IgnorePointer(
                      ignoring: !open,
                      // Over an embedded web page too: a tap there closes the panel.
                      child: PointerShield(
                        enabled: open,
                        child: GestureDetector(
                          behavior: HitTestBehavior.translucent,
                          onTap: widget.onDismiss,
                        ),
                      ),
                    ),
                  ),
                Positioned.fill(
                  child: IgnorePointer(ignoring: !open, child: panel),
                ),
              ],
            ),
            child: _AnchoredLayout(
              anchor: widget.anchor ?? _anchor,
              side: widget.side,
              align: widget.align,
              sideOffset: widget.sideOffset,
              cover: widget.cover,
              padding: safe + EdgeInsets.all(widget.collisionPadding),
              direction: direction,
              geometry: _geometry,
              relayout: _relayout,
              child: AnchoredPanelScope._(
                state: this,
                child: Directionality(
                  textDirection: direction,
                  child: PointerShield(child: Builder(builder: widget.panel)),
                ),
              ),
            ),
          ),
        );
      },
      child: ValueListenableBuilder<bool>(
        valueListenable: _triggerHidden,
        builder: (context, hidden, child) => AnimatedOpacity(
          opacity: hidden ? 0 : 1,
          duration: Duration(milliseconds: hidden ? 60 : 120),
          curve: hidden ? Curves.linear : Curves.easeOut,
          child: child,
        ),
        child: KeyedSubtree(key: _anchor, child: widget.child),
      ),
    );
  }
}

class _Relayout extends ChangeNotifier {
  void ping() => notifyListeners();
}

class _AnchoredLayout extends SingleChildRenderObjectWidget {
  const _AnchoredLayout({
    required this.anchor,
    required this.side,
    required this.align,
    required this.sideOffset,
    required this.cover,
    required this.padding,
    required this.direction,
    required this.geometry,
    required this.relayout,
    super.child,
  });
  final GlobalKey anchor;
  final PanelSide side;
  final PanelAlign? align;
  final double sideOffset;
  final bool cover;
  final EdgeInsets padding;
  final TextDirection direction;
  final AnchoredGeometry geometry;
  final Listenable relayout;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<GlobalKey>('anchor', anchor))
      ..add(EnumProperty<PanelSide>('side', side))
      ..add(EnumProperty<PanelAlign?>('align', align, defaultValue: null))
      ..add(DoubleProperty('sideOffset', sideOffset))
      ..add(FlagProperty('cover', value: cover, ifTrue: 'covers trigger'))
      ..add(DiagnosticsProperty<EdgeInsets>('padding', padding))
      ..add(EnumProperty<TextDirection>('direction', direction))
      ..add(
        FlagProperty(
          'geometry',
          value: geometry.placed,
          ifTrue: 'placed',
          ifFalse: 'not placed',
        ),
      )
      ..add(DiagnosticsProperty<Listenable>('relayout', relayout));
  }

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderAnchoredLayout(
        anchor: anchor,
        side: side,
        align: align,
        sideOffset: sideOffset,
        cover: cover,
        padding: padding,
        direction: direction,
        geometry: geometry,
        relayout: relayout,
      );

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderAnchoredLayout renderObject,
  ) {
    renderObject
      ..anchor = anchor
      ..side = side
      ..align = align
      ..sideOffset = sideOffset
      ..cover = cover
      ..padding = padding
      ..direction = direction
      ..geometry = geometry
      ..relayout = relayout;
  }
}

class _RenderAnchoredLayout extends RenderShiftedBox {
  _RenderAnchoredLayout({
    required this._anchor,
    required this._side,
    required this._align,
    required this._sideOffset,
    required this._cover,
    required this._padding,
    required this._direction,
    required this.geometry,
    required this._relayout,
  }) : super(null);

  AnchoredGeometry geometry;

  GlobalKey _anchor;
  set anchor(GlobalKey v) {
    if (v == _anchor) return;
    _anchor = v;
    markNeedsLayout();
  }

  PanelSide _side;
  set side(PanelSide v) {
    if (v == _side) return;
    _side = v;
    markNeedsLayout();
  }

  PanelAlign? _align;
  set align(PanelAlign? v) {
    if (v == _align) return;
    _align = v;
    markNeedsLayout();
  }

  double _sideOffset;
  set sideOffset(double v) {
    if (v == _sideOffset) return;
    _sideOffset = v;
    markNeedsLayout();
  }

  bool _cover;
  set cover(bool v) {
    if (v == _cover) return;
    _cover = v;
    markNeedsLayout();
  }

  EdgeInsets _padding;
  set padding(EdgeInsets v) {
    if (v == _padding) return;
    _padding = v;
    markNeedsLayout();
  }

  TextDirection _direction;
  set direction(TextDirection v) {
    if (v == _direction) return;
    _direction = v;
    markNeedsLayout();
  }

  Listenable _relayout;
  set relayout(Listenable v) {
    if (v == _relayout) return;
    if (attached) {
      _relayout.removeListener(markNeedsLayout);
      v.addListener(markNeedsLayout);
    }
    _relayout = v;
    markNeedsLayout();
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<GlobalKey>('anchor', _anchor))
      ..add(EnumProperty<PanelSide>('side', _side))
      ..add(EnumProperty<PanelAlign?>('align', _align, defaultValue: null))
      ..add(DoubleProperty('sideOffset', _sideOffset))
      ..add(FlagProperty('cover', value: _cover, ifTrue: 'covers trigger'))
      ..add(DiagnosticsProperty<EdgeInsets>('padding', _padding))
      ..add(EnumProperty<TextDirection>('direction', _direction))
      ..add(
        FlagProperty(
          'placed',
          value: geometry.placed,
          ifFalse: 'not placed yet',
        ),
      )
      ..add(DiagnosticsProperty<Rect>('anchorRect', geometry.anchor))
      ..add(DiagnosticsProperty<Size>('panelSize', geometry.panel))
      ..add(EnumProperty<PanelSide>('placedSide', geometry.side));
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _relayout.addListener(markNeedsLayout);
  }

  @override
  void detach() {
    _relayout.removeListener(markNeedsLayout);
    super.detach();
  }

  /// The trigger's rect in this box's coordinates (through any transforms between them).
  Rect? _anchorRect() {
    final box = _anchor.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.attached || !box.hasSize) return null;
    final self = Matrix4.tryInvert(getTransformTo(null));
    if (self == null) return null;
    return MatrixUtils.transformRect(
      self..multiply(box.getTransformTo(null)),
      Offset.zero & box.size,
    );
  }

  /// Skip hit-testing until [performLayout] has placed the panel and the child
  /// has a size — otherwise pointer events during the first open frame assert
  /// `Cannot hit test a render box with no size` and cascade into mouse_tracker.
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!geometry.placed) return false;
    final child = this.child;
    if (child == null || !child.hasSize) return false;
    return super.hitTest(result, position: position);
  }

  @override
  void performLayout() {
    size = constraints.biggest;
    final child = this.child;
    if (child == null) return;
    final bounds = _padding.deflateRect(Offset.zero & size);
    // The trigger is laid out before its overlay child (OverlayPortal defers this layout), but
    // it isn't our child: read it inside a layout callback, where that is permitted.
    Rect? measured;
    invokeLayoutCallback<BoxConstraints>((_) => measured = _anchorRect());
    final anchor =
        measured ?? Rect.fromLTWH(bounds.center.dx, bounds.top, 0, 0);
    final vertical = _side == PanelSide.top || _side == PanelSide.bottom;
    final width = math.max(0.0, bounds.width);
    // Above or below: the room caps its height (it scrolls). Beside: it keeps its natural width
    // (capped to the bounds) and drops below the trigger when neither side fits it, so a menu is
    // never squeezed under its minimum width.
    child.layout(
      BoxConstraints(
        maxWidth: width,
        maxHeight: vertical
            ? panelMaxExtent(
                bounds,
                anchor,
                _side,
                sideOffset: _sideOffset,
                cover: _cover,
                direction: _direction,
              )
            : math.max(0.0, bounds.height),
      ),
      parentUsesSize: true,
    );
    final placement = placeAnchoredPanel(
      bounds: bounds,
      anchor: anchor,
      size: child.size,
      side: _side,
      align:
          _align ??
          menuAlign(
            true,
            anchor.center.dx,
            bounds.left,
            bounds.right,
            rtl: _direction == TextDirection.rtl,
          ),
      sideOffset: _sideOffset,
      cover: _cover,
      direction: _direction,
    );
    (child.parentData! as BoxParentData).offset = placement.rect.topLeft;
    geometry
      ..anchor = anchor.shift(-placement.rect.topLeft)
      ..panel = child.size
      ..side = placement.side
      ..placed = true;
  }
}
