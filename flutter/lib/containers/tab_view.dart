import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../scroll/scroll_area.dart';

import '../glass/container.dart';
import '../layout/size_reporter.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../primitives/segmented.dart' show SegmentOption;
import '../primitives/segmented_model.dart' show SelectionSemantics;
import '../primitives/selection_track.dart';
import '../scaffold.dart';
import '../theme.dart';
import '../theme/tokens.dart';
import 'tab_view_minimize.dart';

/// One top-level destination of a [TabView].
@immutable
class Tab {
  const Tab({
    required this.id,
    required this.label,
    required this.icon,
    this.badge,
    required this.content,
  });

  /// Stable id; also the value of `value`.
  final String id;

  /// Short label in sentence case (one word is best).
  final String label;

  /// Icon shown above (phones) or before (wide) the label.
  final Widget icon;

  /// A short count on the icon's corner for something that needs action, e.g. unconfirmed orders
  /// ("8"). It is part of the tab's accessible name ("Orders, 8").
  final String? badge;

  /// The tab's content, usually a NavigationStack. It stays mounted while other tabs show.
  final Widget content;
}

/// How the tab bar reacts to scrolling.
enum TabMinimize {
  /// The bar shrinks to the selected tab while content scrolls down and comes back on scroll up
  /// or a tap, like iOS 26.
  scroll,

  /// The bar stays full.
  never,
}

/// App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
/// tab bar switches between them, and while the person scrolls down it shrinks to the selected
/// tab so content gets the screen. Picking the current tab again returns it to the top. The twin
/// of `TabView` in `@feeef.dev/ui/containers/tab-view`. The bar's height (+ the toolbar inset) is
/// reserved in every panel through [ScrollExtraBottom].
///
/// The bar is a segmented control with tab semantics (the shared selection track): press the
/// selected tab and it becomes a glass lens you can drag across the tabs; the tab under it on
/// release is chosen. Tabs can carry a count ([Tab.badge]).
class TabView extends StatefulWidget {
  const TabView({
    super.key,
    required this.tabs,
    required this.value,
    required this.onChange,
    this.onReselect,
    this.minimize = TabMinimize.scroll,
    this.accessory,
    this.label = 'Tabs',
    this.showBar = true,
  });

  /// 2–5 top-level destinations.
  final List<Tab> tabs;

  /// Selected tab id (controlled).
  final String value;

  /// Called when the person picks another tab: a tap, a drag of the selection released on it, or
  /// an arrow, Home or End key (tabs activate as the keyboard reaches them).
  final ValueChanged<String> onChange;

  /// Called when the person picks the tab that is already selected: pop its stack to the root,
  /// or (the default) scroll its content back to the top.
  final ValueChanged<String>? onReselect;

  /// `scroll` (default) minimizes the bar while content scrolls down; `never` keeps it full.
  final TabMinimize minimize;

  /// A persistent control beside the tabs (a mini player, a call in progress). Sits above the bar,
  /// and beside it when minimized.
  final Widget? accessory;

  /// Accessible name of the tab bar.
  final String label;

  /// Shows the floating phone tab bar. Set false when the same destinations live in a
  /// wide scaffold sidebar; mounted panels and their state stay intact, with no bar reservation.
  final bool showBar;

  @override
  State<TabView> createState() => _TabViewState();
}

class _TabViewState extends State<TabView> {
  late final Set<String> _visited = {widget.value};

  /// Past halfway minimized: a press on the bar only brings it back and the pill can't be dragged.
  bool _minimized = false;

  /// `--lab-tab-chrome`: the full chrome's measured height (64 before the first layout).
  double _chrome = 64;
  final _panelKeys = <String, GlobalKey>{};

  /// A switched-to panel fades in quickly; it never slides (tabs are siblings, not depth).
  final _fade = MotionValue(1, 0.004);
  final _opacity = ValueNotifier<double>(1);
  final _unsubscribe = <void Function()>[];

