/// Pure ladder helpers (no widgets) so they can be unit tested: the Dart twin of
/// `@feeef.dev/ui/model-ladder-core`. A quality ladder is one control that moves between curated
/// models, cheapest first (port of marchant `tools/ai/widgets/model_ladder_selector.dart`).
library;

import 'dart:math' as math;
import 'dart:ui' show Color;

/// Shows a Free or Pro tag on a model. Display only; the owner enforces access.
enum LadderAccess { free, pro }

/// One rung of the ladder, or one model in the full model list.
class LadderStop {
  const LadderStop({
    this.access,
    required this.modelId,
    required this.label,
    required this.modelName,
    this.description,
    this.priceUsd,
  });

  /// Reads a stop as the Lab API serves it (`access` is `free`, `pro` or absent).
  factory LadderStop.fromJson(Map<String, Object?> json) => LadderStop(
    access: switch (json['access']) {
      'free' => LadderAccess.free,
      'pro' => LadderAccess.pro,
      _ => null,
    },
    modelId: json['modelId'] as String? ?? '',
    label: json['label'] as String? ?? '',
    modelName: json['modelName'] as String? ?? '',
    description: json['description'] as String?,
    priceUsd: (json['priceUsd'] as num?)?.toDouble(),
  );

  /// Shows a Free or Pro tag. Display only; the owner enforces access.
  final LadderAccess? access;

  /// Stable model id sent to the API.
  final String modelId;

  /// Tier word shown large, e.g. "Fast", "Pro". Replaced by a positional tier when it copies the
  /// name or id.
  final String label;

  /// Human model name shown under the tier.
  final String modelName;

  /// Optional one-liner shown in the model list.
  final String? description;

  /// Typical price per run, when known. Never estimated on the client.
  final double? priceUsd;
}

/// Where a ladder came from: a Cloud collection or the priced catalog fallback.
enum LadderSource { cloud, catalog }

/// A ladder as the Lab API serves it (Cloud collection, or a priced catalog fallback).
class Ladder {
  const Ladder({
    required this.id,
    required this.name,
    required this.source,
    required this.stops,
    required this.defaultIndex,
  });

  /// Reads a ladder from the Lab API's JSON.
  factory Ladder.fromJson(Map<String, Object?> json) => Ladder(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    source: json['source'] == 'cloud'
        ? LadderSource.cloud
        : LadderSource.catalog,
    stops: [
      for (final stop in (json['stops'] as List? ?? const []))
        LadderStop.fromJson((stop as Map).cast<String, Object?>()),
    ],
    defaultIndex: (json['defaultIndex'] as num?)?.toInt() ?? 0,
  );

  /// Collection id.
  final String id;

  /// Collection name.
  final String name;

  /// Cloud collection or catalog fallback.
  final LadderSource source;

  /// The rungs, cheapest first.
  final List<LadderStop> stops;

  /// The rung the ladder starts on.
  final int defaultIndex;
}

/// Size and aspect of the canvas the selected model will render.
class AspectReadout {
  const AspectReadout({
    required this.size,
    required this.aspect,
    required this.widthOverHeight,
  });

  /// Pixel size, e.g. `1024 × 1536`.
  final String size;

  /// Aspect label, e.g. `2:3`.
  final String aspect;

  /// Aspect ratio as width divided by height.
  final double widthOverHeight;
}

String _typical(String price) => 'Usually about $price';

/// The ladder's strings.
class LadderCopy {
  const LadderCopy({
    required this.quality,
    required this.reset,
    required this.fast,
    required this.balanced,
    required this.best,
    required this.pickModel,
    required this.searchModels,
    required this.noMatches,
    required this.back,
    required this.typical,
  });

  /// The slider's name.
  final String quality;

  /// The reset button's name.
  final String reset;

  /// Positional tier words.
  final String fast, balanced, best;

  /// Model list title.
  final String pickModel;

  /// Model list search placeholder.
  final String searchModels;

  /// Model list empty state.
  final String noMatches;

  /// Model list back button.
  final String back;

  /// Typical price line, given a formatted price.
  final String Function(String price) typical;
}

/// The built-in English strings (`LADDER_COPY` in the web kit).
const ladderCopy = LadderCopy(
  quality: 'Quality',
  reset: 'Reset to default',
  fast: 'Fast',
  balanced: 'Balanced',
  best: 'Best',
  pickModel: 'Choose a model',
  searchModels: 'Search models…',
  noMatches: 'No models match.',
  back: 'Back to quality',
  typical: _typical,
);

/// [value] limited to [min]..[max] (`Math.min(max, Math.max(min, value))`).
double clamp(double value, double min, double max) =>
    math.min(max, math.max(min, value));

/// Tier word for a stop; a label that copies the name or id becomes Fast / Balanced / Best.
String visibleLabel(
  LadderStop stop,
  int index,
  int count, [
  LadderCopy copy = ladderCopy,
]) {
  final label = stop.label.trim();
  if (label.isNotEmpty &&
      label != stop.modelName.trim() &&
      label != stop.modelId.trim()) {
    return label;
  }
  if (count <= 1 || index >= count - 1) return copy.best;
  if (index <= 0) return copy.fast;
  return copy.balanced;
}

/// Human name for a list row; keeps the model id when no distinct name is available.
String displayName(
  LadderStop stop,
  int index,
  int count, [
  LadderCopy copy = ladderCopy,
]) {
  final name = stop.modelName.trim();
  final id = stop.modelId.trim();
  if (name.isNotEmpty && name != id) return name;
  final label = stop.label.trim();
  if (label.isNotEmpty && label != id && label != name) return label;
  if (name.isNotEmpty) return name;
  if (id.isNotEmpty) return id;
  return visibleLabel(stop, index, count, copy);
}

/// The ladder's middle rung is the balanced default, as in marchant.
int middleIndex(int count) => math.max(0, ((count - 1) / 2).floor());

/// Heat of the top rung: 0 until the thumb passes the second-to-last stop, 1 on the last.
double heatAt(double position, int count) =>
    count <= 1 ? 1 : clamp(position - (count - 2), 0, 1);

/// USD with enough precision for cents-level AI prices.
String formatUsd(double value) => value <= 0
    ? r'$0'
    : value < 0.01
    ? r'<$0.01'
    : value < 0.1
    ? '\$${value.toStringAsFixed(3)}'
    : '\$${value.toStringAsFixed(2)}';

/// Side of one fire cell in logical pixels (`FIRE_CELL`).
const fireCellSize = 5;

/// Fire colours from embers to the white-hot tip (`FIRE_PALETTE`).
const firePalette = [
  Color(0xFF3B0A04),
  Color(0xFFA32008),
  Color(0xFFFF4D0A),
  Color(0xFFFF9A1F),
  Color(0xFFFFD54A),
  Color(0xFFFFF6C4),
];

/// Cheap deterministic noise in [0, 1) for one cell and frame.
double fireNoise(num x, num y, num frame) {
  final s = math.sin(x * 127.1 + y * 311.7 + frame * 74.7) * 43758.5453;
  return s - s.floorToDouble();
}

/// Palette index for a cell, or -1 when it stays dark. `rise` is 0 at the top edge, 1 at the
/// bottom.
int fireCell(int col, int row, int rows, int frame) {
  final rise = rows <= 1 ? 1.0 : row / (rows - 1);
  final n = fireNoise(col, row, frame);
  final v = rise * rise * (0.55 + 0.45 * n) + 0.12 * n;
  if (v < 0.18) return -1;
  return clamp(
    (v * firePalette.length).floorToDouble(),
    0,
    firePalette.length - 1,
  ).toInt();
}
