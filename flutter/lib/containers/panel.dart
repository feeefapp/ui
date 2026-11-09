import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../i18n/i18n.dart';
import '../presentation/body.dart';
import '../presentation/header.dart';
import '../presentation/host.dart';
import '../theme.dart';
import 'panel_model.dart';
import 'sheet.dart';

export 'panel_model.dart';

/// An independent opaque work surface with floating title, actions and close.
/// Content is deliberately unaware of navigation, routing or application data.
/// Put a PresentationDock (or any widget) in [dock] for measured floating actions.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.label,
    required this.child,
    this.title,
    this.leading,
    this.trailing = const [],
    this.dock,
    this.onClose,
    this.contentPadding,
  });

  /// Accessible name of this work surface.
  final String label;

  /// Reusable body content, independent of host and navigation.
  final Widget child;

  /// Visible title in the shared floating presentation header.
  final Widget? title;

  /// Optional leading header content.
  final Widget? leading;

  /// Contextual tools such as Edit, rendered inside this panel's header.
  final List<Widget> trailing;

  /// Floating task actions with measured scroll clearance.
  final Widget? dock;

  /// Standalone dismissal; hosted panels use their host's controlled callback.
  final VoidCallback? onClose;

  /// Body inset in logical pixels; defaults to the theme shell gap.
  final double? contentPadding;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(IntProperty('trailing', trailing.length, defaultValue: 0))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onClose', onClose))
      ..add(
        DoubleProperty('contentPadding', contentPadding, defaultValue: null),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final scope = _PanelSurfaceScope.maybeOf(context);
    final compact = scope?.compact ?? false;
    final close = scope?.close ?? onClose;
    final radius = theme.sizes.radiusPanel;
    final header = PresentationHeader(
      title: title,
      leading: leading,
      trailing: trailing,
      onClose: close,
      closeLabel: I18n.of(context)
          .t('lab.composer.closeLabel', {'label': label}),
    );
    // The PresentationBody itself never changes parents across modes. The
    // host reparents this complete keyed Panel in the very same frame.
    return PresentationHost(
      label: label,
      modal: false,
      onEscape: close,
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: compact ? null : theme.colors.surface,
          shape: SuperellipseBorder(
            radius: compact ? 0 : radius,
            side: compact
                ? BorderSide.none
                : BorderSide(color: theme.colors.line),
          ),
        ),
        child: PresentationBody(
          label: label,
          top: header,
          bottom: dock,
          fill: true,
          contentPadding: contentPadding,
          surface: theme.colors.surface,
          radius: compact ? 0 : radius,
          child: child,
        ),
      ),
    );
  }
}

/// One stable node in a controlled [PanelHost]. Keep [id] for the lifetime of
/// its work (draft, scroll and subscriptions), including while replacing props.
@immutable
class PanelEntry {
  const PanelEntry({
    required this.id,
    required this.panel,
    this.sizing = const PanelSizing(),
    this.canClose,
  });

  /// Stable identity of this work and its state.
  final Object id;

  /// Independent surface presented by the host.
  final Panel panel;

  /// Constraints in logical pixels for desktop columns.
  final PanelSizing sizing;

  /// Allows dismissal or branch replacement, including when an ancestor closes.
  /// Return false to retain the chain, for example after cancelling a discard alert.
  final FutureOr<bool> Function()? canClose;
}

/// A single adaptive coordinator, never a tree of nested split views.
/// Desktop columns use this host's bounded constraints, not MediaQuery width.
/// Older columns stay alive offstage when depth exceeds available space. Compact
/// details use the existing Sheet's drag, scrim, focus and reduced-motion engine.
/// The owner must echo [onPanelsChange]; no internal shadow stack is maintained.
class PanelHost extends StatefulWidget {
  const PanelHost({
    super.key,
    required this.root,
    required this.panels,
    required this.onPanelsChange,
    this.rootMinWidth = 320,
    this.breakpoint = 720,
  });

  /// Always-mounted root surface, usually a resource list.
  final Panel root;
  /// Ordered branch of open records, first child first, with unique IDs.
  final List<PanelEntry> panels;
  /// Echo the next branch after a scoped push or permitted dismissal.
  /// Direct owner updates are authoritative and bypass dismissal guards.
  final ValueChanged<List<PanelEntry>> onPanelsChange;
  /// Minimum root column width in logical pixels.
  final double rootMinWidth;
  /// Local width below which the branch presents as stacked sheets.
  final double breakpoint;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<Object>('panelIds', panels.map((p) => p.id)))
      ..add(
        ObjectFlagProperty<ValueChanged<List<PanelEntry>>>.has(
          'onPanelsChange',
          onPanelsChange,
        ),
      )
      ..add(DoubleProperty('rootMinWidth', rootMinWidth, defaultValue: 320))
      ..add(DoubleProperty('breakpoint', breakpoint, defaultValue: 720));
  }

  @override
  State<PanelHost> createState() => _PanelHostState();
}

class _PanelHostState extends State<PanelHost> {
  final _rootKey = GlobalKey(debugLabel: 'Panel root');
  final _keys = <Object, GlobalKey>{};

  bool _pending = false;

