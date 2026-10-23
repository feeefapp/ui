import 'dart:math' as math;
import 'dart:ui' show SemanticsRole;

import 'package:flutter/rendering.dart' show OverflowBoxFit;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../scroll/scroll_area.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../layout/size_reporter.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../scaffold.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
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

  /// Short label in sentence case (one word is best), usually a Text.
  final Widget label;

  /// Icon shown above (phones) or before (wide) the label.
  final Widget icon;

  /// A count or dot on the icon, e.g. unconfirmed orders.
  final Widget? badge;

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
/// of `TabView` in `@feeef.dev/ui/containers/tab-view`. The bar's height (+12px) is reserved in
/// every panel through [ScrollExtraBottom].
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

  /// Called when the person picks another tab.
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
  final _nodes = <String, FocusNode>{};

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
      final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
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
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  FocusNode _node(String id) =>
      _nodes.putIfAbsent(id, () => FocusNode(debugLabel: 'Tab $id'));

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

  void _pick(Tab tab) {
    _setMinimized(false);
    if (tab.id != widget.value) {
      widget.onChange(tab.id);
      return;
    }
    final reselect = widget.onReselect;
    if (reselect != null) {
      reselect(tab.id);
      return;
    }
    final position = _scrollableIn(tab.id)?.position;
    if (position == null) return;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
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

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final tabs = widget.tabs;
    if (tabs.isEmpty) return KeyEventResult.ignored;
    final index = tabs.indexWhere((t) => t.id == widget.value);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final key = event.logicalKey;
    var next = -1;
    if (key == LogicalKeyboardKey.arrowRight ||
        key == LogicalKeyboardKey.arrowLeft) {
      final delta = (key == LogicalKeyboardKey.arrowRight) != rtl ? 1 : -1;
      next = (index + delta + tabs.length) % tabs.length;
    } else if (key == LogicalKeyboardKey.home) {
      next = 0;
    } else if (key == LogicalKeyboardKey.end) {
      next = tabs.length - 1;
    }
    if (next < 0) return KeyEventResult.ignored;
    widget.onChange(tabs[next].id);
    _node(tabs[next].id).requestFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final scale = theme.sizes.radiusScale;
    final safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    return LayoutBuilder(
      builder: (context, constraints) {
        // Wide (container ≥ 600px): icon and label in one row.
        final wide = constraints.maxWidth >= 600;
        final tabHeight = wide ? 44.0 : 52.0;
        final chromeWidth = math.max(0.0, constraints.maxWidth - 24);
        final panels = [
          for (final tab in widget.tabs)
            if (_visited.contains(tab.id)) _panel(tab),
        ];

        final bar = Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onKeyEvent: _onKey,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            excludeFromSemantics: true,
            onTap: _minimized ? () => _setMinimized(false) : null,
            child: GlassGroup(
              glassId: 'tabs',
              radius: 30 * scale,
              padding: const EdgeInsets.all(4),
              child: Semantics(
                container: true,
                role: SemanticsRole.tabBar,
                label: widget.label,
                explicitChildNodes: true,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 2,
                  children: [
                    for (final tab in widget.tabs)
                      Flexible(
                        child: _TabButton(
                          key: ValueKey(tab.id),
                          tab: tab,
                          selected: tab.id == widget.value,
                          minimized: _minimized,
                          wide: wide,
                          height: tabHeight,
                          focusNode: _node(tab.id),
                          onTap: () =>
                              _minimized ? _setMinimized(false) : _pick(tab),
                        ),
                      ),
                  ],
                ),
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
        final chrome = GlassScope(
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
            spacing: 8,
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
        );

        return DecoratedBox(
          decoration: BoxDecoration(color: c.surface),
          child: ClipRect(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ...panels,
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: 12 + safe.bottom,
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
      child: ScrollExtraBottom(value: _chrome + 12, child: tab.content),
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

/// One tab: icon (with badge) and label; springs its width when the bar minimizes.
class _TabButton extends StatefulWidget {
  const _TabButton({
    super.key,
    required this.tab,
    required this.selected,
    required this.minimized,
    required this.wide,
    required this.height,
    required this.focusNode,
    required this.onTap,
  });
  final Tab tab;
  final bool selected, minimized, wide;
  final double height;
  final FocusNode focusNode;
  final VoidCallback onTap;

  @override
  State<_TabButton> createState() => _TabButtonState();
}

class _TabButtonState extends State<_TabButton> {
  bool _hovered = false, _down = false, _focusVisible = false;
  late final MotionValue _min, _max, _pad;
  final _unsubscribe = <void Function()>[];

  ({double min, double max, double pad}) get _target {
    if (widget.minimized) {
      return widget.selected
          ? (min: 52, max: 52, pad: 0)
          : (min: 0, max: 0, pad: 0);
    }
    return widget.wide
        ? (min: 68, max: 180, pad: 16)
        : (min: 68, max: 120, pad: 10);
  }

  @override
  void initState() {
    super.initState();
    final t = _target;
    _min = MotionValue(t.min, 0.1);
    _max = MotionValue(t.max, 0.1);
    _pad = MotionValue(t.pad, 0.1);
    for (final v in [_min, _max, _pad]) {
      _unsubscribe.add(v.subscribe((_) => setState(() {})));
    }
  }

  @override
  void didUpdateWidget(_TabButton old) {
    super.didUpdateWidget(old);
    final t = _target;
    // Width and padding ride the snappy spring (`springTiming(SPRINGS.snappy)` in CSS).
    final instant =
        (MediaQuery.maybeDisableAnimationsOf(context) ?? false) ||
        old.wide != widget.wide;
    _min.animateTo(t.min, spring: Springs.snappy, instant: instant);
    _max.animateTo(t.max, spring: Springs.snappy, instant: instant);
    _pad.animateTo(t.pad, spring: Springs.snappy, instant: instant);
  }

  @override
  void dispose() {
    for (final u in _unsubscribe) {
      u();
    }
    for (final v in [_min, _max, _pad]) {
      v.stop();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final scale = theme.sizes.radiusScale;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final selected = widget.selected;
    final ink = selected ? c.ink : c.muted;
    final fill = selected
        ? mixSrgb(c.primary, 0.16, transparent)
        : _hovered || _focusVisible
        ? c.controlHover
        : transparent;
    final radius = 26 * scale;
    final pad = math.max(0.0, _pad.get());
    final maxWidth = math.max(0.0, _max.get());
    final minWidth = math.min(maxWidth, math.max(0.0, _min.get()));
    final labelSize = widget.wide ? 14.0 : 11.0;
    // `.lab-tab-label`: 11px / 13px, wide 14px / 17px.
    final lineHeight = widget.wide ? 17.0 : 13.0;

    final icon = SizedBox.square(
      dimension: 24,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          IconTheme.merge(
            data: IconThemeData(size: 22, color: ink),
            child: widget.tab.icon,
          ),
          if (widget.tab.badge != null)
            PositionedDirectional(
              top: -5,
              start: 14,
              child: _Badge(child: widget.tab.badge!),
            ),
        ],
      ),
    );
    final label = DefaultTextStyle.merge(
      style: TextStyle(
        fontSize: labelSize,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        height: lineHeight / labelSize,
        leadingDistribution: TextLeadingDistribution.even,
        color: ink,
      ),
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.ellipsis,
      child: CssBaseline(lineHeight: lineHeight, child: widget.tab.label),
    );
    final children = [
      icon,
      if (!widget.minimized) widget.wide ? Flexible(child: label) : label,
    ];
    final content = Padding(
      padding: EdgeInsets.symmetric(horizontal: pad),
      child: widget.wide
          ? Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 8,
              children: children,
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 2,
              children: children,
            ),
    );

    Widget box = SizedBox(
      height: widget.height,
      child: ConstrainedBox(
        constraints: BoxConstraints(minWidth: minWidth, maxWidth: maxWidth),
        child: ClipPath(
          clipper: _Superellipse(radius),
          child: OverflowBox(
            fit: OverflowBoxFit.deferToChild,
            minWidth: 0,
            // Never narrower than the icon: a collapsing tab clips around its centered icon.
            maxWidth: math.max(maxWidth, 24 + pad * 2),
            child: content,
          ),
        ),
      ),
    );
    box = TweenAnimationBuilder<Color?>(
      tween: ColorTween(end: fill),
      duration: reduced ? Duration.zero : MotionTokens.durationFast,
      curve: MotionTokens.ease,
      builder: (context, color, child) => DecoratedBox(
        decoration: ShapeDecoration(
          color: color,
          shape: SuperellipseBorder(radius: radius),
        ),
        position: DecorationPosition.background,
        child: child,
      ),
      child: box,
    );
    box = FocusRing(
      visible: _focusVisible,
      inside: true,
      radius: radius,
      child: box,
    );
    box = AnimatedOpacity(
      opacity: widget.minimized && !selected ? 0 : 1,
      duration: reduced ? Duration.zero : const Duration(milliseconds: 160),
      curve: Curves.ease,
      child: Transform.scale(scale: _down ? 0.96 : 1, child: box),
    );

    return MergeSemantics(
      child: Semantics(
        role: SemanticsRole.tab,
        selected: selected,
        button: true,
        onTap: widget.onTap,
        // Only the selected tab is a Tab stop; arrows reach the others.
        child: ExcludeFocusTraversal(
          excluding: !selected,
          child: FocusableActionDetector(
            focusNode: widget.focusNode,
            mouseCursor: SystemMouseCursors.click,
            onShowHoverHighlight: (v) => setState(() => _hovered = v),
            onShowFocusHighlight: (v) => setState(() => _focusVisible = v),
            actions: {
              ActivateIntent: CallbackAction<ActivateIntent>(
                onInvoke: (_) => widget.onTap(),
              ),
            },
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapDown: (_) => setState(() => _down = true),
              onTapUp: (_) => setState(() => _down = false),
              onTapCancel: () => setState(() => _down = false),
              onTap: widget.onTap,
              child: box,
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-tab-badge`: a danger pill on the icon.
class _Badge extends StatelessWidget {
  const _Badge({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 18),
      child: Container(
        height: 18,
        padding: const EdgeInsets.symmetric(horizontal: 5),
        decoration: ShapeDecoration(
          color: c.danger,
          shape: const SuperellipseBorder(radius: 9),
        ),
        alignment: Alignment.center,
        child: DefaultTextStyle.merge(
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            height: 18 / 11,
            leadingDistribution: TextLeadingDistribution.even,
            color: c.surface,
          ),
          textAlign: TextAlign.center,
          maxLines: 1,
          softWrap: false,
          child: CssBaseline(lineHeight: 18, child: child),
        ),
      ),
    );
  }
}

class _Superellipse extends CustomClipper<Path> {
  _Superellipse(this.radius);
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(Offset.zero & size, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_Superellipse old) => old.radius != radius;
}
