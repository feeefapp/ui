import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide Action;

import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../primitives/button.dart';
import '../primitives/popover_surface.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import 'layout.dart';
import 'types.dart';
import '../glass/container.dart';

/// The width a shrink-wrapping parent (a Dock) offers its actions, before fitting. Without it,
/// each bar fits its own host. The twin of `ActionsWidthProvider` in the web kit.
class ActionsWidthProvider extends InheritedWidget {
  const ActionsWidthProvider({
    super.key,
    required this.value,
    required super.child,
  });
  final double? value;

  static double? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ActionsWidthProvider>()?.value;

  @override
  bool updateShouldNotify(ActionsWidthProvider old) => old.value != value;
}

/// Which side the row hugs inside a wider host.
enum ActionsAlign { start, end }

/// Responsive, priority-based actions: the twin of `ActionsBar` in `@feeef.dev/ui/actions`. It
/// measures its real controls and moves the lowest-priority ones into a "More actions" menu when
/// they don't fit; entries shrink into the More button and grow back out of it.
class ActionsBar extends StatefulWidget {
  const ActionsBar({
    super.key,
    required this.actions,
    required this.label,
    this.align = ActionsAlign.end,
    this.size = ControlSize.regular,
    this.gap = 4,
    this.overflowLabel,
    this.onActionError,
  });

  /// The action tree, in display order.
  final List<Action> actions;

  /// Accessible name of the group.
  final String label;
  final ActionsAlign align;

  /// Control height: regular 44px or compact 40px.
  final ControlSize size;

  /// Space between controls, included in the fit.
  final double gap;

  /// Accessible name of the overflow trigger.
  final String? overflowLabel;

  /// Application effects are injected; this primitive never calls business APIs.
  final void Function(Object error, Action action)? onActionError;

  @override
  State<ActionsBar> createState() => _ActionsBarState();
}

class _ActionsBarState extends State<ActionsBar> {
  final _widths = <String, double>{};
  double _overflowWidth = 40;
  final _pending = <String>{};
  String _error = '';
  final _moreKey = GlobalKey();
  final _entryKeys = <String, GlobalKey>{};
  // Overflow motion: where entries and the More button were last frame.
  var _lastVisible = <String>[];
  final _lastRects = <String, Rect>{};
  Rect? _lastMore;
  final _motion = <String, _EntryMotion>{};
  final _ghosts = <String, _Ghost>{};

  GlobalKey _keyFor(String id) => _entryKeys.putIfAbsent(id, GlobalKey.new);

  @override
  void dispose() {
    for (final m in _motion.values) {
      m.dispose();
    }
    for (final g in _ghosts.values) {
      g.motion.stop();
    }
    super.dispose();
  }

  void _measured(String id, Size size) {
    if (_widths[id] == size.width) return;
    setState(() => _widths[id] = size.width);
  }

  void _execute(Action action, [bool? checked]) {
    if (action is GroupAction) return;
    if (action.disabled || action.loading || _pending.contains(action.id)) {
      return;
    }
    setState(() {
      _pending.add(action.id);
      _error = '';
    });
    () async {
      try {
        switch (action) {
          case ToggleAction():
            await action.onCheckedChange(checked ?? !action.checked);
          case CommandAction():
            await action.onAction();
          case GroupAction():
            break;
        }
      } catch (error) {
        if (mounted) {
          setState(
            () => _error = '${action.label} could not complete. Try again.',
          );
        }
        widget.onActionError?.call(error, action);
      } finally {
        if (mounted) setState(() => _pending.remove(action.id));
      }
    }();
  }

  /// After layout: slide entries that moved, grow returning entries out of the More button,
  /// shrink leaving ones into it (the web kit's useOverflowMotion).
  void _afterLayout(List<String> visible) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final host = context.findRenderObject() as RenderBox?;
      if (host == null || !host.hasSize) return;
      Rect? rectOf(GlobalKey key) {
        final box = key.currentContext?.findRenderObject() as RenderBox?;
        if (box == null || !box.hasSize || !box.attached) return null;
        return box.localToGlobal(Offset.zero, ancestor: host) & box.size;
      }

