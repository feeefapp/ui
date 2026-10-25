import 'package:flutter/widgets.dart';

import '../motion.dart';
import 'container.dart';

/// Joins the nearest [GlassContainer] with [child], so the container paints its glass (the twin of
/// `useGlassMember` in `@feeef.dev/ui/glass`). Inside a container the child's content rides with
/// its glass; outside one, [standalone] paints the bubble's own glass around it. A member inside
/// another member joins that one's glass: never a bubble inside a bubble.
class GlassMemberBox extends StatefulWidget {
  const GlassMemberBox({
    super.key,
    this.glassId,
    this.union,
    this.motion = GlassMotion.spring,
    required this.radius,
    required this.standalone,
    this.hidden = false,
    required this.child,
  });

  /// Identity inside the container; defaults to one per widget.
  final String? glassId;

  /// Bubbles sharing a union name draw as one shape spanning all of them.
  final String? union;
  final GlassMotion motion;

  /// Corner radius of the bubble's glass.
  final double radius;

  /// Leaves the container's glass (absorbed into its nearest neighbour) while the content keeps its place: the web
  /// kit's `data-glass-hidden`, for a bar title that fades in and out. A bubble inside a closing
  /// [Presence] leaves the glass the same way, so its glass flows away while its content fades.
  final bool hidden;

  /// Paints the bubble on its own (no container).
  final Widget Function(Widget child) standalone;
  final Widget child;

  @override
  State<GlassMemberBox> createState() => _GlassMemberBoxState();
}

class _InsideBubble extends InheritedWidget {
  const _InsideBubble({required super.child});
  @override
  bool updateShouldNotify(_InsideBubble old) => false;
}

class _GlassMemberBoxState extends State<GlassMemberBox> {
  final _box = GlobalKey();
  GlassMemberHandle? _handle;
  GlassMemberRegistry? _registry;
  bool _nested = false;

  /// Inside a container, even while hidden: the bubble never paints its own glass there.
  bool _inContainer = false;
  static final _still = ValueNotifier<(Offset, double)>((Offset.zero, 1));
  String? _id;
  static int _serial = 0;
  late final String _autoId = 'glass-member-${_serial++}';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(GlassMemberBox old) {
    super.didUpdateWidget(old);
    _sync(
      force:
          old.union != widget.union ||
          old.motion != widget.motion ||
          old.hidden != widget.hidden,
    );
  }

  void _sync({bool force = false}) {
    _nested =
        context.dependOnInheritedWidgetOfExactType<_InsideBubble>() != null;
    final container = _nested ? null : GlassMember.of(context);
    _inContainer = container != null;
    final closing = Presence.stateOf(context) == PresenceState.closed;
    final registry = widget.hidden || closing || GlassHidden.of(context)
        ? null
        : container;
    final id = widget.glassId ?? _autoId;
    if (!force && registry == _registry && id == _id) return;
    _handle?.unregister();
    _handle = null;
    _registry = registry;
    _id = id;
    if (registry != null) {
      _handle = registry.register(
        id,
        _box,
        radius: () => widget.radius,
        union: widget.union,
        motion: widget.motion,
      );
    }
  }

  // A bubble taken out of the tree leaves the glass at once, and comes back if it is reinserted
  // (moved with a GlobalKey): the container must never measure an inactive element.
  @override
  void deactivate() {
    _handle?.unregister();
    _handle = null;
    _registry = null;
    super.deactivate();
  }

  @override
  void activate() {
    super.activate();
    _sync(force: true);
  }

  @override
  void dispose() {
    _handle?.unregister();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = _InsideBubble(child: widget.child);
    if (_inContainer) {
      // Content rides with its glass while the bubble moves, and swells with a press. The tree
      // keeps one shape whether or not the bubble is hidden, so its content keeps its state.
      return KeyedSubtree(
        key: _box,
        child: ValueListenableBuilder<(Offset, double)>(
          valueListenable: _handle?.content ?? _still,
          builder: (context, value, child) => Transform.translate(
            offset: value.$1,
            child: Transform.scale(scale: value.$2, child: child),
          ),
          child: content,
        ),
      );
    }
    if (_nested) return KeyedSubtree(key: _box, child: content);
    return KeyedSubtree(key: _box, child: widget.standalone(content));
  }
}

/// Takes every bubble below it out of the container's glass (absorbed into its nearest neighbour)
/// while [hidden], their content keeping its place: the web kit's `data-glass-hidden` on an
/// ancestor. A [ScaffoldAppBar] uses it for a title squeezed out of room.
class GlassHidden extends InheritedWidget {
  const GlassHidden({super.key, required this.hidden, required super.child});
  final bool hidden;

  /// Whether a [GlassHidden] above [context] hides its bubbles.
  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<GlassHidden>()?.hidden ??
      false;

  @override
  bool updateShouldNotify(GlassHidden old) => old.hidden != hidden;
}
