import 'dart:math' as math;
import 'dart:ui' show ViewFocusEvent, ViewFocusState;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_shader.dart';
import '../brand/pixel_noise.dart' show TextureDensity, TextureVariant;
import '../brand/pixel_texture.dart';
import '../glass/container.dart';
import '../glass/member.dart' show GlassHidden, GlassMemberBox;
import '../glass/material.dart' show GlassKind;
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../physics/layout_group.dart';
import '../primitives/button.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';
import '../theme/surfaces.dart';
import '../theme/color_mix.dart';
import '../theme/tokens.dart';
import '../toolbar.dart';

/// Sidebar width: `expanded` (304px), `rail` (64px icons) or `hidden` (0).
enum ScaffoldSideMode { expanded, rail, hidden }

/// What [Scaffold.of] returns: the twin of `ScaffoldState` from `useScaffold()` in
/// `@feeef.dev/ui/workspace/scaffold`.
@immutable
class ScaffoldState {
  const ScaffoldState({
    required this.compact,
    required this.sideMode,
    required this.setSideMode,
    required this.cycleSide,
    required this.drawerOpen,
    required this.setDrawerOpen,
  });

  /// True below the compact breakpoint: the sidebar is replaced by a modal drawer.
  final bool compact;

  /// Current sidebar mode (ignored while compact).
  final ScaffoldSideMode sideMode;

  /// Sets the sidebar mode and calls `onSideModeChange`.
  final ValueChanged<ScaffoldSideMode> setSideMode;

  /// Steps expanded → rail → hidden → expanded.
  final VoidCallback cycleSide;

  /// Whether the compact drawer is open.
  final bool drawerOpen;

  /// Opens or closes the compact drawer.
  final ValueChanged<bool> setDrawerOpen;

  @override
  bool operator ==(Object other) =>
      other is ScaffoldState &&
      other.compact == compact &&
      other.sideMode == sideMode &&
      other.drawerOpen == drawerOpen;

  @override
  int get hashCode => Object.hash(compact, sideMode, drawerOpen);
}

/// Builds the content panel in place of the default scroll area. Receives the [appBar] and
/// [bottom] slots so an editor with its own ScrollArea can float them itself.
typedef ScaffoldViewportBuilder = Widget Function(
  BuildContext context,
  Widget? appBar,
  Widget? bottom,
);

/// `--lab-sidebar-width`: [Metrics.sidebarWidth] when set, else by density (304 / 248 / 224 px).
double scaffoldSidebarWidth(
  Density density, [
  Metrics metrics = const Metrics(),
]) =>
    metrics.sidebarWidth ??
    switch (density) {
      Density.comfortable => 304,
      Density.compact => 248,
      Density.thin => 224,
    };

/// `--lab-navigation-rail-width`: [Metrics.railWidth] when set, else by density (64 / 52 / 44 px).
double scaffoldRailWidth(
  Density density, [
  Metrics metrics = const Metrics(),
]) =>
    metrics.railWidth ??
    switch (density) {
      Density.comfortable => 64,
      Density.compact => 52,
      Density.thin => 44,
    };

/// Workspace layout: optional top row, a glass sidebar (expanded, rail or hidden) and an edge-to-edge
/// content viewport with floating app bar and bottom slots. Fills its parent's height. Below the
/// compact breakpoint the sidebar moves into a modal drawer. The twin of `Scaffold` in
/// `@feeef.dev/ui/workspace/scaffold`; read its state below it with [Scaffold.of].
class Scaffold extends StatefulWidget {
  const Scaffold({
    super.key,
    this.renderViewport,
    this.child,
    this.side,
    this.topSide,
    this.appBar,
    this.bottom,
    this.glassSidebar = true,
    this.extendBodyBehindSidebar = false,
    this.contentController,
    this.contentLabel = 'Workspace content',
    this.sideMode,
    this.defaultSideMode = ScaffoldSideMode.expanded,
    this.onSideModeChange,
    this.compact,
    this.compactBreakpoint = 720,
    this.drawerReturnFocus,
    this.drawerLabel = 'Workspace navigation',
    this.drawerCloseLabel = 'Close',
    this.textDirection,
  });

  /// Replaces the default content scroll area; [child] is then not rendered.
  final ScaffoldViewportBuilder? renderViewport;

  /// Page content, rendered inside the content panel's scroll area.
  final Widget? child;

  /// Sidebar content, usually a [ScaffoldSide]. Rendered in the drawer when compact.
  final Widget? side;

  /// Full-width row above the sidebar and content, usually a [ScaffoldTopBar].
  final Widget? topSide;

  /// Floats over the top of the content panel, usually a [ScaffoldAppBar].
  final Widget? appBar;

  /// Floats over the bottom of the content panel, usually a Dock.
  final Widget? bottom;

