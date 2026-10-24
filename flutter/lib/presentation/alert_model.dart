/// Pure layout rules for [Alert], shared with the web kit (`src/presentation/alert-model.ts`).
library;

/// What an alert action does; it decides the button's paint and its place. No role (null) is a
/// plain choice.
enum AlertActionRole {
  /// Backs out. Escape runs it; it leads a row and ends a stack.
  cancel,

  /// The one main action (filled).
  primary,

  /// Deletes or loses something (tinted danger).
  destructive,
}

/// True when the actions sit side by side: exactly two, each as wide as its label needs (padding
/// included) within half the row, less half the gap. Anything else stacks full width.
bool alertActionsFit(List<double> widths, double rowWidth, double gap) {
  if (widths.length != 2) return false;
  final half = (rowWidth - gap) / 2;
  return widths.every((width) => width <= half + 0.5);
}

/// The order actions appear in, as indices into [roles]: side by side the cancel action leads
/// (the main action ends the row); stacked it goes to the bottom. Others keep their given order.
List<int> alertActionOrder(List<AlertActionRole?> roles, bool sideBySide) {
  final indices = [for (var i = 0; i < roles.length; i++) i];
  final cancel = indices.where((i) => roles[i] == AlertActionRole.cancel);
  final rest = indices.where((i) => roles[i] != AlertActionRole.cancel);
  return sideBySide ? [...cancel, ...rest] : [...rest, ...cancel];
}