  Future<void> _change(
    List<PanelEntry> Function(List<PanelEntry>) update,
  ) async {
    if (_pending) return;
    _pending = true;
    final before = List<PanelEntry>.of(widget.panels);
    try {
      final next = update(before);
      final retained = next.map((entry) => entry.id).toSet();
      for (final entry in before.reversed) {
        if (!retained.contains(entry.id) && entry.canClose != null) {
          if (!await entry.canClose!()) return;
        }
      }
      // A controlled owner can change the branch while a confirmation is open.
      // Never apply an old intent to that replacement branch.
      if (!mounted ||
          before.length != widget.panels.length ||
          !List.generate(
            before.length,
            (i) => identical(before[i], widget.panels[i]),
          ).every((same) => same)) {
        return;
      }
      widget.onPanelsChange(next);
    } finally {
      _pending = false;
    }
  }

  void _close(Object id) => unawaited(
    _change((panels) => panelClose(panels, id, (entry) => entry.id)),
  );
  void _push(PanelEntry entry, Object? after) => unawaited(
    _change(
      (panels) => panelPush(panels, entry, (entry) => entry.id, after: after),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final ids = widget.panels.map((p) => p.id).toSet();
    if (ids.length != widget.panels.length) {
      throw ArgumentError('Panel IDs must be unique');
    }
    _keys.removeWhere((id, _) => !ids.contains(id));
    for (final id in ids) {
      _keys.putIfAbsent(id, () => GlobalKey(debugLabel: 'Panel $id'));
    }
    final gap = ThemeProvider.of(context).sizes.shellGap;
    return LayoutBuilder(
      builder: (context, constraints) {
        if (!constraints.hasBoundedWidth || !constraints.hasBoundedHeight) {
          throw FlutterError(
            'PanelHost requires bounded local width and height.',
          );
        }
        final layout = panelLayout(
          width: constraints.maxWidth,
          panels: widget.panels.map((p) => p.sizing).toList(),
          rootMinWidth: widget.rootMinWidth,
          gap: gap,
          breakpoint: widget.breakpoint,
        );
        Widget content(Panel panel, GlobalKey key, Object? id, bool compact) =>
            PanelScope._(
              id: id,
              push: (entry) => _push(entry, id),
              close: id == null ? null : () => _close(id),
              child: _PanelSurfaceScope(
                compact: compact,
                close: id == null ? null : () => _close(id),
                child: KeyedSubtree(key: key, child: panel),
              ),
            );
        final nodes = <Widget>[];
        var offset = gap;
        final panels = [
          widget.root,
          ...widget.panels.map((entry) => entry.panel),
        ];
        for (var i = 0; i < panels.length; i++) {
          final entry = i == 0 ? null : widget.panels[i - 1];
          final key = entry == null ? _rootKey : _keys[entry.id]!;
          final body = content(
            panels[i],
            key,
            entry?.id,
            layout.compact && i > 0,
          );
          if (layout.compact && entry != null) {
            // animation_level: 1 — all motion/physics belongs to Sheet, which
            // respects the resolved ThemeConfig motion and reducedMotionOf.
            nodes.add(
              Positioned.fill(
                key: ValueKey(entry.id),
                child: Sheet(
                  container: true,
                  label: panels[i].label,
                  // Panel retains its entire header/body/dock subtree in both
                  // modes. Sheet supplies only the outer presentation mechanics.
                  showClose: false,
                  header: const SizedBox.shrink(),
                  onOpenChange: (_) => _close(entry.id),
                  regular: SheetRegular.sheet,
                  regularBreakpoint: double.infinity,
                  detents: const [SheetDetent.large],
                  recede: false,
                  builder: (context, controller) => body,
                ),
              ),
            );
          } else {
            final hidden = !layout.compact && i < layout.visibleFrom;
            final width = layout.compact
                ? constraints.maxWidth
                : hidden
                ? widget.rootMinWidth
                : layout.widths[i - layout.visibleFrom];
            nodes.add(
              PositionedDirectional(
                key: ValueKey(entry?.id ?? _rootKey),
                start: layout.compact ? 0 : offset,
                top: layout.compact ? 0 : gap,
                bottom: layout.compact ? 0 : gap,
                width: width,
                child: Offstage(
                  offstage: hidden,
                  child: TickerMode(enabled: !hidden, child: body),
                ),
              ),
            );
            if (!hidden && !layout.compact) offset += width + gap;
          }
        }
        return Stack(clipBehavior: Clip.hardEdge, children: nodes);
      },
    );
  }
}

/// A content-local request goes to the one enclosing host. Opening a child
/// replaces this panel's descendants; closing removes it and those descendants.
class PanelScope extends InheritedWidget {
  const PanelScope._({
    required this.id,
    required this.push,
    required this.close,
    required super.child,
  });
  final Object? id;
  final ValueChanged<PanelEntry> push;
  final VoidCallback? close;

  static PanelScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<PanelScope>();
    assert(scope != null, 'PanelScope requires a PanelHost ancestor');
    return scope!;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<Object?>('id', id))
      ..add(ObjectFlagProperty<ValueChanged<PanelEntry>>.has('push', push))
      ..add(ObjectFlagProperty<VoidCallback?>.has('close', close));
  }

  @override
  bool updateShouldNotify(PanelScope oldWidget) => true;
}

class _PanelSurfaceScope extends InheritedWidget {
  const _PanelSurfaceScope({
    required this.compact,
    required this.close,
    required super.child,
  });
  final bool compact;
  final VoidCallback? close;
  static _PanelSurfaceScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_PanelSurfaceScope>();
  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('compact', value: compact, ifTrue: 'compact'))
      ..add(ObjectFlagProperty<VoidCallback?>.has('close', close));
  }

  @override
  bool updateShouldNotify(_PanelSurfaceScope oldWidget) =>
      compact != oldWidget.compact || close != oldWidget.close;
}
