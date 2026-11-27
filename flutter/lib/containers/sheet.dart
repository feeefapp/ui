import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../glass/member.dart';
import '../layout/size_reporter.dart';
import '../i18n/i18n.dart';
import '../menu/menu_surface.dart' show MenuMaterial;
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../presentation/body.dart';
import '../presentation/header.dart';
import '../presentation/host.dart';
import '../presentation/motion.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/raster.dart';
import 'sheet_model.dart';
import '../platform/pointer_shield.dart';
import '../scroll/scroll_area.dart';

export 'sheet_model.dart';

part 'sheet_pane.dart';

/// What a [Sheet] becomes on wide screens.
enum SheetRegular {
  /// A centered dialog (the default).
  dialog,

  /// Still a bottom sheet, kept a readable width.
  sheet,

  /// A floating glass card at the leading edge with the same detents (iPad Maps).
  card,

  /// An inspector beside the page: a full-height opaque panel sliding in from [Sheet.paneSide],
  /// with the close bubble floating beside it. Use it for the details of the thing the page is
  /// about. With it the phone sheet fits its content by default ([Sheet.detents] `[fit]`) and pads
  /// 16 (a card's inside); the wide panel shows [Sheet.child] (not [Sheet.builder]) and has no
  /// [SheetScope].
  pane,
}

/// The side a [SheetRegular.pane] slides in from.
enum SheetPaneSide {
  /// The inline end: the right in LTR, the left in RTL (the default).
  end,

  /// The inline start.
  start,
}

/// How a [Sheet] is presented right now ([SheetScope.presentation]).
enum SheetPresentation { sheet, card, dialog }

/// The page behind sheets (`[data-lab-sheet-backdrop]` in the web kit): a modal [Sheet] below it
/// makes it recede (move down, scale back, round its corners) as a large sheet rises. Put it
/// around the page content, below the [Overlay] the sheet presents in.
class SheetBackdrop extends StatefulWidget {
  const SheetBackdrop({super.key, required this.child});

  /// The page.
  final Widget child;

  @override
  State<SheetBackdrop> createState() => _SheetBackdropState();
}

class _SheetBackdropState extends State<SheetBackdrop> {
  final _recede = _Recede();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('recede', _recede.value, defaultValue: 0.0));
  }

  @override
  void dispose() {
    _recede.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _BackdropScope(
    recede: _recede,
    child: ValueListenableBuilder<double>(
      valueListenable: _recede,
      child: widget.child,
      builder: (context, q, child) {
        // The same widgets at rest (identity, no clip), so the page below never remounts.
        // transform-origin 50% 0: translate3d(0, 10q px, 0) scale(1 - 0.06q); clip inset(0 round 22q).
        return Transform(
          alignment: Alignment.topCenter,
          transform: Matrix4.translationValues(0, q * 10, 0)
            ..scaleByDouble(1 - q * 0.06, 1 - q * 0.06, 1, 1),
          child: ClipPath(
            clipBehavior: q == 0 ? Clip.none : Clip.antiAlias,
            clipper: _SuperellipseClipper([q * 22, q * 22, q * 22, q * 22]),
            child: child,
          ),
        );
      },
    ),
  );
}

class _Recede extends ValueNotifier<double> {
  _Recede() : super(0);
  bool disposed = false;
  @override
  void dispose() {
    disposed = true;
    super.dispose();
  }
}

class _BackdropScope extends InheritedWidget {
  const _BackdropScope({required this.recede, required super.child});
  final ValueNotifier<double> recede;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('recede', recede.value, defaultValue: 0.0));
  }

  @override
  bool updateShouldNotify(_BackdropScope old) => old.recede != recede;
}

/// The control a [Sheet] grows out of ([Sheet.source]): give it the same [GlobalKey]. The sheet
/// hides it while it covers it and shows it again as it lands back in it. A key on any other
/// widget still gives the morph its starting rect, without hiding it.
class SheetSource extends StatefulWidget {
  const SheetSource({required GlobalKey super.key, required this.child});

  /// The control (a toolbar button).
  final Widget child;

  @override
  State<SheetSource> createState() => _SheetSourceState();
}

class _SheetSourceState extends State<SheetSource> {
  bool _hidden = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(FlagProperty('hidden', value: _hidden, ifTrue: 'hidden'));
  }

  set hidden(bool value) {
    if (value == _hidden || !mounted) return;
    setState(() => _hidden = value);
  }

  @override
  Widget build(BuildContext context) =>
      Opacity(opacity: _hidden ? 0 : 1, child: widget.child);
}

/// What content inside a [Sheet] can read: where it rests, how far it is expanded, and a way to
/// move it. The twin of `useSheet()` in the web kit.
class SheetScope extends InheritedWidget {
  const SheetScope._({
    required this.detent,
    required this.expansion,
    required this.height,
    required this.setDetent,
    required this.presentation,
    required super.child,
  });

  /// The detent the sheet rests at (it changes when a drag or a tap settles).
  final SheetDetent detent;

  /// 0 at the lowest partial height … 1 at full height, every frame (listen to paint with it).
  final ValueListenable<double> expansion;

  /// The visible height in px, every frame (a free sheet rests between detents).
  final ValueListenable<double> height;

  /// Moves the sheet to another of its detents.
  final ValueChanged<SheetDetent> setDetent;

  /// How the sheet is presented right now.
  final SheetPresentation presentation;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<SheetDetent>('detent', detent))
      ..add(DoubleProperty('expansion', expansion.value))
      ..add(DoubleProperty('height', height.value, unit: 'px'))
      ..add(
        ObjectFlagProperty<ValueChanged<SheetDetent>>.has(
          'setDetent',
          setDetent,
        ),
      )
      ..add(EnumProperty<SheetPresentation>('presentation', presentation));
  }

  /// The sheet [context] is inside, or null. Use it to show more at higher detents (Maps shows
  /// only its search bar at `peek`).
  static SheetScope? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SheetScope>();

  @override
  bool updateShouldNotify(SheetScope old) =>
      old.detent != detent ||
      old.presentation != presentation ||
      old.expansion != expansion ||
      old.height != height;
}

/// A sheet that rises from the bottom, like iOS 26/27: the twin of `Sheet` in
/// `@feeef.dev/ui/containers`. It rests at [detents] (just its header, half, full, fit or custom
/// heights), follows the finger when dragged, snaps to the detent a flick projects to, and closes
/// when flicked down. Below full height it floats inset from the edges on glass; rising, it
/// reaches the edges and turns opaque in one continuous motion. It can grow out of the button
/// that opened it ([source]), leave the page usable at low detents ([backgroundInteraction]), and
/// becomes a dialog, a floating card or an inspector pane on wide screens ([regular]), so you write
/// the content once. Scrolling inside hands off to dragging the
/// sheet at the top. Under a full-height modal sheet a [SheetBackdrop] recedes. Keep it mounted
/// and toggle [open] so the exit can run, or show it with [showSheet] and close it with
/// `Navigator.pop(context, value)`.
class Sheet extends StatelessWidget {
  const Sheet({
    super.key,
    this.open = true,
    this.onOpenChange,
    required this.label,
    this.title,
    this.leading,
    this.trailing = const [],
    this.showClose = true,
    this.header,
    this.dock,
    this.child = const SizedBox.shrink(),
    this.builder,
    this.detents,
    this.detent,
    this.defaultDetent,
    this.onDetentChange,
    this.onHeightChange,
    this.dismissible = true,
    this.snap = true,
    this.grabber,
    this.modal = true,
    this.backgroundInteraction,
    this.floating,
    this.roundedBottom = false,
    this.source,
    this.focusDetent,
    this.raiseOnFocus = true,
    this.regular = SheetRegular.dialog,
    this.regularBreakpoint = 720,
    this.cardWidth = 380,
    this.paneWidth = 420,
    this.paneSide = SheetPaneSide.end,
    this.container = false,
    this.recede = true,
    this.contentPadding,
    this.initialFocus,
    this.returnFocus,
  });

  /// Shows the sheet. It animates in and out; keep it mounted and toggle this.
  final bool open;

  /// Called with `false` when the person dismisses it (drag down, scrim, Escape, close bubble),
  /// never `true`.
  final ValueChanged<bool>? onOpenChange;

  /// Accessible name. Also names the close button.
  final String label;

  /// Visible title in the floating header's title bubble.
  final Widget? title;

  /// Custom content at the start instead of the title bubble (a search field, a back button with
  /// a heading). The close bubble stays.
  final Widget? leading;

  /// More header bubbles before the close bubble (a Reset, a Done).
  final List<Widget> trailing;

  /// Shows the close bubble at the end of the header. Default true.
  final bool showClose;

  /// Replaces the whole floating header (title, trailing, close).
  final Widget? header;

  /// Floating chrome over the bottom, usually a [PresentationDock] with the sheet's main action.
  final Widget? dock;

  /// Sheet content; it scrolls inside the sheet under the floating header and dock.
  final Widget child;

  /// Content that brings its own scroll view instead of [child], like DraggableScrollableSheet: it
  /// fills the sheet under the grabber and the header and gets the sheet's scroll controller, so a
  /// drag over it grows the sheet before it scrolls (and scrolls back before it shrinks). A kit
  /// [ScrollArea] or a vertical list inside takes the controller on its own ([ScrollAreaPrimary],
  /// [PrimaryScrollController]); pass it to anything else. A `fit` detent counts as `large`.
  final Widget Function(BuildContext context, ScrollController controller)?
  builder;

  /// Heights the sheet rests at, in any order. Default `[SheetDetent.large]` (`[SheetDetent.fit]`
  /// with [SheetRegular.pane]). [SheetDetent.peek] is just the header (a search field, like Maps),
  /// so a sheet with `[peek, medium, large]` lives on the page.
  final List<SheetDetent>? detents;

  /// Controlled detent. Pair with [onDetentChange].
  final SheetDetent? detent;

  /// Detent to open at when uncontrolled. Default: the first in [detents].
  final SheetDetent? defaultDetent;

  /// Called when the person drags, taps the grabber, focuses a field or taps the dimmed page.
  final ValueChanged<SheetDetent>? onDetentChange;