  // Minimizing is one progress value, 0 (full bar, accessory above) to 1 (the selected tab as a
  // bubble with the accessory beside it). Scrolling moves it directly, so the morph follows the
  // finger and reverses with it; when scrolling stops it settles on the nearer end. Every frame
  // places the pieces from boxes measured at rest (tab_view_minimize.dart) and asks the chrome's
  // glass container to re-measure, so the material tracks the bubbles exactly.
  final _progress = MotionValue(0, 0.001);
  final _minimize = SelectionMinimize();
  final _frame = ValueNotifier<MinimizeFrame?>(null);
  MinimizeBoxes? _boxes;
  GlassMemberRegistry? _glass;
  Timer? _idle;

  /// With reduced motion, the scroll position's progress: the bar shows only its nearer end.
  double _reducedProgress = 0;
  final _chromeKey = GlobalKey();
  final _barKey = GlobalKey();
  final _trackKey = GlobalKey();
  final _accessoryKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _unsubscribe
      ..add(_fade.subscribe((v) => _opacity.value = v))
      ..add(_progress.subscribe(_paint));
  }

  @override
  void didUpdateWidget(TabView old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) {
      _visited.add(widget.value);
      final reduced = reducedMotionOf(context);
      if (reduced) {
        _fade.set(1);
      } else {
        _fade.set(0);
        _fade.animateTo(1, spring: const Spring(duration: 0.22, bounce: 0));
      }
    }
    if ((old.accessory == null) != (widget.accessory == null)) _boxes = null;
    if (widget.minimize == TabMinimize.never && _progress.get() > 0) {
      _settle(0);
    }
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    _idle?.cancel();
    _fade.stop();
    _progress.stop();
    _opacity.dispose();
    _frame.dispose();
    _minimize.dispose();
    super.dispose();
  }

  void _setMinimized(bool next) {
    if (next != _minimized) setState(() => _minimized = next);
  }

  /// The boxes of the full chrome, in its own pixels (measured on the first minimizing frame,
  /// while the layout is still the full bar's).
  MinimizeBoxes? _measure() {
    final chrome = _chromeKey.currentContext?.findRenderObject() as RenderBox?;
    if (chrome == null || !chrome.attached || !chrome.hasSize) return null;
    Rect? local(GlobalKey key) {
      final box = key.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached || !box.hasSize) return null;
      return MatrixUtils.transformRect(
        box.getTransformTo(chrome),
        Offset.zero & box.size,
      );
    }

    final bar = local(_barKey);
    final track = local(_trackKey);
    final selected = _minimize.measure(chrome);
    if (bar == null || track == null || selected == null) return null;
    return MinimizeBoxes(
      chrome: Offset.zero & chrome.size,
      bar: bar,
      track: track.width,
      option: selected.option,
      icon: selected.icon,
      accessory: local(_accessoryKey),
      gap: ThemeProvider.of(context).sizes.toolbarGap,
      rtl: Directionality.of(context) == TextDirection.rtl,
    );
  }

  void _paint(double p) {
    if (!mounted) return;
    if (p <= 0) {
      _boxes = null;
      _minimize.set(0, Offset.zero);
      _frame.value = null;
      _glass?.requestMeasure();
      return;
    }
    final at = _boxes ??= _measure();
    if (at == null) return;
    final frame = minimizeGeometry(at, p);
    _minimize.set(p, frame.icon);
    _frame.value = frame;
    _glass?.requestMeasure();
  }

  /// Springs to one end (a tap on the small bar, a tab change, scrolling stopped halfway).
  void _settle(int to) {
    _idle?.cancel();
    _reducedProgress = to.toDouble();
    _setMinimized(to == 1);
    if (reducedMotionOf(context)) {
      _progress.stop();
      _progress.set(to.toDouble());
      return;
    }
    _progress.animateTo(to.toDouble(), spring: Springs.snappy);
  }

  /// Scrolling the visible tab drives the progress: down shrinks, up (or reaching the top)
  /// restores.
  bool _onScroll(String id, ScrollUpdateNotification n) {
    if (!widget.showBar) return false;
    if (widget.minimize != TabMinimize.scroll || id != widget.value) {
      return false;
    }
    if (n.metrics.axis != Axis.vertical) return false;
    final delta = n.scrollDelta ?? 0;
    final top = n.metrics.pixels;
    if (reducedMotionOf(context)) {
      // Reduced motion: the bar jumps between its ends, never showing a frame between them.
      _reducedProgress = minimizeProgress(_reducedProgress, delta, top);
      final end = _reducedProgress >= 0.5 ? 1 : 0;
      if (end != _progress.get()) _settle(end);
      return false;
    }
    final next = minimizeProgress(_progress.get(), delta, top);
    _progress.stop();
    _progress.set(next);
    _setMinimized(next >= 0.5);
    _idle?.cancel();
    _idle = Timer(const Duration(milliseconds: 140), () {
      if (!mounted) return;
      final p = _progress.get();
      if (p > 0 && p < 1) _settle(p >= 0.5 ? 1 : 0);
    });
    return false;
  }

  /// The panel's first vertical scroll view (the web kit's first `.lab-scroll-viewport`).
  ScrollableState? _scrollableIn(String id) {
    final root = _panelKeys[id]?.currentContext;
    if (root == null) return null;
    ScrollableState? found;
    void visit(Element element) {
      if (found != null) return;
      if (element is StatefulElement &&
          element.state is ScrollableState &&
          (element.state as ScrollableState).position.axis == Axis.vertical) {
        found = element.state as ScrollableState;
        return;
      }
      element.visitChildren(visit);
    }

    (root as Element).visitChildren(visit);
    return found;
  }

  void _reselect(String id) {
    final reselect = widget.onReselect;
    if (reselect != null) {
      reselect(id);
      return;
    }
    final position = _scrollableIn(id)?.position;
    if (position == null) return;
    final reduced = reducedMotionOf(context);
    if (reduced) {
      position.jumpTo(0);
    } else {
      position.animateTo(
        0,
        duration: const Duration(milliseconds: 420),
        curve: MotionTokens.ease,
      );
    }
  }

  void _select(String id, SelectionSource source) {
    // Keys activate the tab they reach and leave the bar as it is.
    if (source == SelectionSource.key) {
      widget.onChange(id);
      return;
    }
    // A press on the small bar only brings it back.
    if (_minimized && source == SelectionSource.press) {
      _settle(0);
      return;
    }
    _settle(0);
    if (id == widget.value) {
      _reselect(id);
    } else {
      widget.onChange(id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final scale = theme.sizes.radiusScale;
    final safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final inset = theme.sizes.toolbarInset;
    return LayoutBuilder(
      builder: (context, constraints) {
        // Wide (container ≥ 600px): icon and label in one row, the bar as wide as its tabs.
        final wide = constraints.maxWidth >= 600;
        final chromeWidth = math.max(0.0, constraints.maxWidth - inset * 2);
        final panels = [
          for (final tab in widget.tabs)
            if (_visited.contains(tab.id)) _panel(tab),
        ];
        final track = KeyedSubtree(
          key: _trackKey,
          child: SelectionTrack<String>(
            semantics: SelectionSemantics.tab,
            layout: SelectionLayout.stacked,
            equalWidth: true,
            sizes: wide ? _wideTabs : _tabs,
            label: widget.label,
            value: widget.value,
            onSelect: _select,
            draggable: !_minimized,
            minimize: _minimize,
            options: [
              for (final tab in widget.tabs)
                SegmentOption(
                  value: tab.id,
                  label: tab.label,
                  icon: tab.icon,
                  badge: tab.badge,
                ),
            ],
          ),
        );
        final accessory = widget.accessory;
        final gap = theme.sizes.toolbarGap;

        final chrome = ValueListenableBuilder<MinimizeFrame?>(
          valueListenable: _frame,
          builder: (context, frame, _) {
            final at = frame == null ? null : _boxes;
            // iOS 27's bar: a 62pt capsule (+ the 1px border) as wide as the chrome allows, 90pt
            // a tab; wide, as wide as its tabs. Minimizing, it clips the tabs (held at their
            // resting width) and moves them so the selected one ends centred in the circle.
            final barHeight = frame?.bar.height ?? 0;
            final radius = frame == null
                ? 31 * scale
                : math.min(31 * scale, barHeight / 2);
            Widget bar = GlassGroup(
              glassId: 'tabs',
              glassMotion: GlassMotion.follow,
              radius: radius,
              child: ClipRRect(
                clipBehavior: frame == null ? Clip.none : Clip.antiAlias,
                borderRadius: BorderRadius.circular(math.max(0, radius - 1)),
                child: OverflowBox(
                  alignment: Alignment.topLeft,
                  fit: OverflowBoxFit.deferToChild,
                  minWidth: at?.track,
                  maxWidth: at?.track,
                  maxHeight: at == null ? null : double.infinity,
                  child: Transform.translate(
                    offset: frame?.trackShift ?? Offset.zero,
                    child: track,
                  ),
                ),
              ),
            );
            bar = wide
                ? ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: chromeWidth),
                    child: IntrinsicWidth(child: bar),
                  )
                : SizedBox(
                    width: math.min(
                      chromeWidth,
                      widget.tabs.length * 90.0 + 16,
                    ),
                    child: bar,
                  );
            bar = GestureDetector(
              key: _barKey,
              behavior: HitTestBehavior.opaque,
              excludeFromSemantics: true,
              onTap: _minimized ? () => _settle(0) : null,
              child: bar,
            );
            return Column(
              key: _chromeKey,
              mainAxisSize: MainAxisSize.min,
              spacing: gap,
              children: [
                if (accessory != null)
                  _Placed(
                    rest: at?.accessory,
                    to: frame?.accessory,
                    looseHeight: true,
                    child: KeyedSubtree(
                      key: _accessoryKey,
                      child: SizedBox(
                        width: frame == null
                            ? math.min(chromeWidth, 420)
                            : null,
                        child: GlassGroup(
                          glassId: 'accessory',
                          glassMotion: GlassMotion.follow,
                          radius: 26 * scale,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          // min-height 52 (border-box).
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minHeight: 42),
                            child: Align(
                              alignment: AlignmentDirectional.centerStart,
                              widthFactor: 1,
                              child: accessory,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                _Placed(rest: at?.bar, to: frame?.bar, child: bar),
              ],
            );
          },
        );

        return DecoratedBox(
          decoration: BoxDecoration(color: c.surface),
          child: ClipRect(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ...panels,
                // A floating bar: --lab-toolbar-inset (the shell gap G by default) from the panel,
                // the accessory --lab-toolbar-gap above it.
                if (widget.showBar)
                  Positioned(
                    left: inset,
                    right: inset,
                    bottom: inset + safe.bottom,
                    child: SizeReporter(
                      onSize: (size) {
                        // Measured only while full: shrinking the reserve would clamp scroll
                        // positions and read as a scroll up, expanding the bar again.
                        if (!mounted ||
                            _progress.get() > 0 ||
                            size.height == _chrome) {
                          return;
                        }
                        setState(() => _chrome = size.height);
                      },
                      child: GlassBar(
                        child: GlassScope(
                          child: Builder(
                            builder: (context) {
                              _glass = GlassMember.of(context);
                              return chrome;
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _panel(Tab tab) {
    final active = tab.id == widget.value;
    final key = _panelKeys.putIfAbsent(tab.id, GlobalKey.new);
    Widget content = NotificationListener<ScrollUpdateNotification>(
      onNotification: (n) => _onScroll(tab.id, n),
      child: ScrollExtraBottom(
        value: widget.showBar
            ? _chrome + ThemeProvider.of(context).sizes.toolbarInset
            : 0,
        child: tab.content,
      ),
    );
    // The wrapper stays the same for every panel so switching never remounts content.
    content = ValueListenableBuilder<double>(
      valueListenable: _opacity,
      builder: (context, v, child) =>
          Opacity(opacity: active ? v.clamp(0.0, 1.0) : 1, child: child),
      child: content,
    );
    return Positioned.fill(
      key: ValueKey(tab.id),
      child: Offstage(
        offstage: !active,
        child: TickerMode(
          enabled: active,
          child: ExcludeFocus(
            excluding: !active,
            child: Semantics(
              container: true,
              role: SemanticsRole.tabPanel,
              child: KeyedSubtree(key: key, child: content),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-tab-track` (iOS 27): 54pt tabs in a 4pt inset sharing the bar equally, overlapping by
/// 8pt, at least 72 wide; padding 6 / 8 / 7, the glyph in a 28pt line over a Semibold 10 / 12
/// label, 0.5pt apart.
const _tabs = SelectionTrackSizes(
  height: 54,
  inset: 4,
  gap: 0,
  overlap: 8,
  padding: 8,
  paddingTop: 6,
  paddingBottom: 7,
  minWidth: 72,
  fontSize: 10,
  lineHeight: 12,
  iconLine: 28,
  contentGap: 0.5,
);

/// Wide (`@container lab-tab-view (min-width: 600px)`): 44px tabs, 16px sides, 14px / 17px labels
/// beside the icon, 8px apart.
const _wideTabs = SelectionTrackSizes(
  height: 44,
  inset: 4,
  gap: 0,
  overlap: 8,
  padding: 16,
  fontSize: 14,
  lineHeight: 17,
  iconLine: 28,
  contentGap: 8,
  direction: Axis.horizontal,
);

/// A piece of the chrome placed by the minimize geometry: at rest ([rest] null) it lays out as its
/// child; minimizing, it keeps the size it had at rest (so the chrome keeps its height) and draws
/// its child in [to] (relative to the chrome, like [rest]), the child's height its own when
/// [looseHeight].
class _Placed extends SingleChildRenderObjectWidget {
  const _Placed({
    required this.rest,
    required this.to,
    this.looseHeight = false,
    required super.child,
  });
  final Rect? rest, to;
  final bool looseHeight;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderPlaced(rest, to, looseHeight);

  @override
  void updateRenderObject(BuildContext context, _RenderPlaced renderObject) {
    renderObject
      ..rest = rest
      ..to = to
      ..looseHeight = looseHeight;
  }
}

class _RenderPlaced extends RenderShiftedBox {
  _RenderPlaced(this._rest, this._to, this._looseHeight) : super(null);

  Rect? _rest;
  set rest(Rect? value) {
    if (value == _rest) return;
    _rest = value;
    markNeedsLayout();
  }

  Rect? _to;
  set to(Rect? value) {
    if (value == _to) return;
    _to = value;
    markNeedsLayout();
  }

  bool _looseHeight;
  set looseHeight(bool value) {
    if (value == _looseHeight) return;
    _looseHeight = value;
    markNeedsLayout();
  }

  bool get _placing => _rest != null && _to != null;

  /// Placed, the child is hit where it is drawn, outside this box's resting bounds too.
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!_placing) return super.hitTest(result, position: position);
    if (!hitTestChildren(result, position: position)) return false;
    result.add(BoxHitTestEntry(this, position));
    return true;
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) => _placing
      ? constraints.constrain(_rest!.size)
      : child?.getDryLayout(constraints) ?? constraints.smallest;

  @override
  void performLayout() {
    final child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    final data = child.parentData! as BoxParentData;
    if (!_placing) {
      child.layout(constraints, parentUsesSize: true);
      size = child.size;
      data.offset = Offset.zero;
      return;
    }
    final to = _to!;
    child.layout(
      BoxConstraints(
        minWidth: to.width,
        maxWidth: to.width,
        minHeight: _looseHeight ? 0 : to.height,
        maxHeight: _looseHeight ? double.infinity : to.height,
      ),
      parentUsesSize: true,
    );
    size = constraints.constrain(_rest!.size);
    data.offset = to.topLeft - _rest!.topLeft;
  }
}
