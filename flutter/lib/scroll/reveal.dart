import 'package:flutter/widgets.dart';

import 'metrics.dart';
import '../theme.dart';

/// How [revealScrollChild] aligns the child on an axis: the least movement (`nearest`), centred,
/// or not at all (the web kit's `false`).
enum RevealAlignment { nearest, center, none }

/// `behavior` of [revealScrollChild]: jump, or glide like the browser's smooth scroll.
enum RevealBehavior { instant, smooth }

/// Space at the ends of a scroll viewport that floating chrome covers: the twin of the viewport's
/// `scroll-padding`. A scroll area provides it to its content so [revealScrollChild] keeps rows out
/// from under its floats; wrap custom scroll views in it to do the same.
class ScrollRevealPadding extends InheritedWidget {
  const ScrollRevealPadding({
    super.key,
    required this.padding,
    required super.child,
  });

  /// Reserved space, in the viewport's own top/bottom/left/right.
  final EdgeInsets padding;

  /// The nearest reservation, or zero.
  static EdgeInsets of(BuildContext context) =>
      context.getInheritedWidgetOfExactType<ScrollRevealPadding>()?.padding ??
      EdgeInsets.zero;

  @override
  bool updateShouldNotify(ScrollRevealPadding old) => old.padding != padding;
}

/// Scroll distance (on [axis], in scroll offset units) that shows [child] inside [viewport] minus
/// [padding]; the pure part of [revealScrollChild]. Positive moves the content toward its end.
double revealDelta({
  required Rect viewport,
  required Rect child,
  required Axis axis,
  EdgeInsets padding = EdgeInsets.zero,
  RevealAlignment alignment = RevealAlignment.nearest,
}) {
  if (alignment == RevealAlignment.none) return 0;
  final vertical = axis == Axis.vertical;
  final start = vertical
      ? viewport.top + padding.top
      : viewport.left + padding.left;
  final rawEnd = vertical
      ? viewport.bottom - padding.bottom
      : viewport.right - padding.right;
  final end = rawEnd < start ? start : rawEnd;
  return scrollRevealDelta(
    vertical ? child.top : child.left,
    vertical ? child.bottom : child.right,
    start,
    end,
    center: alignment == RevealAlignment.center,
  );
}

/// Scrolls [viewport] the minimum needed to show [child] (a context inside its scroll view),
/// honouring the viewport's [ScrollRevealPadding] (the floats' reservations). The twin of
/// `revealScrollChild` in `@feeef.dev/ui/scroll`: unlike `Scrollable.ensureVisible` it never
/// moves ancestor scroll views. [block] applies to vertical viewports, [inline] to horizontal
/// ones (a ScrollController scrolls one axis). Reduced motion forces an instant scroll.
Future<void> revealScrollChild(
  ScrollController? viewport,
  BuildContext? child, {
  RevealAlignment block = RevealAlignment.nearest,
  RevealAlignment inline = RevealAlignment.nearest,
  RevealBehavior behavior = RevealBehavior.instant,
}) async {
  if (viewport == null || child == null || !viewport.hasClients) return;
  if (!child.mounted) return;
  final position = viewport.position;
  final scrollable = position.context.notificationContext;
  final viewportBox = scrollable?.findRenderObject();
  final childBox = child.findRenderObject();
  if (viewportBox is! RenderBox ||
      childBox is! RenderBox ||
      !viewportBox.hasSize ||
      !childBox.hasSize) {
    return;
  }
  // Only reveal descendants of this viewport.
  RenderObject? node = childBox;
  while (node != null && node != viewportBox) {
    node = node.parent;
  }
  if (node == null) return;
  final origin = viewportBox.localToGlobal(Offset.zero);
  final viewportRect = Offset.zero & viewportBox.size;
  final childRect =
      (childBox.localToGlobal(Offset.zero) - origin) & childBox.size;
  final axis = position.axis;
  final padding = ScrollRevealPadding.of(child);
  var delta = revealDelta(
    viewport: viewportRect,
    child: childRect,
    axis: axis,
    padding: padding,
    alignment: axis == Axis.vertical ? block : inline,
  );
  // Reversed axes (bottom-up lists, right-to-left rows) grow the offset the other way.
  if (axisDirectionIsReversed(position.axisDirection)) delta = -delta;
  if (delta == 0) return;
  final target = (position.pixels + delta).clamp(
    position.minScrollExtent,
    position.maxScrollExtent,
  );
  if (target == position.pixels) return;
  final reduced = reducedMotionOf(child);
  if (behavior == RevealBehavior.instant || reduced) {
    position.jumpTo(target);
  } else {
    await position.animateTo(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }
}