  /// Called on every frame the sheet's visible height (px above the host's bottom edge) changes,
  /// while it is dragged, settles, opens or closes (0 when closed). For chrome that rides on top of
  /// a [container] sheet, like a toolbar that sits on its top edge.
  final ValueChanged<double>? onHeightChange;

  /// Whether dragging down, the scrim and Escape close it. Default true. The close bubble always
  /// does.
  final bool dismissible;

  /// `true` (default): a released sheet snaps to the detent its flick projects to. `false`: it rests
  /// wherever it is let go (after the flick's momentum), anywhere between its lowest and highest
  /// detents, like DraggableScrollableSheet without snapping.
  final bool snap;

  /// Shows the grabber. Default: when there is more than one detent.
  final bool? grabber;

  /// `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet at
  /// every height, with no scrim (a wide [SheetRegular.pane] still closes on Escape while focus is
  /// inside it).
  final bool modal;

  /// The page stays usable (no dim) while the sheet rests at or below this detent, and dims as it
  /// rises past it, like iOS `presentationBackgroundInteraction(.enabled(upThrough:))`: a map with
  /// its results sheet. Tapping the dimmed page brings the sheet back down to it.
  final SheetDetent? backgroundInteraction;

  /// Whether a phone sheet with a partial detent floats: inset from the edges on glass, reaching
  /// the edges and turning opaque as it rises to full height (iOS 26). Default: true when a detent
  /// is below `large`. A sheet with only full-height detents is always attached and opaque.
  final bool? floating;

  /// Keep the bottom corners rounded and inset even at the largest detent.
  /// Defaults to false for the edge-attached iOS presentation.
  final bool roundedBottom;

  /// The key of the control that opened the sheet (wrap it in a [SheetSource] so it hides). The
  /// sheet grows out of it and returns into it when it closes (unless it is dragged away), like an
  /// iOS 26 toolbar button morphing into its sheet.
  final GlobalKey? source;

  /// The detent a text field focused inside raises the sheet to. Default (null): from `peek`, the
  /// highest detent (typing in a Maps search bar opens the sheet); otherwise it stays.
  final SheetDetent? focusDetent;

  /// False never raises the sheet when a field is focused (the web kit's `focusDetent={null}`).
  final bool raiseOnFocus;

  /// What the sheet becomes on wide screens.
  final SheetRegular regular;

  /// Width in px from which the sheet is "regular" (wide). Default 720.
  final double regularBreakpoint;

  /// Width of the [SheetRegular.card] presentation in px. Default 380.
  final double cardWidth;

  /// Width of the [SheetRegular.pane] presentation in px. Default 420, at most 60% of the window.
  final double paneWidth;

  /// The side the [SheetRegular.pane] presentation slides in from. Default [SheetPaneSide.end].
  final SheetPaneSide paneSide;

  /// Renders in place, filling its parent (for example a `Positioned.fill` in a [Stack]), instead
  /// of in the nearest [Overlay]: for embedded previews.
  final bool container;

  /// On phones, let a [SheetBackdrop] behind recede as a large modal sheet rises. Default true.
  final bool recede;

  /// Content padding (the shell gap G when null, 16 with [SheetRegular.pane]; list sections bring
  /// their own inset).
  final double? contentPadding;

  /// Focused when the sheet opens. Default: the sheet itself.
  final FocusNode? initialFocus;

  /// Focused after it closes, when the control that opened it may be gone.
  final FocusNode? returnFocus;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty(
          'open',
          value: open,
          ifTrue: 'open',
          ifFalse: 'closed',
          defaultValue: true,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<bool>?>.has(
          'onOpenChange',
          onOpenChange,
        ),
      )
      ..add(StringProperty('label', label))
      ..add(IntProperty('trailing', trailing.length, defaultValue: 0))
      ..add(
        FlagProperty(
          'showClose',
          value: showClose,
          ifFalse: 'no close bubble',
          defaultValue: true,
        ),
      )
      ..add(
        ObjectFlagProperty<
          Widget Function(BuildContext context, ScrollController controller)?
        >.has('builder', builder),
      )
      ..add(
        IterableProperty<SheetDetent>('detents', detents, defaultValue: null),
      )
      ..add(
        DiagnosticsProperty<SheetDetent?>('detent', detent, defaultValue: null),
      )
      ..add(
        DiagnosticsProperty<SheetDetent?>(
          'defaultDetent',
          defaultDetent,
          defaultValue: null,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<SheetDetent>?>.has(
          'onDetentChange',
          onDetentChange,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<double>?>.has(
          'onHeightChange',
          onHeightChange,
        ),
      )
      ..add(
        FlagProperty(
          'dismissible',
          value: dismissible,
          ifFalse: 'not dismissible',
          defaultValue: true,
        ),
      )
      ..add(
        FlagProperty(
          'snap',
          value: snap,
          ifFalse: 'rests anywhere',
          defaultValue: true,
        ),
      )
      ..add(
        FlagProperty(
          'grabber',
          value: grabber,
          ifTrue: 'grabber',
          ifFalse: 'no grabber',
          defaultValue: null,
        ),
      )
      ..add(
        FlagProperty(
          'modal',
          value: modal,
          ifFalse: 'non-modal',
          defaultValue: true,
        ),
      )
      ..add(
        DiagnosticsProperty<SheetDetent?>(
          'backgroundInteraction',
          backgroundInteraction,
          defaultValue: null,
        ),
      )
      ..add(
        FlagProperty(
          'floating',
          value: floating,
          ifTrue: 'floating',
          ifFalse: 'attached',
          defaultValue: null,
        ),
      )
      ..add(
        DiagnosticsProperty<GlobalKey?>('source', source, defaultValue: null),
      )
      ..add(
        DiagnosticsProperty<SheetDetent?>(
          'focusDetent',
          focusDetent,
          defaultValue: null,
        ),
      )
      ..add(
        FlagProperty(
          'raiseOnFocus',
          value: raiseOnFocus,
          ifFalse: 'never raises on focus',
          defaultValue: true,
        ),
      )
      ..add(
        EnumProperty<SheetRegular>(
          'regular',
          regular,
          defaultValue: SheetRegular.dialog,
        ),
      )
      ..add(
        DoubleProperty(
          'regularBreakpoint',
          regularBreakpoint,
          defaultValue: 720.0,
        ),
      )
      ..add(DoubleProperty('cardWidth', cardWidth, defaultValue: 380.0))
      ..add(
        FlagProperty(
          'roundedBottom',
          value: roundedBottom,
          ifTrue: 'roundedBottom',
          defaultValue: false,
        ),
      )
      ..add(DoubleProperty('paneWidth', paneWidth, defaultValue: 420.0))
      ..add(
        EnumProperty<SheetPaneSide>(
          'paneSide',
          paneSide,
          defaultValue: SheetPaneSide.end,
        ),
      )
      ..add(
        FlagProperty(
          'container',
          value: container,
          ifTrue: 'in place',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'recede',
          value: recede,
          ifFalse: 'no recede',
          defaultValue: true,
        ),
      )
      ..add(
        DoubleProperty('contentPadding', contentPadding, defaultValue: null),
      )
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'initialFocus',
          initialFocus,
          defaultValue: null,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'returnFocus',
          returnFocus,
          defaultValue: null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) => regular == SheetRegular.pane
      ? _PaneSwitch(sheet: this)
      : _BottomSheet(sheet: this);
}

/// The bottom sheet (every presentation but a wide pane).
class _BottomSheet extends StatefulWidget {
  const _BottomSheet({required this.sheet});
  final Sheet sheet;

  @override
  State<_BottomSheet> createState() => _SheetState();
}

typedef _Key = (
  bool,
  Size?,
  double,
  double,
  SheetPresentation,
  SheetFrameMode,
  double,
  double,
);

/// Reduced motion: a sheet leaves with this crossfade instead of sliding down.
const _sheetFade = Duration(milliseconds: 160);

/// The sheet growing out of its source, and flying back into it.
const _morphOpen = Spring(duration: 0.46, bounce: 0.16);
const _morphClose = Spring(duration: 0.36, bounce: 0.08);

/// The source of a running morph, in host pixels.
typedef _Source = ({Rect rect, double radius, _SheetSourceState? state});

class _SheetState extends State<_BottomSheet> {
  List<SheetDetent> get _detents =>
      widget.sheet.detents ??
      (widget.sheet.regular == SheetRegular.pane
          ? const [SheetDetent.fit]
          : const [SheetDetent.large]);

  /// Feeds content drags, flings and wheels to the sheet before the scroll (see
  /// [_SheetScrollPosition]).
  late final _scroll = _SheetScrollController(this);

  /// A free sheet's rest height, and the detent reported with it (a controlled host echoes it back).
  double? _freeHeight;
  SheetDetent? _reported;

  /// A content gesture on a resizable sheet: the sheet's unclamped height and the scroll.
  SheetScrollState? _content;

  /// A touch held the sheet still (a scroll view's hold), to settle again if no drag follows.
  bool _held = false;
  Timer? _wheelIdle;
  final _hostKey = GlobalKey();
  final _grabberKey = GlobalKey();
  final _topKey = GlobalKey();
  final _bottomKey = GlobalKey();
  PresentationRouteScope? _route;
  bool _lastOpen = false;

  /// Whether the sheet is presented (open, or running its exit).
  bool _mounted = false;

  // Motion: `visible` is the sheet's visible height (sheet, card); `shown` 0–1 and `lift` px
  // (dialog); `morph` 0–1 the growth out of the source.
  final _visible = MotionValue(0, 0.5);
  final _shown = MotionValue(0, 0.004);
  final _lift = MotionValue(0, 0.5);
  final _morph = MotionValue(1, 0.002);

  /// The dialog's closing fade (1 at rest): a fixed curve that ends on time, like Modal's.
  final _dialogFade = MotionValue(1, 0.002);

  /// 0 at the lowest partial height … 1 at full height, for [SheetScope.expansion].
  final _expansion = ValueNotifier<double>(0);

  /// The visible height, for [SheetScope.height].
  final _height = ValueNotifier<double>(0);

  /// Ticks on every motion frame: only the panel's position, surface, fade and the dim rebuild,
  /// never the panel's content.
  final _tick = ValueNotifier(0);
  late final List<void Function()> _unsubscribe;

