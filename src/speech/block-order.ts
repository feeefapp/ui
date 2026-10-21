/** Move the original object, including its voice/delivery settings, in one undoable edit. */
export function moveSpeechBlock<T>(blocks: T[], from: number, to: number): T[] {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= blocks.length ||
    to >= blocks.length ||
    from === to
  )
    return blocks
  const result = [...blocks]
  result.splice(to, 0, ...result.splice(from, 1))
  return result
}

/** Follow identity through reorder, removal, undo and redo; new drafts start at block zero. */
export function remapSpeechIndex(index: number, previousKeys: string[], nextKeys: string[]) {
  const key = previousKeys[index]
  const next = key === undefined ? -1 : nextKeys.indexOf(key)
  return next < 0 ? 0 : next
}

/** Measured slots keep mixed-height cards and their gaps intact during a live preview. */
export function speechPreviewOffsets(
  items: { top: number; height: number }[],
  from: number,
  to: number
) {
  const order = moveSpeechBlock(
    items.map((_, index) => index),
    from,
    to
  )
  const offsets = items.map(() => 0)
  let top = items[0]?.top ?? 0
  order.forEach((original, slot) => {
    offsets[original] = top - items[original].top
    top += items[original].height
    if (slot < items.length - 1) top += items[slot + 1].top - items[slot].top - items[slot].height
  })
  return offsets
}

/** Hit testing uses the unclamped grab delta, so a tall card can reach a short final slot. */
export function speechDragIndex(
  items: { top: number; height: number }[],
  from: number,
  delta: number
) {
  const own = items[from]
  if (!own) return from
  const center = own.top + own.height / 2 + delta
  return items.filter((item, index) => index !== from && center >= item.top + item.height / 2)
    .length
}
