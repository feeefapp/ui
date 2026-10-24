import 'dart:math' as math;
import 'dart:ui' show SemanticsRole;

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

  @override
  State<TabView> createState() => _TabViewState();
}

class _TabViewState extends State<TabView> {
  late final Set<String> _visited = {widget.value};
  bool _minimized = false;

  /// `--lab-tab-chrome`: the full chrome's measured height (64 before the first layout).
  double _chrome = 64;
  final _last = Expando<double>('tab scroll top');
  final _panelKeys = <String, GlobalKey>{};

  /// A switched-to panel fades in quickly; it never slides (tabs are siblings, not depth).
  final _fade = MotionValue(1, 0.004);
  final _opacity = ValueNotifier<double>(1);
  void Function()? _unsubscribe;

  @override
  void initState() {
    super.initState();
    _unsubscribe = _fade.subscribe((v) => _opacity.value = v);
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
  }

  @override
  void dispose() {
    _unsubscribe?.call();
    _fade.stop();
    _opacity.dispose();
    super.dispose();
  }

  void _setMinimized(bool next) {
    if (next != _minimized) setState(() => _minimized = next);
  }

  /// Shrink while the person reads down; come back when they scroll up or reach the top.
  bool _onScroll(String id, ScrollUpdateNotification n) {
    if (widget.minimize != TabMinimize.scroll || id != widget.value) {
      return false;
    }
    if (n.metrics.axis != Axis.vertical) return false;
    final key = n.context;
    if (key == null) return false;
    final top = n.metrics.pixels;
    final previous = _last[key] ?? 0;
    _last[key] = top;
    if (top < 24) {
      _setMinimized(false);
    } else if (top - previous > 6) {
      _setMinimized(true);
    } else if (previous - top > 10) {
      _setMinimized(false);
    }
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
    // A tap on the small bar only brings it back.
    if (_minimized && source == SelectionSource.press) {
      _setMinimized(false);
      return;
    }
    _setMinimized(false);
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
        // Wide (container ≥ 600px): icon and label in one row.
        final wide = constraints.maxWidth >= 600;
        final tabHeight = wide ? 44.0 : 52.0;
        final chromeWidth = math.max(0.0, constraints.maxWidth - inset * 2);
        final panels = [
          for (final tab in widget.tabs)
            if (_visited.contains(tab.id)) _panel(tab),
        ];

        // The tabs: a selection track (`.lab-tab-track`) with tab semantics, stacked options and
        // a tinted pill, 4px inset, tabs 2px apart, 68–120px wide (wide: a row, up to 180px).
        // Minimized it folds to the selected tab. Never wider than the chrome, so it scrolls
        // when the tabs don't fit.
        final bar = GestureDetector(
          behavior: HitTestBehavior.opaque,
          excludeFromSemantics: true,
          onTap: _minimized ? () => _setMinimized(false) : null,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: chromeWidth),
            child: GlassGroup(
              glassId: 'tabs',
              radius: 30 * scale,
              child: SelectionTrack<String>(
                semantics: SelectionSemantics.tab,
                layout: SelectionLayout.stacked,
                pill: SelectionPill.tinted,
                sizes: wide ? _wideTabs : _tabs,
                label: widget.label,
                value: widget.value,
                onSelect: _select,
                draggable: !_minimized,
                collapsed: _minimized,
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
            ),
          ),
        );

        Widget? accessory;
        if (widget.accessory != null) {
          // min-height 52 (border-box), stretched to the bar's height when beside it.
          final minHeight = _minimized ? tabHeight + 10 : 52.0;
          accessory = GlassGroup(
            glassId: 'accessory',
            radius: 26 * scale,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: minHeight - 10),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                widthFactor: 1,
                child: widget.accessory,
              ),
            ),
          );
          accessory = SizedBox(
            width: _minimized ? null : math.min(chromeWidth, 420),
            child: accessory,
          );
        }

        // One Flex for both layouts, so minimizing never remounts the bar (its glass and tab
        // springs keep running): a column (accessory above the bar), or a row in reversed reading
        // order where the current tab leads and the accessory fills the rest.
        final rtl = Directionality.of(context) == TextDirection.rtl;
        final chrome = GlassBar(
          child: GlassScope(
            child: Flex(
              direction: _minimized ? Axis.horizontal : Axis.vertical,
              mainAxisSize: _minimized ? MainAxisSize.max : MainAxisSize.min,
              // Reversed, "end" is the reading start: a lone bar still leads.
              mainAxisAlignment: _minimized
                  ? MainAxisAlignment.end
                  : MainAxisAlignment.start,
              textDirection: _minimized
                  ? (rtl ? TextDirection.ltr : TextDirection.rtl)
                  : null,
              spacing: ThemeProvider.of(context).sizes.toolbarGap,
              children: [
                if (accessory != null)
                  Flexible(
                    flex: _minimized ? 1 : 0,
                    fit: FlexFit.tight,
                    child: accessory,
                  ),
                bar,
              ],
            ),
          ),
        );

        return DecoratedBox(
          decoration: BoxDecoration(color: c.surface),
          child: ClipRect(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ...panels,
                // A floating bar: --lab-toolbar-inset (the shell gap G by default) from the panel.
                Positioned(
                  left: inset,
                  right: inset,
                  bottom: inset + safe.bottom,
                  child: SizeReporter(
                    onSize: (size) {
                      // Measured only while full: shrinking the reserve would clamp scroll
                      // positions and read as a scroll up, expanding the bar again.
                      if (!mounted || _minimized || size.height == _chrome) {
                        return;
                      }
                      setState(() => _chrome = size.height);
                    },
                    child: Align(
                      alignment: _minimized
                          ? AlignmentDirectional.centerStart
                          : Alignment.center,
                      heightFactor: 1,
                      child: chrome,
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
        value: _chrome + ThemeProvider.of(context).sizes.toolbarInset,
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

/// `.lab-tab-track`: 52px tabs, 68–120px wide, 10px sides, 11px / 13px labels under the icon.
const _tabs = SelectionTrackSizes(
  height: 52,
  inset: 4,
  gap: 2,
  padding: 10,
  minWidth: 68,
  maxWidth: 120,
  fontSize: 11,
  lineHeight: 13,
);

/// Wide (`@container lab-tab-view (min-width: 600px)`): 44px tabs up to 180px, 16px sides, 14px /
/// 17px labels beside the icon.
const _wideTabs = SelectionTrackSizes(
  height: 44,
  inset: 4,
  gap: 2,
  padding: 16,
  minWidth: 68,
  maxWidth: 180,
  fontSize: 14,
  lineHeight: 17,
  direction: Axis.horizontal,
);
