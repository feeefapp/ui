import '../glass/press.dart';
import '../physics/spring.dart';

/// Pure geometry of a segmented control's moving pill: the twin of
/// `@feeef.dev/ui/primitives/segmented-model` (vectors in `test/fixtures/segmented.json`).

/// One segment along the track, in px from the track's left edge (physical, never mirrored).
class SegmentSpan {
  const SegmentSpan(this.start, this.width, {this.disabled = false});
  final double start, width;

  /// Disabled segments are never a release target.
  final bool disabled;

  double get center => start + width / 2;
}

/// How far (px) the pill can be pulled past either end, with rubber-band resistance.
const double segmentedOverdrag = 12;

/// The lens stretches by the distance the pointer covers in this many seconds (rubber-banded).
const double segmentedStretchTime = 0.1;

/// Deceleration a release is projected with ([projectMomentum]): quicker than a scroll view (0.99),
/// so a flick reaches the next segment without skipping one.
const double segmentedDeceleration = 0.97;

/// Travel (px) before a press becomes a drag: mouse and pen.
const double segmentedSlopMouse = 4;

/// Travel (px) before a press becomes a drag: touch.
const double segmentedSlopTouch = 10;

/// Index of the segment under [x]; a point in a gap or past an end goes to the nearest segment.
int segmentIndexAt(double x, List<SegmentSpan> spans) {
  var best = -1;
  var distance = double.infinity;
  for (var i = 0; i < spans.length; i++) {
    final s = spans[i];
    final d = x < s.start
        ? s.start - x
        : x > s.start + s.width
        ? x - s.start - s.width
        : 0.0;
    if (d < distance) {
      best = i;
      distance = d;
    }
  }
  return best;
}

/// The pill's centre while dragged: the pointer less where it grabbed the pill, kept between the
/// first and last segment centres, with a slight rubber band past either end.
double segmentedDragCenter(
  double pointer,
  double grab,
  List<SegmentSpan> spans,
) {
  if (spans.isEmpty) return pointer - grab;
  return rubberBandClamp(
    pointer - grab,
    spans.first.center,
    spans.last.center,
    segmentedOverdrag,
  );
}

/// The pill's width with its centre at [center]: it changes from one segment's width to the next.
double segmentedPillWidth(double center, List<SegmentSpan> spans) {
  if (spans.isEmpty) return 0;
  if (center <= spans.first.center) return spans.first.width;
  for (var i = 0; i < spans.length - 1; i++) {
    final a = spans[i].center, b = spans[i + 1].center;
    if (center <= b) {
      return mix(
        spans[i].width,
        spans[i + 1].width,
        b == a ? 1 : (center - a) / (b - a),
      );
    }
  }
  return spans.last.width;
}

/// Where a released pill settles: the enabled segment nearest to where its momentum would carry
/// it. -1 when every one is disabled.
int segmentedSnapIndex(
  double center,
  double velocity,
  List<SegmentSpan> spans,
) {
  final projected = projectMomentum(center, velocity, segmentedDeceleration);
  var best = -1;
  var distance = double.infinity;
  for (var i = 0; i < spans.length; i++) {
    if (spans[i].disabled) continue;
    final d = (spans[i].center - projected).abs();
    if (d < distance) {
      best = i;
      distance = d;
    }
  }
  return best;
}

/// How far (px, signed) the lens stretches along a drag moving at [velocity] px/s.
double segmentedStretch(double velocity) =>
    glassStretch(velocity * segmentedStretchTime, 0).x;
