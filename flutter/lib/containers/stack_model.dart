import 'dart:math' as math;
import 'dart:ui';

/// Pure model of a navigation stack: what changed between two page lists, and frame geometry. The
/// twin of `containers/stack-model.ts` in `@feeef.dev/ui`.
sealed class StackChange<K> {
  const StackChange();
}

/// The top page did not change.
final class StackNone<K> extends StackChange<K> {
  const StackNone();
}

/// [enter] arrives on top of [exit] (the previous top, which stays below).
final class StackPush<K> extends StackChange<K> {
  const StackPush({required this.enter, required this.exit});

  /// The page that arrives.
  final K enter;

  /// The previous top, or null when the stack was empty.
  final K? exit;
}

/// [exit] (the old top) leaves; [enter] is uncovered. [removed] lists every page that left.
final class StackPop<K> extends StackChange<K> {
  const StackPop({
    required this.enter,
    required this.exit,
    required this.removed,
  });

  /// The page uncovered, or null when the stack is now empty.
  final K? enter;

  /// The old top.
  final K exit;

  /// Every page that left, bottom first.
  final List<K> removed;
}

/// The top changed without a push or pop (a different detail, a reset).
final class StackReplace<K> extends StackChange<K> {
  const StackReplace({
    required this.enter,
    required this.exit,
    required this.removed,
  });

  /// The new top.
  final K enter;

  /// The old top, or null when the stack was empty.
  final K? exit;

  /// Every page that left, bottom first.
  final List<K> removed;
}

/// Classifies how a stack went from [previous] page keys to [next], root first.
StackChange<K> diffStack<K>(List<K> previous, List<K> next) {
  final prevTop = previous.isEmpty ? null : previous.last;
  final nextTop = next.isEmpty ? null : next.last;
  if (prevTop == nextTop) return StackNone<K>();
  var shared = 0;
  while (shared < previous.length &&
      shared < next.length &&
      previous[shared] == next[shared]) {
    shared++;
  }
  if (shared == previous.length) {
    return StackPush<K>(enter: nextTop as K, exit: prevTop);
  }
  if (shared == next.length) {
    return StackPop<K>(
      enter: nextTop,
      exit: prevTop as K,
      removed: previous.sublist(shared),
    );
  }
  return StackReplace<K>(
    enter: nextTop as K,
    exit: prevTop,
    removed: previous.sublist(shared),
  );
}

/// How far (fraction of the width) the page underneath slides while a page covers it, like iOS.
const double stackParallax = 0.3;

double _unit(double value) => value.clamp(0.0, 1.0);

/// Horizontal offsets in px for a slide transition. [shown] is how much the front page covers the
/// back one: 0 = front fully off its trailing edge, 1 = front in place. Mirrored for RTL.
({double front, double back, double dim}) slideFrame(
  double shown,
  double width,
  bool rtl,
) {
  final sign = rtl ? -1.0 : 1.0;
  return (
    front: sign * (1 - shown) * width,
    back: -sign * stackParallax * _unit(shown) * width,
    dim: _unit(shown),
  );
}

/// Interpolates two rects; [progress] is not clamped, so springs can overshoot through it.
Rect mixRect(Rect from, Rect to, double progress) {
  double m(double a, double b) => a + (b - a) * progress;
  return Rect.fromLTWH(
    m(from.left, to.left),
    m(from.top, to.top),
    m(from.width, to.width),
    m(from.height, to.height),
  );
}

/// Paint for a page shown inside a rect: a uniform [scale] that matches the rect's width, a
/// [translate] to its corner, and a clip that crops [clipBottom] px (page px) off the page's
/// bottom with [clipRadius] corners (page px). Content is never stretched.
typedef ZoomFrame = ({
  double scale,
  Offset translate,
  double clipBottom,
  double clipRadius,
});

/// Paint for a page of [page] size shown inside [rect] (stack coordinates) with [radius] corners
/// in screen px. The twin of `zoomFrame`, which returns the same numbers as CSS strings.
ZoomFrame zoomFrame(Rect rect, double radius, Size page) {
  final scale = math.max(0.0001, rect.width / math.max(1, page.width));
  final visibleHeight = rect.height / scale;
  return (
    scale: scale,
    translate: rect.topLeft,
    clipBottom: math.max(0, page.height - visibleHeight),
    clipRadius: math.max(0, radius) / scale,
  );
}

/// Where a zoomed page sits while it is dragged to dismiss: it shrinks as it is pulled and the
/// point first grabbed stays under the finger. [anchor] is that point in page coordinates; [pull]
/// is how far it has been pulled toward dismissal (defaults to the downward movement).
Rect dragDismissRect(
  Size page,
  Offset anchor,
  double dx,
  double dy, [
  double? pull,
]) {
  final p = pull ?? math.max(0, dy);
  final scale = 1 - 0.4 * (1 - 1 / (1 + math.max(0, p) / (page.height * 0.5)));
  final width = page.width * scale, height = page.height * scale;
  final up = dy < 0
      ? -(1 - 1 / ((-dy * 0.55) / page.height + 1)) * page.height
      : 0.0;
  return Rect.fromLTWH(
    anchor.dx + dx - anchor.dx * scale,
    anchor.dy + (dy > 0 ? dy : up) - anchor.dy * scale,
    width,
    height,
  );
}
