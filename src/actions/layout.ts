/** Width-only contract, independent of React and browser measurement. */
export interface ActionLayoutItem {
  id: string
  /** Lower priorities enter overflow first. Equal priorities spill from the end. */
  priority?: number
}

export interface ActionsLayout<T> {
  visible: T[]
  overflow: T[]
  /** The space the result needs, including the menu trigger when present. */
  requiredWidth: number
}

/**
 * Fit complete top-level entries; nested groups remain intact. Both result
 * lists preserve source order. A host narrower than the overflow trigger still
 * receives that trigger, so every action remains reachable.
 */
export function computeLabActionsLayout<T extends ActionLayoutItem>({
  actions,
  maxWidth,
  measure,
  overflowWidth = 40,
  gap = 4,
}: {
  actions: readonly T[]
  maxWidth: number
  measure: (action: T) => number
  overflowWidth?: number
  gap?: number
}): ActionsLayout<T> {
  if (Number.isNaN(maxWidth) || maxWidth < 0) {
    throw new RangeError('Actions maxWidth must be non-negative.')
  }
  for (const [name, value] of [
    ['overflowWidth', overflowWidth],
    ['gap', gap],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Lab actions ${name} must be finite and non-negative.`)
    }
  }
  if (!actions.length) return { visible: [], overflow: [], requiredWidth: 0 }

  const widths = actions.map((action) => {
    const width = measure(action)
    if (!Number.isFinite(width) || width < 0) {
      throw new RangeError(`Lab action ${action.id} needs a finite, non-negative width.`)
    }
    return width
  })
  const completeWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (actions.length - 1)
  if (completeWidth <= maxWidth) {
    return { visible: [...actions], overflow: [], requiredWidth: completeWidth }
  }

  const spillOrder = actions
    .map((action, index) => ({
      index,
      priority: Number.isFinite(action.priority) ? action.priority! : 0,
    }))
    .sort((a, b) => a.priority - b.priority || b.index - a.index)
  const spilled = new Set<number>()
  let requiredWidth = completeWidth + gap + overflowWidth
  for (const { index } of spillOrder) {
    spilled.add(index)
    requiredWidth -= widths[index] + gap
    if (requiredWidth <= maxWidth) break
  }

  return {
    visible: actions.filter((_, index) => !spilled.has(index)),
    overflow: actions.filter((_, index) => spilled.has(index)),
    requiredWidth: Math.max(overflowWidth, requiredWidth),
  }
}