  /// Floats navigation on glass and leaves the main viewport edge to edge.
  final bool glassSidebar;

  /// Places the viewport beneath the sidebar and adds its occupied width to
  /// the viewport's directional MediaQuery padding. Canvas gestures can span
  /// the workspace while SafeArea and ScrollArea keep controls in reach.
  final bool extendBodyBehindSidebar;

  /// Controller of the content scroll viewport (the web kit's `contentViewportRef`).
  final ScrollController? contentController;

  /// Accessible name of the content scroll region.
  final String contentLabel;

  /// Controlled sidebar mode. Pair with [onSideModeChange].
  final ScaffoldSideMode? sideMode;

  /// Initial sidebar mode when uncontrolled.
  final ScaffoldSideMode defaultSideMode;

  /// Called whenever the sidebar mode changes (toggle button, `setSideMode`, `cycleSide`).
  final ValueChanged<ScaffoldSideMode>? onSideModeChange;

  /// Override for embedded previews; otherwise the host's width selects compact mode.
  final bool? compact;

  /// Host width in px below which the scaffold becomes compact.
  final double compactBreakpoint;

  /// Receives focus when the compact drawer closes (default: what had focus before it opened).
  final FocusNode? drawerReturnFocus;

  /// Accessible name of the compact drawer dialog.
  final String drawerLabel;

  /// Accessible name of the drawer's close button.
  final String drawerCloseLabel;

  /// Text direction for the scaffold and its drawer. Inherited when omitted.
  final TextDirection? textDirection;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty(
          'extendBodyBehindSidebar',
          value: extendBodyBehindSidebar,
          ifTrue: 'full viewport',
        ),
      )
      ..add(
        DiagnosticsProperty<bool>(
          'glassSidebar',
          glassSidebar,
          defaultValue: true,
        ),
      )
      ..add(
        ObjectFlagProperty<ScaffoldViewportBuilder?>.has(
          'renderViewport',
          renderViewport,
        ),
      )
      ..add(
        DiagnosticsProperty<ScrollController?>(
          'contentController',
          contentController,
          defaultValue: null,
        ),
      )
      ..add(
        StringProperty(
          'contentLabel',
          contentLabel,
          defaultValue: 'Workspace content',
        ),
      )
      ..add(
        EnumProperty<ScaffoldSideMode?>(
          'sideMode',
          sideMode,
          defaultValue: null,
        ),
      )
      ..add(
        EnumProperty<ScaffoldSideMode>(
          'defaultSideMode',
          defaultSideMode,
          defaultValue: ScaffoldSideMode.expanded,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<ScaffoldSideMode>?>.has(
          'onSideModeChange',
          onSideModeChange,
        ),
      )
      ..add(
        FlagProperty(
          'compact',
          value: compact,
          ifTrue: 'compact',
          ifFalse: 'not compact',
        ),
      )
      ..add(
        DoubleProperty(
          'compactBreakpoint',
          compactBreakpoint,
          defaultValue: 720,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'drawerReturnFocus',
          drawerReturnFocus,
          defaultValue: null,
        ),
      )
      ..add(
        StringProperty(
          'drawerLabel',
          drawerLabel,
          defaultValue: 'Workspace navigation',
        ),
      )
      ..add(
        StringProperty(
          'drawerCloseLabel',
          drawerCloseLabel,
          defaultValue: 'Close',
        ),
      )
      ..add(
        EnumProperty<TextDirection?>(
          'textDirection',
          textDirection,
          defaultValue: null,
        ),
      );
  }

  /// The nearest Scaffold's state. Throws outside a scaffold, like `useScaffold()`.
  static ScaffoldState of(BuildContext context) {
    final state = maybeOf(context);
    if (state == null) {
      throw FlutterError('Scaffold.of requires a Scaffold above it');
    }
    return state;
  }

  /// The nearest Scaffold's state, or null outside one.
  static ScaffoldState? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ScaffoldScope>()?.state;

  @override
  State<Scaffold> createState() => _ScaffoldWidgetState();
}

class _ScaffoldScope extends InheritedWidget {
  const _ScaffoldScope({required this.state, required super.child});
  final ScaffoldState state;
  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<ScaffoldState>('state', state));
  }

  @override
  bool updateShouldNotify(_ScaffoldScope old) => old.state != state;
}

class _ScaffoldWidgetState extends State<Scaffold> {
  late ScaffoldSideMode _localMode = widget.defaultSideMode;
  bool _drawerOpen = false;
  double _topHeight = 0;
  final _main = FocusNode(debugLabel: 'Workspace main', skipTraversal: true);
  final _sideFocus = FocusNode(
    debugLabel: 'Workspace sidebar',
    skipTraversal: true,
    canRequestFocus: false,
  );
  final _topFocus = FocusNode(
    debugLabel: 'Workspace top side',
    skipTraversal: true,
    canRequestFocus: false,
  );

