/// Index of the first option whose width fits [available], or the last option when none does
/// (-1 for no options): the twin of `pickFitting` in `@feeef.dev/ui/containers/adaptive-model`.
int pickFitting(List<double> widths, double available) {
  final i = widths.indexWhere((w) => w <= available + 0.5);
  return i < 0 ? widths.length - 1 : i;
}
