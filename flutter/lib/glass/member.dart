import 'package:flutter/widgets.dart';

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
    required this.child,
  });

  /// Identity inside the container; defaults to one per widget.
  final String? glassId;

  /// Bubbles sharing a union name draw as one shape spanning all of them.
  final String? union;
  final GlassMotion motion;

  /// Corner radius of the bubble's glass.
  final double radius;

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
    _sync(force: old.union != widget.union || old.motion != widget.motion);
  }

  void _sync({bool force = false}) {
    _nested =
        context.dependOnInheritedWidgetOfExactType<_InsideBubble>() != null;
    final registry = _nested ? null : GlassMember.of(context);
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

  @override
  void dispose() {
    _handle?.unregister();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = _InsideBubble(child: widget.child);
    final handle = _handle;
    if (handle != null) {
      // Content rides with its glass while the bubble moves, and swells with a press.
      return KeyedSubtree(
        key: _box,
        child: ValueListenableBuilder<(Offset, double)>(
          valueListenable: handle.content,
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