  ScaffoldSideMode get _sideMode => widget.sideMode ?? _localMode;

  @override
  void dispose() {
    _main.dispose();
    _sideFocus.dispose();
    _topFocus.dispose();
    super.dispose();
  }

  void _setSideMode(ScaffoldSideMode mode) {
    // Move keyboard focus out of a region that is about to become inert.
    if ((mode == ScaffoldSideMode.hidden && _sideFocus.hasFocus) ||
        (mode == ScaffoldSideMode.expanded && _topFocus.hasFocus)) {
      _main.requestFocus();
    }
    setState(() => _localMode = mode);
    widget.onSideModeChange?.call(mode);
  }

  void _cycleSide() {
    final mode = _sideMode;
    if (mode == ScaffoldSideMode.rail) _main.requestFocus();
    _setSideMode(switch (mode) {
      ScaffoldSideMode.expanded => ScaffoldSideMode.rail,
      ScaffoldSideMode.rail => ScaffoldSideMode.hidden,
      ScaffoldSideMode.hidden => ScaffoldSideMode.expanded,
    });
  }

  void _setDrawerOpen(bool open) {
    if (open != _drawerOpen) setState(() => _drawerOpen = open);
  }

  @override
  Widget build(BuildContext context) {
    final direction = widget.textDirection ?? Directionality.of(context);
    return Directionality(
      textDirection: direction,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact =
              widget.compact ?? constraints.maxWidth < widget.compactBreakpoint;
          // Leaving compact mode closes the drawer.
          if (!compact) _drawerOpen = false;
          final state = ScaffoldState(
            compact: compact,
            sideMode: _sideMode,
            setSideMode: _setSideMode,
            cycleSide: _cycleSide,
            drawerOpen: _drawerOpen,
            setDrawerOpen: _setDrawerOpen,
          );
          return _ScaffoldScope(
            state: state,
            child: _layout(context, state, direction),
          );
        },
      ),
    );
  }

  Widget _layout(
    BuildContext context,
    ScaffoldState state,
    TextDirection direction,
  ) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final compact = state.compact;
    final visibleSide =
        widget.side != null &&
        !compact &&
        !_drawerOpen &&
        _sideMode != ScaffoldSideMode.hidden;
    final viewport = widget.renderViewport != null
        ? Builder(
            builder: (context) =>
                widget.renderViewport!(context, widget.appBar, widget.bottom),
          )
        : ScrollArea(
            label: widget.contentLabel,
            controller: widget.contentController,
            // Content and floats sit the shell gap G from the panel; the app bar and dock sit
            // --lab-toolbar-inset (G by default) from its sides.
            sideGap: theme.sizes.toolbarInset,
            contentPadding: widget.glassSidebar ? 0 : null,
            top: widget.appBar,
            bottom: widget.bottom,
            child: widget.child ?? const SizedBox.shrink(),
          );
    final main = _MainPanel(
      focusNode: _main,
      bare: widget.glassSidebar,
      framed: widget.topSide != null || visibleSide,
      besideSide: visibleSide,
      child: viewport,
    );
    final gap = widget.glassSidebar ? theme.sizes.shellGap : 0.0;
    final overlay = widget.extendBodyBehindSidebar;
    final safe = MediaQuery.paddingOf(context);
    final rtl = direction == TextDirection.rtl;
    final start = overlay ? (rtl ? safe.right : safe.left) : 0.0;
    final topSide = widget.topSide == null
        ? null
        : Focus(
            focusNode: _topFocus,
            skipTraversal: true,
            child: widget.topSide!,
          );
    final top = safe.top + (topSide == null ? 0 : _topHeight);
    final workspace = _SideBoundary(
      immediate: compact,
      mode: visibleSide ? _sideMode : ScaffoldSideMode.hidden,
      density: theme.config.density,
      rtl: rtl,
      layout: (context, width, side) {
        if (!overlay) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              side,
              Expanded(child: main),
            ],
          );
        }
        final media = MediaQuery.of(context);
        final reserved = start + width;
        final bottom = math.max(safe.bottom, media.viewInsets.bottom);
        return Stack(
          fit: StackFit.expand,
          children: [
            MediaQuery(
              data: media.copyWith(
                padding: rtl
                    ? safe.copyWith(right: reserved, top: top, bottom: bottom)
                    : safe.copyWith(left: reserved, top: top, bottom: bottom),
              ),
              child: main,
            ),
            PositionedDirectional(
              start: start,
              top: top,
              bottom: bottom,
              child: MediaQuery.removePadding(
                context: context,
                removeLeft: true,
                removeRight: true,
                removeTop: true,
                removeBottom: true,
                child: side,
              ),
            ),
          ],
        );
      },
      child: Padding(
        padding: EdgeInsetsDirectional.fromSTEB(gap, gap, 0, gap),
        child: Stack(
          fit: StackFit.expand,
          // The glass's shadow and rim paint outside the box, as on every other glass.
          clipBehavior: Clip.none,
          children: [
            if (widget.glassSidebar && visibleSide) const _SidebarGlass(),
            Focus(
              focusNode: _sideFocus,
              skipTraversal: true,
              child: !compact && !_drawerOpen
                  ? widget.side ?? const SizedBox.shrink()
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
    return ColoredBox(
      // `lab` washes the ground toward the primary; `mono` keeps it grey (primary marks actions only).
      color: theme.config.palette == Palette.mono
          ? c.ground
          : mixSrgb(c.primary, 0.03, c.ground),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: c.ink),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Ambient texture, not content: kept quiet so it never competes with the page.
            Positioned.fill(
              child: IgnorePointer(
                child: ExcludeSemantics(
                  child: PixelShader(
                    density: 0.8,
                    speed: 0.18,
                    opacity: widget.glassSidebar ? 0.09 : 0.18,
                  ),
                ),
              ),
            ),
            if (overlay) ...[
              workspace,
              if (topSide != null)
                Positioned(
                  left: safe.left,
                  right: safe.right,
                  top: safe.top,
                  child: SizeReporter(
                    onSize: (size) {
                      if (mounted && _topHeight != size.height) {
                        setState(() => _topHeight = size.height);
                      }
                    },
                    child: topSide,
                  ),
                ),
            ] else
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ?topSide,
                  Expanded(child: workspace),
                ],
              ),
            if (compact)
              _WorkspaceDrawer(
                glassSidebar: widget.glassSidebar,
                open: _drawerOpen,
                label: widget.drawerLabel,
                closeLabel: widget.drawerCloseLabel,
                returnFocus: widget.drawerReturnFocus,
                textDirection: direction,
                close: () => _setDrawerOpen(false),
                child: widget.side ?? const SizedBox.shrink(),
              ),
          ],
        ),
      ),
    );
  }
}

