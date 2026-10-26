import 'package:flutter/widgets.dart';

import '../theme/tokens.dart';
import '../theme.dart';

/// Cross-fades dock content when [swapKey] changes: the old content fades out (100ms, drifting
/// 3px down) and stops taking input, then the new content fades in (160ms, from 3px above).
/// Same-key changes keep focus and child state. The twin of `DockContentSwap` in the web kit.
class DockContentSwap extends StatefulWidget {
  const DockContentSwap({
    super.key,
    required this.swapKey,
    required this.child,
  });

  /// Coarse task identity, e.g. `idle` / `selected`.
  final String swapKey;
  final Widget child;

  @override
  State<DockContentSwap> createState() => _DockContentSwapState();
}

enum _Phase { idle, out, inbound }

class _DockContentSwapState extends State<DockContentSwap>
    with SingleTickerProviderStateMixin {
  late String _shownKey = widget.swapKey;
  late Widget _shown = widget.child;
  _Phase _phase = _Phase.idle;
  late final _clock = AnimationController(vsync: this);

  /// Holds the content's focus nodes, so a swap can tell whether focus is inside it.
  final _region = FocusNode(
    debugLabel: 'DockContentSwap',
    skipTraversal: true,
    canRequestFocus: false,
  );

  @override
  void didUpdateWidget(DockContentSwap old) {
    super.didUpdateWidget(old);
    if (widget.swapKey == _shownKey && _phase != _Phase.out) {
      _shown = widget.child;
      return;
    }
    if (widget.swapKey == _shownKey) return;
    if (reducedMotionOf(context)) {
      _shownKey = widget.swapKey;
      _shown = widget.child;
      _phase = _Phase.idle;
      return;
    }
    // Focus inside the outgoing content moves to the dock before the content goes inert. Asked
    // through the focus tree: the focused widget may be leaving the element tree (a dialog's
    // button that just closed it), where ancestor lookups are unsafe.
    final focus = FocusManager.instance.primaryFocus;
    if (focus != null && focus.ancestors.contains(_region)) {
      focus.unfocus(disposition: UnfocusDisposition.previouslyFocusedChild);
    }
    _phase = _Phase.out;
    _clock
      ..duration = const Duration(milliseconds: 100)
      ..forward(from: 0).whenComplete(() {
        if (!mounted || _phase != _Phase.out) return;
        setState(() {
          _shownKey = widget.swapKey;
          _shown = widget.child;
          _phase = _Phase.inbound;
        });
        _clock
          ..duration = const Duration(milliseconds: 160)
          ..forward(from: 0).whenComplete(() {
            if (mounted && _phase == _Phase.inbound) {
              setState(() => _phase = _Phase.idle);
            }
          });
      });
  }

  @override
  void dispose() {
    _clock.dispose();
    _region.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _clock,
    builder: (context, child) {
      final t = _clock.value;
      final (opacity, dy) = switch (_phase) {
        _Phase.idle => (1.0, 0.0),
        _Phase.out => (1 - t, 3 * t),
        _Phase.inbound => (
          MotionTokens.ease.transform(t),
          -3 * (1 - MotionTokens.ease.transform(t)),
        ),
      };
      return IgnorePointer(
        ignoring: _phase == _Phase.out,
        child: ExcludeFocus(
          excluding: _phase == _Phase.out,
          child: Opacity(
            opacity: opacity,
            child: Transform.translate(offset: Offset(0, dy), child: child),
          ),
        ),
      );
    },
    child: Focus(
      focusNode: _region,
      child: KeyedSubtree(key: ValueKey(_shownKey), child: _shown),
    ),
  );
}
