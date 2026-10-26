/// Small helpers of the image board: the twin of `@feeef.dev/ui/image/board-utils`.
library;

import 'types.dart';

/// Width over height of a take's shape, from `aspectRatio` (or `size`) such as `4:5` or
/// `1024x1536`; 1 when it can't be read.
double stageRatio(Object? model, ImageOptions options) {
  final value = options.aspectRatio ?? options.size ?? '1:1';
  final parts = value.split(RegExp('[:x]')).map(_jsNumber).toList();
  return parts.length == 2 && parts[0] > 0 && parts[1] > 0
      ? parts[0] / parts[1]
      : 1;
}

/// JavaScript `Number(text)`: trims, empty is 0, anything unparsable is NaN.
double _jsNumber(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return 0;
  return double.tryParse(trimmed) ?? double.nan;
}

/// Time since [from] (ISO 8601) at [now] (ms since the epoch): `12s`, `2m 5s`.
String elapsed(String from, num now) {
  final start = DateTime.tryParse(from)?.millisecondsSinceEpoch;
  if (start == null) return 'NaNs';
  final seconds = _jsRound((now - start) / 1000).clamp(0, 1 << 52);
  return seconds < 60 ? '${seconds}s' : '${seconds ~/ 60}m ${seconds % 60}s';
}

/// JavaScript `Math.round`: halves go up.
int _jsRound(num value) => (value + 0.5).floor();

/// The message of a failed take: the translation of `lab.board.err_<errorCode>` when [t] knows
/// it, else the take's own error, else [fallback].
String takeErrorText(
  ({String? error, String? errorCode}) take,
  String Function(String key) t,
  String fallback,
) {
  final code = take.errorCode;
  final key = code != null && code.isNotEmpty ? 'lab.board.err_$code' : null;
  final coded = key != null ? t(key) : null;
  if (coded != null && coded.isNotEmpty && coded != key) return coded;
  final error = take.error;
  return error != null && error.isNotEmpty ? error : fallback;
}
