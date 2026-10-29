import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../motion.dart';
import 'container.dart';
import '../platform/pointer_shield.dart';

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
    this.singleRim = false,
    this.origin,
    required this.child,
  });

  /// The control this bubble comes out of (a menu's button): it is born out of it, returns into it
  /// when it leaves, and its content is clipped to its glass while it travels ([GlassOrigin]).
  final GlassOrigin? origin;

  /// The render box of the glass bubble [context] sits in, or null outside one: a menu's
  /// [GlassOrigin.glass].
  static RenderBox? glassOf(BuildContext context) {
    final bubble = context.getInheritedWidgetOfExactType<_InsideBubble>();
    final box = bubble?.box.currentContext?.findRenderObject();
    return box is RenderBox ? box : null;
  }

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

  /// Keeps control surfaces to one rim independently of their label width.
  final bool singleRim;

  /// Paints the bubble on its own (no container).
  final Widget Function(Widget child) standalone;
  final Widget child;

  @override
  State<GlassMemberBox> createState() => _GlassMemberBoxState();
}

class _InsideBubble extends InheritedWidget {
  const _InsideBubble({
    required this.box,
    required this.registry,
    required super.child,
  });
  final GlobalKey box;

  /// The container that bubble belongs to: a bubble in an overlay opened from it (a menu, under a
  /// [GlassLayer] or its own container) is not inside it.
  final GlassMemberRegistry? registry;
  @override
  bool updateShouldNotify(_InsideBubble old) => old.registry != registry;
}

class _GlassMemberBoxState extends State<GlassMemberBox> {
  final _box = GlobalKey();
  final _contentKey = GlobalKey();
  GlassMemberHandle? _handle;
  GlassMemberRegistry? _registry;
  bool _nested = false;

  /// Inside a container, even while hidden: the bubble never paints its own glass there.
  bool _inContainer = false;
  static final _still = ValueNotifier<(Offset, double)>((Offset.zero, 1));
  static final _unclipped = ValueNotifier<Path?>(null);

  /// The clip of a bubble with an origin; kept after it leaves so its content stays inside its
  /// glass while that flies back.
  ValueListenable<Path?>? _clip;
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
          old.hidden != widget.hidden ||
          old.singleRim != widget.singleRim ||
          old.origin != widget.origin,
    );
  }

  void _sync({bool force = false}) {
    final inside = context.dependOnInheritedWidgetOfExactType<_InsideBubble>();
    final nearest = GlassMember.of(context);
    _nested = inside != null && inside.registry == nearest;
    final container = _nested ? null : nearest;
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
        singleRim: widget.singleRim,
        union: widget.union,
        motion: widget.motion,
        origin: widget.origin,
      );
      if (widget.origin != null) _clip = _handle!.clip;
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
    final content = _InsideBubble(
      box: _box,
      registry: GlassMember.of(context),
      child: widget.child,
    );
    if (_inContainer) {
      // Content rides with its glass while the bubble moves, and swells with a press. The tree
      // keeps one shape whether or not the bubble is hidden, so its content keeps its state. A
      // bubble over an embedded web page keeps the pointer ([PointerShield]).
      // The content is its own layer: the container's glass repaints on every frame its light
      // turns or a bubble springs, and must not re-record every button and icon in the bubble
      // to do so; a control's hover or press repaints the control, not the glass and its
      // backdrop filters. The box the container measures sits above the transform, so the
      // layer changes nothing it reads. A bubble out of the glass (hidden, squeezed away,
      // closing) paints with its container instead: a layer of its own would still paint once
      // in the frame an ancestor takes it offstage (dirty layers paint deepest first), and its
      // content keeps its element and state across the change through its key.
      final keyed = KeyedSubtree(key: _contentKey, child: content);
      final layered = _handle == null ? keyed : RepaintBoundary(child: keyed);
      return PointerShield(
        child: KeyedSubtree(
          key: _box,
          child: ValueListenableBuilder<(Offset, double)>(
            valueListenable: _handle?.content ?? _still,
            builder: (context, value, child) => Transform.translate(
              offset: value.$1,
              child: Transform.scale(scale: value.$2, child: child),
            ),
            child: widget.origin == null
                ? layered
                : ClipPath(
                    clipper: _GlassClipper(_clip ?? _unclipped),
                    child: layered,
                  ),
          ),
        ),
      );
    }
    if (_nested) return KeyedSubtree(key: _box, child: content);
    return PointerShield(
      child: KeyedSubtree(key: _box, child: widget.standalone(content)),
    );
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

/// Clips a bubble's content to its glass while it travels ([GlassMemberHandle.clip]); at rest it
/// clips nothing.
class _GlassClipper extends CustomClipper<Path> {
  _GlassClipper(this.clip) : super(reclip: clip);
  final ValueListenable<Path?> clip;

  @override
  Path getClip(Size size) =>
      clip.value ??
      (Path()..addRect(
        Rect.fromLTWH(-1e4, -1e4, size.width + 2e4, size.height + 2e4),
      ));

  @override
  bool shouldReclip(_GlassClipper old) => old.clip != clip;
}
