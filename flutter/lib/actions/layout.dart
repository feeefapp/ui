/// Which top-level entries fit, and which spill into the overflow menu: the twin of
/// `computeActionsLayout` in `@feeef.dev/ui/actions`. Both lists keep source order. A host
/// narrower than the overflow trigger still gets that trigger, so every action stays reachable.
({List<T> visible, List<T> overflow, double requiredWidth})
computeActionsLayout<T>({
  required List<T> actions,
  required double maxWidth,
  required double Function(T action) measure,
  required double Function(T action) priority,
  double overflowWidth = 40,
  double gap = 4,
}) {
  if (maxWidth.isNaN || maxWidth < 0) {
    throw RangeError('Actions maxWidth must be non-negative.');
  }
  for (final value in [overflowWidth, gap]) {
    if (!value.isFinite || value < 0) {
      throw RangeError(
        'Actions overflowWidth and gap must be finite and non-negative.',
      );
    }
  }
  if (actions.isEmpty) {
    return (visible: <T>[], overflow: <T>[], requiredWidth: 0);
  }
  final widths = [
    for (final action in actions)
      () {
        final width = measure(action);
        if (!width.isFinite || width < 0) {
          throw RangeError('Each action needs a finite, non-negative width.');
        }
        return width;
      }(),
  ];
  final complete =
      widths.fold(0.0, (sum, w) => sum + w) + gap * (actions.length - 1);
  if (complete <= maxWidth) {
    return (visible: [...actions], overflow: <T>[], requiredWidth: complete);
  }
  final order =
      [
        for (var i = 0; i < actions.length; i++)
          (
            index: i,
            priority: priority(actions[i]).isFinite
                ? priority(actions[i])
                : 0.0,
          ),
      ]..sort((a, b) {
        final p = a.priority.compareTo(b.priority);
        return p != 0 ? p : b.index.compareTo(a.index);
      });
  final spilled = <int>{};
  var required = complete + gap + overflowWidth;
  for (final entry in order) {
    spilled.add(entry.index);
    required -= widths[entry.index] + gap;
    if (required <= maxWidth) break;
  }
  return (
    visible: [
      for (var i = 0; i < actions.length; i++)
        if (!spilled.contains(i)) actions[i],
    ],
    overflow: [
      for (var i = 0; i < actions.length; i++)
        if (spilled.contains(i)) actions[i],
    ],
    requiredWidth: required < overflowWidth ? overflowWidth : required,
  );
}

/// What changed in the visible row between two layouts: entries coming out of the More menu,
/// entries going into it, and the ones that stayed.
({List<String> entering, List<String> leaving, List<String> staying})
diffVisibleActions(List<String> previous, List<String> next) {
  final before = previous.toSet(), after = next.toSet();
  return (
    entering: [
      for (final id in next)
        if (!before.contains(id)) id,
    ],
    leaving: [
      for (final id in previous)
        if (!after.contains(id)) id,
    ],
    staying: [
      for (final id in next)
        if (before.contains(id)) id,
    ],
  );
}