/// A stationary glass layer, independent of the navigation and its interactive controls.
class _SidebarGlass extends StatefulWidget {
  const _SidebarGlass({this.drawer = false});
  final bool drawer;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('drawer', drawer));
  }

  @override
  State<_SidebarGlass> createState() => _SidebarGlassState();
}

class _SidebarGlassState extends State<_SidebarGlass>
    with WidgetsBindingObserver {
  late bool _focused;
  @override
  void initState() {
    super.initState();
    final binding = WidgetsBinding.instance;
    _focused =
        binding.lifecycleState == null ||
        binding.lifecycleState == AppLifecycleState.resumed;
    binding.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      _setFocused(state == AppLifecycleState.resumed);

  @override
  void didChangeViewFocus(ViewFocusEvent event) {
    if (event.viewId == View.of(context).viewId) {
      _setFocused(event.state == ViewFocusState.focused);
    }
  }

  void _setFocused(bool value) {
    if (_focused != value) setState(() => _focused = value);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = theme.sizes.radiusPanel;
    // Plain container glass, the same material as the toolbar buttons: no extra veil, so the
    // rim, edge light and blur read exactly like every other glass surface.
    return IgnorePointer(
      child: ExcludeSemantics(
        child: Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.none,
          children: [
            // Pointer light like the toolbar glass: the rim's highlight turns toward the cursor
            // and the lens bends the page under the edge.
            GlassContainer(
              interactive: false,
              adaptive: false,
              material: widget.drawer ? GlassKind.menu : GlassKind.regular,
              child: GlassMemberBox(
                motion: GlassMotion.follow,
                radius: radius,
                standalone: (child) => child,
                child: const SizedBox.expand(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.lab-workspace-side-boundary`: the grid column that animates its width (220ms ease) while the
/// content fades (150ms) and slides 24px toward the start when hidden. The content keeps the last
/// visible width while the column closes, clipped, so it never squeezes.
class _SideBoundary extends StatefulWidget {
  const _SideBoundary({
    required this.layout,
    required this.immediate,
    required this.mode,
    required this.density,
    required this.rtl,
    required this.child,
  });
  final ScaffoldSideMode mode;
  final bool immediate;
  final Widget Function(BuildContext, double, Widget) layout;
  final Density density;
  final bool rtl;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ObjectFlagProperty.has('layout', layout))
      ..add(EnumProperty<ScaffoldSideMode>('mode', mode))
      ..add(FlagProperty('immediate', value: immediate, ifTrue: 'immediate'))
      ..add(EnumProperty<Density>('density', density))
      ..add(FlagProperty('rtl', value: rtl, ifTrue: 'rtl'));
  }

  @override
  State<_SideBoundary> createState() => _SideBoundaryState();
}

class _SideBoundaryState extends State<_SideBoundary> {
  double? _lastVisible;

  @override
  Widget build(BuildContext context) {
    final reduced = reducedMotionOf(context);
    final hidden = widget.mode == ScaffoldSideMode.hidden;
    final metrics = ThemeProvider.of(context).config.metrics;
    final target = switch (widget.mode) {
      ScaffoldSideMode.expanded => scaffoldSidebarWidth(
        widget.density,
        metrics,
      ),
      ScaffoldSideMode.rail => scaffoldRailWidth(widget.density, metrics),
      ScaffoldSideMode.hidden => 0.0,
    };
    if (!hidden) _lastVisible = target;
    // A window becoming compact must get its full viewport immediately. Animating
    // the obsolete desktop column would squeeze a phone form during the transition.
    final duration = reduced || widget.immediate
        ? Duration.zero
        : const Duration(milliseconds: 220);
    return TweenAnimationBuilder<double>(
      tween: Tween(end: target),
      duration: duration,
      curve: MotionTokens.ease,
      builder: (context, width, child) {
        final extent = widget.immediate ? target : math.max(0.0, width);
        final innerWidth = hidden
            ? math.max(extent, _lastVisible ?? 0)
            : extent;
        return widget.layout(
          context,
          extent,
          SizedBox(
            width: extent,
            // Clip only while the column opens or closes: at rest the sidebar's glass must
            // paint its shadow and outer rim past the column's end edge, like any glass box.
            child: ClipRect(
              clipBehavior: extent >= innerWidth ? Clip.none : Clip.hardEdge,
              child: OverflowBox(
                alignment: AlignmentDirectional.centerStart,
                minWidth: innerWidth,
                maxWidth: innerWidth,
                child: child,
              ),
            ),
          ),
        );
      },
      child: IgnorePointer(
        ignoring: hidden,
        child: ExcludeFocus(
          excluding: hidden,
          child: ExcludeSemantics(
            excluding: hidden,
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: hidden ? 1 : 0),
              duration: duration,
              // CSS `transition: translate 220ms` uses the default `ease`.
              curve: const Cubic(0.25, 0.1, 0.25, 1),
              builder: (context, away, child) => Transform.translate(
                offset: Offset((widget.rtl ? 24 : -24) * away, 0),
                child: child,
              ),
              child: AnimatedOpacity(
                opacity: hidden ? 0 : 1,
                duration: reduced
                    ? Duration.zero
                    : const Duration(milliseconds: 150),
                curve: const Cubic(0.25, 0.1, 0.25, 1),
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.lab-workspace-main`: 8px margin, 1px line border, panel radius, surface fill, programmatically
/// focusable with the keyboard focus ring just inside its edge. Unframed
/// (nothing beside or above it) it eases to the window's edges: no margin, border or radius.
class _MainPanel extends StatefulWidget {
  const _MainPanel({
    required this.focusNode,
    required this.framed,
    required this.bare,
    this.besideSide = false,
    required this.child,
  });
  final FocusNode focusNode;
  final bool framed;
  final bool bare;

  /// A visible sidebar's own shell gap separates it: no start margin.
  final bool besideSide;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<bool>('bare', bare))
      ..add(DiagnosticsProperty<FocusNode>('focusNode', focusNode))
      ..add(
        FlagProperty(
          'framed',
          value: framed,
          ifTrue: 'framed',
          ifFalse: 'edge to edge',
        ),
      )
      ..add(
        FlagProperty(
          'besideSide',
          value: besideSide,
          ifTrue: 'beside side',
          defaultValue: false,
        ),
      );
  }

  @override
  State<_MainPanel> createState() => _MainPanelState();
}

class _MainPanelState extends State<_MainPanel> {
  bool _ring = false;

  // `:focus-visible` on the panel itself, never `:focus-within`: a focused descendant (the
  // composer) must not ring the whole viewport. That ring also paints over native platform views
  // (macOS WebViews), which then lose every click, scroll and selection under it.
  void _update(bool _) {
    final ring =
        widget.focusNode.hasPrimaryFocus &&
        FocusManager.instance.highlightMode == FocusHighlightMode.traditional;
    if (ring != _ring) setState(() => _ring = ring);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    if (widget.bare) {
      return Focus(
        focusNode: widget.focusNode,
        skipTraversal: true,
        onFocusChange: _update,
        child: FocusRing(
          visible: _ring,
          inside: true,
          radius: 0,
          child: widget.child,
        ),
      );
    }
    final reduced = reducedMotionOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(end: widget.framed ? 1 : 0),
      duration: reduced ? Duration.zero : MotionTokens.durationNormal,
      curve: MotionTokens.ease,
      builder: (context, t, _) => _panel(
        c,
        theme.sizes.radiusPanel * t,
        c.line.withValues(alpha: c.line.a * t),
        theme.sizes.shellGap * t,
      ),
    );
  }

  Widget _panel(ColorTokens c, double radius, Color line, double margin) {
    return Padding(
      padding: EdgeInsetsDirectional.fromSTEB(
        widget.besideSide ? 0 : margin,
        margin,
        margin,
        margin,
      ),
      child: Focus(
        focusNode: widget.focusNode,
        skipTraversal: true,
        onFocusChange: _update,
        child: FocusRing(
          visible: _ring,
          inside: true,
          radius: radius,
          child: DecoratedBox(
            decoration: ShapeDecoration(
              color: c.surface,
              shape: SuperellipseBorder(
                radius: radius,
                side: BorderSide(color: line),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(1),
              child: ClipPath(
                clipper: ShapeBorderClipper(
                  shape: SuperellipseBorder(radius: math.max(0, radius - 1)),
                ),
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The compact drawer: an Android-style navigation drawer attached to the start edge, full
/// height, `min(320px, 100vw - 56px)` wide, sliding in over 240ms (ease-out) and out over 180ms
/// (ease-in). Traps focus, closes on Escape and a backdrop tap, and returns focus afterwards.
class _WorkspaceDrawer extends StatefulWidget {
  const _WorkspaceDrawer({
    required this.glassSidebar,
    required this.open,
    required this.label,
    required this.closeLabel,
    required this.returnFocus,
    required this.textDirection,
    required this.close,
    required this.child,
  });
  final bool open;
  final bool glassSidebar;
  final String label, closeLabel;
  final FocusNode? returnFocus;
  final TextDirection textDirection;
  final VoidCallback close;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'),
      )
      ..add(DiagnosticsProperty<bool>('glassSidebar', glassSidebar))
      ..add(StringProperty('label', label))
      ..add(StringProperty('closeLabel', closeLabel))
      ..add(
        DiagnosticsProperty<FocusNode?>(
          'returnFocus',
          returnFocus,
          defaultValue: null,
        ),
      )
      ..add(EnumProperty<TextDirection>('textDirection', textDirection))
      ..add(ObjectFlagProperty<VoidCallback>.has('close', close));
  }

  @override
  State<_WorkspaceDrawer> createState() => _WorkspaceDrawerState();
}

class _WorkspaceDrawerState extends State<_WorkspaceDrawer>
    with SingleTickerProviderStateMixin {
  final _portal = OverlayPortalController();
  final _scope = FocusScopeNode(debugLabel: 'Workspace drawer');
  late final _presence = AnimationController(vsync: this);
  FocusNode? _previous;
  bool _mounted = false;

  bool get _reduced => reducedMotionOf(context);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _portal.show();
    });
    if (widget.open) _show();
  }

  @override
  void didUpdateWidget(_WorkspaceDrawer old) {
    super.didUpdateWidget(old);
    if (widget.open && !old.open) _show();
    if (!widget.open && old.open) _hide();
  }

  void _show() {
    _previous = FocusManager.instance.primaryFocus;
    _mounted = true;
    _presence.duration = const Duration(milliseconds: 240);
    if (_reduced) {
      _presence.value = 1;
    } else {
      _presence.forward(from: _presence.value);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open) _scope.requestFocus();
    });
  }

  Future<void> _hide() async {
    _presence.duration = const Duration(milliseconds: 180);
    if (_reduced) {
      _presence.value = 0;
    } else {
      await _presence.reverse().orCancel.catchError((_) {});
    }
    if (!mounted || widget.open) return;
    setState(() => _mounted = false);
    final target = widget.returnFocus ?? _previous;
    if (target != null && target.context != null) target.requestFocus();
  }

  @override
  void dispose() {
    _presence.dispose();
    _scope.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OverlayPortal(
    controller: _portal,
    overlayChildBuilder: (context) => _mounted
        ? GlassLayer(child: _drawer(context))
        : const SizedBox.shrink(),
  );

  Widget _drawer(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final screen = MediaQuery.sizeOf(context);
    final rtl = widget.textDirection == TextDirection.rtl;
    final width = math.max(0.0, math.min(320.0, screen.width - 56));
    final gap = widget.glassSidebar ? theme.sizes.shellGap : 0.0;
    final r = widget.glassSidebar
        ? theme.sizes.radiusPanel
        : 20 * theme.sizes.radiusScale;
    // Top-left, top-right, bottom-right, bottom-left: only the end edge is rounded.
    final radii = widget.glassSidebar
        ? List.filled(4, r)
        : rtl
        ? [r, 0.0, 0.0, r]
        : [0.0, r, r, 0.0];
    final panel = SizedBox(
      width: width,
      height: screen.height,
      child: ClipPath(
        clipper: _RadiiClipper(radii),
        child: ColoredBox(
          color: widget.glassSidebar
              ? const Color(0x00000000)
              : theme.config.palette == Palette.mono
              ? c.surface
              : mixSrgb(c.primary, 0.03, c.surface),
          child: Stack(
            children: [
              if (widget.glassSidebar)
                const Positioned.fill(child: _SidebarGlass(drawer: true))
              else
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(painter: _GrainPainter(c.primary)),
                  ),
                ),
              Positioned.fill(child: widget.child),
              PositionedDirectional(
                top: 12,
                end: 12,
                child: IconButton(
                  variant: ButtonVariant.ghost,
                  ariaLabel: widget.closeLabel,
                  onClick: widget.open ? widget.close : null,
                  icon: const LucideX(size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    return Directionality(
      textDirection: widget.textDirection,
      child: Shortcuts(
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
        },
        child: Actions(
          actions: {
            DismissIntent: CallbackAction<DismissIntent>(
              onInvoke: (_) {
                if (widget.open) widget.close();
                return null;
              },
            ),
          },
          child: FocusScope(
            node: _scope,
            child: AnimatedBuilder(
              animation: _presence,
              builder: (context, child) {
                final t = _presence.value;
                final opening = _presence.status != AnimationStatus.reverse;
                final e = opening
                    ? MotionTokens.easeOut.transform(t)
                    : 1 - MotionTokens.easeIn.transform(1 - t);
                final offset = (rtl ? 1 : -1) * width * (1 - e);
                return Stack(
                  children: [
                    Positioned.fill(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: widget.open ? widget.close : null,
                        child: ColoredBox(
                          color: Color.from(
                            alpha: 0.4 * e,
                            red: 12 / 255,
                            green: 24 / 255,
                            blue: 17 / 255,
                          ),
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      start: gap,
                      top: widget.glassSidebar
                          ? math.max(gap, MediaQuery.paddingOf(context).top)
                          : 0,
                      bottom: widget.glassSidebar
                          ? math.max(gap, MediaQuery.paddingOf(context).bottom)
                          : 0,
                      child: IgnorePointer(
                        ignoring: !widget.open,
                        child: Transform.translate(
                          offset: Offset(offset, 0),
                          child: child,
                        ),
                      ),
                    ),
                  ],
                );
              },
              child: Semantics(
                scopesRoute: true,
                namesRoute: true,
                explicitChildNodes: true,
                label: widget.label,
                child: GestureDetector(onTap: () {}, child: panel),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RadiiClipper extends CustomClipper<Path> {
  _RadiiClipper(this.radii);
  final List<double> radii;
  @override
  Path getClip(Size size) => superellipsePath(Offset.zero & size, radii);
  @override
  bool shouldReclip(_RadiiClipper old) =>
      old.radii.length != radii.length ||
      [for (var i = 0; i < radii.length; i++) old.radii[i] != radii[i]]
          .any((changed) => changed);
}

/// `.lab-workspace-drawer-paint`: a sparse grain PixelTexture in the primary colour at 6%.
class _GrainPainter extends CustomPainter {
  _GrainPainter(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size size) => paintPixelTexture(
    canvas,
    Offset.zero & size,
    color: color,
    opacity: 0.06,
    variant: TextureVariant.grain,
    seed: 'workspace-drawer',
    density: TextureDensity.sparse,
  );
  @override
  bool shouldRepaint(_GrainPainter old) => old.color != color;
}

/// Sidebar body: a scroll area with [leading] floating at the top and [trailing] at the bottom.
/// The twin of `ScaffoldSide`.
class ScaffoldSide extends StatelessWidget {
  const ScaffoldSide({
    super.key,
    this.leading,
    this.child,
    this.trailing,
    this.label = 'Workspace sidebar',
    this.contentLabel = 'Sidebar navigation content',
  });

  /// Pinned at the top: a brand, back button or toggle.
  final Widget? leading;

  /// Main content: the navigation.
  final Widget? child;

  /// Pinned at the bottom: usually the account tile.
  final Widget? trailing;

  /// Accessible name of the sidebar.
  final String label;

  /// Accessible name of its scroll region.
  final String contentLabel;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label, defaultValue: 'Workspace sidebar'))
      ..add(
        StringProperty(
          'contentLabel',
          contentLabel,
          defaultValue: 'Sidebar navigation content',
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final rail = Scaffold.maybeOf(context)?.sideMode == ScaffoldSideMode.rail;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: ScrollArea(
        label: contentLabel,
        // The ScrollArea's default shell gap G: from the window, between the header/footer and
        // the items, and (the content panel has no start margin beside it) between the items and
        // the panel.
        surface: theme.colors.ground,
        top: leading == null
            ? null
            : SizedBox(width: double.infinity, child: leading),
        // In the rail the sidebar is one toolbar bubble wide: bottom groups stack their controls,
        // and a layout transition carries each control from the row to the column.
        bottom: trailing == null
            ? null
            : SizedBox(
                width: double.infinity,
                child: ToolbarOrientation(
                  axis: rail ? Axis.vertical : Axis.horizontal,
                  child: LayoutGroup(
                    layoutKey: rail,
                    animateEnter: false,
                    child: trailing!,
                  ),
                ),
              ),
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}

/// Narrower than this, a title squeezed by the bar's other groups leaves instead of showing a
/// sliver: its glass flows into the neighbouring bubble. Web: `APP_BAR_TITLE_MIN_WIDTH`.
const double appBarTitleMinWidth = 64;

/// Transparent bar for the content panel's `appBar` slot; put controls in ToolbarGroups. The
/// title takes its own width and [trailing] sits at the end; given less than [appBarTitleMinWidth]
/// it hides until there is room again. The twin of `ScaffoldAppBar`.
class ScaffoldAppBar extends StatelessWidget {
  const ScaffoldAppBar({super.key, this.leading, this.child, this.trailing});

  /// Start content: a back button or toggle.
  final Widget? leading;

  /// The title, usually a ToolbarGroup.
  final Widget? child;

  /// End content: actions.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => GlassScope(
    child: Semantics(
      container: true,
      explicitChildNodes: true,
      child: Row(
        // --lab-toolbar-gap between the bar's groups.
        spacing: ThemeProvider.of(context).sizes.toolbarGap,
        children: [
          ?leading,
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final squeezed = constraints.maxWidth < appBarTitleMinWidth;
                return Offstage(
                  offstage: squeezed,
                  child: GlassHidden(
                    hidden: squeezed,
                    child: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: child ?? const SizedBox.shrink(),
                    ),
                  ),
                );
              },
            ),
          ),
          ?trailing,
        ],
      ),
    ),
  );
}

/// Three-column bar for the `topSide` slot: start, centered brand, end. The twin of
/// `ScaffoldTopBar`.
class ScaffoldTopBar extends StatelessWidget {
  const ScaffoldTopBar({super.key, this.leading, this.child, this.trailing});

  /// Start content.
  final Widget? leading;

  /// The centered brand.
  final Widget? child;

  /// End content.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final sizes = ThemeProvider.of(context).sizes;
    final gap = sizes.shellGap;
    return GlassScope(
      child: Padding(
        padding: EdgeInsets.fromLTRB(gap, gap, gap, 0),
        child: Row(
          spacing: sizes.toolbarGap,
          children: [
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: leading ?? const SizedBox.shrink(),
              ),
            ),
            ?child,
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerEnd,
                child: trailing ?? const SizedBox.shrink(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// What a [ScaffoldToggleButton] does: `cycle` steps expanded → rail → hidden, `restore`
/// expands, `drawer` always opens the drawer.
enum ScaffoldToggleAction { cycle, restore, drawer }

/// Icon button that drives the nearest Scaffold's sidebar; opens the drawer when compact. The
/// twin of `ScaffoldToggleButton`.
class ScaffoldToggleButton extends StatelessWidget {
  const ScaffoldToggleButton({
    super.key,
    this.action = ScaffoldToggleAction.cycle,
    this.label,
  });

  /// What a click does.
  final ScaffoldToggleAction action;

  /// Accessible name. Defaults to a description of what the click does.
  final String? label;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        EnumProperty<ScaffoldToggleAction>(
          'action',
          action,
          defaultValue: ScaffoldToggleAction.cycle,
        ),
      )
      ..add(StringProperty('label', label, defaultValue: null));
  }

  @override
  Widget build(BuildContext context) {
    final state = Scaffold.of(context);
    final drawer = action == ScaffoldToggleAction.drawer || state.compact;
    final mode = state.sideMode;
    final accessibleLabel =
        label ??
        (drawer
            ? 'Open workspace navigation'
            : action == ScaffoldToggleAction.restore ||
                  mode == ScaffoldSideMode.hidden
            ? 'Expand workspace sidebar'
            : mode == ScaffoldSideMode.expanded
            ? 'Minimize workspace sidebar'
            : 'Hide workspace sidebar');
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final Widget icon = drawer
        ? const LucideMenu()
        : Transform.flip(
            flipX: rtl,
            child: mode == ScaffoldSideMode.expanded
                ? const LucidePanelLeftClose()
                : const LucidePanelLeftOpen(),
          );
    return Semantics(
      expanded: drawer ? state.drawerOpen : mode != ScaffoldSideMode.hidden,
      child: IconButton(
        variant: ButtonVariant.text,
        ariaLabel: accessibleLabel,
        onClick: () {
          if (drawer) {
            state.setDrawerOpen(true);
          } else if (action == ScaffoldToggleAction.restore) {
            state.setSideMode(ScaffoldSideMode.expanded);
          } else {
            state.cycleSide();
          }
        },
        icon: icon,
      ),
    );
  }
}