      final rects = <String, Rect>{
        for (final id in visible) id: ?rectOf(_keyFor(id)),
      };
      final more = rectOf(_moreKey) ?? _lastMore;
      final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
      final previous = _lastVisible;
      if (previous.isNotEmpty && !reduced) {
        final diff = diffVisibleActions(previous, visible);
        for (final id in diff.staying) {
          final now = rects[id], before = _lastRects[id];
          if (now == null || before == null) continue;
          final d = before.topLeft - now.topLeft;
          if (d.distance > 0.5) _motionFor(id).slideFrom(d);
        }
        for (final id in diff.entering) {
          final now = rects[id];
          if (now == null) continue;
          _motionFor(id)
              .growFrom(more != null ? more.center - now.center : Offset.zero);
        }
        for (final id in diff.leaving) {
          final before = _lastRects[id];
          final action = _find(widget.actions, id) ?? _ghostAction[id];
          if (before == null || action == null) continue;
          final ghost = _Ghost(action, before, MotionValue(0, 0.002));
          setState(() => _ghosts[id] = ghost);
          final to = more != null ? more.center - before.center : Offset.zero;
          ghost.to = to;
          ghost.motion.subscribe((_) {
            if (mounted) setState(() {});
          });
          ghost.motion.animateTo(1, spring: Springs.snappy).then((_) {
            if (mounted) setState(() => _ghosts.remove(id));
          });
        }
      }
      _lastVisible = visible;
      _lastRects
        ..clear()
        ..addAll(rects);
      _lastMore = more;
      for (final a in widget.actions) {
        _ghostAction[a.id] = a;
      }
    });
  }

  final _ghostAction = <String, Action>{};

  _EntryMotion _motionFor(String id) => _motion.putIfAbsent(id, () {
    final m = _EntryMotion();
    m.listenable.addListener(() {
      if (mounted) setState(() {});
    });
    return m;
  });

  Action? _find(List<Action> list, String id) {
    for (final a in list) {
      if (a.id == id) return a;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.actions.isEmpty) return const SizedBox.shrink();
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final overflowLabel =
        widget.overflowLabel ?? I18n.of(context).t('lab.common.moreActions');
    final s = theme.sizes;
    final inherited = ActionsWidthProvider.maybeOf(context);
    final compact = widget.size == ControlSize.compact;
    final minHeight = theme.coarsePointer(context)
        ? 44.0
        : (compact ? s.controlCompact : s.controlHeight);
    final measured = widget.actions.every((a) => _widths.containsKey(a.id));

    return LayoutBuilder(
      builder: (context, constraints) {
        final available =
            inherited ??
            (constraints.maxWidth.isFinite ? constraints.maxWidth : 1e9);
        final layout = measured
            ? computeActionsLayout<Action>(
                actions: widget.actions,
                maxWidth: math.max(0, available),
                measure: (a) => _widths[a.id] ?? _overflowWidth,
                priority: (a) => a.priority,
                overflowWidth: _overflowWidth,
                gap: widget.gap,
              )
            : (
                visible: widget.actions,
                overflow: <Action>[],
                requiredWidth: 0.0,
              );
        _afterLayout([for (final a in layout.visible) a.id]);

        Widget entry(Action action) {
          final motion = _motion[action.id];
          Widget control = action is GroupAction
              ? _MenuAnchor(
                  label: action.label,
                  actions: action.actions,
                  pending: _pending,
                  execute: _execute,
                  onOpen: action.onOpen,
                  enabled: !action.disabled && action.actions.isNotEmpty,
                  builder: (open) => _ActionControl(
                    action: action,
                    size: widget.size,
                    loading: _pending.contains(action.id),
                    onClick: open,
                  ),
                )
              : _ActionControl(
                  action: action,
                  size: widget.size,
                  loading: _pending.contains(action.id),
                  onClick: () => _execute(action),
                );
          if (motion != null) control = motion.wrap(control);
          return KeyedSubtree(key: _keyFor(action.id), child: control);
        }

        final row = Row(
          mainAxisSize: MainAxisSize.min,
          spacing: widget.gap,
          children: [
            for (final action in layout.visible) entry(action),
            if (layout.overflow.isNotEmpty)
              KeyedSubtree(
                key: _moreKey,
                child: _MenuAnchor(
                  label: overflowLabel,
                  actions: layout.overflow,
                  pending: _pending,
                  execute: _execute,
                  enabled: true,
                  builder: (open) =>
                      _moreButton(widget.size, overflowLabel, open),
                ),
              ),
          ],
        );

        // A checked toggle reads as a selected chip: soft surface, focus-coloured edge.
        return ControlOverrides.merge(
          context,
          pressedFill: c.surfaceSoft,
          pressedEdge: c.focus,
          child: Semantics(
            container: true,
            explicitChildNodes: true,
            label: widget.label,
            child: SizedBox(
              width: inherited == null ? null : layout.requiredWidth,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: widget.align == ActionsAlign.end
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // Real controls, hidden and inert, keep the measurement exact.
                      // Positioned, so the row takes its natural width whatever the host.
                      Positioned(
                        left: 0,
                        top: 0,
                        child: Offstage(
                          child: ExcludeSemantics(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (final action in widget.actions)
                                  SizeReporter(
                                    onSize: (size) =>
                                        _measured(action.id, size),
                                    child: _ActionControl(
                                      action: action,
                                      size: widget.size,
                                      loading: _pending.contains(action.id),
                                    ),
                                  ),
                                SizeReporter(
                                  onSize: (size) {
                                    if (_overflowWidth != size.width) {
                                      setState(
                                        () => _overflowWidth = size.width,
                                      );
                                    }
                                  },
                                  child: _moreButton(
                                    widget.size,
                                    overflowLabel,
                                    null,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Visibility.maintain(
                        visible: measured,
                        child: ConstrainedBox(
                          constraints: BoxConstraints(minHeight: minHeight),
                          child: Align(
                            widthFactor: 1,
                            alignment: widget.align == ActionsAlign.end
                                ? AlignmentDirectional.centerEnd
                                : AlignmentDirectional.centerStart,
                            child: row,
                          ),
                        ),
                      ),
                      for (final ghost in _ghosts.values)
                        Positioned.fromRect(
                          rect: ghost.from,
                          child: IgnorePointer(
                            child: ExcludeSemantics(
                              child: Opacity(
                                opacity: (1 - ghost.motion.get()).clamp(
                                  0.0,
                                  1.0,
                                ),
                                child: Transform.translate(
                                  offset: ghost.to * ghost.motion.get(),
                                  child: Transform.scale(
                                    scale: 1 - 0.6 * ghost.motion.get(),
                                    child: _ActionControl(
                                      action: ghost.action,
                                      size: widget.size,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (_error.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Semantics(
                        liveRegion: true,
                        child: Text(
                          _error,
                          style: TextStyle(color: c.danger, fontSize: 13),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Ghost {
  _Ghost(this.action, this.from, this.motion);
  final Action action;
  final Rect from;
  final MotionValue motion;
  Offset to = Offset.zero;
}

/// One entry's motion: a slide from where it was, or a growth out of the More button.
class _EntryMotion {
  final _progress = MotionValue(1, 0.002);
  Offset _from = Offset.zero;
  bool _grow = false;
  final listenable = ValueNotifier<int>(0);

  _EntryMotion() {
    _progress.subscribe((_) => listenable.value++);
  }

  void slideFrom(Offset delta) {
    _from = delta;
    _grow = false;
    _progress.set(0);
    _progress.animateTo(1, spring: Springs.snappy);
  }

  void growFrom(Offset delta) {
    _from = delta;
    _grow = true;
    _progress.set(0);
    _progress.animateTo(1, spring: Springs.snappy);
  }

  Widget wrap(Widget child) {
    final p = _progress.get();
    if ((p - 1).abs() < 0.001) return child;
    final offset = _from * (1 - p);
    Widget moved = Transform.translate(offset: offset, child: child);
    if (_grow) {
      moved = Opacity(
        opacity: p.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: offset,
          child: Transform.scale(scale: 0.4 + 0.6 * p, child: child),
        ),
      );
    }
    return moved;
  }

  void dispose() {
    _progress.stop();
    listenable.dispose();
  }
}

Widget _moreButton(ControlSize size, String label, VoidCallback? onClick) =>
    IconButton(
      variant: ButtonVariant.ghost,
      appearance: ButtonAppearance.toolbar,
      controlSize: size == ControlSize.compact
          ? ControlSize.compact
          : ControlSize.regular,
      ariaLabel: label,
      onClick: onClick ?? () {},
      icon: const LucideEllipsis(size: 20),
    );

/// One inline action: the web kit's ActionControl recipe.
class _ActionControl extends StatelessWidget {
  const _ActionControl({
    required this.action,
    required this.size,
    this.loading = false,
    this.onClick,
  });
  final Action action;
  final ControlSize size;
  final bool loading;
  final VoidCallback? onClick;

  @override
  Widget build(BuildContext context) {
    final a = action;
    final iconOnly =
        a.display == ActionDisplay.icon &&
        (a is ToggleAction || a.icon != null);
    final blocked = a.disabled || (a is GroupAction && a.actions.isEmpty);
    final variant = a.destructive
        ? ButtonVariant.destructive
        : (a.variant ??
              (a is ToggleAction && a.checked
                  ? ButtonVariant.elevated
                  : ButtonVariant.ghost));
    final appearance =
        a.appearance ??
        (!a.destructive &&
                (a.variant == null || a.variant == ButtonVariant.ghost)
            ? ButtonAppearance.toolbar
            : ButtonAppearance.defaultAppearance);
    final Widget? icon = a.icon != null
        ? IconTheme.merge(
            data: IconThemeData(size: iconOnly ? 20 : 18),
            child: a.icon!,
          )
        : a is ToggleAction
        ? (a.checked
              ? const LucideSquareCheck(size: 18)
              : const LucideSquare(size: 18))
        : null;
    final children = <Widget>[
      ?icon,
      if (!iconOnly) Text(a.label),
      if (a is GroupAction && !iconOnly) const LucideChevronDown(size: 14),
    ];
    if (iconOnly) {
      return IconButton(
        variant: variant,
        appearance: appearance,
        controlSize: size == ControlSize.compact
            ? ControlSize.compact
            : ControlSize.regular,
        disabled: blocked,
        loading: loading || a.loading,
        pressed: a is ToggleAction ? a.checked : null,
        ariaLabel: a.label,
        onClick: onClick ?? () {},
        icon: icon ?? Text(a.label),
      );
    }
    return Button(
      variant: variant,
      controlSize: size,
      appearance: appearance,
      disabled: blocked,
      loading: loading || a.loading,
      pressed: a is ToggleAction ? a.checked : null,
      ariaLabel: a.label,
      onClick: onClick ?? () {},
      children: children,
    );
  }
}

/// A trigger that opens a menu of [actions] on a [PopoverSurface] below it, aligned to its end:
/// rows with icons, checkable toggles, nested submenus, destructive rows, arrow keys and Escape.
/// The Flutter stand-in for a Radix `DropdownMenu` styled with the kit's `.lab-actions-menu`
/// classes, and the same menu an [ActionsBar] opens for its groups and overflow. Commands run like
/// in the bar: a returned future blocks repeats until it completes.
class ActionsMenuAnchor extends StatefulWidget {
  const ActionsMenuAnchor({
    super.key,
    required this.label,
    required this.actions,
    required this.builder,
    this.enabled = true,
    this.onActionError,
  });

  /// Accessible name of the menu.
  final String label;
  final List<Action> actions;

  /// Builds the trigger; `open` toggles the menu (null when disabled).
  final Widget Function(VoidCallback? open) builder;
  final bool enabled;
  final void Function(Object error, Action action)? onActionError;

  @override
  State<ActionsMenuAnchor> createState() => _ActionsMenuAnchorState();
}

class _ActionsMenuAnchorState extends State<ActionsMenuAnchor> {
  final _pending = <String>{};

  void _execute(Action action, [bool? checked]) {
    if (action is GroupAction) return;
    if (action.disabled || action.loading || _pending.contains(action.id)) {
      return;
    }
    setState(() => _pending.add(action.id));
    () async {
      try {
        switch (action) {
          case ToggleAction():
            await action.onCheckedChange(checked ?? !action.checked);
          case CommandAction():
            await action.onAction();
          case GroupAction():
            break;
        }
      } catch (error) {
        widget.onActionError?.call(error, action);
      } finally {
        if (mounted) setState(() => _pending.remove(action.id));
      }
    }();
  }

  @override
  Widget build(BuildContext context) => _MenuAnchor(
    label: widget.label,
    actions: widget.actions,
    pending: _pending,
    execute: _execute,
    enabled: widget.enabled && widget.actions.isNotEmpty,
    builder: widget.builder,
  );
}

/// A trigger that opens a menu of actions below it, aligned to its end.
class _MenuAnchor extends StatefulWidget {
  const _MenuAnchor({
    required this.label,
    required this.actions,
    required this.pending,
    required this.execute,
    required this.enabled,
    required this.builder,
    this.onOpen,
    this.submenu = false,
  });
  final String label;

  /// Opens beside the row, toward the inline end (Radix `SubContent`, sideOffset 4).
  final bool submenu;
  final List<Action> actions;
  final Set<String> pending;
  final void Function(Action action, [bool? checked]) execute;
  final bool enabled;
  final bool Function()? onOpen;
  final Widget Function(VoidCallback? open) builder;

  @override
  State<_MenuAnchor> createState() => _MenuAnchorState();
}

class _MenuAnchorState extends State<_MenuAnchor> {
  final _portal = OverlayPortalController();
  final _link = LayerLink();

  void _toggle() {
    if (_portal.isShowing) {
      _portal.hide();
      setState(() {});
      return;
    }
    if (widget.onOpen?.call() == false) return;
    _portal.show();
    setState(() {});
  }

  void _close() {
    if (_portal.isShowing) {
      _portal.hide();
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) => CompositedTransformTarget(
    link: _link,
    child: OverlayPortal(
      controller: _portal,
      overlayChildBuilder: (context) => GlassLayer(
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _close,
              ),
            ),
            CompositedTransformFollower(
              link: _link,
              targetAnchor:
                  (widget.submenu
                          ? AlignmentDirectional.topEnd
                          : AlignmentDirectional.bottomEnd)
                      .resolve(Directionality.of(context)),
              followerAnchor:
                  (widget.submenu
                          ? AlignmentDirectional.topStart
                          : AlignmentDirectional.topEnd)
                      .resolve(Directionality.of(context)),
              offset: widget.submenu
                  ? Offset(
                      Directionality.of(context) == TextDirection.rtl ? -4 : 4,
                      -4,
                    )
                  : const Offset(0, 8),
              child: _ActionsMenu(
                label: widget.label,
                actions: widget.actions,
                pending: widget.pending,
                execute: (action, [checked]) {
                  _close();
                  widget.execute(action, checked);
                },
                close: _close,
              ),
            ),
          ],
        ),
      ),
      child: widget.builder(widget.enabled ? _toggle : null),
    ),
  );
}

/// `.lab-actions-menu` on a PopoverSurface: rows of actions, checkable toggles, submenus.
class _ActionsMenu extends StatefulWidget {
  const _ActionsMenu({
    required this.label,
    required this.actions,
    required this.pending,
    required this.execute,
    required this.close,
  });
  final String label;
  final List<Action> actions;
  final Set<String> pending;
  final void Function(Action action, [bool? checked]) execute;
  final VoidCallback close;

  @override
  State<_ActionsMenu> createState() => _ActionsMenuState();
}

class _ActionsMenuState extends State<_ActionsMenu> {
  int _highlight = -1;
  final _scope = FocusScopeNode(debugLabel: 'Actions menu');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scope.requestFocus();
    });
  }

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  void _move(int delta) {
    final n = widget.actions.length;
    if (n == 0) return;
    var next = _highlight;
    for (var i = 0; i < n; i++) {
      next = (next + delta + n) % n;
      if (!widget.actions[next].disabled) break;
    }
    setState(() => _highlight = next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final screen = MediaQuery.sizeOf(context).width;
    final space1 = s.density == Density.thin ? 2.0 : 4.0;
    return FocusScope(
      node: _scope,
      onKeyEvent: (_, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        final key = event.logicalKey;
        if (key == LogicalKeyboardKey.escape) {
          widget.close();
        } else if (key == LogicalKeyboardKey.arrowDown) {
          _move(1);
        } else if (key == LogicalKeyboardKey.arrowUp) {
          _move(-1);
        } else if ((key == LogicalKeyboardKey.enter ||
                key == LogicalKeyboardKey.space) &&
            _highlight >= 0) {
          final a = widget.actions[_highlight];
          if (a is! GroupAction) widget.execute(a);
        } else {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      },
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: widget.label,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: math.min(200, screen - 24),
            maxWidth: math.min(360, screen - 24),
          ),
          child: IntrinsicWidth(
            child: PopoverSurface(
              padding: EdgeInsets.all(space1),
              child: DefaultTextStyle.merge(
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < widget.actions.length; i++)
                      _MenuRow(
                        action: widget.actions[i],
                        highlighted: i == _highlight,
                        loading:
                            widget.actions[i].loading ||
                            widget.pending.contains(widget.actions[i].id),
                        radius: s.radiusGroup - space1 - 1,
                        onHover: () => setState(() => _highlight = i),
                        pending: widget.pending,
                        execute: widget.execute,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.action,
    required this.highlighted,
    required this.loading,
    required this.radius,
    required this.onHover,
    required this.pending,
    required this.execute,
  });
  final Action action;
  final bool highlighted, loading;
  final double radius;
  final VoidCallback onHover;
  final Set<String> pending;
  final void Function(Action action, [bool? checked]) execute;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final a = action;
    final disabled =
        a.disabled || loading || (a is GroupAction && a.actions.isEmpty);
    final destructive = a.destructive || a.variant == ButtonVariant.destructive;
    final leading = loading
        ? const SizedBox.square(dimension: 17)
        : a is ToggleAction
        ? (a.checked ? const LucideCheck(size: 18) : const SizedBox.shrink())
        : a.icon;
    final row = DecoratedBox(
      decoration: BoxDecoration(
        color: highlighted ? c.surfaceSoft : const Color(0x00000000),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: theme.coarsePointer(context) ? 44 : s.controlCompact,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: IconTheme.merge(
            data: IconThemeData(
              size: 18,
              color: destructive ? c.danger : c.ink,
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(color: destructive ? c.danger : c.ink),
              child: Row(
                spacing: 8,
                children: [
                  SizedBox.square(dimension: 18, child: Center(child: leading)),
                  Expanded(
                    child: CssBaseline(lineHeight: 19.6, child: Text(a.label)),
                  ),
                  if (a is GroupAction)
                    const Padding(
                      padding: EdgeInsetsDirectional.only(start: 12),
                      child: LucideChevronRight(size: 16),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    final faded = Opacity(opacity: disabled ? 0.5 : 1, child: row);
    Widget item = faded;
    if (a is GroupAction) {
      // The builder must close over the row, not over `item` (which becomes this anchor).
      item = _MenuAnchor(
        label: a.label,
        actions: a.actions,
        pending: pending,
        execute: execute,
        enabled: !disabled,
        onOpen: a.onOpen,
        submenu: true,
        builder: (open) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: open,
          child: faded,
        ),
      );
    } else {
      item = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: disabled ? null : () => execute(a),
        child: item,
      );
    }
    return Semantics(
      button: true,
      checked: a is ToggleAction ? a.checked : null,
      enabled: !disabled,
      label: a.label,
      excludeSemantics: true,
      child: MouseRegion(onEnter: (_) => onHover(), child: item),
    );
  }
}
