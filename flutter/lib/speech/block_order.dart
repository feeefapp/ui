/// Pure reorder maths for speech blocks: the Dart twin of `@feeef.dev/ui/speech/block-order`.
library;

/// A block's measured slot: its top edge and height, in one coordinate space.
typedef SpeechSlot = ({double top, double height});

/// Move the original object, including its voice/delivery settings, in one undoable edit. Returns
/// [blocks] itself when the move is out of range or a no-op.
List<T> moveSpeechBlock<T>(List<T> blocks, int from, int to) {
  if (from < 0 ||
      to < 0 ||
      from >= blocks.length ||
      to >= blocks.length ||
      from == to) {
    return blocks;
  }
  final result = [...blocks];
  result.insert(to, result.removeAt(from));
  return result;
}

/// Follow identity through reorder, removal, undo and redo; new drafts start at block zero.
int remapSpeechIndex(
  int index,
  List<String> previousKeys,
  List<String> nextKeys,
) {
  if (index < 0 || index >= previousKeys.length) return 0;
  final next = nextKeys.indexOf(previousKeys[index]);
  return next < 0 ? 0 : next;
}

/// Measured slots keep mixed-height cards and their gaps intact during a live preview: how far
/// each block moves when block [from] is shown at [to].
List<double> speechPreviewOffsets(List<SpeechSlot> items, int from, int to) {
  final order = moveSpeechBlock(
    [for (var i = 0; i < items.length; i++) i],
    from,
    to,
  );
  final offsets = [for (final _ in items) 0.0];
  var top = items.isEmpty ? 0.0 : items[0].top;
  for (var slot = 0; slot < order.length; slot++) {
    final original = order[slot];
    offsets[original] = top - items[original].top;
    top += items[original].height;
    if (slot < items.length - 1) {
      top += items[slot + 1].top - items[slot].top - items[slot].height;
    }
  }
  return offsets;
}

/// Hit testing uses the unclamped grab delta, so a tall card can reach a short final slot.
int speechDragIndex(List<SpeechSlot> items, int from, double delta) {
  if (from < 0 || from >= items.length) return from;
  final own = items[from];
  final center = own.top + own.height / 2 + delta;
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    if (i != from && center >= items[i].top + items[i].height / 2) count++;
  }
  return count;
}
