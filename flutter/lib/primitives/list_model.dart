import '../physics/spring.dart';

/// Pure decisions for list rows: where a swipe lands, and where a dragged row would drop. The
/// twin of `@feeef.dev/ui/primitives/list-model`.
class SwipeSides {
  const SwipeSides({
    required this.leading,
    required this.trailing,
    required this.row,
    this.fullLeading = true,
    this.fullTrailing = true,
  });

  /// Width revealed by the start-side actions (0 = none).
  final double leading;

  /// Width revealed by the end-side actions (0 = none).
  final double trailing;

  /// The row's width.
  final double row;

  /// Whether a long swipe runs the first action on that side.
  final bool fullLeading, fullTrailing;
}

/// Which side's first action a swipe runs.
enum SwipeSide { leading, trailing }

/// Fraction of the row past which a swipe runs the first action.
const double fullSwipe = 0.55;

/// Where a released row goes. [offset] is logical: positive moves the row toward the end and
/// shows leading actions; negative shows trailing ones. [velocity] in the same units per second.
({double offset, SwipeSide? commit}) swipeRelease(
  double offset,
  double velocity,
  SwipeSides s,
) {
  final full = s.row * fullSwipe;
  if (offset > full && s.fullLeading && s.leading > 0) {
    return (offset: s.row, commit: SwipeSide.leading);
  }
  if (offset < -full && s.fullTrailing && s.trailing > 0) {
    return (offset: -s.row, commit: SwipeSide.trailing);
  }
  final projected = projectMomentum(offset, velocity, 0.99);
  if (projected > s.leading / 2 && s.leading > 0 && offset > 0) {
    return (offset: s.leading, commit: null);
  }
  if (projected < -s.trailing / 2 && s.trailing > 0 && offset < 0) {
    return (offset: -s.trailing, commit: null);
  }
  return (offset: 0, commit: null);
}

/// Whether a row dragged to [offset] is in full-swipe territory (the first action takes over).
bool swipeIsFull(double offset, SwipeSides s) {
  final full = s.row * fullSwipe;
  return (offset > full && s.fullLeading && s.leading > 0) ||
      (offset < -full && s.fullTrailing && s.trailing > 0);
}

/// The index a dragged item would drop at: an item moves aside once the dragged item's centre
/// passes its centre.
int reorderTarget(List<double> heights, int from, double delta) {
  final tops = <double>[];
  var y = 0.0;
  for (final h in heights) {
    tops.add(y);
    y += h;
  }
  final center = tops[from] + heights[from] / 2 + delta;
  var to = from;
  for (var j = from + 1; j < heights.length; j++) {
    if (center > tops[j] + heights[j] / 2) to = j;
  }
  for (var j = from - 1; j >= 0; j--) {
    if (center < tops[j] + heights[j] / 2) to = j;
  }
  return to;
}

/// How far each item shifts to open the gap at [to] while item [from] is dragged.
List<double> reorderShifts(List<double> heights, int from, int to) => [
  for (var j = 0; j < heights.length; j++)
    j == from
        ? 0
        : from < to && j > from && j <= to
        ? -heights[from]
        : to < from && j >= to && j < from
        ? heights[from]
        : 0,
];

/// Where the dragged item lands relative to its start, once it drops at [to].
double reorderLanding(List<double> heights, int from, int to) {
  var sum = 0.0;
  if (to > from) {
    for (var j = from + 1; j <= to; j++) {
      sum += heights[j];
    }
  } else {
    for (var j = to; j < from; j++) {
      sum -= heights[j];
    }
  }
  return sum;
}
