/// Framing maths of the freeform board: the twin of `@feeef.dev/ui/image/freeform-frame`.
library;

import 'dart:math' as math;

import 'package:flutter/foundation.dart';

/// The board's pan and zoom: world point `p` shows at `p * scale + (x, y)`.
@immutable
class FrameView {
  const FrameView({required this.x, required this.y, required this.scale});
  final double x, y, scale;

  FrameView copyWith({double? x, double? y, double? scale}) =>
      FrameView(x: x ?? this.x, y: y ?? this.y, scale: scale ?? this.scale);

  static FrameView lerp(FrameView a, FrameView b, double t) => FrameView(
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: a.scale + (b.scale - a.scale) * t,
  );

  @override
  bool operator ==(Object other) =>
      other is FrameView &&
      other.x == x &&
      other.y == y &&
      other.scale == scale;

  @override
  int get hashCode => Object.hash(x, y, scale);

  @override
  String toString() => 'FrameView($x, $y, ×$scale)';
}

/// A floating panel's horizontal extent in the viewport.
@immutable
class FrameRect {
  const FrameRect({
    required this.left,
    required this.right,
    required this.width,
    required this.height,
  });
  final double left, right, width, height;
}

/// Which edge a side panel hugs.
enum FrameSide { left, right }

/// Horizontal room a floating panel occupies. A side column (the project rail, the poster
/// inspector) reserves space; a full-width sheet does not, because it covers the canvas on purpose.
double sideInset(
  bool open,
  FrameRect? rect,
  double viewportW,
  FrameSide side, [
  double gap = 8,
]) {
  if (!open ||
      rect == null ||
      viewportW <= 0 ||
      rect.width <= 0 ||
      rect.height <= 0) {
    return 0;
  }
  if (rect.width > viewportW * 0.7) return 0;
  if (side == FrameSide.left) {
    if (rect.left >= viewportW * 0.5) return 0;
    return _jsRound(math.max(0, rect.right + gap));
  }
  if (rect.left <= 0 ||
      rect.right > viewportW + 1 ||
      rect.right <= viewportW * 0.5) {
    return 0;
  }
  return _jsRound(math.max(0, viewportW - rect.left + gap));
}

/// JavaScript `Math.round`: halves go up.
double _jsRound(num value) => (value + 0.5).floorToDouble();

/// A card's horizontal world extent, for [revealCovered].
abstract interface class FrameCard {
  double get x;
  double get w;
}

/// After the focused card is fitted, pulls any card that is already peeking out from under a side
/// panel fully into the free area. The focus stays inside that area; cards that are completely
/// hidden stay put so a long history does not shove the current poster to the opposite edge.
FrameView revealCovered<T extends FrameCard>(
  FrameView view,
  List<T> cards,
  T focus,
  ({double w}) viewport,
  ({double left, double right}) insets, [
  double padding = 28,
]) {
  final leftBound = insets.left + padding;
  final rightBound = viewport.w - insets.right - padding;
  final scale = view.scale;
  if (!(scale > 0) || rightBound <= leftBound) return view;
  var x = view.x;
  double leftOf(T card, [double? origin]) => (origin ?? x) + card.x * scale;
  double rightOf(T card, [double? origin]) =>
      (origin ?? x) + (card.x + card.w) * scale;

  final peekingLeft = cards.where((card) {
    final left = leftOf(card);
    final right = rightOf(card);
    return left < leftBound - 0.5 && right > leftBound + 0.5;
  }).toList();
  if (peekingLeft.isNotEmpty) {
    final need = peekingLeft
        .map((card) => leftBound - leftOf(card))
        .reduce(math.max);
    final slack = rightBound - rightOf(focus);
    if (need > 0.5 && slack > 0.5) x += math.min(need, slack);
  }

  final peekingRight = cards.where((card) {
    final left = leftOf(card, x);
    final right = rightOf(card, x);
    return left < rightBound - 0.5 && right > rightBound + 0.5;
  }).toList();
  if (peekingRight.isNotEmpty) {
    final need = peekingRight
        .map((card) => rightOf(card, x) - rightBound)
        .reduce(math.max);
    final slack = leftOf(focus, x) - leftBound;
    if (need > 0.5 && slack > 0.5) x -= math.min(need, slack);
  }

  return x == view.x ? view : view.copyWith(x: x);
}