  Size? _host;

  /// The body's natural height (content + reserved chrome + safe area), from [PresentationBody].
  double? _bodyNatural;

  /// The floating header's height, for [SheetDetent.peek].
  double _headerHeight = 0;
  late int _localIndex;
  bool _presented = false;
  bool _dragging = false;
  bool _draggedAway = false;
  bool _fading = false;
  int _exitGeneration = 0;
  _Key? _synced;
  ValueNotifier<double>? _backdrop;

  /// Set while the sheet grows out of (or back into) its source.
  _Source? _morphing;

  // Drag session.
  double _dragOrigin = 0, _dragStart = 0;
  VelocityTracker? _pointerTracker, _valueTracker;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    final detents = _detents;
    properties
      ..add(
        FlagProperty('open', value: _open, ifTrue: 'open', ifFalse: 'closed'),
      )
      ..add(FlagProperty('presented', value: _mounted, ifTrue: 'presented'))
      ..add(FlagProperty('routed', value: _route != null, ifTrue: 'routed'))
      ..add(EnumProperty<SheetPresentation>('presentation', _presentation))
      ..add(
        DiagnosticsProperty<SheetDetent>(
          'detent',
          detents.isEmpty ? null : detents[_index],
        ),
      )
      ..add(IterableProperty<SheetDetent>('detents', detents))
      ..add(DoubleProperty('visibleHeight', _visible.get(), unit: 'px'))
      ..add(DoubleProperty('expansion', _expansion.value))
      ..add(
        DoubleProperty(
          'freeHeight',
          _freeHeight,
          unit: 'px',
          defaultValue: null,
        ),
      )
      ..add(DiagnosticsProperty<Size?>('host', _host, defaultValue: null))
      ..add(
        DoubleProperty(
          'bodyNatural',
          _bodyNatural,
          unit: 'px',
          defaultValue: null,
        ),
      )
      ..add(DoubleProperty('headerHeight', _headerHeight, defaultValue: 0.0))
      ..add(FlagProperty('dragging', value: _dragging, ifTrue: 'dragging'))
      ..add(
        FlagProperty(
          'contentGesture',
          value: _content != null,
          ifTrue: 'content gesture',
        ),
      )
      ..add(FlagProperty('held', value: _held, ifTrue: 'held'))
      ..add(
        FlagProperty(
          'draggedAway',
          value: _draggedAway,
          ifTrue: 'dragged away',
        ),
      )
      ..add(
        FlagProperty(
          'morphing',
          value: _morphing != null,
          ifTrue: 'morphing from source',
        ),
      )
      ..add(FlagProperty('fading', value: _fading, ifTrue: 'fading'));
  }

  @override
  void initState() {
    super.initState();
    _localIndex = math.max(
      0,
      _detents.indexOf(widget.sheet.defaultDetent ?? _detents.first),
    );
    _unsubscribe = [
      _visible.subscribe(_paint),
      _shown.subscribe(_paint),
      _lift.subscribe(_paint),
      _morph.subscribe(_paint),
      _dialogFade.subscribe(_paint),
    ];
    FocusManager.instance.addListener(_onFocus);
  }

  /// Open: the hosting route's state when [showSheet] hosts it, otherwise [Sheet.open].
  bool get _open => _route?.open ?? widget.sheet.open;

  /// Asks to close: pops the hosting route, or calls `onOpenChange(false)`.
  void _close() {
    if (!_open) return;
    final route = _route;
    if (route != null) {
      route.dismiss();
    } else {
      widget.sheet.onOpenChange?.call(false);
    }
  }

  void _syncOpen() {
    if (_open && !_lastOpen) _enter();
    _lastOpen = _open;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _backdrop = context.getInheritedWidgetOfExactType<_BackdropScope>()?.recede;
    _route = PresentationRouteScope.maybeOf(context);
    _syncOpen();
  }

  @override
  void didUpdateWidget(_BottomSheet old) {
    super.didUpdateWidget(old);
    _syncOpen();
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_onFocus);
    for (final off in _unsubscribe) {
      off();
    }
    _visible.stop();
    _shown.stop();
    _lift.stop();
    _morph.stop();
    _dialogFade.stop();
    _morphing?.state?.hidden = false;
    _tick.dispose();
    _expansion.dispose();
    _height.dispose();
    _wheelIdle?.cancel();
    // The tree is locked while it unmounts: release the backdrop after this frame.
    final backdrop = _backdrop;
    if (backdrop is _Recede && backdrop.value != 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!backdrop.disposed) backdrop.value = 0;
      });
    }
    _scroll.dispose();
    super.dispose();
  }

  bool get _reduced => reducedMotionOf(context);

  void _enter() {
    _exitGeneration++;
    _mounted = true;
  }

  void _paint(double _) {
    if (!mounted) return;
    _tick.value++;
    _paintRecede();
    final frame = _frame;
    if (frame != null && _expansion.value != frame.expansion) {
      _expansion.value = frame.expansion;
    }
    if (_height.value != _visible.get()) {
      _height.value = _visible.get();
      widget.sheet.onHeightChange?.call(math.max(0.0, _height.value));
    }
    final m = _morphing;
    // The source hides once the sheet covers it, and shows again as the sheet lands back in it.
    if (m != null) m.state?.hidden = _morph.get() > 0.08;
  }

  // ---- Measured state ----

  EdgeInsets get _safe => MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
  bool get _ready =>
      _host != null && (_bodyNatural != null || widget.sheet.builder != null);
  bool get _showGrabber =>
      _presentation != SheetPresentation.dialog &&
      (widget.sheet.grabber ?? _detents.length > 1);

  bool get _wide =>
      _host != null && _host!.width >= widget.sheet.regularBreakpoint;

  SheetPresentation get _presentation => !_wide
      ? SheetPresentation.sheet
      : switch (widget.sheet.regular) {
          SheetRegular.dialog => SheetPresentation.dialog,
          SheetRegular.card => SheetPresentation.card,
          SheetRegular.sheet || SheetRegular.pane => SheetPresentation.sheet,
        };

  SizeTokens get _sizes => ThemeProvider.of(context).sizes;

  /// The floating gap (the shell gap G) and the sheet radius.
  double get _inset => _sizes.shellGap;
  double get _radius => 32 * _sizes.radiusScale;

  /// `large` without measuring the content.
  double get _large {
    final host = _host;
    return host == null ? 0 : math.max(0.0, host.height - 10 - _safe.top);
  }

  SheetFrameMode get _mode {
    if (_presentation == SheetPresentation.card) return SheetFrameMode.card;
    final large = _large;
    final hasPartial = _heightsFor(_metricsWith(0)).any((h) => h < large - 0.5);
    return (widget.sheet.floating ?? hasPartial)
        ? SheetFrameMode.float
        : SheetFrameMode.attached;
  }

  /// The content column keeps the floating gap at every height, so nothing reflows while it moves.
  double get _columnInset =>
      _presentation == SheetPresentation.dialog ||
          (_mode == SheetFrameMode.attached && !widget.sheet.roundedBottom)
      ? 0
      : _inset;

  SheetMetrics? _metricsWith(double gap) {
    final host = _host;
    if (host == null) return null;
    final safe = _safe;
    final grab = _showGrabber ? sheetGrabberBand : 0.0;
    // The grabber row and the body (content, float reservations and safe area).
    // A builder's content scrolls on its own: `fit` takes all the room.
    final natural = widget.sheet.builder != null
        ? double.infinity
        : grab + (_bodyNatural ?? 0) + gap;
    // Peek: the grabber, the floating header at its offset, the same gap again below it.
    final header = _headerHeight > 0 ? _headerHeight : 64.0;
    final edge = _inset;
    final peek = grab + edge + safe.top + header + edge + gap;
    return SheetMetrics(
      hostHeight: host.height,
      topInset: 10 + safe.top,
      natural: natural.ceilToDouble(),
      peek: peek.ceilToDouble(),
    );
  }

  SheetMetrics? get _metrics => _metricsWith(_columnInset);

  List<double> _heightsFor(SheetMetrics? m) =>
      m == null ? const [] : detentHeights(_detents, m);

  List<double> get _heights => _heightsFor(_metrics);

  int get _index {
    final controlled = widget.sheet.detent;
    if (controlled != null) {
      return math.max(0, _detents.indexOf(controlled));
    }
    return math.min(_localIndex, _detents.length - 1);
  }

  double get _target {
    final h = _heights;
    final i = _index;
    final free = _freeHeight;
    if (free != null && !widget.sheet.snap && _detents[i] == _reported) {
      return free.clamp(_minHeight, _maxHeight);
    }
    return i < h.length ? h[i] : 0;
  }

  double get _minHeight {
    final h = _heights;
    return h.isEmpty ? 0 : h.reduce(math.min);
  }

  double get _maxHeight {
    final h = _heights;
    return h.isEmpty ? 0 : h.reduce(math.max);
  }

  /// A sheet that changes height: its content gestures grow it before they scroll, and back.
  bool get _resizable =>
      _ready &&
      _presentation != SheetPresentation.dialog &&
      (!widget.sheet.snap || _heights.toSet().length > 1);

  /// Even a single-detent sheet can be pulled down to dismiss. Its scroll view must
  /// own that gesture so native trackpad pans and touch drags share the same handoff.
  bool get _contentMovable =>
      _ready &&
      _presentation != SheetPresentation.dialog &&
      (_resizable || widget.sheet.dismissible);

  /// The height up to which the page stays usable, or null.
  double? get _undimmed {
    final d = widget.sheet.backgroundInteraction, m = _metrics;
    return d == null || m == null ? null : detentHeight(d, m);
  }

  bool get _dims =>
      widget.sheet.modal || widget.sheet.backgroundInteraction != null;
  bool get _hostModal =>
      widget.sheet.modal && widget.sheet.backgroundInteraction == null;

  double get _dialogHeight {
    final m = _metrics;
    return m == null ? 0 : math.min(m.natural, m.hostHeight - 64);
  }

  /// The surface at the current height, or null before it is measured (or as a dialog).
  SheetFrame? get _frame {
    if (!_ready || _presentation == SheetPresentation.dialog) return null;
    return sheetFrame(
      _visible.get(),
      heights: _heights,
      large: _large,
      inset: _inset,
      radius: _radius,
      mode: _mode,
      roundedBottom: widget.sheet.roundedBottom,
    );
  }

  void _paintRecede() {
    final backdrop = _backdrop, m = _metrics;
    if (backdrop == null || m == null) return;
    final q =
        widget.sheet.recede &&
            _hostModal &&
            _mounted &&
            _presentation == SheetPresentation.sheet &&
            !_reduced
        ? sheetRecede(_visible.get(), m.hostHeight - m.topInset) *
              _morph.get().clamp(0.0, 1.0)
        : 0.0;
    if (backdrop.value != q) backdrop.value = q;
  }

  // ---- Present, follow detent and size changes, and leave ----

  void _scheduleSync() {
    if (!_ready) return;
    final _Key key = (
      _open,
      _host,
      _metrics!.topInset,
      _metrics!.natural,
      _presentation,
      _mode,
      _target,
      _dialogHeight,
    );
    if (key == _synced) return;
    _synced = key;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _sync();
    });
  }

  Future<bool> _moveTo(
    double height, [
    Spring spring = Springs.smooth,
    double? velocity,
  ]) {
    _stopMorph();
    return _visible.animateTo(height, spring: spring, velocity: velocity);
  }

  /// The source to grow out of, in host pixels, or null when there is none to see.
  _Source? _sourceRect() {
    final key = widget.sheet.source;
    final origin = key?.currentContext;
    final host = _hostKey.currentContext?.findRenderObject();
    final box = origin?.findRenderObject();
    if (origin == null ||
        host is! RenderBox ||
        !host.attached ||
        box is! RenderBox ||
        !box.attached ||
        !box.hasSize ||
        box.size.isEmpty) {
      return null;
    }
    Rect read(RenderBox b) =>
        MatrixUtils.transformRect(b.getTransformTo(host), Offset.zero & b.size);
    var rect = read(box);
    // A button hugged by its glass bubble grows out of the bubble.
    final glass = GlassMemberBox.glassOf(origin);
    if (glass != null && glass.attached && glass.hasSize) {
      final bubble = read(glass);
      if (bubble.width - rect.width < 16) rect = bubble;
    }
    final state = key!.currentState;
    return (
      rect: rect,
      radius: rect.shortestSide / 2,
      state: state is _SheetSourceState ? state : null,
    );
  }

  void _endMorph() {
    final m = _morphing;
    _morphing = null;
    m?.state?.hidden = false;
    if (mounted) _tick.value++;
  }

  /// Settles a running morph at rest: a drag, a detent move or a dialog takes over.
  void _stopMorph() {
    if (_morphing == null) return;
    _morph.stop();
    _morph.set(1);
    _endMorph();
  }

  void _sync() {
    if (!_ready || !_mounted) return;
    final reduced = _reduced;
    final dialog = _presentation == SheetPresentation.dialog;
    final motion = motionOf(context);
    if (!_open) {
      _presented = false;
      final generation = _exitGeneration;
      // Unmounting the host returns focus.
      void done() {
        if (!mounted || _open || generation != _exitGeneration) return;
        setState(() {
          _mounted = false;
          _fading = false;
          _synced = null;
        });
        _visible.set(0);
        _shown.set(0);
        _lift.set(0);
        _dialogFade.set(1);
        _backdrop?.value = 0;
      }

      if (dialog) {
        // Like Modal: the panel and the dim fade out on one fixed curve that ends exactly at its
        // length (a spring's tail would leave it faintly on screen), while the move eases back.
        final fade = motionFade(motion, PopMotion.fadeOut);
        _shown.animateTo(
          0,
          spring: reduced
              ? Spring(duration: fade.inMicroseconds / 1e6, bounce: 0)
              : Springs.smooth,
          instant: fade == Duration.zero,
        );
        _dialogFade
            .easeTo(0, fade * _dialogFade.get(), curve: PopMotion.fadeCurve)
            .then((arrived) => arrived ? done() : null);
      } else if (reduced) {
        _stopMorph();
        // The panel fades out (_sheetFade), then unmounts once the fade has ended.
        final fade = motionFade(motion, _sheetFade);
        setState(() => _fading = true);
        if (fade == Duration.zero) {
          done();
        } else {
          Timer(fade + const Duration(milliseconds: 10), done);
        }
      } else {
        final back = !_draggedAway && !_dragging ? _sourceRect() : null;
        _draggedAway = false;
        if (back != null && !_visible.isAnimating) {
          // Fly back into the control that opened it.
          _morphing = (rect: back.rect, radius: back.radius, state: back.state);
          _morph.animateTo(0, spring: _morphClose).then((arrived) {
            if (!arrived) return;
            _endMorph();
            done();
          });
        } else {
          _moveTo(0).then((arrived) => arrived ? done() : null);
        }
      }
      return;
    }
    if (_fading) setState(() => _fading = false);
    if (dialog) {
      _stopMorph();
      _paintRecede();
      if (!_presented) {
        _presented = true;
        // Opened again while fading out: the fade turns back from where it is.
        _dialogFade.easeTo(
          1,
          motionFade(motion, PopMotion.fadeIn) * (1 - _dialogFade.get()),
          curve: PopMotion.fadeCurve,
        );
        if (!_shown.isAnimating) _shown.set(0);
        final fade = motionFade(motion, const Duration(milliseconds: 200));
        _shown.animateTo(
          1,
          spring: reduced
              ? Spring(duration: fade.inMicroseconds / 1e6, bounce: 0)
              : Springs.smooth,
          instant: fade == Duration.zero,
        );
      }
      return;
    }
    final target = _target;
    if (!_presented) {
      _presented = true;
      if (reduced) {
        _visible.set(target);
        return;
      }
      final from = !_visible.isAnimating && !_morph.isAnimating
          ? _sourceRect()
          : null;
      if (from != null) {
        // Grow out of the control that opened it: the panel takes its place at rest at once and
        // a clip the size of the control opens up to it.
        _morphing = from;
        _visible.stop();
        _visible.set(target);
        _morph.set(0);
        _morph.animateTo(1, spring: _morphOpen).then((arrived) {
          if (arrived) _endMorph();
        });
        return;
      }
      if (_morph.isAnimating && _morphing != null) {
        // Reopened while flying back into the source: turn around.
        _morph.animateTo(1, spring: _morphOpen).then((arrived) {
          if (arrived) _endMorph();
        });
        return;
      }
      // Reopened while still leaving: turn around from where it is.
      if (!_visible.isAnimating) _visible.set(0);
      _moveTo(target);
      return;
    }
    if (_dragging) return;
    if (_morphing != null) {
      // The detent moved while growing (a fit sheet measured late): the clip follows the panel.
      _visible.set(target);
      return;
    }
    if (_visible.isAnimating) {
      // The detent moved while rising (a fit sheet's content measured late): retarget in flight.
      if ((_visible.target - target).abs() >= 1) _moveTo(target);
    } else if ((_visible.get() - target).abs() < 1) {
      _visible.set(target);
    } else {
      _moveTo(target);
    }
  }

  void _setDetentIndex(int next) {
    final current = _index;
    setState(() {
      _freeHeight = null;
      _reported = null;
      if (widget.sheet.detent == null) _localIndex = next;
    });
    if (next != current) widget.sheet.onDetentChange?.call(_detents[next]);
  }

  /// A free sheet rests at [height]; the nearest detent is reported as its detent.
  void _settleFree(double height) {
    final current = _index;
    final next = nearestDetent(height, _heights);
    setState(() {
      _reported = _detents[next];
      _freeHeight = height;
      if (widget.sheet.detent == null) _localIndex = next;
    });
    if (next != current) widget.sheet.onDetentChange?.call(_detents[next]);
  }

  /// Where a released sheet goes (snap or free) at [velocity] (px/s, positive = growing).
  void _release(double velocity, bool cancelled) {
    final heights = _heights;
    if (heights.isEmpty) return;
    if (!widget.sheet.snap) {
      final landing = freeTarget(
        _visible.get(),
        velocity,
        heights,
        widget.sheet.dismissible,
      );
      if (landing.dismiss && !cancelled) return _dismissAway(velocity);
      final height = landing.dismiss ? _visible.get() : landing.height;
      _settleFree(height);
      _moveTo(height, Springs.release, velocity);
      return;
    }
    final landing = releaseTarget(
      _visible.get(),
      velocity,
      heights,
      widget.sheet.dismissible,
    );
    if (landing.dismiss && !cancelled) return _dismissAway(velocity);
    final next = landing.dismiss ? _index : landing.index;
    _setDetentIndex(next);
    _moveTo(
      next < heights.length ? heights[next] : landing.height,
      Springs.release,
      velocity,
    );
  }

  /// Leave at the finger's speed; the close that follows continues this same motion.
  void _dismissAway(double velocity) {
    _draggedAway = true;
    _visible.animateTo(0, spring: Springs.smooth, velocity: velocity);
    _close();
    // A host that keeps the sheet open gets it back at its detent.
    Timer(const Duration(milliseconds: 400), () {
      _draggedAway = false;
      if (mounted && _open && !_visible.isAnimating) _moveTo(_target);
    });
  }

  // ---- Content gestures on a resizable sheet (from [_SheetScrollPosition]) ----

  /// A touch on the content: a moving sheet stops under the finger.
  void _contentHold() {
    if (!_contentMovable) return;
    _wheelIdle?.cancel();
    if (_visible.isAnimating) {
      _visible.stop();
      _held = true;
    }
  }

  /// A drag over the content begins at [scroll].
  void _contentStart(double scroll) {
    _held = false;
    _dragging = true;
    _stopMorph();
    _visible.stop();
    _content = (raw: _visible.get(), scroll: scroll);
  }

  /// One finger movement over the content ([delta] > 0 moves the content up). Returns the scroll
  /// offset the content should take.
  double _contentDrag(double delta, double scroll, double scrollMax) {
    final state = _content ?? (raw: _visible.get(), scroll: scroll);
    final next = sheetScrollStep(state, delta, _maxHeight, scrollMax);
    _content = next;
    _visible.set(
      dragHeight(
        next.raw,
        _heights,
        _host?.height ?? 800,
        widget.sheet.dismissible,
      ),
    );
    return next.scroll;
  }

  /// The content drag ended with [velocity] (px/s, positive = content moving up). Returns true when
  /// the content should carry the fling itself (the sheet is at its full height).
  bool _contentEnd(double velocity) {
    final state = _content;
    _content = null;
    final held = _held;
    _held = false;
    if (state == null) {
      // A touch that held a moving sheet and lifted without dragging: settle again.
      if (held) _release(0, true);
      return true;
    }
    _dragging = false;
    final max = _maxHeight;
    if (state.raw >= max - 0.5) {
      if (state.raw > max + 0.5) _moveTo(max, Springs.release);
      // It rests at its highest detent: report it.
      if (widget.sheet.snap) {
        _setDetentIndex(_heights.indexOf(max));
      } else {
        _settleFree(max);
      }
      return true;
    }
    _release(velocity, false);
    return false;
  }

  /// The content, flung down, reached its top with [velocity] (px/s, negative) left: the rest
  /// carries the sheet down.
  void _contentHandOff(double velocity) {
    if (!mounted || !_open || _dragging) return;
    _release(velocity, false);
  }

  /// Whether a wheel or trackpad scroll of [delta] (> 0 = scrolling down) moves the sheet, with
  /// the content at [scroll].
  bool _wheelMoves(double delta, double scroll) {
    if (!_ready || !_open || _dragging) return false;
    if (_presentation == SheetPresentation.dialog) return false;
    final height = _visible.get();
    // A single-detent sheet can reverse a pull-to-dismiss before its content scrolls.
    if (delta > 0) return _contentMovable && height < _maxHeight - 0.5;
    if (delta >= 0 || scroll > 0) return false;
    return widget.sheet.dismissible
        ? height > 0.5
        : _resizable && height > _minHeight + 0.5;
  }

  void _onPointerSignal(PointerSignalEvent event) {
    if (event is! PointerScrollEvent) return;
    final delta = event.scrollDelta.dy;
    final scroll = _scroll.hasClients ? _scroll.positions.last.pixels : 0.0;
    if (delta == 0 || !_wheelMoves(delta, scroll)) return;
    GestureBinding.instance.pointerSignalResolver.register(
      event,
      (_) => _wheel(delta),
    );
  }

  /// Grows (scrolling down) or shrinks (scrolling up at the content's top) the sheet, and a
  /// dismissible one on below its lowest height until it closes ([wheelHeight]); a snapping sheet
  /// settles on a detent when the wheel stops.
  void _wheel(double delta) {
    _stopMorph();
    _visible.stop();
    _visible.set(
      wheelHeight(
        _visible.get(),
        delta,
        _minHeight,
        _maxHeight,
        widget.sheet.dismissible,
      ),
    );
    _wheelIdle?.cancel();
    _wheelIdle = Timer(const Duration(milliseconds: 160), _settleWheel);
  }

  void _settleWheel() {
    if (!mounted || !_open || _dragging || _visible.isAnimating) return;
    final height = _visible.get(), min = _minHeight;
    if (height < min - 0.5) {
      if (widget.sheet.dismissible && wheelDismisses(height, min)) {
        return _dismissAway(0);
      }
      if (widget.sheet.snap) {
        _setDetentIndex(_heights.indexOf(min));
      } else {
        _settleFree(min);
      }
      _moveTo(min, Springs.release);
      return;
    }
    if (widget.sheet.snap) {
      _release(0, true);
    } else {
      _settleFree(height);
    }
  }

  void _cycle(int step) {
    final heights = _heights;
    if (heights.isEmpty) return;
    final order = [for (var i = 0; i < heights.length; i++) i]
      ..sort((a, b) => heights[a].compareTo(heights[b]));
    final at = order.indexOf(_index);
    _setDetentIndex(order[(at + step + order.length) % order.length]);
  }

  /// Back down to where the page is usable, or closed.
  void _collapse() {
    final through = widget.sheet.backgroundInteraction, undimmed = _undimmed;
    if (through != null && undimmed != null && _target > undimmed + 0.5) {
      final i = _detents.indexOf(through);
      if (i >= 0) {
        _setDetentIndex(i);
        return;
      }
    }
    if (widget.sheet.dismissible) _close();
  }

  /// A text field focused inside raises the sheet ([Sheet.focusDetent]).
  void _onFocus() {
    if (!mounted || !_open || !_ready) return;
    if (_presentation == SheetPresentation.dialog) return;
    final focused = FocusManager.instance.primaryFocus?.context;
    if (focused == null || !focused.mounted) return;
    if (focused.findAncestorStateOfType<_SheetState>() != this) return;
    if (focused.widget is! EditableText &&
        focused.findAncestorWidgetOfExactType<EditableText>() == null) {
      return;
    }
    final next = focusRaise(
      _detents,
      _heights,
      _index,
      widget.sheet.focusDetent,
      raise: widget.sheet.raiseOnFocus,
    );
    if (next != null) _setDetentIndex(next);
  }

  // ---- Drag ----

  bool _contains(GlobalKey key, Offset global) {
    final box = key.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return false;
    return (Offset.zero & box.size).contains(box.globalToLocal(global));
  }

  /// The grabber row and the floating chrome: a finger there drags, never scrolls.
  bool _isChrome(Offset global) =>
      _contains(_grabberKey, global) ||
      _contains(_topKey, global) ||
      _contains(_bottomKey, global);

  /// A text field under the pointer keeps it (to place the caret and select).
  bool _onEditable(Offset global) {
    final host = _hostKey.currentContext?.findRenderObject();
    if (host is! RenderBox || !host.attached) return false;
    final result = BoxHitTestResult();
    host.hitTest(result, position: host.globalToLocal(global));
    return result.path.any((entry) => entry.target is RenderEditable);
  }

  double _localY(Offset global) {
    final box = _hostKey.currentContext?.findRenderObject();
    return box is RenderBox ? box.globalToLocal(global).dy : global.dy;
  }

  bool _canBegin(PointerDeviceKind kind, Offset global) {
    if (!_open || !_ready) return false;
    // A field keeps the mouse (text selection) and its own drags while focused; a finger dragging
    // across an unfocused field moves the sheet (a tap still focuses it), as in Maps.
    if (_onEditable(global) &&
        (kind == PointerDeviceKind.mouse || _fieldFocusedInside)) {
      return false;
    }
    final chrome = _isChrome(global);
    // The content's own scroll view drives resizes and pull-to-dismiss gestures.
    if (_contentMovable && !chrome) return false;
    return kind == PointerDeviceKind.touch ||
        kind == PointerDeviceKind.stylus ||
        kind == PointerDeviceKind.invertedStylus ||
        chrome;
  }

  /// A text field inside this sheet has focus.
  bool get _fieldFocusedInside {
    final focused = FocusManager.instance.primaryFocus?.context;
    if (focused == null || !focused.mounted) return false;
    if (focused.findAncestorStateOfType<_SheetState>() != this) return false;
    return focused.widget is EditableText ||
        focused.findAncestorWidgetOfExactType<EditableText>() != null;
  }

  bool _shouldStart(int direction, Offset global) {
    if (_presentation == SheetPresentation.dialog) {
      return direction == 1 && widget.sheet.dismissible && _isChrome(global);
    }
    if (_isChrome(global)) return true;
    // Down: only when the content is scrolled to the top. Up: while the sheet can still grow.
    if (direction == 1) return !(_scroll.hasClients && _scroll.offset > 1);
    return _visible.get() < _heights.reduce(math.max) - 1;
  }

  double _gestureY(PointerEvent event) => _localY(
    event.position +
        (event is PointerPanZoomUpdateEvent ? event.pan : Offset.zero),
  );

  void _onStart(PointerEvent event) {
    _dragging = true;
    _stopMorph();
    _wheelIdle?.cancel();
    _dragOrigin = _gestureY(event);
    _pointerTracker = VelocityTracker.withKind(event.kind)
      ..addPosition(event.timeStamp, Offset(0, _dragOrigin));
    final value = _presentation == SheetPresentation.dialog ? _lift : _visible;
    value.stop();
    _dragStart = value.get();
    _valueTracker = VelocityTracker.withKind(event.kind)
      ..addPosition(event.timeStamp, Offset(0, _dragStart));
  }

  void _onMove(PointerEvent event) {
    final y = _gestureY(event);
    _pointerTracker?.addPosition(event.timeStamp, Offset(0, y));
    final move = y - _dragOrigin;
    if (_presentation == SheetPresentation.dialog) {
      final lift = _dragStart + move;
      _lift.set(lift < 0 ? -rubberBand(-lift, 300) * 0.5 : lift);
      _valueTracker?.addPosition(event.timeStamp, Offset(0, _lift.get()));
      return;
    }
    _visible.set(
      dragHeight(
        _dragStart - move,
        _heights,
        _host?.height ?? 800,
        widget.sheet.dismissible,
      ),
    );
    _valueTracker?.addPosition(event.timeStamp, Offset(0, _visible.get()));
  }

  void _onEnd(bool cancelled) {
    _dragging = false;
    final vy = _pointerTracker?.getVelocity().pixelsPerSecond.dy ?? 0;
    final velocity = _valueTracker?.getVelocity().pixelsPerSecond.dy ?? 0;
    _pointerTracker = _valueTracker = null;
    if (_presentation == SheetPresentation.dialog) {
      final away =
          !cancelled &&
          widget.sheet.dismissible &&
          projectMomentum(_lift.get(), vy, 0.99) > 160;
      if (away) {
        _close();
        _lift.animateTo(0, spring: Springs.smooth);
      } else {
        _lift.animateTo(0, spring: Springs.release, velocity: velocity);
      }
      return;
    }
    _release(velocity, cancelled);
  }

  // ---- Build ----

  @override
  Widget build(BuildContext context) {
    _scheduleSync();
    return PresentationLayer(
      mounted: _mounted,
      inPlace: widget.sheet.container,
      builder: _hostView,
    );
  }

  Widget _hostView(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final presentation = _presentation;
    // Built once per change of state; motion frames only move, clip, size or fade it.
    final content = RepaintBoundary(child: _panel(context, presentation));
    final motion = ListenableBuilder(
      listenable: _tick,
      child: content,
      builder: (context, content) =>
          _motionView(context, content!, presentation),
    );
    Widget view = SizeReporter(
      key: _hostKey,
      onSize: (size) {
        if (size != _host) setState(() => _host = size);
      },
      child: motion,
    );
    if (!_hostModal) {
      // The page stays usable around the sheet: the host only hits the panel (and the scrim
      // while it dims).
      view = PassThrough(child: view);
    }
    // The on-screen keyboard: the sheet's host ends at its top edge, so detents, the dock and the
    // focused field stay above it. Children see no inset (it is already applied here).
    // Always wrapped (even at 0) so the tree does not change as the keyboard opens.
    final media = MediaQuery.of(context);
    final keyboard = media.viewInsets.bottom;
    view = Padding(
      padding: EdgeInsets.only(bottom: keyboard),
      child: MediaQuery(
        data: keyboard > 0
            ? media.copyWith(
                viewInsets: media.viewInsets.copyWith(bottom: 0),
                padding: media.padding.copyWith(bottom: 0),
              )
            : media,
        child: view,
      ),
    );
    return PresentationRouteScope.none(
      child: PresentationHost(
        label: widget.sheet.label,
        modal: _hostModal,
        onEscape: () {
          if (_open) _collapse();
        },
        initialFocus: widget.sheet.initialFocus,
        returnFocus: widget.sheet.returnFocus,
        child: DefaultTextStyle.merge(
          style: TextStyle(color: c.ink),
          child: view,
        ),
      ),
    );
  }

  /// The scrim and the panel at this motion frame.
  Widget _motionView(
    BuildContext context,
    Widget content,
    SheetPresentation presentation,
  ) {
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    final dialog = presentation == SheetPresentation.dialog;
    final host = _host;
    final v = _visible.get();
    final morph = _morph.get().clamp(0.0, 1.0);
    final p = _shown.get().clamp(0.0, 1.0) * _dialogFade.get().clamp(0.0, 1.0);
    final heights = _heights;
    final undimmed = _undimmed;
    final scrimOpacity = !_dims || _fading || !_ready || heights.isEmpty
        ? 0.0
        : dialog
        ? p
        : sheetDim(v, heights, undimmed, _large) * morph;
    // Below the undimmed detent the page under the scrim stays usable.
    final scrimTakesTaps = undimmed == null || scrimOpacity > 0.02;

    // While the panel moves, its glass rides it as is (no springs of its own) and leaves with it.
    Widget panel = GlassInstant(
      instant:
          _visible.isAnimating ||
          _shown.isAnimating ||
          _dialogFade.isAnimating ||
          _morph.isAnimating ||
          _dragging,
      child: content,
    );
    if (dialog) {
      final width = host == null ? 0.0 : math.min(560.0, host.width - 48);
      final shown = _shown.get();
      panel = Center(
        child: Opacity(
          opacity: p,
          child: Transform(
            alignment: Alignment.center,
            transform: Matrix4.translationValues(
              0,
              (1 - shown) * 28 + _lift.get(),
              0,
            )..scaleByDouble(0.96 + 0.04 * shown, 0.96 + 0.04 * shown, 1, 1),
            child: SizedBox(
              width: math.max(0, width),
              height: math.max(0, _dialogHeight),
              child: _DialogSurface(child: panel),
            ),
          ),
        ),
      );
    } else {
      panel = _sheetFrameView(context, panel, presentation, v);
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        if (_dims)
          Positioned.fill(
            child: IgnorePointer(
              ignoring: !scrimTakesTaps,
              child: PointerShield(
                enabled: scrimTakesTaps,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _open ? _collapse : null,
                  child: ExcludeSemantics(
                    child: Opacity(
                      opacity: scrimOpacity.clamp(0.0, 1.0),
                      // --lab-sheet-scrim: rgb(0 0 0 / 0.3), dark 0.55.
                      child: ColoredBox(color: black(dark ? 0.55 : 0.3)),
                    ),
                  ),
                ),
              ),
            ),
          ),
        Visibility(
          visible: _ready,
          maintainState: true,
          maintainAnimation: true,
          maintainSize: true,
          child: dialog ? panel : Stack(children: [panel]),
        ),
      ],
    );
  }

  /// A bottom sheet or card at height [v]: the surface (glass, with the opaque layer fading in)
  /// whose gap and bottom corners follow the height, and the content column at a fixed inset,
  /// moved and clipped while it grows out of its source.
  Widget _sheetFrameView(
    BuildContext context,
    Widget content,
    SheetPresentation presentation,
    double v,
  ) {
    final host = _host;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final inset = _inset;
    final radius = _radius;
    final width = host?.width ?? 0;
    // The panel's horizontal place: a card at the leading edge, a wide bottom sheet a readable
    // width, a phone sheet edge to edge.
    double left = 0, panelWidth = width;
    if (presentation == SheetPresentation.card) {
      panelWidth = math.min(width, widget.sheet.cardWidth + 2 * inset);
      left = rtl ? width - panelWidth : 0;
    } else if (width >= 720) {
      left = math.max(0.0, (width - 680) / 2);
      panelWidth = width - 2 * left;
    }
    final frame =
        _frame ?? (expansion: 0.0, gap: 0.0, bottomRadius: radius, solid: 1.0);
    final column = _columnInset;
    final height = math.max(0.0, v);
    Widget panel = Stack(
      fit: StackFit.expand,
      children: [
        Positioned(
          left: frame.gap,
          right: frame.gap,
          top: 0,
          bottom: frame.gap,
          // Over an embedded web page the sheet keeps the pointer; the gaps around it stay the
          // page's.
          child: PointerShield(
            child: SheetSurface(
              radii: [radius, radius, frame.bottomRadius, frame.bottomRadius],
              solid: frame.solid,
            ),
          ),
        ),
        Positioned(
          left: column,
          right: column,
          top: 0,
          bottom: column,
          child: PointerShield(child: content),
        ),
      ],
    );
    final m = _morphing;
    if (m != null && host != null) {
      final f = sheetMorphFrame(
        _morph.get(),
        Rect.fromLTWH(left, host.height - height, panelWidth, height),
        m.rect,
        m.radius,
        radius,
      );
      panel = Transform.translate(
        offset: Offset(f.dx, f.dy),
        child: ClipPath(
          clipper: _InsetClipper(f.side, f.bottom, f.radius),
          child: Opacity(opacity: f.content.clamp(0.0, 1.0), child: panel),
        ),
      );
    }
    // Stretched until the host is measured, so its content lays out at a real width at once.
    return Positioned(
      left: left,
      right: host == null ? 0 : width - left - panelWidth,
      bottom: 0,
      height: height,
      child: AnimatedOpacity(
        opacity: _fading ? 0 : 1,
        duration: motionFade(motionOf(context), _sheetFade),
        child: panel,
      ),
    );
  }

  Widget _panel(BuildContext context, SheetPresentation presentation) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final highContrast = MediaQuery.maybeHighContrastOf(context) ?? false;
    final dialog = presentation == SheetPresentation.dialog;
    final attached =
        !dialog &&
        _mode == SheetFrameMode.attached &&
        !widget.sheet.roundedBottom;
    final r = dialog ? s.radiusPanel : _radius;
    final radii = [r, r, attached ? 0.0 : r, attached ? 0.0 : r];
    final header =
        widget.sheet.header ??
        PresentationHeader(
          title: widget.sheet.title,
          leading: widget.sheet.leading,
          trailing: widget.sheet.trailing,
          onClose: widget.sheet.showClose ? _close : null,
          closeLabel: I18n.of(context)
              .t('lab.composer.closeLabel', {'label': widget.sheet.label}),
        );
    final dock = widget.sheet.dock;
    final index = _index;
    final content = SheetScope._(
      detent: _detents[index],
      expansion: _expansion,
      height: _height,
      presentation: presentation,
      setDetent: (d) {
        final i = _detents.indexOf(d);
        if (i >= 0) _setDetentIndex(i);
      },
      // The grabber takes an 8 px band and its button reaches over the body's top gap, above the
      // floats, so the floating header sits 16 px from the edge.
      child: Stack(
        children: [
          Positioned.fill(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.sheet.builder != null)
                  ..._builtContent(context, header, dock)
                else
                  Expanded(
                    child: PresentationBody(
                      label: widget.sheet.label,
                      controller: _scroll,
                      fill: true,
                      contentPadding:
                          widget.sheet.contentPadding ??
                          (widget.sheet.regular == SheetRegular.pane
                              ? 16
                              : null),
                      // Glass under the floats' washes until the surface turns opaque.
                      surface: c.surface,
                      radius: r,
                      // Keyed so a drag that starts on the chrome is told from one on the content.
                      top: KeyedSubtree(
                        key: _topKey,
                        child: SizeReporter(
                          onSize: (size) {
                            if (mounted && size.height != _headerHeight) {
                              setState(() => _headerHeight = size.height);
                            }
                          },
                          child: header,
                        ),
                      ),
                      bottom: dock == null
                          ? null
                          : KeyedSubtree(key: _bottomKey, child: dock),
                      onNaturalHeight: (height) {
                        if (height != _bodyNatural) {
                          setState(() => _bodyNatural = height);
                        }
                      },
                      child: widget.sheet.child,
                    ),
                  ),
              ],
            ),
          ),
          if (_showGrabber)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Center(
                child: KeyedSubtree(
                  key: _grabberKey,
                  child: SheetGrabber(
                    onNext: () => _cycle(1),
                    onPrevious: () => _cycle(-1),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
    return RawGestureDetector(
      gestures: {
        _SheetDragRecognizer:
            GestureRecognizerFactoryWithHandlers<_SheetDragRecognizer>(
              () => _SheetDragRecognizer(debugOwner: this),
              (r) => r
                ..canBegin = _canBegin
                ..shouldStart = _shouldStart
                ..onStart = _onStart
                ..onMove = _onMove
                ..onEnd = _onEnd,
            ),
      },
      // Wheels the content's scroll view does not take (scrolling up at its top, or content that
      // does not scroll) still move the sheet.
      child: Listener(
        onPointerSignal: _onPointerSignal,
        child: Semantics(
          container: true,
          explicitChildNodes: true,
          child: CustomPaint(
            // The forced-colors outline; the surface paints the rest.
            foregroundPainter: highContrast
                ? _OutlinePainter(radii: radii, color: c.ink)
                : null,
            child: ClipPath(
              clipper: _SuperellipseClipper(radii),
              // Taps inside the panel never reach the scrim.
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {},
                // Overflow hidden: while it leaves, the panel can be shorter than its grabber row.
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final height = math.max(constraints.maxHeight, 20.0);
                    return OverflowBox(
                      alignment: Alignment.topCenter,
                      minHeight: height,
                      maxHeight: height,
                      child: content,
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// A [Sheet.builder]'s content: the header on top (a drag handle), the content with the
  /// sheet's scroll controller under it, the dock floating over its bottom.
  /// The builder's content with the sheet's scroll controller handed down to it.
  Widget _builderBody(BuildContext context) => ScrollAreaPrimary(
    controller: _scroll,
    child: PrimaryScrollController(
      controller: _scroll,
      automaticallyInheritForPlatforms: TargetPlatform.values.toSet(),
      child: Builder(
        builder: (context) => widget.sheet.builder!(context, _scroll),
      ),
    ),
  );

  List<Widget> _builtContent(
    BuildContext context,
    Widget header,
    Widget? dock,
  ) {
    final g = ThemeProvider.of(context).sizes.shellGap;
    // Stacked, not in a column: while the sheet enters it can be shorter than its header, and
    // then it clips instead of overflowing.
    return [
      Expanded(
        child: Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned.fill(
              top: _headerHeight > 0 ? g + _headerHeight : 0,
              // Laid out at least as tall as it rests at the target height and clipped while the
              // sheet moves, so nothing inside squeezes or relayouts on every frame of a motion.
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final rest =
                      _target -
                      (_showGrabber ? sheetGrabberBand : 0) -
                      _columnInset -
                      (_headerHeight > 0 ? g + _headerHeight : 0);
                  final height = math.max(constraints.maxHeight, rest);
                  return OverflowBox(
                    alignment: Alignment.topCenter,
                    minHeight: height,
                    maxHeight: height,
                    child: _builderBody(context),
                  );
                },
              ),
            ),
            Positioned(
              top: g,
              left: g,
              right: g,
              child: KeyedSubtree(
                key: _topKey,
                child: SizeReporter(
                  onSize: (size) {
                    if (mounted && size.height != _headerHeight) {
                      setState(() => _headerHeight = size.height);
                    }
                  },
                  child: header,
                ),
              ),
            ),
            if (dock != null)
              Positioned(
                left: g,
                right: g,
                bottom: g,
                child: KeyedSubtree(key: _bottomKey, child: dock),
              ),
          ],
        ),
      ),
    ];
  }
}

/// How much of the sheet's height the grabber takes; its 16 px button reaches over the body's top
/// gap (`.lab-sheet-grabber-row`).
const double sheetGrabberBand = 8;

/// The sheet's grabber (`.lab-sheet-grabber`): a 64×16 button at the top edge that changes the
/// height ([onNext] on a tap, Enter or Arrow Up; [onPrevious] on Arrow Down), with the
/// keyboard focus ring just inside. [Sheet] draws one when it has more than one detent; use it in
/// your own sheet-like surfaces.
class SheetGrabber extends StatefulWidget {
  const SheetGrabber({
    super.key,
    required this.onNext,
    required this.onPrevious,
  });

  /// The next height up (wrapping around to the lowest).
  final VoidCallback onNext;

  /// The next height down.
  final VoidCallback onPrevious;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ObjectFlagProperty<VoidCallback>.has('onNext', onNext))
      ..add(ObjectFlagProperty<VoidCallback>.has('onPrevious', onPrevious));
  }

  @override
  State<SheetGrabber> createState() => _SheetGrabberState();
}

class _SheetGrabberState extends State<SheetGrabber> {
  bool _focusVisible = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('focusVisible', value: _focusVisible, ifTrue: 'focus ring'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      width: 64,
      height: 16,
      child: Center(
        child: Semantics(
          button: true,
          label: I18n.of(context).t('lab.sheet.grabber'),
          onIncrease: widget.onNext,
          onDecrease: widget.onPrevious,
          child: FocusableActionDetector(
            mouseCursor: SystemMouseCursors.grab,
            onShowFocusHighlight: (value) =>
                setState(() => _focusVisible = value),
            shortcuts: const {
              SingleActivator(LogicalKeyboardKey.arrowUp): _CycleIntent(1),
              SingleActivator(LogicalKeyboardKey.arrowDown): _CycleIntent(-1),
            },
            actions: {
              ActivateIntent: CallbackAction<ActivateIntent>(
                onInvoke: (_) {
                  widget.onNext();
                  return null;
                },
              ),
              _CycleIntent: CallbackAction<_CycleIntent>(
                onInvoke: (intent) {
                  intent.step > 0 ? widget.onNext() : widget.onPrevious();
                  return null;
                },
              ),
            },
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onNext,
              child: CustomPaint(
                size: const Size(64, 16),
                painter: _GrabberPainter(
                  pill: mixSrgb(c.ink, 0.22, transparent),
                  focus: _focusVisible
                      ? FocusRingStyle.of(context, inside: true)
                      : null,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A sheet's surface (`.lab-sheet-surface`): the thick glass menus and alerts use ([MenuMaterial]),
/// its shadow and rim, and the opaque surface over it at [solid] (`.lab-sheet-solid`). Opaque
/// under `GlassStyle.solid` and more contrast. Taps on it never reach the page. [Sheet] sizes it
/// from [sheetFrame] every frame (the gap, the bottom corners and [solid] follow the height); use
/// it to give your own floating panels the same material.
class SheetSurface extends StatelessWidget {
  const SheetSurface({super.key, required this.radii, this.solid = 0});

  /// Corner radii: top-left, top-right, bottom-right, bottom-left.
  final List<double> radii;

  /// Opacity 0–1 of the opaque surface over the glass ([SheetFrame.solid]).
  final double solid;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<double>('radii', radii))
      ..add(DoubleProperty('solid', solid, defaultValue: 0.0));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final dark = theme.brightness == Brightness.dark;
    final glass = MenuMaterial.of(context);
    final opaque = glass.solid || glass.contrast ? 1.0 : solid.clamp(0.0, 1.0);
    final fill = ColoredBox(color: glass.fill);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {},
      child: CustomPaint(
        // --lab-sheet-shadow: 0 -6px 36px -14px rgb(0 0 0 / 0.26), dark 0.7.
        painter: _ShadowPainter(
          dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
          radii: radii,
          color: glass.contrast ? null : black(dark ? 0.7 : 0.26),
          offsetY: -6,
          blur: 36,
          spread: -14,
        ),
        child: ClipPath(
          clipper: _SuperellipseClipper(radii),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Fully opaque: the backdrop under it is never seen, so it is not filtered.
              if (opaque < 1)
                glass.solid || !glassFiltersBackdropOf(context)
                    ? fill
                    : BackdropFilter(filter: glass.filter, child: fill),
              if (opaque < 1)
                CustomPaint(
                  painter: _RimPainter(
                    radii: radii,
                    line: mixSrgb(c.line, 0.7, transparent),
                    light: c.glassEdgeLow,
                  ),
                ),
              if (opaque > 0)
                Opacity(
                  opacity: opaque,
                  child: ColoredBox(color: c.surface),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The dialog presentation's opaque card: `0 30px 80px -24px rgb(0 0 0 / 0.4)`.
class _DialogSurface extends StatelessWidget {
  const _DialogSurface({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final r = theme.sizes.radiusPanel;
    final radii = [r, r, r, r];
    return CustomPaint(
      painter: _ShadowPainter(
        dpr: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
        radii: radii,
        color: black(0.4),
        offsetY: 30,
        blur: 80,
        spread: -24,
        fill: theme.colors.surface,
      ),
      child: child,
    );
  }
}

/// CSS `inset(0 side bottom side round radius)`.
class _InsetClipper extends CustomClipper<Path> {
  const _InsetClipper(this.side, this.bottom, this.radius);
  final double side, bottom, radius;

  @override
  Path getClip(Size size) {
    final rect = Rect.fromLTRB(
      side,
      0,
      math.max(side, size.width - side),
      math.max(0, size.height - bottom),
    );
    return superellipsePath(rect, [radius, radius, radius, radius]);
  }

  @override
  bool shouldReclip(_InsetClipper old) =>
      old.side != side || old.bottom != bottom || old.radius != radius;
}

/// The surface's outer box-shadow (outside the shape only, like CSS), and an optional fill.
class _ShadowPainter extends CustomPainter {
  const _ShadowPainter({
    required this.dpr,
    required this.radii,
    required this.color,
    required this.offsetY,
    required this.blur,
    required this.spread,
    this.fill,
  });

  final List<double> radii;
  final Color? color, fill;
  final double offsetY, blur, spread;

  /// The device pixel ratio the still shadow is rendered at.
  final double dpr;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    if (rect.isEmpty) return;
    final shape = superellipsePath(rect, radii);
    final shadowRect = rect.inflate(spread);
    final color = this.color;
    if (color != null && !shadowRect.isEmpty) {
      // Rendered once per size ([paintStill]): a wide blur under a sheet otherwise costs a
      // Gaussian pass on every frame it is open.
      final reach = rect.inflate(blur * 2 + offsetY.abs());
      paintStill(
        canvas,
        key: (
          'sheet-shadow',
          size.width,
          size.height,
          radii.first,
          color.toARGB32(),
          offsetY,
          blur,
          spread,
        ),
        bounds: reach,
        dpr: dpr,
        draw: (canvas) {
          canvas.save();
          canvas.clipPath(
            Path.combine(
              PathOperation.difference,
              Path()..addRect(reach),
              shape,
            ),
          );
          canvas.drawPath(
            superellipsePath(shadowRect, [
              for (final r in radii) math.max(0.0, r + spread),
            ]).shift(Offset(0, offsetY)),
            Paint()
              ..color = color
              ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur / 2),
          );
          canvas.restore();
        },
      );
    }
    final fill = this.fill;
    if (fill != null) canvas.drawPath(shape, Paint()..color = fill);
  }

  @override
  bool shouldRepaint(_ShadowPainter old) =>
      old.dpr != dpr ||
      !_sameRadii(old.radii, radii) ||
      old.color != color ||
      old.fill != fill ||
      old.offsetY != offsetY ||
      old.blur != blur ||
      old.spread != spread;
}

/// The glass rim: `inset 0 0 0 1px` line at 70 % and `--lab-glass-light` (edge-low along the top,
/// 6 % black along the bottom).
class _RimPainter extends CustomPainter {
  const _RimPainter({
    required this.radii,
    required this.line,
    required this.light,
  });
  final List<double> radii;
  final Color line, light;

  @override
  void paint(Canvas canvas, Size size) {
    final box = Offset.zero & size;
    if (box.isEmpty) return;
    // CSS inset shadows on a borderless box: each band is the outermost 1px row, so the ring
    // (listed before them, painted over them) covers the light at 70 %.
    final shape = superellipsePath(box, radii);
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        shape,
        shape.shift(const Offset(0, 1)),
      ),
      Paint()..color = light,
    );
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        shape,
        shape.shift(const Offset(0, -1)),
      ),
      Paint()..color = black(0.06),
    );
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
      !_sameRadii(old.radii, radii) || old.line != line || old.light != light;
}

/// Forced colors: an ink outline around the panel.
class _OutlinePainter extends CustomPainter {
  const _OutlinePainter({required this.radii, required this.color});
  final List<double> radii;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    canvas.drawPath(
      superellipsePath(Offset.zero & size, radii, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_OutlinePainter old) =>
      !_sameRadii(old.radii, radii) || old.color != color;
}

class _CycleIntent extends Intent {
  const _CycleIntent(this.step);
  final int step;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(IntProperty('step', step));
  }
}

class _SuperellipseClipper extends CustomClipper<Path> {
  const _SuperellipseClipper(this.radii);
  final List<double> radii;

  @override
  Path getClip(Size size) => superellipsePath(Offset.zero & size, radii);

  @override
  bool shouldReclip(_SuperellipseClipper old) => !_sameRadii(old.radii, radii);
}

bool _sameRadii(List<double> a, List<double> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// `.lab-sheet-grabber::before`: 36×5 at (14, 6), radius 3; the keyboard focus ring just inside,
/// radius 10.
class _GrabberPainter extends CustomPainter {
  const _GrabberPainter({required this.pill, this.focus});
  final Color pill;
  final FocusRingStyle? focus;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawPath(
      superellipsePath(const Rect.fromLTWH(14, 6, 36, 5), [3, 3, 3, 3]),
      Paint()..color = pill,
    );
    final f = focus;
    if (f != null) paintFocusRing(canvas, Offset.zero & size, 10, f);
  }

  @override
  bool shouldRepaint(_GrabberPainter old) =>
      old.pill != pill || old.focus != focus;
}

/// The content's scroll controller on a sheet: its positions hand content gestures to the sheet.
class _SheetScrollController extends ScrollController {
  _SheetScrollController(this.sheet);
  final _SheetState sheet;

  @override
  ScrollPosition createScrollPosition(
    ScrollPhysics physics,
    ScrollContext context,
    ScrollPosition? oldPosition,
  ) => _SheetScrollPosition(
    sheet: sheet,
    // Content shorter than its view still takes drags: they move the sheet.
    physics: AlwaysScrollableScrollPhysics(parent: physics),
    context: context,
    oldPosition: oldPosition,
  );
}

/// The scroll position of a sheet's content, the technique of Flutter's
/// DraggableScrollableSheet: on a resizable sheet a drag over the content moves the sheet first
/// and the content second ([sheetScrollStep]: grow, then scroll; scroll back, then shrink), a
/// release below full height settles the sheet, a fling at full height scrolls the content and,
/// reaching its top going down, hands what is left of its speed to the sheet. Wheels and
/// trackpads grow the sheet before scrolling it.
class _SheetScrollPosition extends ScrollPositionWithSingleContext {
  _SheetScrollPosition({
    required this.sheet,
    required super.physics,
    required super.context,
    super.oldPosition,
  });

  final _SheetState sheet;

  @override
  ScrollHoldController hold(VoidCallback holdCancelCallback) {
    sheet._contentHold();
    return super.hold(holdCancelCallback);
  }

  @override
  Drag drag(DragStartDetails details, VoidCallback dragCancelCallback) {
    if (sheet._contentMovable) sheet._contentStart(pixels);
    return super.drag(details, dragCancelCallback);
  }

  @override
  void applyUserOffset(double delta) {
    if (!sheet._contentMovable) return super.applyUserOffset(delta);
    // delta > 0: the finger moves down (the content too).
    final scroll = sheet._contentDrag(
      -delta,
      pixels.clamp(minScrollExtent, maxScrollExtent),
      maxScrollExtent - minScrollExtent,
    );
    final move = scroll - pixels;
    if (move.abs() > precisionErrorTolerance) super.applyUserOffset(-move);
  }

  @override
  void goBallistic(double velocity) {
    if (!sheet._contentMovable) return super.goBallistic(velocity);
    // velocity > 0: the content moves up (the scroll offset grows).
    if (!sheet._contentEnd(velocity)) return super.goBallistic(0);
    super.goBallistic(velocity);
  }

  @override
  double setPixels(double newPixels) {
    final current = activity;
    if (sheet._contentMovable &&
        current is BallisticScrollActivity &&
        current.velocity < 0 &&
        newPixels < minScrollExtent &&
        pixels > minScrollExtent - precisionErrorTolerance) {
      // A fling down reached the top: stop here and give what is left to the sheet.
      final velocity = current.velocity;
      final overscroll = newPixels - minScrollExtent;
      super.setPixels(minScrollExtent);
      scheduleMicrotask(() => sheet._contentHandOff(velocity));
      return overscroll;
    }
    return super.setPixels(newPixels);
  }

  @override
  void pointerScroll(double delta) {
    // A single wheel event can cross the boundary: do not discard its remainder
    // at the highest detent or at the content's top.
    if (delta > 0 && sheet._wheelMoves(delta, pixels)) {
      final grow = math.min(delta, sheet._maxHeight - sheet._visible.get());
      sheet._wheel(grow);
      final remainder = delta - grow;
      if (remainder > precisionErrorTolerance) super.pointerScroll(remainder);
      return;
    }
    if (delta < 0 && sheet._contentMovable) {
      final back = math.min(-delta, math.max(0.0, pixels - minScrollExtent));
      if (back > precisionErrorTolerance) super.pointerScroll(-back);
      final remainder = delta + back;
      if (remainder < -precisionErrorTolerance &&
          sheet._wheelMoves(remainder, pixels)) {
        sheet._wheel(remainder);
      }
      return;
    }
    super.pointerScroll(delta);
  }
}

/// Vertical drag for the sheet that decides within 4px (before a scroll view's touch slop), so it
/// can take the gesture from the content when the sheet should move, or hand it back.
class _SheetDragRecognizer extends OneSequenceGestureRecognizer {
  _SheetDragRecognizer({super.debugOwner});

  // ignore: diagnostic_describe_all_properties
  late bool Function(PointerDeviceKind kind, Offset global) canBegin;
  // ignore: diagnostic_describe_all_properties
  late bool Function(int direction, Offset global) shouldStart;
  // ignore: diagnostic_describe_all_properties
  late void Function(PointerEvent event) onStart;
  // ignore: diagnostic_describe_all_properties
  late void Function(PointerEvent event) onMove;
  // ignore: diagnostic_describe_all_properties
  late void Function(bool cancelled) onEnd;

  int? _pointer;
  Offset _down = Offset.zero;
  bool _decided = false, _started = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    // The callbacks are late and always set by the gesture factory: not read here.
    properties
      ..add(IntProperty('pointer', _pointer, defaultValue: null))
      ..add(FlagProperty('decided', value: _decided, ifTrue: 'decided'))
      ..add(FlagProperty('started', value: _started, ifTrue: 'dragging'));
  }

  @override
  bool isPointerAllowed(PointerDownEvent event) =>
      _pointer == null &&
      super.isPointerAllowed(event) &&
      canBegin(event.kind, event.position);

  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    _pointer = event.pointer;
    _down = event.position;
    _decided = _started = false;
  }

  @override
  bool isPointerPanZoomAllowed(PointerPanZoomStartEvent event) =>
      _pointer == null &&
      super.isPointerPanZoomAllowed(event) &&
      canBegin(event.kind, event.position);

  @override
  void addAllowedPointerPanZoom(PointerPanZoomStartEvent event) {
    startTrackingPointer(event.pointer, event.transform);
    _pointer = event.pointer;
    _down = event.position;
    _decided = _started = false;
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event.pointer != _pointer) return;
    if (event is PointerMoveEvent || event is PointerPanZoomUpdateEvent) {
      if (_started) {
        onMove(event);
        return;
      }
      if (_decided) return;
      final d = event is PointerPanZoomUpdateEvent
          ? event.pan
          : event.position - _down;
      if (d.distance < 4) return;
      _decided = true;
      if (d.dy.abs() < d.dx.abs() || !shouldStart(d.dy >= 0 ? 1 : -1, _down)) {
        resolve(GestureDisposition.rejected);
        stopTrackingPointer(event.pointer);
        return;
      }
      resolve(GestureDisposition.accepted);
      _started = true;
      // Measured from here so the sheet does not jump by the threshold distance.
      onStart(event);
    } else if (event is PointerUpEvent ||
        event is PointerCancelEvent ||
        event is PointerPanZoomEndEvent) {
      if (_started) {
        _started = false;
        onEnd(event is PointerCancelEvent);
      } else {
        resolve(GestureDisposition.rejected);
      }
      stopTrackingPointer(event.pointer);
    }
  }

  @override
  void acceptGesture(int pointer) {}

  @override
  void rejectGesture(int pointer) {
    if (_started) {
      _started = false;
      onEnd(true);
    }
    stopTrackingPointer(pointer);
  }

  @override
  void didStopTrackingLastPointer(int pointer) => _pointer = null;

  @override
  String get debugDescription => 'sheet drag';
}
